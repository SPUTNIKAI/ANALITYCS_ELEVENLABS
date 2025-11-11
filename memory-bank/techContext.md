# Tech Context

Технологии (предварительно):
- Node.js 20+, Express или Fastify
- body-parser raw для `application/json` вебхука
- Встроенный crypto для HMAC SHA-256
- dotenv для локальной разработки
 - OpenAI SDK для LLM-аналитики
 - Render.com (сервер и управляемая PostgreSQL)

Переменные окружения:
- `WEBHOOK_SECRET` — секрет подписи
- `WEBHOOK_TOLERANCE_SEC` — допуск времени (по умолчанию 1800)
- `PORT` — порт сервера
 - `OPENAI_API_KEY` — ключ OpenAI
 - `ANALYZE_MODEL` — модель анализа (по умолчанию `gpt-5`)
 - `ANALYZE_AUTO` — автоанализ входящих событий (`true`/`false`)
 - `ANALYZE_MAX_CONCURRENCY`, `ANALYZE_MIN_MS` — троттлинг очереди
 - `CRM_MD_ENABLED` — включение записи в markdown (`true` по умолчанию)
 - `CRM_MD_PATH` — путь к `crm.md`
 - `EXTERNAL_CRM_ENABLED`, `CRM_SERVICE_URL`, `CRM_LANDING_ID`, `CRM_BASIC_AUTH_USER`, `CRM_BASIC_AUTH_PASS`, `CRM_TIMEOUT_MS`, `CRM_MAX_RETRIES`
 - `DATABASE_URL` — строка подключения к PostgreSQL (локально без SSL; на Render — с SSL)
 - `DEBUG` — включает подробные логи

Ограничения и заметки:
- Нужен доступ к сырому телу запроса до JSON-парсинга
- Обработчик вебхука должен быть быстрым, длительные задачи — асинхронно
 - Запись в markdown не должна падать весь процесс; считать её best-effort
 - Локально SSL к БД отключён автоматически; в проде (Render) — SSL включён
