const express = require('express');
const router = express.Router();
const boardsController = require('../controllers/boards.controller');
const authMiddleware = require('../middleware/auth');

// All board routes require authentication
router.use(authMiddleware);

router.get('/', boardsController.getAllBoards);
router.post('/', boardsController.createBoard);
router.put('/:id', boardsController.updateBoard);
router.delete('/:id', boardsController.deleteBoard);

module.exports = router;
