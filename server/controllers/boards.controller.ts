import { Response, NextFunction } from 'express';
import { pool } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Get all boards for authenticated user
 * GET /api/boards
 */
export const getAllBoards = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const result = await pool.query(
            `SELECT b.id, b.name, b.created_at AS "createdAt", b.updated_at AS "updatedAt",
                    COUNT(j.id)::int AS "jobCount"
             FROM boards b
             LEFT JOIN jobs j ON b.id = j.board_id
             WHERE b.user_id = $1
             GROUP BY b.id
             ORDER BY b.created_at ASC`,
            [req.userId]
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

/**
 * Create new board
 * POST /api/boards
 */
export const createBoard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Board name is required' });
        }

        const result = await pool.query(
            `INSERT INTO boards (user_id, name)
             VALUES ($1, $2)
             RETURNING id, name, created_at AS "createdAt", updated_at AS "updatedAt"`,
            [req.userId, name.trim()]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

/**
 * Update/Rename board
 * PUT /api/boards/:id
 */
export const updateBoard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Board name is required' });
        }

        const result = await pool.query(
            `UPDATE boards
             SET name = $1, updated_at = NOW()
             WHERE id = $2 AND user_id = $3
             RETURNING id, name, created_at AS "createdAt", updated_at AS "updatedAt"`,
            [name.trim(), id, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Board not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

/**
 * Delete board
 * DELETE /api/boards/:id
 */
export const deleteBoard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        // Check if this is the last remaining board
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM boards WHERE user_id = $1',
            [req.userId]
        );

        const boardCount = parseInt(countResult.rows[0].count, 10);
        if (boardCount <= 1) {
            return res.status(400).json({ error: 'Cannot delete your last remaining board.' });
        }

        const result = await pool.query(
            'DELETE FROM boards WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Board not found' });
        }

        res.json({ message: 'Board deleted successfully', id: result.rows[0].id });
    } catch (error) {
        next(error);
    }
};
