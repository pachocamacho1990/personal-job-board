const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const jobsRoutes = require('../routes/jobs.routes');
const { pool } = require('../config/db');

// Mock middlewares
jest.mock('../middleware/auth', () => (req, res, next) => {
    req.userId = 1;
    next();
});

jest.mock('../config/db', () => ({
    pool: {
        query: jest.fn(),
    }
}));

const app = express();
app.use(bodyParser.json());
app.use('/api/jobs', jobsRoutes);

describe('Jobs Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/jobs', () => {
        it('should return all jobs for authenticated user', async () => {
            const mockJobs = [
                { id: 1, position: 'Developer', company: 'Tech Co', type: 'job' }
            ];
            pool.query.mockResolvedValueOnce({ rows: mockJobs });

            const res = await request(app).get('/api/jobs');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(mockJobs);
            // Verify query filtered by user_id
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE user_id = $1'),
                [1]
            );
        });
    });

    describe('POST /api/jobs', () => {
        it('should create a new job', async () => {
            const newJob = {
                status: 'interested',
                company: 'Tech Co',
                position: 'Developer',
                type: 'job'
            };

            pool.query.mockResolvedValueOnce({ rows: [{ ...newJob, id: 1, user_id: 1 }] });

            const res = await request(app)
                .post('/api/jobs')
                .send(newJob);

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO jobs'),
                expect.any(Array)
            );
        });

        it('should return 400 if status is missing', async () => {
            const res = await request(app)
                .post('/api/jobs')
                .send({ company: 'Tech Co' });

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error', 'Status is required');
        });
    });

    describe('DELETE /api/jobs/:id', () => {
        it('should delete existing job owned by user', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

            const res = await request(app).delete('/api/jobs/1');

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('message', 'Job deleted successfully');
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE id = $1 AND user_id = $2'),
                ['1', 1]
            );
        });

        it('should return 404 if job not found or not owned by user', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app).delete('/api/jobs/999');

            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty('error', 'Job not found');
        });
    });
});
