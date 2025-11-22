## 1. Environment Configuration
- [ ] 1.1 Добавить переменные окружения ADMIN_USERNAME и ADMIN_PASSWORD в .env
- [ ] 1.2 Установить дефолтные значения для разработки (admin/admin123)

## 2. Authentication Middleware
- [ ] 2.1 Создать middleware функцию requireAuth для проверки сессии
- [ ] 2.2 Реализовать простую cookie-based аутентификацию
- [ ] 2.3 Добавить обработку POST /login для аутентификации

## 3. Login Page
- [ ] 3.1 Создать HTML страницу login.html с формой входа
- [ ] 3.2 Добавить базовую стилизацию формы
- [ ] 3.3 Реализовать JavaScript для отправки формы

## 4. Route Protection
- [ ] 4.1 Защитить маршрут /admin middleware requireAuth
- [ ] 4.2 Защитить маршрут /leads middleware requireAuth
- [ ] 4.3 Добавить перенаправление на /login для неавторизованных пользователей

## 5. Integration and Testing
- [ ] 5.1 Добавить маршрут GET /login для обслуживания страницы входа
- [ ] 5.2 Протестировать процесс входа/выхода
- [ ] 5.3 Проверить защиту маршрутов от неавторизованного доступа</contents>
</xai:function_call">Теперь создам design.md для объяснения архитектурных решений. 

<xai:function_call name="write">
<parameter name="file_path">openspec/changes/add-admin-auth/design.md
