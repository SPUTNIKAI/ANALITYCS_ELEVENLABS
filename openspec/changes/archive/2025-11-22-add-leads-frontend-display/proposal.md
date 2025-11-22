# Change: add-leads-frontend-display

## Why
Пользователи системы нуждаются в удобном интерфейсе для просмотра всех лидов из базы данных. Текущий admin.html предоставляет базовую таблицу, но не имеет современного UI, фильтрации, сортировки и детального просмотра лидов. Необходимо создать полноценный фронтенд для отображения лидов с аналитикой звонков.

## What Changes
- Создать новый фронтенд маршрут `/leads` для отображения всех лидов из базы данных
- Реализовать современный UI с таблицей лидов, фильтрами и поиском
- Добавить возможность просмотра детальной информации по каждому лиду
- Внедрить пагинацию и сортировку по различным полям
- **BREAKING**: Заменить текущий admin.html на новый интерфейс

## Impact
- Affected specs: leads-display
- Affected code: src/index.html (новый маршрут), src/admin.html (замена), src/routes/events.js (расширение API)
- Новые зависимости: возможно добавление клиентских библиотек для UI</contents>
</xai:function_call">Now let me create the tasks.md file. 

<xai:function_call name="write">
<parameter name="file_path">openspec/changes/add-leads-frontend-display/tasks.md
