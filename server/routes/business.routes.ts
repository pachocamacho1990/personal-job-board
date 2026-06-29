import express from 'express';
import * as businessController from '../controllers/business.controller';
import * as businessFilesController from '../controllers/business-files.controller';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', businessController.getEntities);
router.post('/', businessController.createEntity);
router.put('/:id', businessController.updateEntity);
router.delete('/:id', businessController.deleteEntity);

// File management routes
router.get('/:id/files', businessFilesController.getEntityFiles);
router.post('/:id/files', upload.single('file'), businessFilesController.uploadFile);
router.delete('/:id/files/:fileId', businessFilesController.deleteFile);
router.get('/:id/files/:fileId/download', businessFilesController.downloadFile);

export default router;
