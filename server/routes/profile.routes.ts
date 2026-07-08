import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getProfile, saveProfile, getUserMemories, deleteUserMemory, updateSearchPrompt } from '../controllers/profile.controller';

const router = Router();

// GET /api/profile - Fetch current user's professional profile
router.get('/', authMiddleware, getProfile);

// POST /api/profile - Save professional profile and trigger interview flow
router.post('/', authMiddleware, saveProfile);

// GET /api/profile/memories - Fetch user's learned agent preferences/memories
router.get('/memories', authMiddleware, getUserMemories);

// DELETE /api/profile/memories/:id - Delete a specific preference/memory
router.delete('/memories/:id', authMiddleware, deleteUserMemory);

// PUT /api/profile/search-prompt - Update user's custom search prompt
router.put('/search-prompt', authMiddleware, updateSearchPrompt);


export default router;

