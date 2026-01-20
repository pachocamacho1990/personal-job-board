const { pool } = require('../config/db');

/**
 * Get all jobs for authenticated user
 * GET /api/jobs
 */
const getAllJobs = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT id, type, rating, status, company, position, location, salary,
                    contact_name, organization, comments, created_at, updated_at
             FROM jobs 
             WHERE user_id = $1 
             ORDER BY updated_at DESC`,
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
            company,
            position,
            location,
            salary,
            contact_name,
            organization,
            comments
        } = req.body;

        // Validation
        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const result = await pool.query(
            `INSERT INTO jobs 
             (user_id, type, rating, status, company, position, location, salary, 
              contact_name, organization, comments)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [req.userId, type, rating, status, company, position, location, salary,
                contact_name, organization, comments]
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
                 company = COALESCE($4, company),
                 position = COALESCE($5, position),
                 location = COALESCE($6, location),
                 salary = COALESCE($7, salary),
                 contact_name = COALESCE($8, contact_name),
                 organization = COALESCE($9, organization),
                 comments = COALESCE($10, comments)
             WHERE id = $11 AND user_id = $12
             RETURNING *`,
            [type, rating, status, company, position, location, salary,
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

module.exports = {
    getAllJobs,
    createJob,
    updateJob,
    deleteJob
};
