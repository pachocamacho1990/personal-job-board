const express = require('express');
const router = express.Router();
const apiKeysController = require('../controllers/apiKeys.controller');
const authMiddleware = require('../middleware/auth');

// All routes here require authentication (login session) to manage keys
router.use(authMiddleware);

router.get('/', apiKeysController.listApiKeys);
router.post('/', apiKeysController.createApiKey);
router.delete('/:id', apiKeysController.revokeApiKey);

module.exports = router;
