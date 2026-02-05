const express = require('express');
const router = express.Router();
const businessController = require('../controllers/business.controller');
const verifyToken = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

router.get('/', businessController.getEntities);
router.post('/', businessController.createEntity);
router.put('/:id', businessController.updateEntity);
router.delete('/:id', businessController.deleteEntity);

// File management routes
const businessFilesController = require('../controllers/business-files.controller');
router.get('/:id/files', businessFilesController.getEntityFiles);
router.post('/:id/files', businessController.upload ? businessController.upload.single('file') : require('../middleware/upload').upload.single('file'), businessFilesController.uploadFile);
router.delete('/:id/files/:fileId', businessFilesController.deleteFile);
router.get('/:id/files/:fileId/download', businessFilesController.downloadFile);

module.exports = router;
