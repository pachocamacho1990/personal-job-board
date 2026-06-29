import { Response, NextFunction } from 'express';
import { pool } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Get dashboard summary data
 * GET /api/dashboard/summary
 */
export const getDashboardSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { boardId } = req.query;
        let targetBoardId: any = boardId;

        if (!targetBoardId) {
            // Find default/first board for user
            const boardResult = await pool.query(
                'SELECT id FROM boards WHERE user_id = $1 ORDER BY id ASC LIMIT 1',
                [req.userId]
            );
            if (boardResult.rows.length > 0) {
                targetBoardId = boardResult.rows[0].id;
            }
        }

        // Fetch upcoming interviews (jobs with status 'interview')
        const interviewsQuery = targetBoardId 
            ? `SELECT id, company, position, status, created_at, updated_at 
               FROM jobs 
               WHERE user_id = $1 AND board_id = $2 AND status = 'interview' 
               ORDER BY updated_at DESC`
            : `SELECT id, company, position, status, created_at, updated_at 
               FROM jobs 
               WHERE user_id = $1 AND status = 'interview' 
               ORDER BY updated_at DESC`;
        const interviewsParams = targetBoardId ? [req.userId, targetBoardId] : [req.userId];
        const interviewsResult = await pool.query(interviewsQuery, interviewsParams);

        // Fetch new AI job matches (is_unseen = true AND origin = 'agent')
        const newMatchesQuery = targetBoardId
            ? `SELECT id, company, position, salary, location, created_at 
               FROM jobs 
               WHERE user_id = $1 AND board_id = $2 AND is_unseen = TRUE AND origin = 'agent' 
               ORDER BY created_at DESC`
            : `SELECT id, company, position, salary, location, created_at 
               FROM jobs 
               WHERE user_id = $1 AND is_unseen = TRUE AND origin = 'agent' 
               ORDER BY created_at DESC`;
        const newMatchesParams = targetBoardId ? [req.userId, targetBoardId] : [req.userId];
        const newMatchesResult = await pool.query(newMatchesQuery, newMatchesParams);

        res.json({
            interviews: interviewsResult.rows,
            newMatches: newMatchesResult.rows
        });
    } catch (error) {
        next(error);
    }
};
