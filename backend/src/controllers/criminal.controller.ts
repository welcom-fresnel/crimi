/**
 * Controleur de gestion des criminels avec notifications temps reel
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { criminalService } from '../services/criminal.service';
import { socketService } from '../services/socket.service';
import { CriminalCreatedPayload, CriminalUpdatedPayload } from '../types/socket.types';
import { auditService } from '../services/audit.service';
import path from 'path';
import { createHash } from 'crypto';
import fs from 'fs';
import { prisma } from '../utils/prisma';
import { config } from '../config';

export const toCriminalView = <T extends Record<string, any>>(criminal: T, roles: string[]): T => {
  if (!roles.includes('VIEWER')) return criminal;
  const hiddenFields = new Set(['fingerprint', 'lastknownaddress', 'phonenumber', 'fileurls', 'filehashes']);
  const scrub = (value: any): any => {
    if (Array.isArray(value)) return value.map(scrub);
    if (!value || typeof value !== 'object' || value instanceof Date) return value;
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !hiddenFields.has(key.toLowerCase()))
      .map(([key, item]) => [key, scrub(item)]));
  };
  return scrub(criminal) as T;
};

class CriminalController {
  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const statuses = ['ACTIVE', 'ARRESTED', 'RELEASED', 'DECEASED', 'UNKNOWN'] as const;
      const [total, ...counts] = await Promise.all([
        prisma.criminal.count({ where: { deletedAt: null } }),
        ...statuses.map((status) => prisma.criminal.count({ where: { deletedAt: null, status } })),
      ]);
      await auditService.createAuditLog({
        userId: req.user!.userId, action: 'VIEW', entity: 'CRIMINAL',
        changes: { resource: 'stats' }, ipAddress: req.ip, userAgent: req.headers['user-agent'],
      });
      res.status(200).json({ success: true, data: { total, byStatus: Object.fromEntries(statuses.map((status, index) => [status, counts[index]])) } });
    } catch (error) { next(error); }
  }

  async recordExport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const criminal = await criminalService.getCriminalById(req.params.id);
      await auditService.createAuditLog({
        userId: req.user!.userId, action: 'VIEW', entity: 'CRIMINAL', entityId: criminal.id,
        changes: { export: true, format: req.body.format }, ipAddress: req.ip, userAgent: req.headers['user-agent'],
      });
      res.status(204).end();
    } catch (error) { next(error); }
  }

  async getPhoto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const criminal = await criminalService.getCriminalById(req.params.id);
      if (!criminal.photo?.startsWith('/uploads/photos/')) return res.status(404).json({ success: false, message: 'Photo non trouvee' });
      const photosRoot = path.resolve(process.cwd(), 'uploads', 'photos');
      const filePath = path.resolve(photosRoot, path.basename(criminal.photo));
      if (!filePath.startsWith(`${photosRoot}${path.sep}`)) return res.status(404).json({ success: false, message: 'Photo non trouvee' });
      res.setHeader('Cache-Control', 'private, no-store');
      if (req.query.context === 'detail') {
        await auditService.createAuditLog({ userId: req.user!.userId, action: 'VIEW', entity: 'CRIMINAL', entityId: criminal.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
      }
      return res.sendFile(filePath, (error) => { if (error) next(error); });
    } catch (error) { next(error); }
  }
  async createCriminal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const createdById = req.user!.userId;
      const criminal = await criminalService.createCriminal(req.body, createdById);

      const payload: CriminalCreatedPayload = {
        criminal,
        createdBy: {
          id: req.user!.userId,
          username: req.user!.username,
          postId: req.body.postId,
        },
        timestamp: new Date(),
      };

      socketService.notifyCriminalCreated(payload);

      res.status(201).json({
        success: true,
        message: 'Criminel cree avec succes',
        data: toCriminalView(criminal as Record<string, any>, req.user!.roles),
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllCriminals(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(config.maxPageSize, Math.max(1, parseInt(req.query.limit as string) || config.defaultPageSize));

      const result = await criminalService.getAllCriminals(page, limit);
      await auditService.createAuditLog({ userId: req.user!.userId, action: 'VIEW', entity: 'CRIMINAL', changes: { criteria: { page, limit }, resultCount: result.pagination.total }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

      res.status(200).json({
        success: true,
        data: result.criminals.map((criminal) => toCriminalView(criminal as Record<string, any>, req.user!.roles)),
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCriminalById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const criminal = await criminalService.getCriminalById(id);

      await auditService.createAuditLog({ userId: req.user!.userId, action: 'VIEW', entity: 'CRIMINAL', entityId: id, changes: { fields: ['id'] }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

      res.status(200).json({
        success: true,
        data: toCriminalView(criminal as Record<string, any>, req.user!.roles),
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCriminal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updatedById = req.user!.userId;
      const originalData = (req as any).originalData;

      const criminal = await criminalService.updateCriminal(
        id,
        req.body,
        updatedById,
        req.user!.roles
      );

      const payload: CriminalUpdatedPayload = {
        criminal,
        changes: originalData
          ? {
              before: originalData,
              after: criminal,
            }
          : undefined,
        updatedBy: {
          id: req.user!.userId,
          username: req.user!.username,
          postId: req.body.postId,
        },
        timestamp: new Date(),
      };

      socketService.notifyCriminalUpdated(payload);

      res.status(200).json({
        success: true,
        message: 'Criminel mis a jour avec succes',
        data: toCriminalView(criminal as Record<string, any>, req.user!.roles),
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadPhoto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const file = (req as any).file;

      if (!file) {
        return res.status(400).json({ success: false, message: 'Aucun fichier recu' });
      }

      const photoUrl = `/uploads/photos/${path.basename(file.path)}`;
      const updatedCriminal = await criminalService.saveCriminalPhoto(
        id,
        photoUrl,
        req.user!.userId,
        req.user!.roles
      );

      const payload: CriminalUpdatedPayload = {
        criminal: updatedCriminal,
        updatedBy: {
          id: req.user!.userId,
          username: req.user!.username,
          postId: req.body.postId,
        },
        timestamp: new Date(),
      };

      try {
        socketService.notifyCriminalUpdated(payload);
      } catch (_) {}

      return res.status(200).json({ success: true, message: 'Photo enregistree', data: toCriminalView(updatedCriminal as Record<string, any>, req.user!.roles) });
    } catch (error) {
      return next(error);
    }
  }

  async addEvidence(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const files = ((req as any).files || []) as Express.Multer.File[];
      const fileUrls = files.map((file) => `/uploads/evidences/${path.basename(file.path)}`);
      const fileHashes = files.map((file) => createHash('sha256').update(fs.readFileSync(file.path)).digest('hex'));

      const evidence = await criminalService.addEvidence(
        id,
        {
          title: req.body.title,
          description: req.body.description,
          category: req.body.category,
          collectedAt: req.body.collectedAt,
          collectedAtLocation: req.body.collectedAtLocation,
          fileUrls,
          fileHashes,
        },
        req.user!.userId,
      );

      return res.status(201).json({
        success: true,
        message: 'Piece a conviction enregistree',
        data: toCriminalView(evidence as Record<string, any>, req.user!.roles),
      });
    } catch (error) {
      return next(error);
    }
  }

  async getEvidences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await criminalService.assertCriminalActive(req.params.id);
      const criminal = await criminalService.getCriminalById(req.params.id);
      const evidences = criminal.evidences;
      await auditService.createAuditLog({
        userId: req.user!.userId,
        action: 'VIEW',
        entity: 'CRIMINAL',
        entityId: criminal.id,
        changes: { viewedEvidenceCount: evidences.length },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      });

      return res.status(200).json({ success: true, data: toCriminalView({ evidences }, req.user!.roles).evidences });
    } catch (error) {
      return next(error);
    }
  }

  async getEvidenceFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const fileIndex = Number(req.params.fileIndex);
      const file = await criminalService.getEvidenceFile(
        req.params.id,
        req.params.evidenceId,
        fileIndex,
      );

      await auditService.createAuditLog({
        userId: req.user!.userId,
        action: 'VIEW',
        entity: 'EVIDENCE',
        entityId: req.params.evidenceId,
        changes: { criminalId: req.params.id, fileName: file.fileName },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      });

      if (req.query.download === '1') {
        res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
      }
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      return res.sendFile(file.filePath, (error) => {
        if (error) next(error);
      });
    } catch (error) {
      return next(error);
    }
  }

  async updateEvidence(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const evidence = await criminalService.updateEvidence(
        req.params.id,
        req.params.evidenceId,
        req.body,
      );
      return res.status(200).json({
        success: true,
        message: 'Piece a conviction mise a jour',
        data: toCriminalView(evidence as Record<string, any>, req.user!.roles),
      });
    } catch (error) {
      return next(error);
    }
  }

  async addCrime(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const crime = await criminalService.addCrime(id, req.body, req.user!.userId);

      return res.status(201).json({
        success: true,
        message: 'Crime ajouté avec succès',
        data: crime,
      });
    } catch (error) {
      return next(error);
    }
  }

  async deleteCriminal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await criminalService.deleteCriminal(id, req.user!.userId);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      return next(error);
    }
  }

  async searchCriminals(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const searchParams = {
        name: req.query.name as string,
        caseNumber: req.query.caseNumber as string,
        crimeTypeId: req.query.crimeTypeId as string,
        status: req.query.status as any,
        dangerLevel: req.query.dangerLevel as any,
        page: Math.max(1, parseInt(req.query.page as string) || 1),
        limit: Math.min(config.maxPageSize, Math.max(1, parseInt(req.query.limit as string) || config.defaultPageSize)),
      };

      const result = await criminalService.searchCriminals(searchParams);

      await auditService.createAuditLog({ userId: req.user!.userId, action: 'VIEW', entity: 'CRIMINAL', changes: { criteria: searchParams, resultCount: result.pagination.total }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

      res.status(200).json({
        success: true,
        data: result.criminals.map((criminal) => toCriminalView(criminal as Record<string, any>, req.user!.roles)),
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const criminalController = new CriminalController();
