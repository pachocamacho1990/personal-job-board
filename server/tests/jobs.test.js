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

    describe('GET /api/jobs/:id/history', () => {
        it('should return history for a valid job', async () => {
            const mockHistory = [
                { id: 1, job_id: 1, previous_status: null, new_status: 'interested', changed_at: '2026-01-01T00:00:00Z' },
                { id: 2, job_id: 1, previous_status: 'interested', new_status: 'applied', changed_at: '2026-01-02T00:00:00Z' }
            ];

            // First query: check job ownership
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Second query: get history
            pool.query.mockResolvedValueOnce({ rows: mockHistory });

            const res = await request(app).get('/api/jobs/1/history');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(mockHistory);
            expect(res.body).toHaveLength(2);
        });

        it('should return 404 if job does not exist', async () => {
            // Job ownership check returns empty
            pool.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/api/jobs/999/history');

            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty('error', 'Job not found');
        });

        it('should return empty array for job with no history', async () => {
            // Job ownership check passes
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // History query returns empty
            pool.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/api/jobs/1/history');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([]);
        });
    });

    describe('Pending Status Support', () => {
        it('should create a job with pending status', async () => {
            const pendingJob = {
                status: 'pending',
                company: 'Waiting Corp',
                position: 'On Hold'
            };

            pool.query.mockResolvedValueOnce({
                rows: [{
                    ...pendingJob,
                    id: 10,
                    user_id: 1,
                    origin: 'human',
                    is_unseen: false
                }]
            });

            const res = await request(app)
                .post('/api/jobs')
                .send(pendingJob);

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('status', 'pending');
        });

        it('should update a job to pending status', async () => {
            const updateData = { status: 'pending' };

            // First query: ownership check
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Second query: update
            pool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    status: 'pending',
                    company: 'Test Corp',
                    position: 'Tester'
                }]
            });

            const res = await request(app)
                .put('/api/jobs/1')
                .send(updateData);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('status', 'pending');
        });
    });
    describe('Archive Feature Support', () => {
        it('should create a job with archived status', async () => {
            const archivedJob = {
                status: 'archived',
                company: 'Old Corp',
                position: 'Past Role'
            };

            pool.query.mockResolvedValueOnce({
                rows: [{
                    ...archivedJob,
                    id: 11,
                    user_id: 1,
                    origin: 'human',
                    is_unseen: false
                }]
            });

            const res = await request(app)
                .post('/api/jobs')
                .send(archivedJob);

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('status', 'archived');
        });

        it('should update a job to archived status', async () => {
            const updateData = { status: 'archived' };

            // First query: ownership check
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Second query: update
            pool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    status: 'archived',
                    company: 'Test Corp',
                    position: 'Tester'
                }]
            });

            const res = await request(app)
                .put('/api/jobs/1')
                .send(updateData);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('status', 'archived');
        });

        it('should restore an archived job', async () => {
            const updateData = { status: 'interested' };

            // First query: ownership check
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Second query: update
            pool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    status: 'interested',
                    company: 'Test Corp',
                    position: 'Tester'
                }]
            });

            const res = await request(app)
                .put('/api/jobs/1')
                .send(updateData);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('status', 'interested');
        });
    });
    describe('POST /api/jobs/:id/transform', () => {
        let mockClient;

        beforeEach(() => {
            mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };
            pool.connect = jest.fn().mockResolvedValue(mockClient);
        });

        it('should transform a job successfully (Transaction)', async () => {
            // Mock Data
            const jobData = {
                id: 1,
                user_id: 1,
                company: 'Transformed Corp',
                status: 'interview',
                is_locked: false,
                comments: 'Great job'
            };
            const filesData = [{ filename: 'resume.pdf', original_name: 'resume.pdf' }];

            // Mock Query Sequence
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [jobData] }) // SELECT job
                .mockResolvedValueOnce({ rows: [{ id: 100 }] }) // INSERT entity
                .mockResolvedValueOnce({ rows: filesData }) // SELECT files
                .mockResolvedValueOnce({}) // INSERT file 1
                .mockResolvedValueOnce({}) // UPDATE job
                .mockResolvedValueOnce({}); // COMMIT

            const res = await request(app).post('/api/jobs/1/transform');

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('entityId', 100);

            // Verify Transaction Flow
            expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE jobs'), expect.anything());
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should return 404 if job not found', async () => {
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [] }) // SELECT job (empty)
                .mockResolvedValueOnce({}); // ROLLBACK

            const res = await request(app).post('/api/jobs/999/transform');

            expect(res.statusCode).toBe(404);
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should return 400 if job is already locked', async () => {
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [{ id: 1, is_locked: true }] }) // SELECT job
                .mockResolvedValueOnce({}); // ROLLBACK

            const res = await request(app).post('/api/jobs/1/transform');

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/already transformed/);
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should rollback transaction on error', async () => {
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockRejectedValueOnce(new Error('Database error')); // SELECT fails

            const res = await request(app).post('/api/jobs/1/transform');

            expect(res.statusCode).toBe(500); // Or whatever global error handler returns
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });
});
