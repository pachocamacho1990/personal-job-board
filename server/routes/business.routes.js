const express = require('express');
const router = express.Router();
const businessController = require('../controllers/business.controller');
const { verifyToken } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

router.get('/', businessController.getEntities);
router.post('/', businessController.createEntity);
router.put('/:id', businessController.updateEntity);
router.delete('/:id', businessController.deleteEntity);

module.exports = router;
