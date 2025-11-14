 

### Тема
Интеграция отправки аналитики звонков в БПМсофт по доверенному домену (без авторизации)

### Текст письма
Здравствуйте!  
Интегрируем пост‑колл аналитику (LLM) из ElevenLabs в БПМсофт. Планируем отправлять данные на SaveWebFormObjectData «как виджет» без Basic Auth по доверенному домену.

Просим подтвердить/уточнить:

1) Целевая сущность  
- Верно ли, что «истина» — создание лида через `SaveWebFormObjectData`?  
- Или нужен иной сервис/объект (укажите endpoint/схему).

2) Поля и обязательность  
- Наш мэппинг:  
  - fields: Commentary, UsrQualificationComment, UsrTSLeadStatus, UsrQualificationTopic, UsrIntent, UsrQualityScore, UsrEventId, UsrAgentId, UsrConversationId  
  - contactFields: FullName, Phone, Email  
- Какие поля обязательны? Требуются ли доп. поля (например, UsrChannel, UsrCampaign, UTM)?  
- Требования к формату/длине телефонов и строк (маски, max length)?  
- Если предпочтителен раздельный телефон (код/номер), подтвердите поля (например, UsrPhoneNumberCode, UsrTelephoneNumberForCode).

3) Идемпотентность  
- Можно ли настроить уникальность по `UsrEventId` на вашей стороне (индекс/валидация)?  
- Какой желаемый ответ при дубликате: 200 (no‑op) или 409?

4) Авторизация/доверие  
- Достаточно ли проверки по доверенному домену через заголовок `Origin: https://mir.utlik.pro` (server‑to‑server)?  
- Нужен ли `Referer`?  
- Используете ли IP‑allowlist? Если да — мы предоставим наши prod/UAT IP.

5) Отправка без контакта  
- Допускается ли создание записи без телефона/email (только с `UsrEventId` и аналитикой)?  
- Если нет — какой минимальный набор обязателных контактных полей?

6) Технические параметры  
- Финальный endpoint и метод: подтверждаем `POST https://office.bir.by:6163/0/ServiceModel/GeneratedObjectWebFormService.svc/SaveWebFormObjectData`?  
- Лимиты/таймауты/RPS/максимальный размер тела?  
- Формат ответов при успехе/ошибке (для корректных ретраев)?  
- Требуется ли CORS для backend‑запросов или проверка Origin достаточно?

Пример полезной нагрузки (для согласования):

```json
{
  "landingId": "cd8c698b-4b42-4a47-aaf4-7a9e72a0344b",
  "fields": [
    { "name": "Commentary", "value": "Тема: ... | Намерение: ... | Качество: 4 | Итог: ... | Итог (RU): ... | Рекомендации: ... | IDs: event=123, agent=A1, conv=C1" },
    { "name": "UsrQualificationComment", "value": "..." },
    { "name": "UsrTSLeadStatus", "value": "..." },
    { "name": "UsrQualificationTopic", "value": "..." },
    { "name": "UsrIntent", "value": "..." },
    { "name": "UsrQualityScore", "value": "4" },
    { "name": "UsrEventId", "value": "123" },
    { "name": "UsrAgentId", "value": "A1" },
    { "name": "UsrConversationId", "value": "C1" }
  ],
  "contactFields": [
    { "name": "FullName", "value": "Иван Иванов" },
    { "name": "Phone", "value": "+375291234567" },
    { "name": "Email", "value": "user@example.com" }
  ]
}
```

Пример запроса (без Basic Auth, с доверенным Origin):

```bash
curl -X POST "https://office.bir.by:6163/0/ServiceModel/GeneratedObjectWebFormService.svc/SaveWebFormObjectData" \
  -H "Content-Type: application/json" \
  -H "Origin: https://mir.utlik.pro" \
  -d @payload.json
```

Данные для доверия/вайтлиста:  
- Домен: https://mir.utlik.pro  
- IP (prod/UAT): [указать]  

После подтверждения включим отправку на UAT, протестируем кейсы успех/ошибка/повтор и затем активируем в проде.

Спасибо!

— — —

- Могу сразу отправить письмо или сохранить его в `memory-bank/integrations/bpmsoft-crm.md`.

---

## План тестирования (UAT) и как просматривать данные в CRM

