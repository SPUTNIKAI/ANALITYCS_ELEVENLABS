# System Patterns

Архитектура:
- HTTP-сервер (Node.js/Express или Fastify) с `POST /webhook/elevenlabs`
- Middleware для чтения сырого тела запроса (raw) для проверки подписи
- Модуль проверки подписи HMAC SHA-256 (`timestamp.rawBody`)
- Абстракция хранилища событий (`eventStore`) для БД/файла

Ключевые решения:
- Строгая проверка подписи и допустимого окна времени
- Немедленный ответ `200 OK` после успешного приёма и записи
- Идемпотентность по `event_id` (если доступно) и таймштампам

Поток:
- router → rawBodyMiddleware → verifySignature → parseJSON → storeEvent → 200 OK

Наблюдаемость:
- Структурированные логи; correlation id из заголовков, уровень debug для подписи
