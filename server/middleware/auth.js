const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');

/**
 * JWT verification middleware
 * Protects routes by requiring valid JWT token in Authorization header
 * Also accepts token from query parameter (for embed/img tags that can't send headers)
 */
const authMiddleware = (req, res, next) => {
    try {
        let token = null;

        // First, try Authorization header (format: "Bearer <token>")
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }

        // Fallback: check query parameter (for embed/img tags)
        if (!token && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Verify token
        const decoded = jwt.verify(token, jwtSecret);

        // Attach user ID to request object
        req.userId = decoded.userId;
        req.userEmail = decoded.email;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        return res.status(500).json({ error: 'Authentication error' });
    }
};

module.exports = authMiddleware;

