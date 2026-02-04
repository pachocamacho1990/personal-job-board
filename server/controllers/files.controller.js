const { pool } = require('../config/db');
const path = require('path');
const fs = require('fs');
const { UPLOADS_DIR } = require('../middleware/upload');

/**
 * Get all files for a job
 * GET /api/jobs/:id/files
 */
const getJobFiles = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify job belongs to user
        const jobCheck = await pool.query(
            'SELECT id FROM jobs WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );

        if (jobCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const result = await pool.query(
            `SELECT id, filename, original_name AS "originalName", mimetype, size, created_at AS "createdAt"
             FROM job_files 
             WHERE job_id = $1 
             ORDER BY created_at DESC`,
            [id]
        );

        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

/**
 * Upload a file to a job
 * POST /api/jobs/:id/files
 */
const uploadFile = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify job belongs to user
        const jobCheck = await pool.query(
            'SELECT id FROM jobs WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );

        if (jobCheck.rows.length === 0) {
            // Clean up uploaded file if job not found
            if (req.file) {
                fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename));
            }
            return res.status(404).json({ error: 'Job not found' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Save file metadata to database
        const result = await pool.query(
            `INSERT INTO job_files (job_id, filename, original_name, mimetype, size)
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
 * DELETE /api/jobs/:jobId/files/:fileId
 */
const deleteFile = async (req, res, next) => {
    try {
        const { id: jobId, fileId } = req.params;

        // Verify job belongs to user and file exists
        const fileCheck = await pool.query(
            `SELECT jf.id, jf.filename 
             FROM job_files jf
             JOIN jobs j ON jf.job_id = j.id
             WHERE jf.id = $1 AND jf.job_id = $2 AND j.user_id = $3`,
            [fileId, jobId, req.userId]
        );

        if (fileCheck.rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const filename = fileCheck.rows[0].filename;

        // Delete from database
        await pool.query('DELETE FROM job_files WHERE id = $1', [fileId]);

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
 * GET /api/jobs/:jobId/files/:fileId/download
 */
const downloadFile = async (req, res, next) => {
    try {
        const { id: jobId, fileId } = req.params;

        // Verify job belongs to user and file exists
        const fileCheck = await pool.query(
            `SELECT jf.filename, jf.original_name, jf.mimetype
             FROM job_files jf
             JOIN jobs j ON jf.job_id = j.id
             WHERE jf.id = $1 AND jf.job_id = $2 AND j.user_id = $3`,
            [fileId, jobId, req.userId]
        );

        if (fileCheck.rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const { filename, original_name, mimetype } = fileCheck.rows[0];
        const filePath = path.join(UPLOADS_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }

        res.setHeader('Content-Type', mimetype);
        res.setHeader('Content-Disposition', `inline; filename="${original_name}"`);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getJobFiles,
    uploadFile,
    deleteFile,
    downloadFile
};
