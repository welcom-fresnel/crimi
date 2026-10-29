import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: {
    criminal: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), count: vi.fn() },
    crimeType: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
  bcryptCompare: vi.fn(),
  criminalGetAll: vi.fn(),
  auditCreate: vi.fn(),
  auditGetAll: vi.fn(),
}));
vi.mock('../src/utils/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('bcryptjs', () => ({ default: { compare: mocks.bcryptCompare, hash: vi.fn() } }));
vi.mock('../src/services/audit.service', () => ({ auditService: { createAuditLog: mocks.auditCreate, getAllAuditLogs: mocks.auditGetAll } }));

import { auditLog, saveOriginalData } from '../src/middlewares/audit.middleware';
import { criminalService, deleteFileIfSafe } from '../src/services/criminal.service';
import { authenticate } from '../src/middlewares/auth.middleware';
import { authService } from '../src/services/auth.service';
import { criminalController } from '../src/controllers/criminal.controller';
import { config } from '../src/config';
import { verifyUploadedFiles } from '../src/routes/criminal.routes';
import criminalRoutes from '../src/routes/criminal.routes';
import { socketService } from '../src/services/socket.service';
import { auditController } from '../src/controllers/audit.controller';

afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks(); });

describe('régressions lot A', () => {
  it('A1 charge la preuve avec evidenceId dans le middleware d’audit', async () => {
    const app = express();
    app.use(express.json());
    const getEvidenceById = vi.fn(async (id: string) => ({ id }));
    app.put('/criminals/:id/evidences/:evidenceId', (req: any, _res, next) => { req.user = { userId: 'u-1' }; next(); }, saveOriginalData('EVIDENCE', getEvidenceById, 'evidenceId'), auditLog('UPDATE', 'EVIDENCE'), (req, res) => res.json({ success: true, data: (req as any).originalData }));
    const result = await request(app).put('/criminals/case-1/evidences/evidence-9').send({ title: 'Titre modifié' });
    expect(result.status).toBe(200);
    expect(result.body.data.id).toBe('evidence-9');
    expect(getEvidenceById).toHaveBeenCalledWith('evidence-9');
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ changes: expect.objectContaining({ before: { id: 'evidence-9' }, after: { title: 'Titre modifié' } }) }));
  });

  it('A2 refuse un dossier supprimé logiquement', async () => {
    mocks.prisma.criminal.findUnique.mockResolvedValue({ id: 'c-1', deletedAt: new Date() });
    await expect(criminalService.assertCriminalActive('c-1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('A3 ne supprime pas un fichier situé hors du répertoire uploads', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'securit-test-'));
    const file = path.join(dir, 'evidence.pdf');
    fs.writeFileSync(file, 'donnée');
    deleteFileIfSafe(file);
    expect(fs.existsSync(file)).toBe(true);
    fs.unlinkSync(file);
    fs.rmdirSync(dir);
  });

  it('A4 retourne 404 pour un ancien chemin statique /uploads/photos', async () => {
    const app = express();
    app.use('/api/criminals', criminalRoutes);
    app.use((error: any, _req: any, res: any, _next: any) => res.status(error.statusCode || 500).json({ message: error.message }));
    app.use((_req, res) => res.status(404).json({ success: false }));
    const result = await request(app).get('/uploads/photos/photo.jpg');
    expect(result.status).toBe(404);
    expect(fs.readFileSync(path.join(process.cwd(), 'src/server.ts'), 'utf8')).not.toContain('express.static');
    const tokenQuery = await request(app).get('/api/criminals/c-1/photo?t=jwt-in-url');
    expect(tokenQuery.status).toBe(401);
    expect(fs.readFileSync(path.join(process.cwd(), 'src/routes/criminal.routes.ts'), 'utf8')).not.toContain('photo-token');
  });

  it('A5 conserve une liste blanche de champs d’écriture explicite', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/services/criminal.service.ts'), 'utf8');
    expect(source).toContain('firstName: effectiveData.firstName');
    expect(source).not.toContain('...effectiveData');
  });

  it('A6 rejette un JWT signé avec HS512', async () => {
    config.jwtSecret = 'test-secret-key-that-is-at-least-thirty-two-characters';
    const app = express();
    app.get('/protected', authenticate, (_req, res) => res.status(200).end());
    app.use((error: any, _req: any, res: any, _next: any) => res.status(error.statusCode || 500).json({ message: error.message }));
    const token = jwt.sign({ userId: 'u-1', username: 'test', email: 'test@example.org', roles: ['ADMIN'] }, config.jwtSecret, { algorithm: 'HS512' });
    const result = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(result.status).toBe(401);
  });

  it('A7 renvoie le même 401 pour un compte inconnu et un compte désactivé', async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'u-1', username: 'off', password: 'hash', isActive: false, userRoles: [] });
    mocks.bcryptCompare.mockResolvedValue(true);
    const unknown = await authService.login({ username: 'missing', password: 'bad' }).catch((error) => error);
    const disabled = await authService.login({ username: 'off', password: 'bad' }).catch((error) => error);
    expect(unknown.statusCode).toBe(401);
    expect(disabled.statusCode).toBe(401);
    expect(unknown.message).toBe(disabled.message);
    expect(unknown.message).toBe('Identifiants invalides');
  });

  it('AB4 inclut le changement de mot de passe et les permissions fusionnées au login', async () => {
    config.jwtSecret = 'test-secret-key-that-is-at-least-thirty-two-characters';
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: 'u-2', username: 'admin-agent', email: 'a@example.org', password: 'hash', isActive: true,
      failedLoginCount: 0, lockedUntil: null, mustChangePassword: true, profile: {},
      userRoles: [{ role: { name: 'ADMIN' } }, { role: { name: 'AGENT' } }],
    });
    mocks.bcryptCompare.mockResolvedValue(true);
    const result = await authService.login({ username: 'admin-agent', password: 'correct' });
    expect(result.mustChangePassword).toBe(true);
    expect(result.user.mustChangePassword).toBe(true);
    expect(result.permissions).toContainEqual({ resource: 'criminals', actions: ['create', 'read', 'update', 'delete'] });
    expect(result.permissions).toContainEqual({ resource: 'users', actions: ['create', 'read', 'update', 'delete'] });
  });

  it('A8 borne la pagination des listes criminelles', async () => {
    vi.spyOn(criminalService, 'getAllCriminals').mockResolvedValue({ criminals: [], pagination: { page: 1, limit: config.maxPageSize, total: 0, totalPages: 0 } } as any);
    mocks.auditCreate.mockResolvedValue({});
    const req: any = { query: { page: '-10', limit: '9999' }, user: { userId: 'u-1', roles: ['ADMIN'] }, ip: '127.0.0.1', headers: {} };
    const res: any = { statusCode: 200, status: vi.fn().mockReturnThis(), json: vi.fn() };
    await criminalController.getAllCriminals(req, res, vi.fn());
    expect(criminalService.getAllCriminals).toHaveBeenCalledWith(1, config.maxPageSize);
  });

  it('AB2 génère le caseNumber dans la transaction lorsque le champ est omis', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ value: '42' }]),
      criminal: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'c-created', caseNumber: '2026-000042' }),
      },
      crime: { createMany: vi.fn() },
    };
    mocks.prisma.crimeType.findUnique.mockResolvedValue({ id: 'crime-type' });
    mocks.prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    mocks.prisma.criminal.findUnique.mockResolvedValue({ id: 'c-created', caseNumber: '2026-000042' });
    const created = await criminalService.createCriminal({
      firstName: 'Awa', lastName: 'Test', crimeTypeId: 'crime-type', description: 'Description valide du crime',
    }, 'user-1');
    expect(tx.criminal.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ caseNumber: '2026-000042' }) }));
    expect(created?.caseNumber).toBe('2026-000042');
  });

  it('AB3 ignore les valeurs déjà renseignées identiques après normalisation', async () => {
    mocks.prisma.criminal.findUnique
      .mockResolvedValueOnce({ id: 'c-1', deletedAt: null })
      .mockResolvedValueOnce({ id: 'c-1', deletedAt: null, firstName: 'Awa', arrestation: { arrestDate: new Date('2020-01-02T00:00:00.000Z') } })
      .mockResolvedValueOnce({ id: 'c-1', deletedAt: null, firstName: 'Awa', arrestation: { arrestDate: new Date('2020-01-02T00:00:00.000Z') } });
    const result = await criminalService.updateCriminal('c-1', {
      firstName: ' Awa ', arrestation: { arrestDate: '2020-01-02T23:00:00.000Z' },
    }, 'user-2', ['AGENT']);
    expect(result.id).toBe('c-1');
    expect(mocks.prisma.criminal.update).not.toHaveBeenCalled();
  });

  it('AB5 limite chaque événement criminal au contrat minimal', () => {
    config.socketFullPayload = false;
    const emit = vi.spyOn(socketService, 'emitToAllExcept').mockImplementation(() => undefined);
    const timestamp = new Date('2026-10-29T10:00:00Z');
    const by = { id: 'u-1', username: 'agent' };
    socketService.notifyCriminalCreated({ criminal: { id: 'c-1', caseNumber: '2026-000001', fingerprint: 'secret' }, createdBy: by, timestamp });
    expect(emit.mock.calls[0]).toEqual(['u-1', 'criminal:created', { criminalId: 'c-1', caseNumber: '2026-000001', by, timestamp }]);
    emit.mockClear();
    socketService.notifyCriminalUpdated({ criminal: { id: 'c-1', caseNumber: '2026-000001', fingerprint: 'secret' }, updatedBy: by, timestamp });
    expect(emit.mock.calls[0]).toEqual(['u-1', 'criminal:updated', { criminalId: 'c-1', caseNumber: '2026-000001', by, timestamp }]);
    emit.mockClear();
    socketService.notifyCriminalDeleted({ criminalId: 'c-1', caseNumber: '2026-000001', deletedBy: by, timestamp });
    expect(emit.mock.calls[0]).toEqual(['u-1', 'criminal:deleted', { criminalId: 'c-1', caseNumber: '2026-000001', by, timestamp }]);
  });

  it('AB6 retourne les statistiques de dossiers actifs et écrit une seule trace VIEW', async () => {
    [5, 1, 2, 1, 0, 1].forEach((count) => mocks.prisma.criminal.count.mockResolvedValueOnce(count));
    const req: any = { user: { userId: 'u-1' }, ip: '127.0.0.1', headers: {} };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await criminalController.getStats(req, res, vi.fn());
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { total: 5, byStatus: { ACTIVE: 1, ARRESTED: 2, RELEASED: 1, DECEASED: 0, UNKNOWN: 1 } } });
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ action: 'VIEW', entity: 'CRIMINAL', changes: { resource: 'stats' } }));
  });

  it('AB6 journalise un export PDF et répond 204', async () => {
    mocks.prisma.criminal.findUnique.mockResolvedValue({ id: 'c-1', caseNumber: '2026-000001', deletedAt: null });
    const req: any = { params: { id: 'c-1' }, body: { format: 'pdf', purpose: 'print' }, user: { userId: 'u-1' }, ip: '127.0.0.1', headers: {} };
    const res: any = { status: vi.fn().mockReturnThis(), end: vi.fn() };
    await criminalController.recordExport(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(204);
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ action: 'VIEW', entityId: 'c-1', changes: { export: true, format: 'pdf' } }));
  });

  it('AB6 borne la pagination de GET /api/audit à maxPageSize', async () => {
    mocks.auditGetAll.mockResolvedValue({ auditLogs: [], pagination: { page: 1, limit: config.maxPageSize, total: 0, totalPages: 0 } });
    const req: any = { query: { page: '-2', limit: '5000' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await auditController.getAllAuditLogs(req, res, vi.fn());
    expect(mocks.auditGetAll).toHaveBeenCalledWith(1, config.maxPageSize, expect.any(Object));
  });

  it('B4 rejette un exécutable renommé en PDF et supprime le temporaire', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'securit-upload-'));
    const file = path.join(dir, 'renomme.pdf');
    fs.writeFileSync(file, Buffer.from('MZ\x90\x00FAUX-EXECUTABLE'));
    const app = express();
    app.post('/upload', (req, _res, next) => {
      (req as any).file = { path: file, mimetype: 'application/pdf', filename: 'renomme.pdf' };
      next();
    }, verifyUploadedFiles('evidence'), (_req, res) => res.status(200).end());
    app.use((error: any, _req: any, res: any, _next: any) => res.status(error.statusCode || 500).json({ message: error.message }));
    const result = await request(app).post('/upload');
    expect(result.status).toBe(400);
    expect(fs.existsSync(file)).toBe(false);
    fs.rmdirSync(dir);
  });

  it('B6 verrouille le compte lors du cinquième échec', async () => {
    let failedLoginCount = 0;
    let persistedLock: Date | null = null;
    const tx = {
      $queryRaw: vi.fn(),
      user: {
        findUnique: vi.fn(async () => ({ failedLoginCount })),
        update: vi.fn(async ({ data }: any) => { failedLoginCount = data.failedLoginCount; persistedLock = data.lockedUntil; }),
      },
    };
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'u-1', username: 'agent', password: 'hash', isActive: true, failedLoginCount: 0, lockedUntil: null, userRoles: [] });
    mocks.prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    mocks.bcryptCompare.mockResolvedValue(false);
    let fifthFailure: any;
    for (let i = 0; i < 5; i += 1) {
      try { await authService.login({ username: 'agent', password: 'incorrect' }); }
      catch (error) { if (i === 4) fifthFailure = error; }
    }
    expect(failedLoginCount).toBe(5);
    expect(persistedLock).toBeInstanceOf(Date);
    expect(persistedLock!.getTime()).toBeGreaterThan(Date.now());
    expect(fifthFailure).toMatchObject({ statusCode: 429, code: 'TOO_MANY_ATTEMPTS', message: 'Trop de tentatives. Réessayez plus tard.' });
  });
});
