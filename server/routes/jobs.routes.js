const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobs.controller');
const authMiddleware = require('../middleware/auth');

// All job routes require authentication
router.use(authMiddleware);

// Job CRUD routes
router.get('/', jobsController.getAllJobs);
router.post('/', jobsController.createJob);
router.put('/:id', jobsController.updateJob);
router.delete('/:id', jobsController.deleteJob);
router.get('/:id/history', jobsController.getJobHistory);

module.exports = router;
