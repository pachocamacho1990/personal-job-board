import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import profileRoutes from '../routes/profile.routes';
import { pool } from '../config/db';

// Mock specific database responses
jest.mock('../config/db', () => ({
    pool: {
        query: jest.fn(),
    }
}));

// Mock JWT validation
jest.mock('jsonwebtoken', () => ({
    verify: jest.fn().mockReturnValue({ userId: 1, email: 'test@example.com' })
}));

const app = express();
app.use(bodyParser.json());
app.use('/api/profile', profileRoutes);

// Error handler middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    res.status(err.status || 500).json({ error: err.message });
});

describe('Profile Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/profile', () => {
        it('should return existing profile', async () => {
            const mockProfile = {
                full_name: 'Francisco Camacho',
                headline: 'Architect'
            };
            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ profile_data: mockProfile, onboarding_status: 'interview_pending' }]
            });

            const res = await request(app)
                .get('/api/profile')
                .set('Authorization', 'Bearer mock_token');

            expect(res.statusCode).toBe(200);
            expect(res.body.profile_data).toEqual(mockProfile);
            expect(res.body.onboarding_status).toBe('interview_pending');
        });

        it('should initialize profile if none exists', async () => {
            // First select returns empty rows
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
            // Second insert query returns successfully
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .get('/api/profile')
                .set('Authorization', 'Bearer mock_token');

            expect(res.statusCode).toBe(200);
            expect(res.body.profile_data).toEqual({});
            expect(res.body.onboarding_status).toBe('uninitialized');
            expect(pool.query).toHaveBeenCalledTimes(2);
        });
    });

    describe('POST /api/profile', () => {
        it('should save profile and transition status', async () => {
            const profileData = {
                full_name: 'Francisco Camacho',
                headline: 'Architect'
            };

            // Existing profile check
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ user_id: 1 }] });
            // Update query
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/api/profile')
                .set('Authorization', 'Bearer mock_token')
                .send({ profile_data: profileData });

            expect(res.statusCode).toBe(200);
            expect(res.body.onboarding_status).toBe('interview_pending');
            expect(res.body.profile_data).toEqual(profileData);
        });

        it('should return 400 if full_name is missing', async () => {
            const res = await request(app)
                .post('/api/profile')
                .set('Authorization', 'Bearer mock_token')
                .send({ profile_data: { headline: 'Architect' } });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('full_name is required');
        });
    });
});
