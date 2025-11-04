const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/response');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware для проверки JWT токена
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    logger.warn({ path: req.path }, 'No token provided');
    return errorResponse('UNAUTHORIZED', 'Access token is required', res, 401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn({ err, path: req.path }, 'Invalid token');
      return errorResponse('INVALID_TOKEN', 'Invalid or expired token', res, 403);
    }

    req.user = user;
    next();
  });
};

/**
 * Middleware для проверки роли администратора
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
    logger.warn({ userId: req.user?.id, path: req.path }, 'Admin access denied');
    return errorResponse('FORBIDDEN', 'Admin access required', res, 403);
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin
};
