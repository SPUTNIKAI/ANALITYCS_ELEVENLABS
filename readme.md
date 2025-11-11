# ANALITYCS_ELEVENLABS

Сервер для приёма POST вебхуков ElevenLabs после завершения разговора агента.

## Запуск

1. Установите зависимости:
```bash
npm install
```
2. Создайте `.env` по образцу:
```bash
cp .env.example .env
```
3. Запустите сервер:
```bash
npm start
```

## Эндпоинты
- `POST /webhook/elevenlabs` — приём вебхуков (требует заголовок `ElevenLabs-Signature`)
- `GET /health` — проверка живости

## Подпись
- Формат заголовка: `t=TIMESTAMP, s=HMAC_HEX`
- Сообщение для HMAC: `${timestamp}.${rawBody}` (сырой JSON)
- Алгоритм: HMAC SHA-256, секрет `WEBHOOK_SECRET`
- Допуск времени: `WEBHOOK_TOLERANCE_SEC` (по умолчанию 1800)

## Логи
- События пишутся в `logs/events.jsonl` (JSONL)

## Аналитика LLM
- Переменные окружения:
  - `OPENAI_API_KEY` — ключ для OpenAI
  - `ANALYZE_MODEL` — модель (по умолчанию `gpt-5`)
  - `ANALYZE_AUTO` — автоанализ входящих событий (`true`/`false`)
  - `ANALYZE_MAX_CONCURRENCY` / `ANALYZE_MIN_MS` — троттлинг

## Экспорт в CRM Markdown
- Результаты анализа дополнительно пишутся в `memory-bank/crm.md`
- Управление:
  - `CRM_MD_ENABLED` — включить запись (`true` по умолчанию)
  - `CRM_MD_PATH` — путь к целевому markdown (по умолчанию `memory-bank/crm.md`)

## Внешняя CRM (БПМсофт / bpmsoft) — отправка аналитики
- Включение: `EXTERNAL_CRM_ENABLED=true`
- Настройки:
  - `CRM_SERVICE_URL` — URL `.../ServiceModel/GeneratedObjectWebFormService.svc/SaveWebFormObjectData`
  - `CRM_LANDING_ID` — GUID лендинга
  - `CRM_BASIC_AUTH_USER` / `CRM_BASIC_AUTH_PASS` — (опционально) basic auth
  - `CRM_TIMEOUT_MS` — таймаут запроса (по умолчанию 8000)
  - `CRM_MAX_RETRIES` — число ретраев при ошибках (по умолчанию 2)
- Поля отправки формируются как массивы `fields` и `contactFields` (name/value), совместимые с примерами из БПМсофт. В комментарий (`Commentary` / `UsrQualificationComment`) добавляется краткая аналитика: тема, намерение, оценка, итог, резюме, рекомендации, а также идентификаторы события/агента/диалога.

## Отладка
- `DEBUG=true` — включает подробные логи пайплайна (webhook → store → analyze → write/send).