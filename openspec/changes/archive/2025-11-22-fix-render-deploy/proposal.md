# Change: fix-render-deploy

## Why
Деплой на Render.com падает с ошибками из-за неправильной конфигурации. Render не может найти package.json и не может аутентифицироваться в GitHub.

## What Changes
- Исправить конфигурацию render.yaml для правильного поиска package.json
- Упростить процесс деплоя без SSH ключей (сделать репозиторий публичным)
- Убедиться, что buildCommand правильно работает с нашим скриптом

## Impact
- Affected specs: deploy-config
- Affected code: render.yaml, .render-deploy.sh
- Новые файлы: упрощенная конфигурация деплоя
