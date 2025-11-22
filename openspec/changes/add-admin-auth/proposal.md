# Change: add-admin-auth

## Why
Текущие админ-страницы (`/admin` и `/leads`) доступны без аутентификации, что создает угрозу безопасности. Необходимо добавить базовую аутентификацию для защиты доступа к управлению лидами и аналитике.

## What Changes
- Добавить базовую HTTP аутентификацию для маршрутов `/admin` и `/leads`
- Создать страницу входа `/login` с формой логина/пароля
- Использовать hardcoded credentials из переменных окружения
- **BREAKING**: Доступ к админ-функциям теперь требует аутентификации

## Impact
- Affected specs: admin-auth
- Affected code: src/server.js (добавление middleware аутентификации), создание src/login.html
- Новые переменные окружения: ADMIN_USERNAME, ADMIN_PASSWORD</contents>
</xai:function_call">Теперь создам tasks.md. 

<xai:function_call name="write">
<parameter name="file_path">openspec/changes/add-admin-auth/tasks.md
