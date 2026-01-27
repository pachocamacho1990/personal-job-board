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
jest.mock('../middleware/auth', () => (req, res, next) => {
    req.userId = 1;
    next();
});

const app = express();
app.use(bodyParser.json());
app.use('/api/dashboard', dashboardRoutes);

// Error handler
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message });
});

describe('Dashboard Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/dashboard/summary', () => {
        it('should return summary data with interviews and new matches', async () => {
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

        it('should return empty arrays when no data exists', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/api/dashboard/summary');

            expect(res.statusCode).toBe(200);
            expect(res.body.interviews).toEqual([]);
            expect(res.body.newMatches).toEqual([]);
        });

        it('should filter interviews by status', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await request(app).get('/api/dashboard/summary');

            // First query should filter for interview status
            expect(pool.query).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('interview'),
                expect.any(Array)
            );
        });

        it('should filter new matches by origin=agent and is_unseen=true', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await request(app).get('/api/dashboard/summary');

            // Second query should filter for agent origin and unseen
            expect(pool.query).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining('agent'),
                expect.any(Array)
            );
        });

        it('should handle database errors gracefully', async () => {
            pool.query.mockRejectedValueOnce(new Error('Database connection failed'));

            const res = await request(app).get('/api/dashboard/summary');

            expect(res.statusCode).toBe(500);
        });
    });
});
