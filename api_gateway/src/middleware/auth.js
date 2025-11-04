const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware для проверки JWT токена на защищенных путях
 * Список публичных путей (не требуют авторизации)
 */
const publicPaths = [
  { method: 'POST', path: /^\/v1\/users\/register$/ },
  { method: 'POST', path: /^\/v1\/users\/login$/ },
  { method: 'GET', path: /^\/health$/ },
  { method: 'GET', path: /^\/status$/ }
];

/**
 * Проверяет, является ли путь публичным
 */
const isPublicPath = (method, path) => {
  return publicPaths.some(route =>
    route.method === method && route.path.test(path)
  );
};

/**
 * Middleware для проверки JWT токена
 */
const authenticateToken = (req, res, next) => {
  // Проверяем, является ли путь публичным
  if (isPublicPath(req.method, req.path)) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    logger.warn({ path: req.path, requestId: req.id }, 'No token provided for protected route');
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token is required'
      }
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn({ err, path: req.path, requestId: req.id }, 'Invalid token');
      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }

    // Добавляем информацию о пользователе в заголовки для проксирования
    req.headers['x-user-id'] = user.id;
    req.headers['x-user-email'] = user.email;
    req.headers['x-user-roles'] = JSON.stringify(user.roles || []);

    next();
  });
};

module.exports = {
  authenticateToken,
  isPublicPath
};
