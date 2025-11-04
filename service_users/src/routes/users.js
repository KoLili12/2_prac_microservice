const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { registerSchema, loginSchema, updateProfileSchema, validate } = require('../utils/validation');

/**
 * POST /v1/users/register
 * Регистрация нового пользователя
 */
router.post('/register', validate(registerSchema), usersController.register);

/**
 * POST /v1/users/login
 * Вход пользователя
 */
router.post('/login', validate(loginSchema), usersController.login);

/**
 * GET /v1/users/profile
 * Получение профиля текущего пользователя (требуется авторизация)
 */
router.get('/profile', authenticateToken, usersController.getProfile);

/**
 * PUT /v1/users/profile
 * Обновление профиля текущего пользователя (требуется авторизация)
 */
router.put('/profile', authenticateToken, validate(updateProfileSchema), usersController.updateProfile);

/**
 * GET /v1/users
 * Получение списка пользователей с пагинацией (только для админа)
 */
router.get('/', authenticateToken, requireAdmin, usersController.getUsers);

module.exports = router;
