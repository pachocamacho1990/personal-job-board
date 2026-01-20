/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Check if headers already sent
    if (res.headersSent) {
        return next(err);
    }

    // PostgreSQL unique violation (duplicate email, etc.)
    if (err.code === '23505') {
        return res.status(409).json({ error: 'Resource already exists' });
    }

    // PostgreSQL foreign key violation
    if (err.code === '23503') {
        return res.status(400).json({ error: 'Invalid reference' });
    }

    // Default error response
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

module.exports = errorHandler;
