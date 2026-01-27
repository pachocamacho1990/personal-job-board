const { pool } = require('../config/db');

/**
 * Get all business entities for the logged-in user
 * GET /api/business
 */
const getEntities = async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT * FROM business_entities WHERE user_id = $1 ORDER BY updated_at DESC',
            [req.userId]
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new business entity
 * POST /api/business
 */
const createEntity = async (req, res, next) => {
    try {
        const { name, type, status, contact_person, email, website, location, notes } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const validTypes = ['investor', 'vc', 'accelerator', 'connection'];
        if (type && !validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid type' });
        }

        const result = await pool.query(
            `INSERT INTO business_entities 
            (user_id, name, type, status, contact_person, email, website, location, notes) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING *`,
            [req.userId, name, type || 'connection', status || 'researching', contact_person, email, website, location, notes]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

/**
 * Update a business entity
 * PUT /api/business/:id
 */
const updateEntity = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, type, status, contact_person, email, website, location, notes } = req.body;

        // Check ownership
        const check = await pool.query(
            'SELECT id FROM business_entities WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );

        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Entity not found' });
        }

        const result = await pool.query(
            `UPDATE business_entities 
            SET name = COALESCE($1, name),
                type = COALESCE($2, type),
                status = COALESCE($3, status),
                contact_person = COALESCE($4, contact_person),
                email = COALESCE($5, email),
                website = COALESCE($6, website),
                location = COALESCE($7, location),
                notes = COALESCE($8, notes)
            WHERE id = $9 AND user_id = $10
            RETURNING *`,
            [name, type, status, contact_person, email, website, location, notes, id, req.userId]
        );

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a business entity
 * DELETE /api/business/:id
 */
const deleteEntity = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM business_entities WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Entity not found' });
        }

        res.json({ message: 'Entity deleted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getEntities,
    createEntity,
    updateEntity,
    deleteEntity
};
