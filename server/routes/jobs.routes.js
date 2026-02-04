const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobs.controller');
const filesController = require('../controllers/files.controller');
const authMiddleware = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// All job routes require authentication
router.use(authMiddleware);

// Job CRUD routes
router.get('/', jobsController.getAllJobs);
router.post('/', jobsController.createJob);
router.put('/:id', jobsController.updateJob);
router.delete('/:id', jobsController.deleteJob);
router.get('/:id/history', jobsController.getJobHistory);

// File attachment routes
router.get('/:id/files', filesController.getJobFiles);
router.post('/:id/files', upload.single('file'), filesController.uploadFile);
router.delete('/:id/files/:fileId', filesController.deleteFile);
router.get('/:id/files/:fileId/download', filesController.downloadFile);

module.exports = router;

