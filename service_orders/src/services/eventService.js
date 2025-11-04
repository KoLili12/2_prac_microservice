const logger = require('../config/logger');

/**
 * Заглушка для публикации доменных событий
 * В будущем здесь будет интеграция с брокером сообщений (RabbitMQ, Kafka, etc.)
 */
class EventService {
  /**
   * Публикация события "Создан заказ"
   */
  async publishOrderCreated(order) {
    logger.info({
      event: 'ORDER_CREATED',
      orderId: order.id,
      userId: order.user_id
    }, 'Domain event: Order created');

    // TODO: Отправить событие в брокер сообщений
    // await messageBroker.publish('orders.created', order);
  }

  /**
   * Публикация события "Обновлен статус заказа"
   */
  async publishOrderStatusUpdated(order, oldStatus, newStatus) {
    logger.info({
      event: 'ORDER_STATUS_UPDATED',
      orderId: order.id,
      userId: order.user_id,
      oldStatus,
      newStatus
    }, 'Domain event: Order status updated');

    // TODO: Отправить событие в брокер сообщений
    // await messageBroker.publish('orders.status_updated', { order, oldStatus, newStatus });
  }

  /**
   * Публикация события "Заказ отменен"
   */
  async publishOrderCancelled(order) {
    logger.info({
      event: 'ORDER_CANCELLED',
      orderId: order.id,
      userId: order.user_id
    }, 'Domain event: Order cancelled');

    // TODO: Отправить событие в брокер сообщений
    // await messageBroker.publish('orders.cancelled', order);
  }
}

module.exports = new EventService();
