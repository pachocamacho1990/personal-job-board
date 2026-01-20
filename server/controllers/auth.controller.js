const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { jwtSecret, jwtExpiresIn, bcryptRounds } = require('../config/auth');

/**
 * User signup
 * POST /api/auth/signup
 */
const signup = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Password strength validation (min 6 characters)
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, bcryptRounds);

        // Insert user into database
        const result = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
            [email.toLowerCase(), passwordHash]
        );

        const user = result.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            jwtSecret,
            { expiresIn: jwtExpiresIn }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        // Duplicate email error
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Email already registered' });
        }
        next(error);
    }
};

/**
 * User login
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user by email
        const result = await pool.query(
            'SELECT id, email, password_hash FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last login timestamp
        await pool.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            jwtSecret,
            { expiresIn: jwtExpiresIn }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get current user info (requires auth)
 * GET /api/auth/me
 */
const getCurrentUser = async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT id, email, created_at, last_login FROM users WHERE id = $1',
            [req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    signup,
    login,
    getCurrentUser
};
