export const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
export const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
export const bcryptRounds = 10; // Salt rounds for password hashing
