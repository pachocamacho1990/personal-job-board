module.exports = {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptRounds: 10, // Salt rounds for password hashing
};
