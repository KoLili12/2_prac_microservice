const { z } = require('zod');

/**
 * Схема валидации регистрации
 */
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name too long')
});

/**
 * Схема валидации входа
 */
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

/**
 * Схема валидации обновления профиля
 */
const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name too long').optional(),
  email: z.string().email('Invalid email format').optional()
}).refine(data => data.name || data.email, {
  message: 'At least one field must be provided'
});

/**
 * Middleware для валидации запроса
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  validate
};
