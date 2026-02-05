const { pool } = require('../config/db');
const path = require('path');
const fs = require('fs');
const { UPLOADS_DIR } = require('../middleware/upload');

/**
 * Get all files for a business entity
 * GET /api/business/:id/files
 */
const getEntityFiles = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify entity belongs to user
        const entityCheck = await pool.query(
            'SELECT id FROM business_entities WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );

        if (entityCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Business entity not found' });
        }

        const result = await pool.query(
            `SELECT id, filename, original_name AS "originalName", mimetype, size, created_at AS "createdAt"
             FROM business_entity_files 
             WHERE entity_id = $1 
             ORDER BY created_at DESC`,
            [id]
        );

        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

/**
 * Upload a file to a business entity
 * POST /api/business/:id/files
 */
const uploadFile = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify entity belongs to user
        const entityCheck = await pool.query(
            'SELECT id FROM business_entities WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );

        if (entityCheck.rows.length === 0) {
            // Clean up uploaded file if entity not found
            if (req.file) {
                fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename));
            }
            return res.status(404).json({ error: 'Business entity not found' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Save file metadata to database
        const result = await pool.query(
            `INSERT INTO business_entity_files (entity_id, filename, original_name, mimetype, size)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, filename, original_name AS "originalName", mimetype, size, created_at AS "createdAt"`,
            [id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        // Clean up file on error
        if (req.file) {
            try {
                fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename));
            } catch (cleanupErr) {
                console.error('Failed to clean up file:', cleanupErr);
            }
        }
        next(error);
    }
};

/**
 * Delete a file
 * DELETE /api/business/:entityId/files/:fileId
 */
const deleteFile = async (req, res, next) => {
    try {
        const { id: entityId, fileId } = req.params;

        // Verify entity belongs to user and file exists
        const fileCheck = await pool.query(
            `SELECT bef.id, bef.filename 
             FROM business_entity_files bef
             JOIN business_entities be ON bef.entity_id = be.id
             WHERE bef.id = $1 AND bef.entity_id = $2 AND be.user_id = $3`,
            [fileId, entityId, req.userId]
        );

        if (fileCheck.rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const filename = fileCheck.rows[0].filename;

        // Delete from database
        await pool.query('DELETE FROM business_entity_files WHERE id = $1', [fileId]);

        // Delete physical file
        const filePath = path.join(UPLOADS_DIR, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ message: 'File deleted successfully', id: parseInt(fileId) });
    } catch (error) {
        next(error);
    }
};

/**
 * Serve/download a file
 * GET /api/business/:entityId/files/:fileId/download
 */
const downloadFile = async (req, res, next) => {
    try {
        const { id: entityId, fileId } = req.params;

        // Verify entity belongs to user and file exists
        const fileCheck = await pool.query(
            `SELECT bef.filename, bef.original_name, bef.mimetype
             FROM business_entity_files bef
             JOIN business_entities be ON bef.entity_id = be.id
             WHERE bef.id = $1 AND bef.entity_id = $2 AND be.user_id = $3`,
            [fileId, entityId, req.userId]
        );

        if (fileCheck.rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const { filename, original_name, mimetype } = fileCheck.rows[0];
        const filePath = path.join(UPLOADS_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }

        // Sanitize filename for maximum browser compatibility (replace spaces/symbols with underscores)
        const sanitizedFilename = original_name.replace(/[^a-zA-Z0-9.\-_]/g, '_');

        // Use 'inline' if explicitly requested for preview
        if (req.query.preview === 'true') {
            res.setHeader('Content-Type', mimetype);
            res.setHeader('Content-Disposition', `inline; filename="${sanitizedFilename}"`);
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        } else {
            // Use Express res.download but override filename with sanitized version
            res.download(filePath, sanitizedFilename, (err) => {
                if (err) {
                    // Only handle error if headers haven't been sent
                    if (!res.headersSent) {
                        next(err);
                    }
                }
            });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getEntityFiles,
    uploadFile,
    deleteFile,
    downloadFile
};
