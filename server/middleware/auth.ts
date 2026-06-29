import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/auth';

export interface AuthenticatedRequest extends Request {
    userId?: number;
    userEmail?: string;
}

/**
 * JWT verification middleware
 * Protects routes by requiring valid JWT token in Authorization header
 * Also accepts token from query parameter (for embed/img tags that can't send headers)
 */
export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        let token: string | null = null;

        // First, try Authorization header (format: "Bearer <token>")
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }

        // Fallback: check query parameter (for embed/img tags)
        if (!token && req.query.token) {
            token = req.query.token as string;
        }

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Verify token
        const decoded = jwt.verify(token, jwtSecret) as { userId: number; email: string };

        // Attach user ID to request object
        req.userId = decoded.userId;
        req.userEmail = decoded.email;

        next();
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        return res.status(500).json({ error: 'Authentication error' });
    }
};
