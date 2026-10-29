import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/ApiError';
import { auditService } from '../services/audit.service';
import { AuthRequest } from '../types';

const router = Router();
const db: any = prisma;
router.use(authenticate);

const requireRole = (req: AuthRequest, role: string) => {
  if (!req.user?.roles.includes(role)) throw new ApiError(403, 'Vous n’avez pas la permission d’effectuer cette action');
};
const requireText = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, `${label} est obligatoire`);
  return value.trim();
};

// Les procédures décrivent le suivi procédural sans dépendre des champs historiques de Criminal.
router.post('/criminals/:criminalId/procedures', async (req: AuthRequest, res, next) => {
  try {
    requireRole(req, 'ADMIN');
    const criminalId = requireText(req.params.criminalId, 'Le dossier');
    const reference = requireText(req.body.reference, 'La référence');
    const summary = typeof req.body.summary === 'string' ? req.body.summary : undefined;
    const criminal = await db.criminal.findFirst({ where: { id: criminalId, deletedAt: null }, select: { id: true, caseNumber: true, firstName: true, lastName: true, personSituation: true, offenseState: true, updatedAt: true } });
    if (!criminal) throw new ApiError(404, 'Dossier non trouvé');
    const procedure = await db.$transaction(async (tx: any) => {
      const created = await tx.procedure.create({ data: { criminalId, reference, summary, createdById: req.user!.userId } });
      const lastVersion = await tx.dossierVersion.aggregate({ where: { criminalId }, _max: { version: true } });
      await tx.dossierVersion.create({ data: { criminalId, version: (lastVersion._max.version || 0) + 1, snapshot: criminal, reason: 'Création de procédure', createdById: req.user!.userId } });
      return created;
    });
    await auditService.createAuditLog({ userId: req.user!.userId, action: 'CREATE', entity: 'CRIMINAL', entityId: criminalId, changes: { procedureId: procedure.id, fields: ['reference', ...(summary ? ['summary'] : [])] }, ipAddress: req.ip });
    res.status(201).json({ success: true, message: 'Procédure créée', data: procedure });
  } catch (error) { next(error); }
});

router.get('/criminals/:criminalId/procedures', async (req: AuthRequest, res, next) => {
  try {
    const criminal = await db.criminal.findFirst({ where: { id: req.params.criminalId, deletedAt: null }, select: { id: true } });
    if (!criminal) throw new ApiError(404, 'Dossier non trouvé');
    const data = await db.procedure.findMany({ where: { criminalId: criminal.id }, include: { decisions: { include: { peine: true } }, validations: true, requests: { include: { published: true } } }, orderBy: { createdAt: 'desc' } });
    res.status(200).json({ success: true, message: 'Procédures récupérées', data });
  } catch (error) { next(error); }
});

router.post('/procedures/:procedureId/demandes', async (req: AuthRequest, res, next) => {
  try {
    const type = requireText(req.body.type, 'Le type de demande');
    const payload = req.body.payload;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new ApiError(400, 'Le contenu de la demande est invalide');
    const procedure = await db.procedure.findUnique({ where: { id: req.params.procedureId } });
    if (!procedure) throw new ApiError(404, 'Procédure non trouvée');
    const demande = await db.demande.create({ data: { procedureId: procedure.id, type, payload, createdById: req.user!.userId } });
    await auditService.createAuditLog({ userId: req.user!.userId, action: 'CREATE', entity: 'CRIMINAL', entityId: procedure.criminalId, changes: { demandeId: demande.id, fields: ['type', 'payload'] }, ipAddress: req.ip });
    res.status(201).json({ success: true, message: 'Demande créée en brouillon', data: demande });
  } catch (error) { next(error); }
});

