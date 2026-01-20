const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth');

// Rate limiter for auth routes (prevent brute force attacks)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Max 5 requests per window
    message: { error: 'Too many attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Public routes
router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);

// Protected routes (require authentication)
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;
