import express from 'express';
import * as jobsController from '../controllers/jobs.controller';
import * as filesController from '../controllers/files.controller';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = express.Router();

// All job routes require authentication
router.use(authMiddleware);

// Job CRUD routes
router.get('/', jobsController.getAllJobs);
router.post('/', jobsController.createJob);
router.get('/:id', jobsController.getJobById);
router.put('/:id', jobsController.updateJob);
router.delete('/:id', jobsController.deleteJob);
router.get('/:id/history', jobsController.getJobHistory);
router.post('/:id/transform', jobsController.transformJobToEntity);

// File attachment routes
router.get('/:id/files', filesController.getJobFiles);
router.post('/:id/files', upload.single('file'), filesController.uploadFile);
router.delete('/:id/files/:fileId', filesController.deleteFile);
router.get('/:id/files/:fileId/download', filesController.downloadFile);

export default router;
