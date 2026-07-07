import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getProfile, saveProfile } from '../controllers/profile.controller';

const router = Router();

// GET /api/profile - Fetch current user's professional profile
router.get('/', authMiddleware, getProfile);

// POST /api/profile - Save professional profile and trigger interview flow
router.post('/', authMiddleware, saveProfile);

export default router;
