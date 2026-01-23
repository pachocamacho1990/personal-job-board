const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('../routes/auth.routes');
const { pool } = require('../config/db');

// Mock specific database responses
jest.mock('../config/db', () => ({
    pool: {
        query: jest.fn(),
    }
}));

// Mock bcrypt to avoid hashing time in tests
jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('hashed_password'),
    compare: jest.fn().mockResolvedValue(true)
}));

// Mock JWT
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('mock_token'),
    verify: jest.fn().mockReturnValue({ userId: 1, email: 'test@example.com' })
}));

const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRoutes);

// Error handler middleware
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message });
});

describe('Auth Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/signup', () => {
        it('should create a new user successfully', async () => {
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 1, email: 'test@example.com', created_at: new Date() }]
            });

            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toHaveProperty('email', 'test@example.com');
        });

        it('should return 400 for invalid email', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    email: 'invalid-email',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error', 'Invalid email format');
        });

        it('should return 400 for short password', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    email: 'test@example.com',
                    password: '123'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error', 'Password must be at least 6 characters');
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login successfully', async () => {
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 1, email: 'test@example.com', password_hash: 'hashed_password' }]
            });
            pool.query.mockResolvedValueOnce({}); // Update last login

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('token');
        });

        it('should return 401 for non-existent user', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body).toHaveProperty('error', 'Invalid email or password');
        });
    });
});
