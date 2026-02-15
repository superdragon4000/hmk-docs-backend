# HMK Docs Backend (NestJS MVP)

MVP backend для платного доступа к PDF-каталогам спецтехники.

## Что реализовано

- NestJS + TypeORM + PostgreSQL
- JWT access + refresh без `passport`
- Регистрация/логин по email
- Подписки `1 день` и `7 дней`
- Оплата через YooKassa
- Идемпотентная обработка webhook + фоновая сверка pending-платежей
- Активация подписки в транзакции
- Доступ к PDF только при активной подписке
- Короткоживущие ссылки на PDF (60 сек)
- Email-уведомления через Nodemailer
- Swagger: `/docs`
- Валидация входных данных

## Быстрый запуск

```bash
cp .env.example .env
npm install
npm run migration:run
npm run seed:catalogs
npm run start:dev
```

API: `http://localhost:3000/api`
Swagger: `http://localhost:3000/docs`

## Миграции

```bash
npm run migration:run
npm run migration:revert
npm run migration:generate
```

`DB_SYNC` должен быть `false`.

## Seed каталогов

В репозитории есть демо PDF:

- `storage/catalogs/hidromek-hmk220lc-gen1.pdf`
- `storage/catalogs/hidromek-hmk220lc-gen2.pdf`
- `storage/catalogs/hidromek-hmk102b-alpha.pdf`

Заполнение таблицы `catalogs`:

```bash
npm run seed:catalogs
```

## Ключевые endpoint'ы

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/catalogs`
- `GET /api/catalogs/:id/access-link`
- `POST /api/payments/create`
- `GET /api/subscriptions/me`

## Ограничения MVP

- Полностью исключить скачивание PDF нельзя (нет DRM).
- Для продакшена стоит добавить верификацию webhook, audit log скачиваний и лимиты по устройствам/IP.