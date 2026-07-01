import { Response, NextFunction } from 'express';
import { pool } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Get all jobs for authenticated user
 * GET /api/jobs
 */
export const getAllJobs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { boardId } = req.query;
        let targetBoardId: any = boardId;

        if (!targetBoardId) {
            const boardResult = await pool.query(
                'SELECT id FROM boards WHERE user_id = $1 ORDER BY id ASC LIMIT 1',
                [req.userId]
            );
            if (boardResult.rows.length > 0) {
                targetBoardId = boardResult.rows[0].id;
            } else {
                return res.json([]);
            }
        }

        const result = await pool.query(
            `SELECT id, board_id AS "boardId", type, rating, status, origin, is_unseen, is_locked, company, position, location, salary,
                    contact_name AS "contactName", organization, comments, 
                    created_at AS "created_at", updated_at AS "updated_at"
             FROM jobs 
             WHERE user_id = $1 AND board_id = $2
             ORDER BY updated_at DESC, rating DESC`,
            [req.userId, targetBoardId]
        );

        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

/**
 * Create new job
 * POST /api/jobs
 */
export const createJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const {
            type = 'job',
            rating = 3,
            status,
            origin = 'human',
            company,
            position,
            location,
            salary,
            contact_name,
            organization,
            comments,
            created_at,  // Optional: for migration imports
            updated_at,   // Optional: for migration imports
            boardId
        } = req.body;

        // Validation
        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        // Auto-set is_unseen: true for agents, false for humans
        const is_unseen = (origin === 'agent');

        let targetBoardId: any = boardId;
        if (!targetBoardId) {
            const boardResult = await pool.query(
                'SELECT id FROM boards WHERE user_id = $1 ORDER BY id ASC LIMIT 1',
                [req.userId]
            );
            if (boardResult.rows.length > 0) {
                targetBoardId = boardResult.rows[0].id;
            } else {
                return res.status(400).json({ error: 'A board is required to create a job' });
            }
        } else {
            // Verify board ownership
            const boardCheck = await pool.query(
                'SELECT id FROM boards WHERE id = $1 AND user_id = $2',
                [targetBoardId, req.userId]
            );
            if (boardCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Board not found' });
            }
        }

        const result = await pool.query(
            `INSERT INTO jobs 
             (user_id, board_id, type, rating, status, origin, is_unseen, company, position, location, salary, 
              contact_name, organization, comments, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                     COALESCE($15::timestamptz, NOW()), COALESCE($16::timestamptz, NOW()))
             RETURNING id, board_id AS "boardId", type, rating, status, origin, is_unseen, is_locked, company, position, location, salary,
                       contact_name AS "contactName", organization, comments,
                       created_at AS "created_at", updated_at AS "updated_at"`,
            [req.userId, targetBoardId, type, rating, status, origin, is_unseen, company, position, location, salary,
                contact_name, organization, comments, created_at || null, updated_at || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

/**
 * Update job
 * PUT /api/jobs/:id
 */
export const updateJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const {
            type,
            rating,
            status,
            origin,
            is_unseen, // Allow updating visibility (e.g. marking as seen)
            company,
            position,
            location,
            salary,
            contact_name,
            organization,
            comments,
            boardId
        } = req.body;

        // First, verify job belongs to user
        const checkResult = await pool.query(
            'SELECT id FROM jobs WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // If changing board, verify new board belongs to user
        if (boardId) {
            const boardCheck = await pool.query(
                'SELECT id FROM boards WHERE id = $1 AND user_id = $2',
                [boardId, req.userId]
            );
            if (boardCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Target board not found' });
            }
        }

        // Auto-mark as seen if status is updated (meaning reviewed), unless explicitly specified
        let resolvedIsUnseen = is_unseen;
        if (resolvedIsUnseen === undefined && status !== undefined) {
            resolvedIsUnseen = false;
        }

        // Update job (updated_at timestamp handled by trigger)
        const result = await pool.query(
            `UPDATE jobs 
             SET type = COALESCE($1, type),
                 rating = COALESCE($2, rating),
                 status = COALESCE($3, status),
                 origin = COALESCE($4, origin),
                 is_unseen = COALESCE($5, is_unseen),
                 company = COALESCE($6, company),
                 position = COALESCE($7, position),
                 location = COALESCE($8, location),
                 salary = COALESCE($9, salary),
                 contact_name = COALESCE($10, contact_name),
                 organization = COALESCE($11, organization),
                 comments = COALESCE($12, comments),
                 board_id = COALESCE($13, board_id)
             WHERE id = $14 AND user_id = $15
             RETURNING id, board_id AS "boardId", type, rating, status, origin, is_unseen, is_locked, company, position, location, salary,
                       contact_name AS "contactName", organization, comments,
                       created_at AS "created_at", updated_at AS "updated_at"`,
            [type, rating, status, origin, resolvedIsUnseen, company, position, location, salary,
                contact_name, organization, comments, boardId || null, id, req.userId]
        );

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

/**
 * Delete job
 * DELETE /api/jobs/:id
 */
export const deleteJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM jobs WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({ message: 'Job deleted successfully', id: result.rows[0].id });
    } catch (error) {
        next(error);
    }
};

/**
 * Get job history
 * GET /api/jobs/:id/history
 */
export const getJobHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        // Verify job belongs to user
        const checkResult = await pool.query(
            'SELECT id FROM jobs WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const result = await pool.query(
            'SELECT * FROM job_history WHERE job_id = $1 ORDER BY changed_at ASC',
            [id]
        );

        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

/**
 * Transform Job to Business Entity
 * POST /api/jobs/:id/transform
 */
export const transformJobToEntity = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        // 1. Fetch Job
        const jobResult = await client.query(
            'SELECT * FROM jobs WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );

        if (jobResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Job not found' });
        }

        const job = jobResult.rows[0];

        if (job.is_locked) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Job is already transformed/locked' });
        }

        // 2. Create Business Entity
        const notes = (job.comments || '') + `\n\n**Transformed from Job**\nPosition: ${job.position || 'N/A'}\nSalary: ${job.salary || 'N/A'}`;

        const entityResult = await client.query(
            `INSERT INTO business_entities 
            (user_id, name, type, status, contact_person, website, location, notes) 
            VALUES ($1, $2, 'connection', 'researching', $3, $4, $5, $6) 
            RETURNING id`,
            [
                req.userId,
                job.company || 'Unknown Company',
                job.contact_name,
                job.organization,
                job.location,
                notes
            ]
        );
        const newEntityId = entityResult.rows[0].id;

        // 3. Copy Files
        const filesResult = await client.query(
            'SELECT * FROM job_files WHERE job_id = $1',
            [id]
        );

        for (const file of filesResult.rows) {
            await client.query(
                `INSERT INTO business_entity_files 
                (entity_id, filename, original_name, mimetype, size) 
                VALUES ($1, $2, $3, $4, $5)`,
                [newEntityId, file.filename, file.original_name, file.mimetype, file.size]
            );
        }

        // 4. Lock Job (keep original status, do NOT archive)
        await client.query(
            `UPDATE jobs 
             SET is_locked = TRUE, updated_at = NOW() 
             WHERE id = $1`,
            [id]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Transformation successful',
            entityId: newEntityId
        });

    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

/**
 * Get single job by ID
 * GET /api/jobs/:id
 */
export const getJobById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT id, board_id AS "boardId", type, rating, status, origin, is_unseen, is_locked, company, position, location, salary,
                    contact_name AS "contactName", organization, comments,
                    created_at AS "created_at", updated_at AS "updated_at"
             FROM jobs 
             WHERE id = $1 AND user_id = $2`,
            [id, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};
