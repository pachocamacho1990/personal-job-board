const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const businessRoutes = require('../routes/business.routes');
const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

// Mock database
jest.mock('../config/db', () => ({
    pool: {
        query: jest.fn(),
    }
}));

const originalFs = jest.requireActual('fs');

// Mock filesystem
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
    unlinkSync: jest.fn(),
    createReadStream: jest.fn(),
    stat: jest.fn((path, cb) => cb(null, {
        isFile: () => true,
        isDirectory: () => false,
        size: 1024,
        mtime: new Date(),
        atime: new Date(),
        ctime: new Date(),
        ino: 0
    })),
}));

// Mock authentication middleware to bypass JWT check
jest.mock('../middleware/auth', () => (req, res, next) => {
    req.userId = 1;
    req.userEmail = 'test@example.com';
    next();
});

// Mock upload middleware
jest.mock('../middleware/upload', () => {
    // Mock multer middleware to handle file upload
    return {
        upload: {
            single: () => (req, res, next) => {
                req.file = {
                    filename: 'test-business-file.pdf',
                    originalname: 'test-business-original.pdf',
                    mimetype: 'application/pdf',
                    size: 1024
                };
                next();
            }
        },
        UPLOADS_DIR: '/mock/uploads/dir'
    };
});

const app = express();
app.use(bodyParser.json());
app.use('/api/business', businessRoutes);

// Error handler
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message });
});

describe('Business File Attachment Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/business/:id/files', () => {
        it('should get all files for a business entity', async () => {
            // Mock entity check
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Mock list files
            pool.query.mockResolvedValueOnce({
                rows: [
                    { id: 1, filename: 'test.pdf', originalName: 'test.pdf', mimetype: 'application/pdf', size: 1024 }
                ]
            });

            const res = await request(app).get('/api/business/1/files');

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].filename).toBe('test.pdf');
        });

        it('should return 404 if entity not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // Entity check failed

            const res = await request(app).get('/api/business/999/files');

            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty('error', 'Business entity not found');
        });
    });

    describe('POST /api/business/:id/files', () => {
        it('should upload a file successfully', async () => {
            // Mock entity check
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Mock insert file
            pool.query.mockResolvedValueOnce({
                rows: [
                    { id: 100, filename: 'test-business-file.pdf', originalName: 'test-business-original.pdf', mimetype: 'application/pdf', size: 1024 }
                ]
            });

            const res = await request(app)
                .post('/api/business/1/files')
                .attach('file', Buffer.from('dummy'), 'test.pdf');

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('id', 100);
            expect(res.body).toHaveProperty('originalName', 'test-business-original.pdf');
        });

        it('should return 404 if entity not found during upload', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // Entity check failed

            const res = await request(app)
                .post('/api/business/999/files');

            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty('error', 'Business entity not found');
        });
    });

    describe('DELETE /api/business/:id/files/:fileId', () => {
        it('should delete a file successfully', async () => {
            // Mock file check (entity check included in query)
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 100, filename: 'test-business-file.pdf' }]
            });
            // Mock delete query
            pool.query.mockResolvedValueOnce({});
            // Mock FS exists
            fs.existsSync.mockReturnValue(true);

            const res = await request(app).delete('/api/business/1/files/100');

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('message', 'File deleted successfully');
            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        it('should return 404 if file not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // File check failed

            const res = await request(app).delete('/api/business/1/files/999');

            expect(res.statusCode).toBe(404);
            expect(fs.unlinkSync).not.toHaveBeenCalled();
        });
    });

    describe('GET /api/business/:id/files/:fileId/download', () => {
        it('should support preview mode with inline disposition', async () => {
            // Mock file check
            pool.query.mockResolvedValueOnce({
                rows: [{ filename: 'test-business-file.pdf', original_name: 'test.pdf', mimetype: 'application/pdf' }]
            });
            fs.existsSync.mockReturnValue(true);
            fs.createReadStream.mockReturnValue(Readable.from(['dummy content']));

            const res = await request(app).get('/api/business/1/files/100/download?preview=true');

            expect(res.statusCode).toBe(200);
            expect(res.headers['content-disposition']).toContain('inline');
        });

        it('should return 404 if file does not exist on disk', async () => {
            // Mock file check
            pool.query.mockResolvedValueOnce({
                rows: [{ filename: 'test-business-file.pdf', original_name: 'test.pdf', mimetype: 'application/pdf' }]
            });
            fs.existsSync.mockReturnValue(false);

            const res = await request(app).get('/api/business/1/files/100/download');

            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty('error', 'File not found on disk');
        });
    });
});
