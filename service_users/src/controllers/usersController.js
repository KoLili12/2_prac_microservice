const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const logger = require('../config/logger');
const { successResponse, errorResponse } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Регистрация нового пользователя
 */
const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Проверка существования пользователя
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      logger.warn({ email }, 'User already exists');
      return errorResponse('USER_EXISTS', 'User with this email already exists', res, 409);
    }

    // Хеширование пароля
    const passwordHash = await bcrypt.hash(password, 10);

    // Создание пользователя
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, roles)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, roles, created_at`,
      [email, passwordHash, name, ['user']]
    );

    const user = result.rows[0];
    logger.info({ userId: user.id, email: user.email }, 'User registered successfully');

    return successResponse(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        createdAt: user.created_at
      },
      res,
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Вход пользователя
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Поиск пользователя
    const result = await pool.query(
      'SELECT id, email, password_hash, name, roles FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      logger.warn({ email }, 'Login failed: user not found');
      return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', res, 401);
    }

    const user = result.rows[0];

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      logger.warn({ userId: user.id, email }, 'Login failed: invalid password');
      return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', res, 401);
    }

    // Генерация JWT токена
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roles: user.roles
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info({ userId: user.id, email: user.email }, 'User logged in successfully');

    return successResponse(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles
        }
      },
      res
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Получение текущего профиля
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT id, email, name, roles, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return errorResponse('USER_NOT_FOUND', 'User not found', res, 404);
    }

    const user = result.rows[0];

    return successResponse(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      res
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Обновление профиля
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (email) {
      // Проверка уникальности email
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );

      if (existingUser.rows.length > 0) {
        return errorResponse('EMAIL_EXISTS', 'Email already in use', res, 409);
      }

      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}
       RETURNING id, email, name, roles, created_at, updated_at`,
      values
    );

    const user = result.rows[0];
    logger.info({ userId: user.id }, 'User profile updated');

    return successResponse(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      res
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Получение списка пользователей (только для админа)
 */
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const roleFilter = req.query.role;

    let query = 'SELECT id, email, name, roles, created_at, updated_at FROM users';
    let countQuery = 'SELECT COUNT(*) FROM users';
    const values = [];
    let paramCount = 1;

    // Фильтр по роли
    if (roleFilter) {
      const whereClause = ` WHERE $${paramCount} = ANY(roles)`;
      query += whereClause;
      countQuery += whereClause;
      values.push(roleFilter);
      paramCount++;
    }

    // Подсчет общего количества
    const countResult = await pool.query(countQuery, values.slice(0, paramCount - 1));
    const total = parseInt(countResult.rows[0].count);

    // Получение пользователей с пагинацией
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    return successResponse(
      {
        users: result.rows.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
          createdAt: user.created_at,
          updatedAt: user.updated_at
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

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  getUsers
};
