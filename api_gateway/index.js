const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const pinoHttp = require('pino-http');
const logger = require('./src/config/logger');
const { USERS_SERVICE_URL, ORDERS_SERVICE_URL } = require('./src/config/services');
const { authenticateToken } = require('./src/middleware/auth');
const { generalLimiter, authLimiter } = require('./src/middleware/rateLimiter');
const requestIdMiddleware = require('./src/middleware/requestId');

const app = express();
const PORT = process.env.PORT || 8000;

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Basic middleware
app.use(cors(corsOptions));
app.use(requestIdMiddleware);

// HTTP logging with Pino
app.use(pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  }
}));

// Rate limiting
app.use(generalLimiter);

// Auth rate limiting для логина и регистрации
app.use('/v1/users/login', authLimiter);
app.use('/v1/users/register', authLimiter);

// JWT authentication middleware
app.use(authenticateToken);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'API Gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/status', (req, res) => {
  res.json({
    status: 'API Gateway is running',
    timestamp: new Date().toISOString()
  });
});

// Proxy configuration for Users Service
const usersProxyOptions = {
  target: USERS_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Перенаправляем /v1/users/* на сервис пользователей как есть
    return path;
  },
  onProxyReq: (proxyReq, req, res) => {
    // Прокидываем X-Request-ID
    if (req.id) {
      proxyReq.setHeader('X-Request-ID', req.id);
    }

    // Прокидываем информацию о пользователе из JWT
    if (req.headers['x-user-id']) {
      proxyReq.setHeader('X-User-ID', req.headers['x-user-id']);
      proxyReq.setHeader('X-User-Email', req.headers['x-user-email']);
      proxyReq.setHeader('X-User-Roles', req.headers['x-user-roles']);
    }

    logger.info({
      requestId: req.id,
      method: req.method,
      path: req.path,
      target: USERS_SERVICE_URL
    }, 'Proxying to Users Service');
  },
  onProxyRes: (proxyRes, req, res) => {
    // Прокидываем X-Request-ID обратно
    if (req.id) {
      proxyRes.headers['x-request-id'] = req.id;
    }
  },
  onError: (err, req, res) => {
    logger.error({
      err,
      requestId: req.id,
      method: req.method,
      path: req.path,
      target: USERS_SERVICE_URL
    }, 'Proxy error to Users Service');

    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Users service is temporarily unavailable'
      }
    });
  }
};

// Proxy configuration for Orders Service
const ordersProxyOptions = {
  target: ORDERS_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Перенаправляем /v1/orders/* на сервис заказов как есть
    return path;
  },
  onProxyReq: (proxyReq, req, res) => {
    // Прокидываем X-Request-ID
    if (req.id) {
      proxyReq.setHeader('X-Request-ID', req.id);
    }

    // Прокидываем информацию о пользователе из JWT
    if (req.headers['x-user-id']) {
      proxyReq.setHeader('X-User-ID', req.headers['x-user-id']);
      proxyReq.setHeader('X-User-Email', req.headers['x-user-email']);
      proxyReq.setHeader('X-User-Roles', req.headers['x-user-roles']);
    }

    logger.info({
      requestId: req.id,
      method: req.method,
      path: req.path,
      target: ORDERS_SERVICE_URL
    }, 'Proxying to Orders Service');
  },
  onProxyRes: (proxyRes, req, res) => {
    // Прокидываем X-Request-ID обратно
    if (req.id) {
      proxyRes.headers['x-request-id'] = req.id;
    }
  },
  onError: (err, req, res) => {
    logger.error({
      err,
      requestId: req.id,
      method: req.method,
      path: req.path,
      target: ORDERS_SERVICE_URL
    }, 'Proxy error to Orders Service');

    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Orders service is temporarily unavailable'
      }
    });
  }
};

// Setup proxies
app.use('/v1/users', createProxyMiddleware(usersProxyOptions));
app.use('/v1/orders', createProxyMiddleware(ordersProxyOptions));

// 404 Handler
app.use((req, res) => {
  logger.warn({ requestId: req.id, path: req.path }, 'Route not found');
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({
    err,
    requestId: req.id,
    path: req.path,
    method: req.method
  }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    }
  });
});

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Users Service: ${USERS_SERVICE_URL}`);
  logger.info(`Orders Service: ${ORDERS_SERVICE_URL}`);
});

module.exports = { app, server };
