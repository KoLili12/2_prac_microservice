const logger = require('../config/logger');
const { errorResponse } = require('../utils/response');

/**
 * Глобальный обработчик ошибок
 */
const errorHandler = (err, req, res, next) => {
  logger.error({
    err,
    path: req.path,
    method: req.method,
    requestId: req.id
  }, 'Unhandled error');

  // Ошибки валидации Zod
  if (err.name === 'ZodError') {
    return errorResponse(
      'VALIDATION_ERROR',
      err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      res,
      400
    );
  }

  // Ошибки PostgreSQL
  if (err.code) {
    switch (err.code) {
      case '23505': // Уникальное ограничение
        return errorResponse('DUPLICATE_ENTRY', 'Resource already exists', res, 409);
      case '23503': // Внешний ключ
        return errorResponse('FOREIGN_KEY_VIOLATION', 'Referenced resource does not exist', res, 400);
      default:
        logger.error({ code: err.code }, 'Database error');
    }
  }

  // Общая ошибка сервера
  return errorResponse(
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    res,
    500
  );
};

module.exports = errorHandler;
