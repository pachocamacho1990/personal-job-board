const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth');

// Rate limiter for auth routes (prevent brute force attacks)
// Only counts failed attempts (4xx/5xx responses)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Max 15 failed attempts per window
    message: { error: 'Too many failed attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    // Only count failed requests (4xx and 5xx status codes)
    skipSuccessfulRequests: true,
});

// Public routes
router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);

// Protected routes (require authentication)
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;