router.post('/demandes/:demandeId/submit', async (req: AuthRequest, res, next) => {
  try {
    const demande = await db.demande.findUnique({ where: { id: req.params.demandeId }, include: { procedure: true } });
    if (!demande) throw new ApiError(404, 'Demande non trouvée');
    if (demande.createdById !== req.user!.userId && !req.user!.roles.includes('ADMIN')) throw new ApiError(403, 'Seul le créateur peut soumettre cette demande');
    if (demande.status !== 'DRAFT') throw new ApiError(409, 'Seule une demande en brouillon peut être soumise');
    const result = await db.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT "id" FROM "demandes" WHERE "id" = ${demande.id} FOR UPDATE`;
      const current = await tx.demande.findUnique({ where: { id: demande.id } });
      if (!current || current.status !== 'DRAFT') throw new ApiError(409, 'Seule une demande en brouillon peut être soumise');
      const updated = await tx.demande.update({ where: { id: demande.id }, data: { status: 'SUBMITTED' } });
      await tx.validation.create({ data: { procedureId: demande.procedureId, submittedById: req.user!.userId, status: 'SUBMITTED', submittedAt: new Date() } });
      return updated;
    });
    res.status(200).json({ success: true, message: 'Demande soumise à validation', data: result });
  } catch (error) { next(error); }
});

router.post('/demandes/:demandeId/decision', async (req: AuthRequest, res, next) => {
  try {
    requireRole(req, 'ADMIN');
    const outcome = req.body.outcome;
    if (!['APPROVED', 'REJECTED'].includes(outcome)) throw new ApiError(400, 'La décision doit être APPROVED ou REJECTED');
    const reason = requireText(req.body.reason, 'Le motif de décision');
    const demande = await db.demande.findUnique({ where: { id: req.params.demandeId }, include: { procedure: true } });
    if (!demande) throw new ApiError(404, 'Demande non trouvée');
    if (demande.createdById === req.user!.userId) throw new ApiError(403, 'Un administrateur ne peut pas valider sa propre demande');
    if (demande.status !== 'SUBMITTED') throw new ApiError(409, 'Seule une demande soumise peut recevoir une décision');
    const result = await db.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT "id" FROM "demandes" WHERE "id" = ${demande.id} FOR UPDATE`;
      const current = await tx.demande.findUnique({ where: { id: demande.id } });
      if (!current || current.status !== 'SUBMITTED') throw new ApiError(409, 'Seule une demande soumise peut recevoir une décision');
      const updated = await tx.demande.update({ where: { id: demande.id }, data: { status: outcome, reviewerId: req.user!.userId, reviewedAt: new Date(), reason } });
      await tx.validation.updateMany({ where: { procedureId: demande.procedureId, status: 'SUBMITTED' }, data: { status: outcome, reviewerId: req.user!.userId, reviewedAt: new Date(), reason } });
      await tx.decision.create({ data: { procedureId: demande.procedureId, type: outcome, reason, decidedById: req.user!.userId } });
      return updated;
    });
    await auditService.createAuditLog({ userId: req.user!.userId, action: 'UPDATE', entity: 'CRIMINAL', entityId: demande.procedure.criminalId, changes: { demandeId: demande.id, before: { status: demande.status }, after: { status: outcome, reason } }, ipAddress: req.ip });
    res.status(200).json({ success: true, message: 'Décision enregistrée', data: result });
  } catch (error) { next(error); }
});

router.post('/demandes/:demandeId/publish', async (req: AuthRequest, res, next) => {
  try {
    requireRole(req, 'ADMIN');
    const demande = await db.demande.findUnique({ where: { id: req.params.demandeId } });
    if (!demande) throw new ApiError(404, 'Demande non trouvée');
    if (demande.status !== 'APPROVED') throw new ApiError(409, 'Seule une demande approuvée peut être publiée');
    const result = await db.resultatPublie.create({ data: { demandeId: demande.id, payload: demande.payload, publishedById: req.user!.userId } });
    res.status(201).json({ success: true, message: 'Résultat publié', data: result });
  } catch (error) { next(error); }
});

export default router;
