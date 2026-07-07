import { Response } from 'express';
import { pool } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * GET /api/profile
 * Returns the user's professional profile data from agent_profiles table.
 * If no profile exists, creates one with uninitialized status.
 */
export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.userId;

        // Try to get existing profile
        let result = await pool.query(
            'SELECT profile_data, onboarding_status, career_strategy, search_prompt FROM agent_profiles WHERE user_id = $1',
            [userId]
        );

        // If no profile exists, create one
        if (result.rows.length === 0) {
            await pool.query(
                "INSERT INTO agent_profiles (user_id, onboarding_status, profile_data) VALUES ($1, 'uninitialized', '{}'::jsonb)",
                [userId]
            );
            return res.json({
                profile_data: {},
                onboarding_status: 'uninitialized',
                career_strategy: {},
                search_prompt: null
            });
        }

        const row = result.rows[0];
        res.json({
            profile_data: row.profile_data || {},
            onboarding_status: row.onboarding_status,
            career_strategy: row.career_strategy || {},
            search_prompt: row.search_prompt || null
        });
    } catch (error: any) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

/**
 * POST /api/profile
 * Saves the user's professional profile data and transitions onboarding
 * status from 'uninitialized' to 'interview_pending'.
 * 
 * Expected body: { profile_data: { full_name, headline, linkedin_url, ... } }
 */
export const saveProfile = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.userId;
        const { profile_data } = req.body;

        if (!profile_data || typeof profile_data !== 'object') {
            return res.status(400).json({ error: 'profile_data is required and must be an object' });
        }

        // Validate required fields
        if (!profile_data.full_name || profile_data.full_name.trim() === '') {
            return res.status(400).json({ error: 'full_name is required' });
        }

        // Ensure profile row exists
        const existing = await pool.query(
            'SELECT user_id FROM agent_profiles WHERE user_id = $1',
            [userId]
        );

        if (existing.rows.length === 0) {
            // Create profile row with data and transition to interview_pending
            await pool.query(
                `INSERT INTO agent_profiles (user_id, onboarding_status, profile_data, updated_at) 
                 VALUES ($1, 'interview_pending', $2::jsonb, NOW())`,
                [userId, JSON.stringify(profile_data)]
            );
        } else {
            // Update existing profile and transition to interview_pending
            await pool.query(
                `UPDATE agent_profiles 
                 SET profile_data = $1::jsonb, 
                     onboarding_status = 'interview_pending', 
                     updated_at = NOW() 
                 WHERE user_id = $2`,
                [JSON.stringify(profile_data), userId]
            );
        }

        res.json({
            message: 'Profile saved successfully',
            onboarding_status: 'interview_pending',
            profile_data
        });
    } catch (error: any) {
        console.error('Error saving profile:', error);
        res.status(500).json({ error: 'Failed to save profile' });
    }
};
