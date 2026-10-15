/**
 * Routes de gestion des criminels
 */

import { Router } from 'express';
import { criminalController } from '../controllers/criminal.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditLog, saveOriginalData } from '../middlewares/audit.middleware';
import { validate } from '../middlewares/validation.middleware';
import { createCriminalValidator, updateCriminalValidator, createCrimeValidator } from '../validators/criminal.validator';
import { criminalService } from '../services/criminal.service';
import multer from 'multer';
import path from 'path';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const photosPath = path.resolve(process.cwd(), 'uploads', 'photos');
const evidencesPath = path.resolve(process.cwd(), 'uploads', 'evidences');

const createStorage = (destination: string) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => {
      const originalName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
      const unique = `${Date.now()}-${originalName}`;
      cb(null, unique);
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

const router = Router();

router.use(authenticate);

router.get('/search', authorize('criminals', 'read'), criminalController.searchCriminals);

router.post(
  '/',
  authorize('criminals', 'create'),
  validate(createCriminalValidator),
  auditLog('CREATE', 'CRIMINAL'),
  criminalController.createCriminal,
);

router.get('/', authorize('criminals', 'read'), criminalController.getAllCriminals);

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
  auditLog('UPDATE', 'CRIMINAL'),
  criminalController.uploadPhoto,
);

router.post(
  '/:id/evidences',
  authorize('criminals', 'update'),
  uploadEvidence.array('evidenceFiles', 6),
  auditLog('CREATE', 'EVIDENCE'),
  criminalController.addEvidence,
);

router.put(
  '/:id/evidences/:evidenceId',
  authorize('criminals', 'update'),
  saveOriginalData('EVIDENCE', (evidenceId: string) => criminalService.getEvidenceById(evidenceId)),
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
