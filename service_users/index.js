const express = require('express');
const cors = require('cors');
const pinoHttp = require('pino-http');
const logger = require('./src/config/logger');
const pool = require('./src/config/db');
const usersRoutes = require('./src/routes/users');
const errorHandler = require('./src/middleware/errorHandler');
const requestIdMiddleware = require('./src/middleware/requestId');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);

// HTTP логирование с Pino
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Users Service',
    timestamp: new Date().toISOString()
  });
});

// API Routes v1
app.use('/v1/users', usersRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found'
    }
  });
});

// Error handler (должен быть последним)
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');

  try {
    await pool.end();
    logger.info('Database connections closed');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const server = app.listen(PORT, '0.0.0.0', async () => {
  logger.info(`Users service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Проверка подключения к БД
  try {
    await pool.query('SELECT NOW()');
    logger.info('Database connection verified');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to database');
    process.exit(1);
  }
});

module.exports = { app, server };
