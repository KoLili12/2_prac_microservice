const axios = require('axios');
const logger = require('../config/logger');

const SERVICE_USERS_URL = process.env.SERVICE_USERS_URL || 'http://localhost:3001';

/**
 * Проверка существования пользователя через сервис пользователей
 */
const checkUserExists = async (userId, requestId) => {
  try {
    const response = await axios.get(`${SERVICE_USERS_URL}/v1/users/${userId}`, {
      headers: {
        'X-Request-ID': requestId
      },
      timeout: 5000
    });

    return response.data && response.data.success;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      logger.warn({ userId, requestId }, 'User not found in users service');
      return false;
    }

    logger.error({
      err: error,
      userId,
      requestId
    }, 'Error checking user existence');

    throw new Error('Failed to verify user');
  }
};

module.exports = {
  checkUserExists
};
