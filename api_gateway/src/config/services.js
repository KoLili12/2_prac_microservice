/**
 * Конфигурация URL микросервисов
 */
module.exports = {
  USERS_SERVICE_URL: process.env.SERVICE_USERS_URL || 'http://localhost:3001',
  ORDERS_SERVICE_URL: process.env.SERVICE_ORDERS_URL || 'http://localhost:3002'
};
