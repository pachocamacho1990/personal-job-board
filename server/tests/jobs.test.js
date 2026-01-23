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
        it('should create a new job (Default: Human creation)', async () => {
            const newJob = {
                status: 'interested',
                company: 'Tech Co',
                position: 'Developer'
            };

            // Mock DB response
            pool.query.mockResolvedValueOnce({
                rows: [{
                    ...newJob,
                    id: 1,
                    user_id: 1,
                    origin: 'human',
                    is_unseen: false
                }]
            });

            const res = await request(app)
                .post('/api/jobs')
                .send(newJob);

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('origin', 'human');
            expect(res.body).toHaveProperty('is_unseen', false);

            // Verify Logic: origin defaults to human, is_unseen defaults to false
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO jobs'),
                expect.arrayContaining(['human', false]) // origin, is_unseen
            );
        });

        it('should create an Agent job as Unseen (Shine Effect)', async () => {
            const agentJob = {
                status: 'interested',
                company: 'AI Corp',
                position: 'Bot',
                origin: 'agent'
            };

            // Mock DB response
            pool.query.mockResolvedValueOnce({
                rows: [{
                    ...agentJob,
                    id: 2,
                    user_id: 1,
                    is_unseen: true
                }]
            });

            const res = await request(app)
                .post('/api/jobs')
                .send(agentJob);

            expect(res.statusCode).toBe(201);

            // Verify Logic: origin='agent' MUST trigger is_unseen=true
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO jobs'),
                expect.arrayContaining(['agent', true]) // origin, is_unseen
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
