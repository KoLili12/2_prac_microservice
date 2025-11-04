/**
 * Единый формат успешного ответа
 */
const successResponse = (data, res, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data
  });
};

/**
 * Единый формат ответа с ошибкой
 */
const errorResponse = (code, message, res, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
};

module.exports = {
  successResponse,
  errorResponse
};
