const express = require('express');
const router = express.Router();
const businessController = require('../controllers/business.controller');
const businessFilesController = require('../controllers/business-files.controller');
const verifyToken = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// All routes require authentication
router.use(verifyToken);

router.get('/', businessController.getEntities);
router.post('/', businessController.createEntity);
router.put('/:id', businessController.updateEntity);
router.delete('/:id', businessController.deleteEntity);

// File management routes
router.get('/:id/files', businessFilesController.getEntityFiles);
router.post('/:id/files', upload.single('file'), businessFilesController.uploadFile);
router.delete('/:id/files/:fileId', businessFilesController.deleteFile);
router.get('/:id/files/:fileId/download', businessFilesController.downloadFile);

module.exports = router;
