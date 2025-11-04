const { v4: uuidv4 } = require('uuid');

/**
 * Middleware для генерации или извлечения X-Request-ID
 */
const requestIdMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

module.exports = requestIdMiddleware;
