# Документация API

Полная OpenAPI 3.0 спецификация для микросервисной системы управления заказами.

## Файлы

- **openapi.yaml** - OpenAPI спецификация в формате YAML

## Просмотр документации

### Онлайн просмотр

Самый простой способ - использовать онлайн инструменты:

1. **Swagger Editor** (рекомендуется)
   - Перейдите на https://editor.swagger.io
   - Скопируйте содержимое `openapi.yaml` в редактор
   - Увидите интерактивную документацию справа

2. **Swagger UI Online**
   - Перейдите на https://petstore.swagger.io
   - Вставьте путь к вашему openapi.yaml

### Локальный просмотр

#### Способ 1: С помощью Swagger UI (Docker)

```bash
docker run -p 8080:8080 \
  -e SWAGGER_JSON=/docs/openapi.yaml \
  -v $(pwd)/docs:/docs \
  swaggerapi/swagger-ui
```

Откройте http://localhost:8080

#### Способ 2: С помощью Redoc

```bash
npm install -g redoc-cli
redoc-cli serve docs/openapi.yaml
```

Откройте http://localhost:8080

#### Способ 3: VSCode расширение

1. Установите расширение "OpenAPI (Swagger) Editor"
2. Откройте файл `openapi.yaml`
3. Нажмите `Shift+Alt+P` (Windows/Linux) или `Shift+Option+P` (Mac)
4. Выберите "OpenAPI: Show preview"

## Структура API

### Базовые URL

- **Development**: `http://localhost:8000` (API Gateway)
- **Users Service**: `http://localhost:3001` (прямой доступ)
- **Orders Service**: `http://localhost:3002` (прямой доступ)

### Эндпоинты

#### Пользователи

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| POST | `/v1/users/register` | Регистрация | Нет |
| POST | `/v1/users/login` | Вход | Нет |
| GET | `/v1/users/profile` | Получение профиля | Да |
| PUT | `/v1/users/profile` | Обновление профиля | Да |
| GET | `/v1/users` | Список пользователей (admin) | Да |

#### Заказы

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| POST | `/v1/orders` | Создание заказа | Да |
| GET | `/v1/orders` | Список заказов | Да |
| GET | `/v1/orders/:id` | Получение заказа | Да |
| PATCH | `/v1/orders/:id/status` | Обновление статуса | Да |
| DELETE | `/v1/orders/:id` | Отмена заказа | Да |

#### Здоровье

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| GET | `/health` | Проверка состояния | Нет |
| GET | `/status` | Статус сервиса | Нет |

## Аутентификация

API использует JWT (JSON Web Tokens) для аутентификации.

### Получение токена

1. Зарегистрируйтесь: `POST /v1/users/register`
2. Войдите: `POST /v1/users/login`
3. Сохраните полученный токен из поля `data.token`

### Использование токена

Добавьте заголовок `Authorization` ко всем защищенным запросам:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

Пример с curl:

```bash
curl -X GET http://localhost:8000/v1/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Rate Limiting

API Gateway применяет ограничение частоты запросов:

- **Общий лимит**: 100 запросов за 15 минут с одного IP
- **Auth лимит**: 5 попыток входа/регистрации за 15 минут с одного IP

Заголовки ответа:
- `RateLimit-Limit` - максимум запросов
- `RateLimit-Remaining` - оставшиеся запросы
- `RateLimit-Reset` - время сброса лимита

## Формат ответов

### Успешный ответ

```json
{
  "success": true,
  "data": {
    // данные ответа
  }
}
```

### Ошибка

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

### Коды ошибок

| Код | Описание |
|-----|----------|
| `VALIDATION_ERROR` | Ошибка валидации входных данных |
| `UNAUTHORIZED` | Требуется аутентификация |
| `INVALID_TOKEN` | Невалидный или истекший токен |
| `FORBIDDEN` | Недостаточно прав |
| `NOT_FOUND` | Ресурс не найден |
| `USER_EXISTS` | Пользователь уже существует |
| `INVALID_CREDENTIALS` | Неверные учетные данные |
| `RATE_LIMIT_EXCEEDED` | Превышен лимит запросов |
| `SERVICE_UNAVAILABLE` | Сервис временно недоступен |
| `INTERNAL_ERROR` | Внутренняя ошибка сервера |

## Примеры использования

### Регистрация и вход

```bash
# Регистрация
curl -X POST http://localhost:8000/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "Иван Иванов"
  }'

# Вход
curl -X POST http://localhost:8000/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Работа с заказами

```bash
# Создание заказа
curl -X POST http://localhost:8000/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "items": [
      {
        "product": "Кирпич красный",
        "quantity": 1000,
        "price": 15.50
      }
    ]
  }'

# Получение списка заказов
curl -X GET "http://localhost:8000/v1/orders?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Обновление статуса заказа
curl -X PATCH http://localhost:8000/v1/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "in_progress"
  }'
```

## Валидация спецификации

Проверьте валидность OpenAPI спецификации:

```bash
# С помощью swagger-cli
npm install -g @apidevtools/swagger-cli
swagger-cli validate docs/openapi.yaml

# С помощью онлайн валидатора
# Загрузите файл на https://apitools.dev/swagger-parser/online/
```

## Генерация клиентов

Используйте OpenAPI Generator для генерации клиентских библиотек:

```bash
# JavaScript
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g javascript \
  -o ./client-js

# Python
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g python \
  -o ./client-python

# TypeScript Axios
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g typescript-axios \
  -o ./client-ts
```

## Импорт в Postman

1. Откройте Postman
2. File → Import
3. Выберите файл `openapi.yaml`
4. Постман автоматически создаст коллекцию со всеми эндпоинтами

## Поддержка

При возникновении вопросов по API, обратитесь к команде разработки ООО «СистемаКонтроля».
