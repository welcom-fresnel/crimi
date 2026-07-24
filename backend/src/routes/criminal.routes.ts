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

const imageFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('Le fichier doit etre une image'));
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
  fileFilter: imageFileFilter,
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
  auditLog('UPDATE', 'CRIMINAL'),
  criminalController.addEvidence,
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
