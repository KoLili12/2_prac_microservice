const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const { authenticateToken } = require('../middleware/auth');
const { createOrderSchema, updateStatusSchema, validate } = require('../utils/validation');

/**
 * POST /v1/orders
 * Создание нового заказа (требуется авторизация)
 */
router.post('/', authenticateToken, validate(createOrderSchema), ordersController.createOrder);

/**
 * GET /v1/orders/:id
 * Получение заказа по ID (требуется авторизация)
 */
router.get('/:id', authenticateToken, ordersController.getOrder);

/**
 * GET /v1/orders
 * Получение списка заказов с пагинацией и сортировкой (требуется авторизация)
 * Query params: page, limit, sortBy, sortOrder
 */
router.get('/', authenticateToken, ordersController.getOrders);

/**
 * PATCH /v1/orders/:id/status
 * Обновление статуса заказа (требуется авторизация)
 */
router.patch('/:id/status', authenticateToken, validate(updateStatusSchema), ordersController.updateOrderStatus);

/**
 * DELETE /v1/orders/:id
 * Отмена заказа (мягкое удаление) (требуется авторизация)
 */
router.delete('/:id', authenticateToken, ordersController.cancelOrder);

module.exports = router;
