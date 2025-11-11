# Progress

Что работает:
- Memory-bank инициализирован, документы актуализированы
- Сервер вебхука с проверкой HMAC-подписи и допуском времени
- Сохранение событий в PostgreSQL (Render / локально), fallback в `logs/events.jsonl`
- Очередь анализа (Bottleneck), LLM(OpenAI GPT-5) работает и возвращает 8 полей: `topic`, `intent`, `quality`, `outcome`, `summary_ru`, `recommendations`, `client_name`, `phone`
- Сохранение результата анализа в БД (`analyses.result` jsonb)
- Экспорт результатов в `memory-bank/crm.md`
- Интеграция отправки в БПМсофт (best‑effort, фича‑флаг), в тесте отключена
- DEBUG‑логи по пайплайну; ngrok тестирование; фикса SSL для локальной БД

Что осталось сделать:
- Развертывание на Render.com (сервер+БД), настройка переменных окружения
- IP‑whitelist источников ElevenLabs, rate limiting на вебхук/админ‑роуты
- Админ‑API: список/детали событий, репроцессинг, расширенный health
- CI/CD, Dockerfile+compose для локала; базовые метрики/мониторинг
- Идемпотентность по `event_id` или хэшу `rawBody+timestamp` (upsert)
- Финализация маппинга полей в БПМсофт и включение `EXTERNAL_CRM_ENABLED=true` в проде

Известные проблемы:
- При отключённом `OPENAI_API_KEY` анализ не выполняется
- В части событий `event_id` может отсутствовать — требуется стратегия идемпотентности
