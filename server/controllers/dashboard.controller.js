const { pool } = require('../config/db');

/**
 * Get dashboard summary data
 * GET /api/dashboard/summary
 */
const getDashboardSummary = async (req, res, next) => {
    try {
        // Fetch upcoming interviews (jobs with status 'interview')
        const interviewsResult = await pool.query(
            `SELECT id, company, position, status, created_at, updated_at 
             FROM jobs 
             WHERE user_id = $1 AND status = 'interview' 
             ORDER BY updated_at DESC`,
            [req.userId]
        );

        // Fetch new AI job matches (is_unseen = true AND origin = 'agent')
        const newMatchesResult = await pool.query(
            `SELECT id, company, position, salary, location, created_at 
             FROM jobs 
             WHERE user_id = $1 AND is_unseen = TRUE AND origin = 'agent' 
             ORDER BY created_at DESC`,
            [req.userId]
        );

        res.json({
            interviews: interviewsResult.rows,
            newMatches: newMatchesResult.rows
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardSummary
};
