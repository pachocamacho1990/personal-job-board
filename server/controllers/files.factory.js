const { pool } = require('../config/db');
const path = require('path');
const fs = require('fs');
const { UPLOADS_DIR } = require('../middleware/upload');

/**
 * Factory that creates file controller functions for any entity type.
 *
 * @param {Object} config
 * @param {string} config.ownerTable    - Table that owns the files (e.g. 'jobs', 'business_entities')
 * @param {string} config.filesTable    - Table storing file metadata (e.g. 'job_files', 'business_entity_files')
 * @param {string} config.foreignKey    - FK column in filesTable pointing to ownerTable (e.g. 'job_id', 'entity_id')
 * @param {string} config.entityLabel   - Human-readable label for error messages (e.g. 'Job', 'Business entity')
 */
function createFileController({ ownerTable, filesTable, foreignKey, entityLabel }) {

    const getFiles = async (req, res, next) => {
        try {
            const { id } = req.params;

            const ownerCheck = await pool.query(
                `SELECT id FROM ${ownerTable} WHERE id = $1 AND user_id = $2`,
                [id, req.userId]
            );

            if (ownerCheck.rows.length === 0) {
                return res.status(404).json({ error: `${entityLabel} not found` });
            }

            const result = await pool.query(
                `SELECT id, filename, original_name AS "originalName", mimetype, size, created_at AS "createdAt"
                 FROM ${filesTable}
                 WHERE ${foreignKey} = $1
                 ORDER BY created_at DESC`,
                [id]
            );

            res.json(result.rows);
        } catch (error) {
            next(error);
        }
    };

    const uploadFile = async (req, res, next) => {
        try {
            const { id } = req.params;

            const ownerCheck = await pool.query(
                `SELECT id FROM ${ownerTable} WHERE id = $1 AND user_id = $2`,
                [id, req.userId]
            );

            if (ownerCheck.rows.length === 0) {
                if (req.file) {
                    fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename));
                }
                return res.status(404).json({ error: `${entityLabel} not found` });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const result = await pool.query(
                `INSERT INTO ${filesTable} (${foreignKey}, filename, original_name, mimetype, size)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, filename, original_name AS "originalName", mimetype, size, created_at AS "createdAt"`,
                [id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size]
            );

            res.status(201).json(result.rows[0]);
        } catch (error) {
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

    const deleteFile = async (req, res, next) => {
        try {
            const { id: ownerId, fileId } = req.params;

            const fileCheck = await pool.query(
                `SELECT f.id, f.filename
                 FROM ${filesTable} f
                 JOIN ${ownerTable} o ON f.${foreignKey} = o.id
                 WHERE f.id = $1 AND f.${foreignKey} = $2 AND o.user_id = $3`,
                [fileId, ownerId, req.userId]
            );

            if (fileCheck.rows.length === 0) {
                return res.status(404).json({ error: 'File not found' });
            }

            const filename = fileCheck.rows[0].filename;

            await pool.query(`DELETE FROM ${filesTable} WHERE id = $1`, [fileId]);

            const filePath = path.join(UPLOADS_DIR, filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            res.json({ message: 'File deleted successfully', id: parseInt(fileId) });
        } catch (error) {
            next(error);
        }
    };

    const downloadFile = async (req, res, next) => {
        try {
            const { id: ownerId, fileId } = req.params;

            const fileCheck = await pool.query(
                `SELECT f.filename, f.original_name, f.mimetype
                 FROM ${filesTable} f
                 JOIN ${ownerTable} o ON f.${foreignKey} = o.id
                 WHERE f.id = $1 AND f.${foreignKey} = $2 AND o.user_id = $3`,
                [fileId, ownerId, req.userId]
            );

            if (fileCheck.rows.length === 0) {
                return res.status(404).json({ error: 'File not found' });
            }

            const { filename, original_name, mimetype } = fileCheck.rows[0];
            const filePath = path.join(UPLOADS_DIR, filename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found on disk' });
            }

            const sanitizedFilename = original_name.replace(/[^a-zA-Z0-9.\-_]/g, '_');

            if (req.query.preview === 'true') {
                res.setHeader('Content-Type', mimetype);
                res.setHeader('Content-Disposition', `inline; filename="${sanitizedFilename}"`);
                const fileStream = fs.createReadStream(filePath);
                fileStream.pipe(res);
            } else {
                res.download(filePath, sanitizedFilename, (err) => {
                    if (err) {
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

    return { getFiles, uploadFile, deleteFile, downloadFile };
}

module.exports = createFileController;