### 1) Подготовка окружения
- ENV на нашем сервисе:
  - `EXTERNAL_CRM_ENABLED=true`
  - `EXTERNAL_CRM_DRY_RUN=true` для первого прогона, затем `false`
  - `CRM_SERVICE_URL=https://office.bir.by:6163/0/ServiceModel/GeneratedObjectWebFormService.svc/SaveWebFormObjectData`
  - `CRM_LANDING_ID=cd8c698b-4b42-4a47-aaf4-7a9e72a0344b`
  - `CRM_TRUSTED_ORIGIN=https://mir.utlik.pro`
- Проверка БД/схемы: таблицы `webhook_events`, `analyses`, `crm_dispatches` созданы (ensureSchema).

### 2) Сценарии тестов
- Тест A (dry-run): отправляем через `POST /api/analyze` событие с транскриптом и контактами. Ожидаем: запись в БД, payload логируется как dry-run, отправки в CRM нет.
- Тест B (реальная отправка): выключаем dry-run, повторяем A. Ожидаем: ответ 200/201 от CRM, запись `success` в `crm_dispatches`.
- Тест C (нет телефона, есть email): проверяем принятие CRM. Если отклонено — фиксируем на нашей стороне валидацию.
- Тест D (повтор одного `event_id`): проверяем идемпотентность — повторная отправка не уходит (у нас), либо CRM возвращает no‑op по `UsrEventId`.
- Тест E (ресенд): `POST /api/events/:id/resend-crm?force=true` — форс‑ресенд для анализа реакции CRM (дубликаты/обновление).

### 3) Проверка результата в CRM (ожидаемое отображение)
- По умолчанию `SaveWebFormObjectData` создаёт запись в сущности, указанной в конфиге лендинга (обычно «Лид»).
- Навигация: раздел «Лиды» (или целевая сущность) → фильтр «Создано сегодня» и/или по `landingId` (если доступно в UI) → искать по полям:
  - Комментарий/Примечание: содержит конкатенацию «Тема/Намерение/Качество/Итог/Итог (RU)/Рекомендации/IDs»
  - Поля `UsrQualificationTopic`, `UsrIntent`, `UsrQualityScore`, `UsrTSLeadStatus`
  - Контакт: `FullName`, `Phone`, `Email` (если маппинг в карточке отображается)
- Рекомендуется договориться о признаке/папке:
  - Добавить вычисляемый признак/папку «Источник = LLM Analytics» (если есть поле, напр. `UsrSource`) или временную папку по `LandingId`/дате для быстрого поиска тестовых записей.

### 4) Критерии приёмки
- Успех: записи в CRM видны в целевой сущности, поля заполнены согласно мэппингу, нет дублей при повторной отправке того же `event_id`.
- Ошибки/отказы: корректно логируются у нас в `crm_dispatches` (status `error`, текст ответа), основной поток не блокируется.
- Ресенд: ручной ресенд работает и фиксируется в `crm_dispatches`.

### 5) Что нужно со стороны тех.заказчика (минимум)
- Подтвердить, где именно в CRM появляются записи из `SaveWebFormObjectData` для данного `landingId` (раздел/карточка).
- Включить/подтвердить доверие по домену `https://mir.utlik.pro` (и/или предоставить IP‑allowlist).
- Предоставить тестовую учётку/ссылку для проверки созданных записей и путь навигации в UI.
- По возможности: настроить уникальность по `UsrEventId` (или иной ключ) для жёсткой идемпотентности на стороне CRM.

### 6) Шаблон короткого сообщения для тех.заказчика (про UAT)
Здравствуйте!  
Запускаем UAT отправки аналитики в БПМсофт (через SaveWebFormObjectData).  
Параметры UAT:  
- landingId: cd8c698b-4b42-4a47-aaf4-7a9e72a0344b  
- trusted origin: https://mir.utlik.pro  
- endpoint: POST https://office.bir.by:6163/0/ServiceModel/GeneratedObjectWebFormService.svc/SaveWebFormObjectData  

Просьбы:  
1) Подтвердите, в какой секции CRM будут появляться записи (ожидаем «Лиды»).  
2) Предоставьте доступ/ссылку для проверки и путь навигации (как найти по дате/landingId).  
3) Подтвердите, что доверие по Origin включено; при необходимости укажите IP‑адреса для вайтлиста.  
4) (Опционально) Включите уникальность по полю `UsrEventId` для исключения дублей.  

С нашей стороны мы проведём серию тестов (dry‑run → реальная отправка, повтор/дубликаты, ресенд) и пришлём результаты.  
Спасибо!