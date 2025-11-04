const pool = require('../config/db');
const logger = require('../config/logger');
const { successResponse, errorResponse } = require('../utils/response');
const eventService = require('../services/eventService');

/**
 * Создание нового заказа
 */
const createOrder = async (req, res, next) => {
  try {
    const { items } = req.body;
    const userId = req.user.id; // Из JWT токена

    // Вычисление общей суммы
    const totalAmount = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Создание заказа
    const result = await pool.query(
      `INSERT INTO orders (user_id, items, status, total_amount)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, items, status, total_amount, created_at, updated_at`,
      [userId, JSON.stringify(items), 'created', totalAmount]
    );

    const order = result.rows[0];
    logger.info({ orderId: order.id, userId, totalAmount }, 'Order created');

    // Публикация события
    await eventService.publishOrderCreated(order);

    return successResponse(
      {
        id: order.id,
        userId: order.user_id,
        items: order.items,
        status: order.status,
        totalAmount: parseFloat(order.total_amount),
        createdAt: order.created_at,
        updatedAt: order.updated_at
      },
      res,
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Получение заказа по ID
 */
const getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];

    const result = await pool.query(
      'SELECT id, user_id, items, status, total_amount, created_at, updated_at FROM orders WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return errorResponse('ORDER_NOT_FOUND', 'Order not found', res, 404);
    }

    const order = result.rows[0];

    // Проверка прав: пользователь может видеть только свои заказы (кроме админа)
    if (order.user_id !== userId && !userRoles.includes('admin')) {
      logger.warn({ orderId: id, userId }, 'Access denied to order');
      return errorResponse('FORBIDDEN', 'You do not have access to this order', res, 403);
    }

    return successResponse(
      {
        id: order.id,
        userId: order.user_id,
        items: order.items,
        status: order.status,
        totalAmount: parseFloat(order.total_amount),
        createdAt: order.created_at,
        updatedAt: order.updated_at
      },
      res
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Получение списка заказов текущего пользователя
 */
const getOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRoles = req.user.roles || [];
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Валидация sortBy для предотвращения SQL injection
    const allowedSortFields = ['created_at', 'updated_at', 'total_amount', 'status'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';

    let query, countQuery, values;

    // Админ может видеть все заказы, обычный пользователь - только свои
    if (userRoles.includes('admin')) {
      query = `SELECT id, user_id, items, status, total_amount, created_at, updated_at
               FROM orders ORDER BY ${validSortBy} ${sortOrder} LIMIT $1 OFFSET $2`;
      countQuery = 'SELECT COUNT(*) FROM orders';
      values = [limit, offset];
    } else {
      query = `SELECT id, user_id, items, status, total_amount, created_at, updated_at
               FROM orders WHERE user_id = $1 ORDER BY ${validSortBy} ${sortOrder} LIMIT $2 OFFSET $3`;
      countQuery = 'SELECT COUNT(*) FROM orders WHERE user_id = $1';
      values = [userId, limit, offset];
    }

    // Подсчет общего количества
    const countValues = userRoles.includes('admin') ? [] : [userId];
    const countResult = await pool.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    // Получение заказов
    const result = await pool.query(query, values);

    return successResponse(
      {
        orders: result.rows.map(order => ({
          id: order.id,
          userId: order.user_id,
          items: order.items,
          status: order.status,
          totalAmount: parseFloat(order.total_amount),
          createdAt: order.created_at,
          updatedAt: order.updated_at
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      res
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Обновление статуса заказа
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];

    // Получение текущего заказа
    const orderResult = await pool.query(
      'SELECT id, user_id, status FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      return errorResponse('ORDER_NOT_FOUND', 'Order not found', res, 404);
    }

    const currentOrder = orderResult.rows[0];

    // Проверка прав: только владелец или админ могут менять статус
    if (currentOrder.user_id !== userId && !userRoles.includes('admin')) {
      logger.warn({ orderId: id, userId }, 'Access denied to update order');
      return errorResponse('FORBIDDEN', 'You do not have access to update this order', res, 403);
    }

    const oldStatus = currentOrder.status;

    // Обновление статуса
    const result = await pool.query(
      `UPDATE orders SET status = $1 WHERE id = $2
       RETURNING id, user_id, items, status, total_amount, created_at, updated_at`,
      [status, id]
    );

    const order = result.rows[0];
    logger.info({ orderId: id, userId, oldStatus, newStatus: status }, 'Order status updated');

    // Публикация события
    await eventService.publishOrderStatusUpdated(order, oldStatus, status);

    return successResponse(
      {
        id: order.id,
        userId: order.user_id,
        items: order.items,
        status: order.status,
        totalAmount: parseFloat(order.total_amount),
        createdAt: order.created_at,
        updatedAt: order.updated_at
      },
      res
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Отмена заказа (мягкое удаление - изменение статуса на cancelled)
 */
const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];

    // Получение текущего заказа
    const orderResult = await pool.query(
      'SELECT id, user_id, status FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      return errorResponse('ORDER_NOT_FOUND', 'Order not found', res, 404);
    }

    const currentOrder = orderResult.rows[0];

    // Проверка прав: только владелец или админ могут отменить заказ
    if (currentOrder.user_id !== userId && !userRoles.includes('admin')) {
      logger.warn({ orderId: id, userId }, 'Access denied to cancel order');
      return errorResponse('FORBIDDEN', 'You do not have access to cancel this order', res, 403);
    }

    // Проверка что заказ можно отменить (не completed)
    if (currentOrder.status === 'completed') {
      return errorResponse('INVALID_OPERATION', 'Cannot cancel completed order', res, 400);
    }

    if (currentOrder.status === 'cancelled') {
      return errorResponse('INVALID_OPERATION', 'Order is already cancelled', res, 400);
    }

    // Обновление статуса на cancelled
    const result = await pool.query(
      `UPDATE orders SET status = 'cancelled' WHERE id = $1
       RETURNING id, user_id, items, status, total_amount, created_at, updated_at`,
      [id]
    );

    const order = result.rows[0];
    logger.info({ orderId: id, userId }, 'Order cancelled');

    // Публикация события
    await eventService.publishOrderCancelled(order);

    return successResponse(
      {
        id: order.id,
        userId: order.user_id,
        items: order.items,
        status: order.status,
        totalAmount: parseFloat(order.total_amount),
        createdAt: order.created_at,
        updatedAt: order.updated_at
      },
      res
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrder,
  getOrders,
  updateOrderStatus,
  cancelOrder
};
