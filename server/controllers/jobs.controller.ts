import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { pool } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { UPLOADS_DIR } from '../middleware/upload';

/**
 * Get all jobs for authenticated user
 * GET /api/jobs
 */
export const getAllJobs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { boardId } = req.query;
        let targetBoardId: any = boardId;

        if (!targetBoardId) {
            const boardResult = await pool.query(
                'SELECT id FROM boards WHERE user_id = $1 ORDER BY id ASC LIMIT 1',
                [req.userId]
            );
            if (boardResult.rows.length > 0) {
                targetBoardId = boardResult.rows[0].id;
            } else {
                return res.json([]);
            }
        }

        const result = await pool.query(
            `SELECT id, board_id AS "boardId", type, rating, status, origin, is_unseen, is_locked, external_opportunity_url AS "externalOpportunityUrl", company, position, location, salary, url,
                    contact_name AS "contactName", organization, comments, 
                    created_at AS "created_at", updated_at AS "updated_at"
             FROM jobs 
             WHERE user_id = $1 AND board_id = $2
             ORDER BY updated_at DESC, rating DESC`,
            [req.userId, targetBoardId]
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
export const createJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const {
            type = 'job',
            rating = 3,
            status,
            origin = 'human',
            company,
            position,
            location,
            salary,
            url,
            contact_name,
            organization,
            comments,
            created_at,  // Optional: for migration imports
            updated_at,   // Optional: for migration imports
            boardId
        } = req.body;

        // Validation
        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        // Auto-set is_unseen: true for agents, false for humans
        const is_unseen = (origin === 'agent');

        let targetBoardId: any = boardId;
        if (!targetBoardId) {
            const boardResult = await pool.query(
                'SELECT id FROM boards WHERE user_id = $1 ORDER BY id ASC LIMIT 1',
                [req.userId]
            );
            if (boardResult.rows.length > 0) {
                targetBoardId = boardResult.rows[0].id;
            } else {
                return res.status(400).json({ error: 'A board is required to create a job' });
            }
        } else {
            // Verify board ownership
            const boardCheck = await pool.query(
                'SELECT id FROM boards WHERE id = $1 AND user_id = $2',
                [targetBoardId, req.userId]
            );
            if (boardCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Board not found' });
            }
        }

        const result = await pool.query(
            `INSERT INTO jobs 
             (user_id, board_id, type, rating, status, origin, is_unseen, company, position, location, salary, url,
              contact_name, organization, comments, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                     COALESCE($16::timestamptz, NOW()), COALESCE($17::timestamptz, NOW()))
             RETURNING id, board_id AS "boardId", type, rating, status, origin, is_unseen, is_locked, external_opportunity_url AS "externalOpportunityUrl", company, position, location, salary, url,
                       contact_name AS "contactName", organization, comments,
                       created_at AS "created_at", updated_at AS "updated_at"`,
            [req.userId, targetBoardId, type, rating, status, origin, is_unseen, company, position, location, salary, url,
                contact_name, organization, comments, created_at || null, updated_at || null]
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
export const updateJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const {
            type,
            rating,
            status,
            origin,
            is_unseen, // Allow updating visibility (e.g. marking as seen)
            company,
            position,
            location,
            salary,
            url,
            contact_name,
            organization,
            comments,
            boardId
        } = req.body;

        // First, verify job belongs to user
        const checkResult = await pool.query(
            'SELECT id FROM jobs WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // If changing board, verify new board belongs to user
        if (boardId) {
            const boardCheck = await pool.query(
                'SELECT id FROM boards WHERE id = $1 AND user_id = $2',
                [boardId, req.userId]
            );
            if (boardCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Target board not found' });
            }
        }

        // Auto-mark as seen if status is updated (meaning reviewed), unless explicitly specified
        let resolvedIsUnseen = is_unseen;
        if (resolvedIsUnseen === undefined && status !== undefined) {
            resolvedIsUnseen = false;
        }

        // Update job (updated_at timestamp handled by trigger)
        const result = await pool.query(
            `UPDATE jobs 
             SET type = COALESCE($1, type),
                 rating = COALESCE($2, rating),
                 status = COALESCE($3, status),
                 origin = COALESCE($4, origin),
                 is_unseen = COALESCE($5, is_unseen),
                 company = COALESCE($6, company),
                 position = COALESCE($7, position),
                 location = COALESCE($8, location),
                 salary = COALESCE($9, salary),
                 url = COALESCE($10, url),
                 contact_name = COALESCE($11, contact_name),
                 organization = COALESCE($12, organization),
                 comments = COALESCE($13, comments),
                 board_id = COALESCE($14, board_id)
             WHERE id = $15 AND user_id = $16
             RETURNING id, board_id AS "boardId", type, rating, status, origin, is_unseen, is_locked, external_opportunity_url AS "externalOpportunityUrl", company, position, location, salary, url,
                       contact_name AS "contactName", organization, comments,
                       created_at AS "created_at", updated_at AS "updated_at"`,
            [type, rating, status, origin, resolvedIsUnseen, company, position, location, salary, url,
                contact_name, organization, comments, boardId || null, id, req.userId]
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
export const deleteJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

/**
 * Get job history
 * GET /api/jobs/:id/history
 */
export const getJobHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        // Verify job belongs to user
        const checkResult = await pool.query(
            'SELECT id FROM jobs WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const result = await pool.query(
            'SELECT * FROM job_history WHERE job_id = $1 ORDER BY changed_at ASC',
            [id]
        );

        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

/**
 * Push a job across to Cassimir Management Center as an opportunity.
 * POST /api/jobs/:id/transform
 *
 * This used to be one local transaction writing into business_entities. That
 * table lives in another application now, so the write is an outbound HTTP call
 * and there is no transaction spanning both databases.
 *
 * Two things replace the rollback that is no longer possible:
 *
 *   Order. CMC is written first and the local lock second. The reverse would
 *   leave a job marked "transformed" with nothing on the other side.
 *
 *   Idempotency. The request carries external_ref "jobboard:<id>", and CMC
 *   returns the existing opportunity rather than making a second one. So if the
 *   local lock fails after CMC succeeded, a retry converges instead of
 *   duplicating.
 *
 * If CMC is unreachable, this is a 503 and *nothing changes* — the job is not
 * locked and the user can try again later. That graceful degradation is what
 * makes depending on a second service acceptable here.
 */
export const transformJobToEntity = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const cmcUrl = process.env.CMC_API_URL;
        const cmcToken = process.env.CMC_INTEGRATION_TOKEN;

        if (!cmcUrl || !cmcToken) {
            return res.status(503).json({
                error: 'Cassimir Management Center is not configured. Set CMC_API_URL and CMC_INTEGRATION_TOKEN.',
            });
        }

        const jobResult = await pool.query(
            'SELECT * FROM jobs WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );

        if (jobResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const job = jobResult.rows[0];

        if (job.is_locked) {
            return res.status(400).json({ error: 'Job is already transformed/locked' });
        }

        const notes = (job.comments || '') +
            `\n\n**Transformed from a job application**\nPosition: ${job.position || 'N/A'}\nSalary: ${job.salary || 'N/A'}`;

        let created: { opportunity_id: number; url: string };

        try {
            const response = await fetch(`${cmcUrl.replace(/\/$/, '')}/api/integrations/opportunities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CMC-Integration-Token': cmcToken,
                },
                body: JSON.stringify({
                    external_ref: `jobboard:${id}`,
                    source: 'jobboard',
                    organization: {
                        name: job.organization || job.company || 'Unknown organization',
                        type: 'partner',
                        location: job.location || null,
                        website: job.url || null,
                    },
                    contact: job.contact_name ? { full_name: job.contact_name } : undefined,
                    opportunity: {
                        title: job.company || job.position || 'Opportunity from the job board',
                        kind: 'partnership',
                        stage: 'researching',
                        notes,
                    },
                }),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                console.error(`CMC rejected the transform of job ${id}:`, response.status, body);
                return res.status(response.status >= 500 ? 503 : 502).json({
                    error: body.error || `Cassimir Management Center responded ${response.status}`,
                });
            }

            created = await response.json();
        } catch (networkError) {
            // Unreachable, DNS failure, timeout. Nothing has been written on
            // either side, so say so plainly and leave the job untouched.
            console.error(`Could not reach CMC while transforming job ${id}:`, networkError);
            return res.status(503).json({
                error: 'Cassimir Management Center is unreachable. The job was left unchanged.',
            });
        }

        // Attachments are best-effort: the opportunity already exists, and
        // failing the whole request over one upload would strand it.
        const filesResult = await pool.query('SELECT * FROM job_files WHERE job_id = $1', [id]);

        for (const file of filesResult.rows) {
            try {
                const filePath = path.join(UPLOADS_DIR, file.filename);
                if (!fs.existsSync(filePath)) {
                    console.error(`Attachment missing on disk, skipped: ${file.filename}`);
                    continue;
                }

                const form = new FormData();
                form.append(
                    'file',
                    new Blob([fs.readFileSync(filePath)], { type: file.mimetype }),
                    file.original_name
                );

                const upload = await fetch(
                    `${cmcUrl.replace(/\/$/, '')}/api/integrations/opportunities/${created.opportunity_id}/files`,
                    { method: 'POST', headers: { 'X-CMC-Integration-Token': cmcToken }, body: form }
                );

                if (!upload.ok) {
                    console.error(`CMC refused attachment ${file.original_name}:`, upload.status);
                }
            } catch (uploadError) {
                console.error(`Failed to forward attachment ${file.original_name}:`, uploadError);
            }
        }

        await pool.query(
            `UPDATE jobs
                SET is_locked = TRUE, external_opportunity_url = $1, updated_at = NOW()
              WHERE id = $2 AND user_id = $3`,
            [created.url, id, req.userId]
        );

        res.json({
            message: 'Transformation successful',
            opportunityId: created.opportunity_id,
            opportunityUrl: created.url,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get single job by ID
 * GET /api/jobs/:id
 */
export const getJobById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT id, board_id AS "boardId", type, rating, status, origin, is_unseen, is_locked, external_opportunity_url AS "externalOpportunityUrl", company, position, location, salary, url,
                    contact_name AS "contactName", organization, comments,
                    created_at AS "created_at", updated_at AS "updated_at"
             FROM jobs 
             WHERE id = $1 AND user_id = $2`,
            [id, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

/**
 * Get job documents
 * GET /api/jobs/:id/documents
 */
export const getJobDocuments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        // Verify job ownership
        const checkResult = await pool.query(
            'SELECT id FROM jobs WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const result = await pool.query(
            'SELECT id, document_type AS "documentType", content, created_at AS "createdAt" FROM job_documents WHERE job_id = $1',
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

/**
 * Generate job document via AI Copilot
 * POST /api/jobs/:id/copilot
 */
export const generateCopilotDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { documentType } = req.body;

        if (!documentType || (documentType !== 'cover_letter' && documentType !== 'resume_bullets')) {
            return res.status(400).json({ error: 'documentType is required and must be cover_letter or resume_bullets' });
        }

        // Verify job ownership
        const checkResult = await pool.query(
            'SELECT id FROM jobs WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // Call Python Agent http://agent:8000/copilot
        const agentResponse = await fetch('http://agent:8000/copilot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: req.userId,
                job_id: parseInt(id as string, 10),

                document_type: documentType
            })
        });

        if (!agentResponse.ok) {
            const errBody = await agentResponse.text();
            throw new Error(`Agent service responded with ${agentResponse.status}: ${errBody}`);
        }

        const data = await agentResponse.json();
        const content = data.content || '';

        // Save generated document to job_documents (upsert)
        const docResult = await pool.query(
            `INSERT INTO job_documents (job_id, document_type, content, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (job_id, document_type) 
             DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
             RETURNING id, document_type AS "documentType", content, created_at AS "createdAt"`,
            [id, documentType, content]
        );

        res.json(docResult.rows[0]);
    } catch (error) {
        next(error);
    }
};

