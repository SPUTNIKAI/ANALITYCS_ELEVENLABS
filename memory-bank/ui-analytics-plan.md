# Детальный план разработки UI для аналитики ElevenLabs

## Вводные и UX-требования (согласовано)
- **Фильтр по дате**: да (от/до)
- **Кнопка запуска анализа необработанных**: нет
- **Пагинация**: 20 записей на страницу
- **Дашборд с общей статистикой**: нет
- **Основные параметры** (в списке и деталях): всё, что приходит от ИИ и пишется в БД + явные поля:
  - Дата/время звонка, ID агента, conversation_id
  - Статус обработки (если доступно), флаги: has_audio, has_user_audio, has_response_audio
  - Результаты LLM: topic, intent, quality, outcome, summary_ru, recommendations, client_name, phone
  - Полный транскрипт разговора (как текст)
- **Экспорт**: нет
- **Тема**: светлая, **стиль**: минималистичный
- **Цвета качества (1–5)**: 1–2 — красный; 3 — синий; 4–5 — зелёный

---

## Фаза 1: Backend API (новые эндпоинты)

### 1.1 Список событий
- Файл: `src/routes/events.js`
- Эндпоинт: `GET /api/events`
- Query-параметры: `page` (1), `limit` (20), `dateFrom` (ISO), `dateTo` (ISO), `agentId` (опц.)
- Ответ (пример):
```json
{
  "data": [
    {
      "id": 1,
      "event_timestamp": 1730707200,
      "agent_id": "agent-123",
      "conversation_id": "conv-456",
      "topic": "недвижимость",
      "quality": 4,
      "outcome": "оставил контакт",
      "client_name": "Иван",
      "phone": "+375291234567",
      "received_at": "2025-11-03T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

### 1.2 Детали события
- Эндпоинт: `GET /api/events/:id`
- Ответ (пример):
```json
{
  "event": {
    "id": 1,
    "event_timestamp": 1730707200,
    "agent_id": "agent-123",
    "conversation_id": "conv-456",
    "status": "completed",
    "has_audio": true,
    "has_user_audio": true,
    "has_response_audio": true,
    "received_at": "2025-11-03T10:00:00Z",
    "processed_at": "2025-11-03T10:01:00Z",
    "transcript": [
      { "role": "agent", "message": "Здравствуйте!" },
      { "role": "user", "message": "Добрый день" }
    ]
  },
  "analysis": {
    "id": 1,
    "model": "gpt-5",
    "result": {
      "topic": "недвижимость",
      "intent": "покупка квартиры",
      "quality": 4,
      "outcome": "оставил контакт",
      "summary_ru": "Клиент интересовался...",
      "recommendations": "Перезвонить клиенту...",
      "client_name": "Иван",
      "phone": "+375291234567"
    },
    "created_at": "2025-11-03T10:01:00Z"
  }
}
```

---

## Фаза 2: Frontend (React + Vite + shadcn/ui)

### 2.1 Структура проекта
```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/
│   │   ├── ui/
│   │   ├── EventsTable.jsx
│   │   ├── EventDetailsModal.jsx
│   │   ├── DateFilter.jsx
│   │   ├── Pagination.jsx
│   │   └── QualityBadge.jsx
│   ├── lib/
│   │   ├── api.js
│   │   └── utils.js
│   └── styles/
│       └── globals.css
```

### 2.2 Зависимости
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@tanstack/react-query": "^5.0.0",
    "date-fns": "^3.0.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### 2.3 Компоненты shadcn/ui
- Table, Dialog, Badge, Button, Calendar, Popover, Card, Skeleton

---

## Фаза 3: Компоненты UI

### 3.1 `EventsTable.jsx`
- Колонки: Дата/Время, Agent ID, Topic, Quality, Outcome, Client, Phone
- Клик по строке → открытие модального окна
- Скелетоны на загрузке
- Качество — цветной бейдж: 1–2 красный, 3 синий, 4–5 зелёный

### 3.2 `EventDetailsModal.jsx`
- Блоки:
  1) Метаданные: conversation_id, agent_id, флаги has_*; received_at, processed_at
  2) Результаты анализа: topic, intent, quality, outcome, summary_ru, recommendations, client_name, phone
  3) Полный транскрипт (прокручиваемая область, простое разделение по ролям)

### 3.3 `DateFilter.jsx`
- Два поля (От/До) на Calendar+Popover, кнопка «Сбросить»
- Автоприменение при выборе

### 3.4 `Pagination.jsx`
- Первая/Предыдущая/Номера/Следующая/Последняя, «Показано X–Y из Z»
- Страница по умолчанию: 1, лимит: 20

### 3.5 `QualityBadge.jsx`
- 1–2: `bg-red-100 text-red-800 border-red-200`
- 3: `bg-blue-100 text-blue-800 border-blue-200`
- 4–5: `bg-green-100 text-green-800 border-green-200`

---

## Фаза 4: API-клиент и состояние

### 4.1 `src/lib/api.js`
```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const eventsApi = {
  getEvents: async ({ page, limit, dateFrom, dateTo, agentId }) => {
    const params = new URLSearchParams({
      page: page || 1,
      limit: limit || 20,
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
      ...(agentId && { agentId })
    });
    const response = await fetch(`${API_BASE}/api/events?${params}`);
    return response.json();
  },
  getEventDetails: async (id) => {
    const response = await fetch(`${API_BASE}/api/events/${id}`);
    return response.json();
  }
};
```

### 4.2 React Query hooks
```javascript
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../lib/api';

export const useEvents = (filters) =>
  useQuery({ queryKey: ['events', filters], queryFn: () => eventsApi.getEvents(filters) });

export const useEventDetails = (id) =>
  useQuery({ queryKey: ['event', id], queryFn: () => eventsApi.getEventDetails(id), enabled: !!id });
```

---

## Фаза 5: Главная страница (`App.jsx`)
- Хедер: «Аналитика звонков ElevenLabs»
- Фильтры: [Дата от] [Дата до] [Сбросить]
- Таблица событий (клик → модалка)
- Пагинация (лимит 20)
- Состояние: `dateFrom`, `dateTo`, `currentPage`, `selectedEventId`

---

## Фаза 6: Стилизация
- Светлая тема: `bg-gray-50`, карточки `bg-white border-gray-200`
- Текст: основной `text-gray-900`, вторичный `text-gray-600`
- Акцент: `blue-600`
- Минималистично: минимум теней/эффектов
- Адаптивность: базовая, desktop-first

---

## Фаза 7: Интеграция с backend
- В `server.js`: включить CORS для фронтенда, подключить роутер `/api/events`
- Опционально: раздача статики фронтенда
- `.env`:
```
PORT=3000
DATABASE_URL=...
VITE_API_URL=http://localhost:3000
```

---

## Оценка времени
| Фаза | Задача | Время |
|------|--------|-------|
| 1 | Backend API endpoints | 2–3 ч |
| 2 | Инициализация фронтенда | 1–2 ч |
| 3 | Компоненты UI | 4–6 ч |
| 4 | API клиент и hooks | 1–2 ч |
| 5 | Главная страница | 2–3 ч |
| 6 | Стилизация | 1–2 ч |
| 7 | Интеграция | 1–2 ч |
|  |  | **Итого: 12–20 ч** |


