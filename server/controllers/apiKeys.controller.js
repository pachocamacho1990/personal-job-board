const { pool: db } = require('../config/db');
const crypto = require('crypto');

/**
 * Generate a secure API key
 * Format: sk_live_<32_random_bytes_hex>
 */
const generateApiKey = () => {
    const prefix = 'sk_live_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}${randomBytes}`;
};

/**
 * Hash API key for storage
 * Uses SHA-256
 */
const hashApiKey = (apiKey) => {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
};

exports.listApiKeys = async (req, res, next) => {
    try {
        const result = await db.query(
            'SELECT id, label, prefix, last_used_at, created_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
            [req.userId]
        );
        res.json({ data: result.rows });
    } catch (error) {
        next(error);
    }
};

exports.createApiKey = async (req, res, next) => {
    try {
        const { label } = req.body;

        if (!label) {
            return res.status(400).json({ error: 'Label is required' });
        }

        const rawApiKey = generateApiKey();
        const keyHash = hashApiKey(rawApiKey);
        const prefix = rawApiKey.substring(0, 15) + '...'; // sk_live_1234...

        const result = await db.query(
            'INSERT INTO api_keys (user_id, key_hash, label, prefix) VALUES ($1, $2, $3, $4) RETURNING id, label, prefix, created_at',
            [req.userId, keyHash, label, prefix]
        );

        // Return the RAW key only once here
        res.status(201).json({
            data: {
                ...result.rows[0],
                apiKey: rawApiKey // This is the only time the user sees the full key
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.revokeApiKey = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'API key not found' });
        }

        res.json({ data: { message: 'API key revoked successfully' } });
    } catch (error) {
        next(error);
    }
};
