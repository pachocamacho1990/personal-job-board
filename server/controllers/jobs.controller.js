const { pool } = require('../config/db');

/**
 * Get all jobs for authenticated user
 * GET /api/jobs
 */
const getAllJobs = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT id, type, rating, status, origin, is_unseen, is_locked, company, position, location, salary,
                    contact_name AS "contactName", organization, comments, 
                    created_at AS "created_at", updated_at AS "updated_at"
             FROM jobs 
             WHERE user_id = $1 
             ORDER BY updated_at DESC, rating DESC`,
            [req.userId]
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
const createJob = async (req, res, next) => {
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
            updated_at   // Optional: for migration imports
        } = req.body;

        // Validation
        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        // Auto-set is_unseen: true for agents, false for humans
        const is_unseen = (origin === 'agent');

        const result = await pool.query(
            `INSERT INTO jobs 
             (user_id, type, rating, status, origin, is_unseen, company, position, location, salary, 
              contact_name, organization, comments, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                     COALESCE($14::timestamptz, NOW()), COALESCE($15::timestamptz, NOW()))
             RETURNING id, type, rating, status, origin, is_unseen, is_locked, company, position, location, salary,
                       contact_name AS "contactName", organization, comments,
                       created_at AS "created_at", updated_at AS "updated_at"`,
            [req.userId, type, rating, status, origin, is_unseen, company, position, location, salary,
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
const updateJob = async (req, res, next) => {
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
            comments
        } = req.body;

        // First, verify job belongs to user
        const checkResult = await pool.query(
            'SELECT id FROM jobs WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
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
                 comments = COALESCE($12, comments)
             WHERE id = $13 AND user_id = $14
             RETURNING id, type, rating, status, origin, is_unseen, is_locked, company, position, location, salary,
                       contact_name AS "contactName", organization, comments,
                       created_at AS "created_at", updated_at AS "updated_at"`,
            [type, rating, status, origin, is_unseen, company, position, location, salary,
                contact_name, organization, comments, id, req.userId]
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
const deleteJob = async (req, res, next) => {
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
const getJobHistory = async (req, res, next) => {
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
const transformJobToEntity = async (req, res, next) => {
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

module.exports = {
    getAllJobs,
    createJob,
    updateJob,
    deleteJob,
    getJobHistory,
    transformJobToEntity
};
