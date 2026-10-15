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

class CriminalController {
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
        data: criminal,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllCriminals(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await criminalService.getAllCriminals(page, limit);

      res.status(200).json({
        success: true,
        data: result.criminals,
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

      res.status(200).json({
        success: true,
        data: criminal,
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
        data: criminal,
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

      return res.status(200).json({ success: true, message: 'Photo enregistree', data: updatedCriminal });
    } catch (error) {
      return next(error);
    }
  }

  async addEvidence(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const files = ((req as any).files || []) as Express.Multer.File[];
      const fileUrls = files.map((file) => `/uploads/evidences/${path.basename(file.path)}`);

      const evidence = await criminalService.addEvidence(
        id,
        {
          title: req.body.title,
          description: req.body.description,
          category: req.body.category,
          collectedAt: req.body.collectedAt,
          collectedAtLocation: req.body.collectedAtLocation,
          fileUrls,
        },
        req.user!.userId,
      );

      return res.status(201).json({
        success: true,
        message: 'Piece a conviction enregistree',
        data: evidence,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getEvidences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const criminal = await criminalService.getCriminalById(req.params.id);
      const evidences = criminal.evidences;
      await Promise.all(evidences.map((evidence) => auditService.createAuditLog({
        userId: req.user!.userId,
        action: 'VIEW',
        entity: 'EVIDENCE',
        entityId: evidence.id,
        changes: { criminalId: criminal.id },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      }))).catch((error) => {
        console.error('Erreur lors de l\'audit de consultation des preuves:', error);
      });

      return res.status(200).json({ success: true, data: evidences });
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
        data: evidence,
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
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const result = await criminalService.searchCriminals(searchParams);

      res.status(200).json({
        success: true,
        data: result.criminals,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const criminalController = new CriminalController();
