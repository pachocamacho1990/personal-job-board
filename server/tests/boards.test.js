const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const boardsRoutes = require('../routes/boards.routes');
const { pool } = require('../config/db');

// Mock specific database responses
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
app.use('/api/boards', boardsRoutes);

// Error handler middleware
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message });
});

describe('Boards Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/boards', () => {
        it('should return all boards for authenticated user with counts', async () => {
            const mockBoards = [
                { id: 1, name: 'Mi Tablero', jobCount: 5 }
            ];
            pool.query.mockResolvedValueOnce({ rows: mockBoards });

            const res = await request(app).get('/api/boards');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(mockBoards);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE b.user_id = $1'),
                [1]
            );
        });
    });

    describe('POST /api/boards', () => {
        it('should create a new board successfully', async () => {
            const boardData = { name: 'New Board' };
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 2, name: 'New Board', createdAt: new Date(), updatedAt: new Date() }]
            });

            const res = await request(app)
                .post('/api/boards')
                .send(boardData);

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('id', 2);
            expect(res.body).toHaveProperty('name', 'New Board');
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO boards'),
                [1, 'New Board']
            );
        });

        it('should return 400 if name is missing', async () => {
            const res = await request(app)
                .post('/api/boards')
                .send({});

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error', 'Board name is required');
        });
    });

    describe('PUT /api/boards/:id', () => {
        it('should update board successfully', async () => {
            const updateData = { name: 'Updated Board' };
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 1, name: 'Updated Board' }]
            });

            const res = await request(app)
                .put('/api/boards/1')
                .send(updateData);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('name', 'Updated Board');
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE boards'),
                ['Updated Board', '1', 1]
            );
        });

        it('should return 404 if board not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .put('/api/boards/999')
                .send({ name: 'Updated Board' });

            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty('error', 'Board not found');
        });
    });

    describe('DELETE /api/boards/:id', () => {
        it('should delete board successfully if not the last one', async () => {
            // Mock count query -> returns 2 boards
            pool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
            // Mock delete query -> success
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

            const res = await request(app).delete('/api/boards/1');

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('message', 'Board deleted successfully');
        });

        it('should return 400 if trying to delete the last remaining board', async () => {
            // Mock count query -> returns 1 board
            pool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

            const res = await request(app).delete('/api/boards/1');

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error', 'Cannot delete your last remaining board.');
        });
    });
});
