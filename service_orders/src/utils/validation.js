const { z } = require('zod');

/**
 * Схема для элемента заказа
 */
const orderItemSchema = z.object({
  product: z.string().min(1, 'Product name is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  price: z.number().positive('Price must be positive')
});

/**
 * Схема валидации создания заказа
 */
const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  userId: z.string().uuid('Invalid user ID format').optional() // Опционально, берется из токена
});

/**
 * Схема валидации обновления статуса
 */
const updateStatusSchema = z.object({
  status: z.enum(['created', 'in_progress', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Status must be one of: created, in_progress, completed, cancelled' })
  })
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
  createOrderSchema,
  updateStatusSchema,
  validate
};
