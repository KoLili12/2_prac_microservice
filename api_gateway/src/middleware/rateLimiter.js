const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

/**
 * Общий rate limiter для всех запросов
 * Ограничение: 100 запросов в 15 минут с одного IP
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // Максимум 100 запросов за окно
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  },
  standardHeaders: true, // Возвращает rate limit info в `RateLimit-*` заголовках
  legacyHeaders: false, // Отключаем `X-RateLimit-*` заголовки
  handler: (req, res) => {
    logger.warn({
      ip: req.ip,
      path: req.path,
      requestId: req.id
    }, 'Rate limit exceeded');

    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later'
      }
    });
  }
});

/**
 * Строгий rate limiter для авторизации
 * Ограничение: 5 запросов в 15 минут с одного IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // Максимум 5 попыток входа за окно
  skipSuccessfulRequests: true, // Не считаем успешные запросы
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts, please try again later'
    }
  },
  handler: (req, res) => {
    logger.warn({
      ip: req.ip,
      path: req.path,
      requestId: req.id
    }, 'Auth rate limit exceeded');

    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts, please try again later'
      }
    });
  }
});

module.exports = {
  generalLimiter,
  authLimiter
};
