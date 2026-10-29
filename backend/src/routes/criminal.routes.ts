/**
 * Routes de gestion des criminels
 */

import { Router } from 'express';
import { criminalController } from '../controllers/criminal.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditLog, saveOriginalData } from '../middlewares/audit.middleware';
import { validate } from '../middlewares/validation.middleware';
import { createCriminalValidator, updateCriminalValidator, createCrimeValidator, updateEvidenceValidator, createEvidenceValidator } from '../validators/criminal.validator';
import { criminalService } from '../services/criminal.service';
import multer from 'multer';
import path from 'path';
import { AuthRequest } from '../types';
import { Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { fromFile } from 'file-type';
import fs from 'fs';
import { ApiError } from '../utils/ApiError';
import { body } from 'express-validator';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const photosPath = path.resolve(process.cwd(), 'uploads', 'photos');
const evidencesPath = path.resolve(process.cwd(), 'uploads', 'evidences');
const extensionByMime: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
  'application/pdf': 'pdf', 'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx', 'text/plain': 'txt',
};

const createStorage = (destination: string) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => {
      const extension = extensionByMime[file.mimetype];
      if (!extension) return cb(new Error('Format non autorise'), '');
      cb(null, `${randomUUID()}.${extension}`);
    },
  });

const allowedEvidenceMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

const imageFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
    cb(new Error('Le fichier doit etre une image valide'));
    return;
  }
  cb(null, true);
};

const evidenceFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!allowedEvidenceMimeTypes.has(file.mimetype)) {
    cb(new Error('Format non autorise. Utilisez une image, PDF, Word, Excel ou fichier texte.'));
    return;
  }
  cb(null, true);
};

const uploadPhoto = multer({
  storage: createStorage(photosPath),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: imageFileFilter,
});

const uploadEvidence = multer({
  storage: createStorage(evidencesPath),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: evidenceFileFilter,
});

export const verifyUploadedFiles = (kind: 'photo' | 'evidence') => async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const files = [...(req.file ? [req.file] : []), ...(Array.isArray(req.files) ? req.files : [])];
  try {
    for (const file of files) {
      const detected = await fromFile(file.path);
      const bytes = fs.readFileSync(file.path);
      const textContent = bytes.toString('utf8');
      const isPlainText = !detected && file.mimetype === 'text/plain' && !bytes.includes(0) && Buffer.from(textContent, 'utf8').equals(bytes);
      const realMime = detected?.mime || (isPlainText ? 'text/plain' : undefined);
      const photoAllowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(realMime || '');
      const zipText = realMime === 'application/zip' ? bytes.toString('latin1') : '';
      const officeZip = realMime === 'application/zip' && zipText.includes('[Content_Types].xml') && (
        (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && zipText.includes('word/document.xml')) ||
        (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && zipText.includes('xl/workbook.xml'))
      );
      const evidenceAllowed = allowedEvidenceMimeTypes.has(realMime || '') || officeZip;
      if (kind === 'photo' ? !photoAllowed : !evidenceAllowed) throw new ApiError(400, 'Le type réel du fichier n’est pas autorisé');
      const extension = officeZip || isPlainText ? extensionByMime[file.mimetype] : detected?.ext;
      if (!extension) throw new ApiError(400, 'Le type réel du fichier n’est pas autorisé');
      const validatedPath = path.join(path.dirname(file.path), `${randomUUID()}.${extension}`);
      fs.renameSync(file.path, validatedPath);
      file.path = validatedPath;
      file.filename = path.basename(validatedPath);
    }
    // Point d’extension: lancer un contrôle antivirus ici avant l’enregistrement des preuves.
    next();
  } catch (error) {
    for (const file of files) if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    next(error);
  }
};

const router = Router();

router.get('/:id/photo', authenticate, authorize('criminals', 'read'), criminalController.getPhoto);

router.use(authenticate);

router.get('/search', authorize('criminals', 'read'), criminalController.searchCriminals);

router.get('/stats', authorize('criminals', 'read'), criminalController.getStats);

router.post(
  '/',
  authorize('criminals', 'create'),
  validate(createCriminalValidator),
  auditLog('CREATE', 'CRIMINAL'),
  criminalController.createCriminal,
);

router.get('/', authorize('criminals', 'read'), criminalController.getAllCriminals);

router.post(
  '/:id/export-log',
  authorize('criminals', 'read'),
  validate([
    body('format').equals('pdf').withMessage('Le format doit être pdf'),
    body('purpose').isIn(['download', 'print']).withMessage('La finalité doit être download ou print'),
  ]),
  criminalController.recordExport,
);

router.get('/:id', authorize('criminals', 'read'), criminalController.getCriminalById);

router.get('/:id/evidences', authorize('criminals', 'read'), criminalController.getEvidences);

router.get(
  '/:id/evidences/:evidenceId/files/:fileIndex',
  authorize('criminals', 'read'),
  criminalController.getEvidenceFile,
);

router.put(
  '/:id',
  authorize('criminals', 'update'),
  validate(updateCriminalValidator),
  saveOriginalData('CRIMINAL', (id: string) => criminalService.getCriminalById(id)),
  auditLog('UPDATE', 'CRIMINAL'),
  criminalController.updateCriminal,
);

router.post(
  '/:id/photo',
  authorize('criminals', 'update'),
  uploadPhoto.single('photo'),
  verifyUploadedFiles('photo'),
  auditLog('UPDATE', 'CRIMINAL'),
  criminalController.uploadPhoto,
);

router.post(
  '/:id/evidences',
  authorize('criminals', 'update'),
  uploadEvidence.array('evidenceFiles', 6),
  verifyUploadedFiles('evidence'),
  validate(createEvidenceValidator),
  auditLog('CREATE', 'EVIDENCE'),
  criminalController.addEvidence,
);

router.put(
  '/:id/evidences/:evidenceId',
  authorize('criminals', 'update'),
  validate(updateEvidenceValidator),
  saveOriginalData('EVIDENCE', (evidenceId: string) => criminalService.getEvidenceById(evidenceId), 'evidenceId'),
  auditLog('UPDATE', 'EVIDENCE'),
  criminalController.updateEvidence,
);

router.post(
  '/:id/crimes',
  authorize('criminals', 'update'),
  validate(createCrimeValidator),
  auditLog('CREATE', 'CRIME'),
  criminalController.addCrime,
);

router.delete(
  '/:id',
  authorize('criminals', 'delete'),
  saveOriginalData('CRIMINAL', (id: string) => criminalService.getCriminalById(id)),
  auditLog('DELETE', 'CRIMINAL'),
  criminalController.deleteCriminal,
);

export default router;
