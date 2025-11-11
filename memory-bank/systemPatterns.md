# System Patterns

Архитектура:
- HTTP-сервер (Node.js/Express или Fastify) с `POST /webhook/elevenlabs`
- Middleware для чтения сырого тела запроса (raw) для проверки подписи
- Модуль проверки подписи HMAC SHA-256 (`timestamp.rawBody`)
- Абстракция хранилища событий (`eventStore`) для БД/файла
 - LLM-анализатор транскрипта (OpenAI) + Bottleneck для троттлинга
 - Писатель CRM Markdown (`crmWriter`) для записи результатов анализа в `memory-bank/crm.md`
 - Отправитель в БПМсофт (best‑effort, ретраи, фича‑флаг)

Ключевые решения:
- Строгая проверка подписи и допустимого окна времени
- Немедленный ответ `200 OK` после успешного приёма и записи
- Идемпотентность по `event_id` (если доступно) и таймштампам
 - Очередь на основе БД: необработанные события (`processed=false`) → worker (Bottleneck)

Поток:
- router → rawBodyMiddleware → verifySignature → parseJSON → storeEvent → (background: analyze → save analyses.result{topic,intent,quality,outcome,summary_ru,recommendations,client_name,phone} → write CRM md → send BPMsoft) → 200 OK

Наблюдаемость:
- Структурированные логи; correlation id из заголовков, уровень debug для подписи
 - Ошибки записи в CRM md не блокируют основной поток (логируются как предупреждения)
 - DEBUG‑флаг включает подробные логи по всем этапам (webhook/store/analyze/llm/send)
