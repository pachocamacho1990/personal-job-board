const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const dashboardRoutes = require('../routes/dashboard.routes');
const { pool } = require('../config/db');

// Mock db
jest.mock('../config/db', () => ({
    pool: {
        query: jest.fn(),
    }
}));

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
    verifyToken: (req, res, next) => {
        req.userId = 1;
        next();
    }
}));

const app = express();
app.use(bodyParser.json());
app.use('/api/dashboard', dashboardRoutes);

describe('Dashboard Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/dashboard/summary', () => {
        it('should return summary data', async () => {
            const mockInterviews = [{ id: 1, company: 'Tech Inc', status: 'interview' }];
            const mockNewMatches = [{ id: 2, company: 'AI Corp', is_unseen: true }];

            pool.query
                .mockResolvedValueOnce({ rows: mockInterviews }) // First query: interviews
                .mockResolvedValueOnce({ rows: mockNewMatches }); // Second query: matches

            const res = await request(app).get('/api/dashboard/summary');

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('interviews');
            expect(res.body.interviews).toEqual(mockInterviews);
            expect(res.body).toHaveProperty('newMatches');
            expect(res.body.newMatches).toEqual(mockNewMatches);
        });
    });
});
