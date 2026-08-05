import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import jobsRoutes from '../routes/jobs.routes';
import { pool } from '../config/db';

// Mock middlewares
jest.mock('../middleware/auth', () => ({
    authMiddleware: (req: any, res: Response, next: NextFunction) => {
        req.userId = 1;
        next();
    }
}));

jest.mock('../config/db', () => {
    const mockQuery = jest.fn();
    const mockQueryProxy = new Proxy(mockQuery, {
        apply(target, thisArg, argumentsList) {
            const queryText = argumentsList[0];
            if (queryText && (queryText.includes('FROM boards') || queryText.includes('INSERT INTO boards') || queryText.includes('SELECT id FROM boards'))) {
                return Promise.resolve({ rows: [{ id: 1, name: 'Mi Tablero' }] });
            }
            return target.apply(thisArg, argumentsList);
        }
    });
    return {
        pool: {
            query: mockQueryProxy,
            connect: jest.fn(),
        }
    };
});

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
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: mockJobs });

            const res = await request(app).get('/api/jobs');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(mockJobs);
            // Verify query filtered by user_id and board_id
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE user_id = $1'),
                [1, 1]
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
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({
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
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({
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
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });

            const res = await request(app).delete('/api/jobs/1');

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('message', 'Job deleted successfully');
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE id = $1 AND user_id = $2'),
                ['1', 1]
            );
        });

        it('should return 404 if job not found or not owned by user', async () => {
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [] });

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
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Second query: get history
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: mockHistory });

            const res = await request(app).get('/api/jobs/1/history');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(mockHistory);
            expect(res.body).toHaveLength(2);
        });

        it('should return 404 if job does not exist', async () => {
            // Job ownership check returns empty
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/api/jobs/999/history');

            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty('error', 'Job not found');
        });

        it('should return empty array for job with no history', async () => {
            // Job ownership check passes
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // History query returns empty
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [] });

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

            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({
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
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Second query: update
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({
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

            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({
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
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Second query: update
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({
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
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Second query: update
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({
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

        it('should automatically set is_unseen to false when status is updated', async () => {
            const updateData = { status: 'applied' };

            // Reset mock history
            (pool.query as unknown as jest.Mock).mockClear();

            // First query: ownership check
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Second query: update
            (pool.query as unknown as jest.Mock).mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    status: 'applied',
                    is_unseen: false
                }]
            });

            const res = await request(app)
                .put('/api/jobs/1')
                .send(updateData);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('is_unseen', false);

            const mockCalls = (pool.query as unknown as jest.Mock).mock.calls;
            const updateQueryCall = mockCalls[1];
            const queryParams = updateQueryCall[1];
            expect(queryParams[4]).toBe(false);
        });
    });

    /**
     * The bridge to Cassimir Management Center.
     *
     * These tests used to assert on BEGIN/COMMIT/ROLLBACK, because the target
     * table lived in this database. It does not any more, and there is no
     * transaction spanning two of them. What replaces the rollback is the order
     * of operations plus idempotency, so that is what is asserted here: CMC is
     * always written first, and the job is only locked once CMC has confirmed.
     */
    describe('POST /api/jobs/:id/transform', () => {
        const OLD_ENV = { ...process.env };

        const unlockedJob = {
            id: 1,
            user_id: 1,
            company: 'Transformed Corp',
            organization: 'Transformed Corp',
            status: 'interview',
            is_locked: false,
            comments: 'Great job',
        };

        beforeEach(() => {
            process.env.CMC_API_URL = 'http://cmc.test:8080';
            process.env.CMC_INTEGRATION_TOKEN = 'test-token';
            global.fetch = jest.fn();
        });

        afterEach(() => {
            process.env = { ...OLD_ENV };
        });

        it('creates the opportunity in CMC, then locks the job', async () => {
            (pool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [unlockedJob] })  // SELECT job
                .mockResolvedValueOnce({ rows: [] })             // SELECT job_files
                .mockResolvedValueOnce({ rows: [] });            // UPDATE jobs

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ opportunity_id: 42, url: 'http://cmc.test:8080/?opportunity=42' }),
            });

            const res = await request(app).post('/api/jobs/1/transform');

            expect(res.statusCode).toBe(200);
            expect(res.body.opportunityId).toBe(42);
            expect(res.body.opportunityUrl).toBe('http://cmc.test:8080/?opportunity=42');

            // The idempotency key is what lets a retry converge instead of
            // creating a second opportunity.
            const [, init] = (global.fetch as jest.Mock).mock.calls[0];
            expect(JSON.parse(init.body).external_ref).toBe('jobboard:1');
            expect(init.headers['X-CMC-Integration-Token']).toBe('test-token');

            const updateCall = (pool.query as jest.Mock).mock.calls
                .find((c) => String(c[0]).includes('UPDATE jobs'));
            expect(updateCall[1][0]).toBe('http://cmc.test:8080/?opportunity=42');
        });

        it('returns 503 and leaves the job untouched when CMC is unreachable', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [unlockedJob] });
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));

            const res = await request(app).post('/api/jobs/1/transform');

            expect(res.statusCode).toBe(503);
            expect(res.body.error).toMatch(/unreachable/i);

            // The whole point of the degradation: nothing was written.
            const wrote = (pool.query as jest.Mock).mock.calls
                .some((c) => String(c[0]).includes('UPDATE jobs'));
            expect(wrote).toBe(false);
        });

        it('returns 503 without calling CMC when it is not configured', async () => {
            delete process.env.CMC_API_URL;

            const res = await request(app).post('/api/jobs/1/transform');

            expect(res.statusCode).toBe(503);
            expect(res.body.error).toMatch(/not configured/i);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('returns 404 if the job is not the caller\'s', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const res = await request(app).post('/api/jobs/999/transform');

            expect(res.statusCode).toBe(404);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('refuses a job that is already locked, without calling CMC again', async () => {
            (pool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [{ id: 1, is_locked: true }] });

            const res = await request(app).post('/api/jobs/1/transform');

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/already transformed/);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('surfaces a 5xx from CMC as 503 and does not lock the job', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [unlockedJob] });
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ error: 'boom' }),
            });

            const res = await request(app).post('/api/jobs/1/transform');

            expect(res.statusCode).toBe(503);
            const wrote = (pool.query as jest.Mock).mock.calls
                .some((c) => String(c[0]).includes('UPDATE jobs'));
            expect(wrote).toBe(false);
        });

        it('still locks the job when forwarding an attachment fails', async () => {
            (pool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [unlockedJob] })
                .mockResolvedValueOnce({ rows: [{ filename: 'nope.pdf', original_name: 'nope.pdf', mimetype: 'application/pdf' }] })
                .mockResolvedValueOnce({ rows: [] });

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ opportunity_id: 42, url: 'http://cmc.test:8080/?opportunity=42' }),
            });

            const res = await request(app).post('/api/jobs/1/transform');

            // The file is missing from disk and gets skipped. Failing the whole
            // request here would strand an opportunity CMC has already created.
            expect(res.statusCode).toBe(200);
            const wrote = (pool.query as jest.Mock).mock.calls
                .some((c) => String(c[0]).includes('UPDATE jobs'));
            expect(wrote).toBe(true);
        });
    });

    describe('GET /api/jobs/:id/documents', () => {
        it('should get job documents successfully', async () => {
            // Verify job ownership check query
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Select job documents query
            const mockDocs = [{ id: 1, documentType: 'cover_letter', content: 'Mock content' }];
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockDocs });

            const res = await request(app).get('/api/jobs/1/documents');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(mockDocs);
        });
    });

    describe('POST /api/jobs/:id/copilot', () => {
        it('should generate copilot document successfully', async () => {
            // Verify job ownership check query
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });

            // Mock fetch response
            const mockFetch = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ content: 'Generated cover letter text' })
            });
            const originalFetch = global.fetch;
            global.fetch = mockFetch as any;

            // Mock insert document query
            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ id: 1, documentType: 'cover_letter', content: 'Generated cover letter text' }]
            });

            const res = await request(app)
                .post('/api/jobs/1/copilot')
                .send({ documentType: 'cover_letter' });

            expect(res.statusCode).toBe(200);
            expect(res.body.content).toBe('Generated cover letter text');
            expect(mockFetch).toHaveBeenCalledWith('http://agent:8000/copilot', expect.anything());

            // Restore fetch
            global.fetch = originalFetch;
        });

        it('should return 400 for invalid documentType', async () => {
            const res = await request(app)
                .post('/api/jobs/1/copilot')
                .send({ documentType: 'invalid' });

            expect(res.statusCode).toBe(400);
        });
    });
});

