const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const businessRoutes = require('../routes/business.routes');
const { pool } = require('../config/db');

// Mock db
jest.mock('../config/db', () => ({
    pool: {
        query: jest.fn(),
    }
}));

// Mock auth middleware to skip token verification and inject user
jest.mock('../middleware/auth', () => (req, res, next) => {
    req.userId = 1;
    next();
});

const app = express();
app.use(bodyParser.json());
app.use('/api/business', businessRoutes);

// Error handler
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message });
});

describe('Business Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/business', () => {
        it('should return all entities for user', async () => {
            const mockData = [{ id: 1, name: 'Acme VC', type: 'vc' }];
            pool.query.mockResolvedValueOnce({ rows: mockData });

            const res = await request(app).get('/api/business');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(mockData);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM business_entities'),
                [1]
            );
        });

        it('should return empty array when no entities exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/api/business');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([]);
        });
    });

    describe('POST /api/business', () => {
        it('should create a new entity', async () => {
            const newEntity = {
                name: 'New Investor',
                type: 'investor',
                status: 'researching'
            };
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1, ...newEntity }] });

            const res = await request(app)
                .post('/api/business')
                .send(newEntity);

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('name', 'New Investor');
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO business_entities'),
                expect.arrayContaining([1, 'New Investor', 'investor'])
            );
        });

        it('should validate required name', async () => {
            const res = await request(app)
                .post('/api/business')
                .send({ type: 'investor' });

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error', 'Name is required');
        });

        it('should reject invalid entity type', async () => {
            const res = await request(app)
                .post('/api/business')
                .send({ name: 'Test', type: 'invalid_type' });

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error', 'Invalid type');
        });

        it('should default to connection type when not specified', async () => {
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 1, name: 'Test', type: 'connection' }]
            });

            const res = await request(app)
                .post('/api/business')
                .send({ name: 'Test' });

            expect(res.statusCode).toBe(201);
            expect(pool.query).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['connection'])
            );
        });
    });

    describe('PUT /api/business/:id', () => {
        it('should update an existing entity', async () => {
            // Mock ownership check
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Mock update
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 1, name: 'Updated Name', status: 'contacted' }]
            });

            const res = await request(app)
                .put('/api/business/1')
                .send({ name: 'Updated Name', status: 'contacted' });

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('name', 'Updated Name');
        });

        it('should return 404 if entity not found or not owned by user', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // Not found

            const res = await request(app)
                .put('/api/business/999')
                .send({ name: 'Updated' });

            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty('error', 'Entity not found');
        });
    });

    describe('DELETE /api/business/:id', () => {
        it('should delete entity', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

            const res = await request(app).delete('/api/business/1');

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('message', 'Entity deleted successfully');
        });

        it('should return 404 if entity not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app).delete('/api/business/999');

            expect(res.statusCode).toBe(404);
        });
    });
});
