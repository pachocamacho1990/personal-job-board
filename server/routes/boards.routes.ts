import express from 'express';
import * as boardsController from '../controllers/boards.controller';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// All board routes require authentication
router.use(authMiddleware);

router.get('/', boardsController.getAllBoards);
router.post('/', boardsController.createBoard);
router.put('/:id', boardsController.updateBoard);
router.delete('/:id', boardsController.deleteBoard);

export default router;
