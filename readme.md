# HMK Docs Backend (NestJS MVP)

MVP backend для платного доступа к PDF-каталогам спецтехники.

## Что реализовано

- NestJS + TypeORM + PostgreSQL
- JWT access + refresh без `passport`
- Регистрация/логин по email
- Подписки `1 день` и `7 дней`
- Оплата через YooKassa
- Защита от сбоев при оплате:
  - платеж создается и сохраняется в БД до редиректа
  - webhook обрабатывается идемпотентно
  - фоновая сверка `pending` платежей каждую минуту
  - активация подписки в транзакции
- Доступ к PDF только при активной подписке
- Короткоживущие ссылки на PDF (60 сек)
- Throttling для API и для скачивания PDF
- Email-уведомления через Nodemailer
- Swagger: `/docs`
- Валидация входных данных (`class-validator`)

## Быстрый запуск

```bash
cp .env.example .env
npm install
npm run start:dev
```

API base: `http://localhost:3000/api`

Swagger: `http://localhost:3000/docs`

## Миграции

`DB_SYNC` должен быть `false`.

Основные команды:

```bash
npm run migration:run
npm run migration:revert
```

Если нужно сгенерировать новую миграцию после изменения entity:

```bash
npm run migration:generate
```

## Переменные окружения

Смотри `.env.example`.

Критично заполнить:

- `DB_*`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `FILE_TOKEN_SECRET`
- `YOOKASSA_SHOP_ID`
- `YOOKASSA_SECRET_KEY`
- `YOOKASSA_RETURN_URL`
- `MAIL_*`
- `ADMIN_API_KEY`

## PDF-каталоги

Файлы загружаются тобой напрямую в `CATALOG_STORAGE_DIR` (по умолчанию `./storage/catalogs`).

Далее создается запись каталога:

`POST /api/catalogs` c заголовком `x-admin-key: <ADMIN_API_KEY>` и `fileName` существующего PDF.

## Основные endpoint'ы

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh` (refresh в `Authorization: Bearer ...`)
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Payments

- `POST /api/payments/create` (`plan`: `DAY` или `WEEK`)
- `GET /api/payments/:id`
- `POST /api/payments/yookassa/webhook`

### Subscriptions

- `GET /api/subscriptions/me`

### Catalogs

- `GET /api/catalogs`
- `POST /api/catalogs` (admin)
- `GET /api/catalogs/:id/access-link`
- `GET /api/catalogs/:id/file?token=...`

## Как работает защита оплаты от падений

1. Создаем `payment` в БД со статусом `PENDING`.
2. Создаем платеж в YooKassa с `Idempotence-Key`.
3. Получаем webhook/или фоново опрашиваем YooKassa.
4. Если платеж `succeeded`, в транзакции:
   - лочим платеж,
   - меняем статус на `SUCCEEDED`,
   - активируем подписку,
   - при повторной доставке webhook повторной активации не будет.

## Ограничения MVP

- Нет watermark PDF и DRM: полностью остановить скачивание нельзя.
- Сейчас защита от массового скачивания: авторизация + активная подписка + short-lived token + throttling + отсутствие публичной статики.
- В проде лучше добавить:
  - реальную верификацию webhook по подписи/секрету провайдера,
  - audit log скачиваний,
  - лимиты по устройствам/IP,
  - queue для email и платежных событий.
