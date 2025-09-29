# ElevenLabs Webhook Specification

Источник: `https://elevenlabs.io/docs/agents-platform/workflows/post-call-webhooks`

Эндпоинт:
- `POST /webhook/elevenlabs`

Заголовки:
- `Content-Type: application/json`
- `ElevenLabs-Signature: t=TIMESTAMP, s=HMAC_HEX`

Подпись:
- Формируется по схеме HMAC SHA-256
- Сообщение: `${timestamp}.${rawBody}` (сырой JSON без изменения порядка/пробелов)
- Секрет: `WEBHOOK_SECRET`
- Отклонение времени: `WEBHOOK_TOLERANCE_SEC` (по умолчанию 1800)

Требования надёжности:
- При успешной валидации и записи события — возвращать `200 OK`
- В противном случае — соответствующий код 4xx/5xx
- Возможный IP-whitelisting для статических IP ElevenLabs

Схема полезной нагрузки (минимум):
```json
{
  "event_id": "string",
  "agent_id": "string",
  "timestamp": "ISO-8601",
  "has_audio": true,
  "has_user_audio": true,
  "has_response_audio": false,
  "conversation": {
    "turns": [
      { "speaker": "user", "text": "..." },
      { "speaker": "agent", "text": "..." }
    ]
  }
}
```

Заметки реализации:
- Использовать middleware для получения `rawBody` наряду с `req.body`
- Хранить оригинальный `rawBody` для аудита
- Идемпотентность по `event_id` если доступно
