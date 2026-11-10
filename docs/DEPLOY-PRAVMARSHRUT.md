# Публикация «Правового маршрута» на домене pravmarshrut.ru

Пошаговая инструкция по самостоятельному размещению сайта на VPS.
Составлена по результатам проверки production-сборки (ноябрь 2026).
Общие сведения о хостинге — также в `docs/DEPLOY.md`, e-mail — в `docs/EMAIL-SMTP.md`,
безопасность — в `docs/SECURITY.md`, резервные копии — в `docs/BACKUP.md`.

---

## 1. Какой вариант размещения подходит

Сайт — одно Node.js-приложение (Next.js 16, standalone-выход) с файловой базой
SQLite. Никаких внешних сервисов ему не требуется: СУБД — файл, почта — SMTP
Яндекса, картинки — локальный каталог.

| Вариант | Оценка | Почему |
|---|---|---|
| **VPS (Ubuntu) — рекомендуется** | ✓ оптимально | Полный контроль, ~250–450 ₽/мес, Caddy даёт бесплатный HTTPS. Проверено: сборка и работа приложения не требуют ничего сверх VPS. |
| Vercel / зарубежные PaaS | ✗ не рекомендуется | Оплата из России затруднена; SQLite на бессерверных платформах не персистентен; домен .ru + российские юртребования проще закрывать своим сервером. |
| Shared-хостинг (PHP) | ✗ не подходит | Приложению нужен долгоживущий Node.js-процесс и `npm run build`. |
| «Хостинг с Node.js» у Beget и т. п. | ○ допустимо | Равноценно дешёвому VPS; уточните поддержку `npm run build` и постоянного процесса. |

**Рекомендация: минимальный VPS 1 vCPU / 2 ГБ RAM / NVMe у российского
провайдера (Timeweb Cloud, Beget, REG.RU, Selectel) + Caddy для HTTPS.**

## 2. Требования к серверу

| Компонент | Требование | Примечание |
|---|---|---|
| ОС | Ubuntu 22.04 / 24.04 LTS | также подойдут Debian 12 |
| CPU | 1 vCPU | достаточно для контентного сайта |
| RAM | **2 ГБ** (минимум 1 ГБ + swap 2 ГБ) | сборка Next.js на 1 ГБ без swap может падать по памяти |
| Диск | 10 GB NVMe | код ~200 МБ, база и картинки растут медленно |
| Сеть | открытые порты 80, 443, 22 | для HTTPS и доступа по SSH |
| Node.js | **20 LTS или 22 LTS** (≥ 20.9) | Next.js 16 не работает на Node 18 |
| Bun | не обязателен | есть равнозначный запуск через `node` (см. ниже) |
| База данных | SQLite (файл) через Prisma | устанавливать СУБД не нужно |
| Процесс-менеджер | PM2 | автозапуск и перезапуск |
| Веб-сервер | Caddy | обратный прокси + автоматический Let's Encrypt |

## 3. Как это работает

```
Интернет ──► Caddy (:80/:443, автоматический HTTPS) ──► Node.js/Next.js (:3000) ──► SQLite (db/app.db)
                                                  └── media-файлы из uploads/
```

Caddy терминирует HTTPS и проксирует запросы на Node-процесс; автоматически
получает и продлевает сертификаты Let's Encrypt.

## 4. Переменные окружения (.env)

Файл `.env` создаётся на сервере в корне проекта. Полный шаблон — `.env.example`.

| Переменная | Обязательна | Значение для pravmarshrut.ru |
|---|---|---|
| `DATABASE_URL` | да | `file:/var/www/pravmarshrut/db/app.db` (абсолютный путь!) |
| `SITE_URL` | да | `https://pravmarshrut.ru` — из него формируются canonical, sitemap.xml, robots.txt, Open Graph |
| `NODE_ENV` | да | `production` |
| `UPLOAD_DIR` | рекомендуется | `/var/www/pravmarshrut/uploads` — абсолютный путь, чтобы каталог картинок не зависел от каталога запуска |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | только при первом сидинге | данные первого администратора; после входа пароль сменить |
| `SMTP_HOST` | для писем | `smtp.yandex.ru` |
| `SMTP_PORT` | для писем | `465` |
| `SMTP_USER` | для писем | `documentonline.direct@yandex.ru` |
| `SMTP_PASSWORD` | для писем | пароль приложения Яндекса (не основной пароль!) |
| `SMTP_FROM` | для писем | `documentonline.direct@yandex.ru` |
| `FEEDBACK_TO_EMAIL` | для писем | `documentonline.direct@yandex.ru` |
| `SITE_NAME` | нет | `Правовой маршрут` (название в теме писем) |
| `MAX_UPLOAD_MB` | нет | лимит загрузки картинок, по умолчанию 5 |

> Без `SITE_URL` сайт работает, но в canonical/sitemap подставляется хост из
> заголовков запроса — на реальном домене обязательно задайте переменную,
> а после запуска продублируйте адрес в админ-панели: «Настройки» → «Адрес сайта»
> (значение админки имеет приоритет).

> **Важно (проверено на production-сборке):** standalone-сервер Next.js читает
> `.env` из каталога `.next/standalone/`, а не из корня проекта. Поэтому после
> любого изменения `.env` выполните `npm run build` (сборка сама копирует файл)
> **или** скопируйте его вручную и перезапустите:
> ```bash
> cp .env .next/standalone/.env && pm2 restart pravmarshrut
> ```
> Альтернатива — передавать переменные напрямую процессу (ecosystem-файл PM2):
> переменные окружения процесса имеют высший приоритет и всегда читаются.

## 5. Пошаговое размещение

### Шаг 1. DNS

У регистратора домена создайте записи (IP — адрес вашего VPS):

```
A    @    → 203.0.113.10    (pravmarshrut.ru)
A    www  → 203.0.113.10    (www.pravmarshrut.ru — для редиректа на основной)
```

Проверка: `ping pravmarshrut.ru` должен отвечать IP сервера (DNS обновляется
от 10 минут до нескольких часов).

### Шаг 2. Подготовка сервера

```bash
ssh root@203.0.113.10

# Обновления и базовые пакеты
apt update && apt upgrade -y
apt install -y curl git ufw

# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v    # ожидается v22.x

# PM2 (процесс-менеджер)
npm install -g pm2

# Caddy (веб-сервер с автоматическим HTTPS)
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

# Файрвол: SSH, HTTP, HTTPS
ufw allow OpenSSH && ufw allow 80,443/tcp && ufw --force enable

# Если RAM 1 ГБ — добавьте swap (для сборки):
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Шаг 3. Загрузка кода

```bash
mkdir -p /var/www/pravmarshrut && cd /var/www/pravmarshrut

# Вариант А: git (если репозиторий опубликован на GitHub/GitLab)
git clone https://github.com/ВЫ/pravmarshrut.git .

# Вариант Б: архивом со своего компьютера
#   локально:  scp pravmarshrut-source.tar.gz root@203.0.113.10:/var/www/
#   на сервере:
tar -xzf /var/www/pravmarshrut-source.tar.gz -C /var/www/pravmarshrut
```

### Шаг 4. .env

```bash
cd /var/www/pravmarshrut
cat > .env << 'EOF'
DATABASE_URL=file:/var/www/pravmarshrut/db/app.db
SITE_URL=https://pravmarshrut.ru
NODE_ENV=production
UPLOAD_DIR=/var/www/pravmarshrut/uploads
SITE_NAME=Правовой маршрут

# Письма о обращениях (можно добавить позже, см. docs/EMAIL-SMTP.md)
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=documentonline.direct@yandex.ru
SMTP_FROM=documentonline.direct@yandex.ru
SMTP_PASSWORD=ПАРОЛЬ_ПРИЛОЖЕНИЯ_ЯНДЕКСА
FEEDBACK_TO_EMAIL=documentonline.direct@yandex.ru
EOF
chmod 600 .env   # читать только владельцу
```

### Шаг 5. Зависимости и база данных

```bash
cd /var/www/pravmarshrut
npm install            # или npm ci
mkdir -p db uploads
npx prisma db push     # создаёт таблицы; данные не теряет

# Первый администратор (однократно; на пустой базе)
ADMIN_EMAIL="ваш@почта.ru" ADMIN_PASSWORD="СложныйПароль!" npx tsx prisma/seed.ts
# сид также создаст 14 категорий, настройки и 4 тестовые статьи (флаг «тестовая»,
# удаляются в админ-панели). Чтобы не создавать тестовые статьи — просто
# удалите их в админке после первого входа.

# Картинки 14 категорий (из scripts/generated-categories → медиатека)
npx tsx scripts/register_category_images.ts
```

### Шаг 6. Сборка и запуск

```bash
cd /var/www/pravmarshrut
npm run build          # standalone-сборка + копирование static/public

# Автозапуск через PM2 (запуск через node, Bun не нужен)
pm2 start "node .next/standalone/server.js" --name pravmarshrut --time
pm2 save
pm2 startup            # выполнить команду, которую pm2 выведет в консоль
pm2 logs pravmarshrut  # логи; выход — Ctrl+C
```

> В `package.json` есть и штатный скрипт `npm start` — он использует Bun.
> На сервере без Bun указанная выше команда `pm2 start "node …"` полностью
> равнозначна. Порт по умолчанию — 3000 (`PORT=3100` можно задать в .env).

### Шаг 7. Caddy: HTTPS и домен

Создайте `/etc/caddy/Caddyfile` (замените ничего не нужно — домен уже вписан):

```caddy
pravmarshrut.ru {
    reverse_proxy localhost:3000
    encode gzip
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}

# www → основной адрес
www.pravmarshrut.ru {
    redir https://pravmarshrut.ru{uri} permanent
}
```

```bash
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Через 1–2 минуты Caddy сам получит сертификаты Let's Encrypt для обоих имён.
Сайт откроется по **https://pravmarshrut.ru**, а `www.pravmarshrut.ru` будет
редиректить на основной адрес (важно для SEO — один канонический хост).

### Шаг 8. Проверка после запуска

```bash
curl -I https://pravmarshrut.ru/                          # 200
curl -s https://pravmarshrut.ru/sitemap.xml | head        # адреса с pravmarshrut.ru
curl -s https://pravmarshrut.ru/robots.txt                # Sitemap: https://pravmarshrut.ru/sitemap.xml
curl -sI https://www.pravmarshrut.ru/ | head -1           # 301 → https://pravmarshrut.ru/
```

В браузере:
1. `https://pravmarshrut.ru/admin/login` — войдите, **смените временный пароль**.
2. «Настройки» → «Адрес сайта» = `https://pravmarshrut.ru` → Сохранить.
3. Удалите тестовые статьи (раздел «Статьи», помечены «тестовая»).
4. Проверьте главную, «Все категории» (14 карточек с картинками), статью, поиск, форму обратной связи.

### Шаг 9. SEO после запуска

- [Яндекс Вебмастер](https://webmaster.yandex.ru): добавить сайт → верификация
  meta-тегом (код — в админке «Настройки» → SEO → «Код верификации…») →
  в разделе «Индексирование» указать `https://pravmarshrut.ru/sitemap.xml`.
- [Google Search Console](https://search.google.com/search-console): то же самое.
- [Яндекс Метрика](https://metrika.yandex.ru): создать счётчик → номер — в
  админке «Настройки» → «Номер счётчика Яндекс Метрики».

## 6. Обновление сайта

```bash
cd /var/www/pravmarshrut
git pull                        # или распакуйте новый архив
npm install                     # если менялись зависимости
npx prisma db push              # если менялась схема (данные сохраняет)
npm run build
pm2 restart pravmarshrut
```

## 7. Резервное копирование

Достаточно сохранить две вещи: `db/app.db` и каталог `uploads/` (плюс `.env`).
Подробно — `docs/BACKUP.md`. Минимальный ночной бэкап по cron:

```bash
0 4 * * * cd /var/www/pravmarshrut && sqlite3 db/app.db ".backup /var/backups/app-$(date +\%F).db" && tar -czf /var/backups/uploads-$(date +\%F).tar.gz uploads/
```

## 8. Если что-то не работает

| Симптом | Причина и решение |
|---|---|
| 502 Bad Gateway | Node-процесс не запущен: `pm2 status`, `pm2 logs pravmarshrut` |
| Нет HTTPS | DNS ещё не обновился или закрыты порты: `ufw allow 80,443/tcp`; статус: `journalctl -u caddy -f` |
| Картинки 404 | Проверьте `UPLOAD_DIR` в .env и что каталог `uploads/` с файлами существует |
| Ошибка базы | Проверьте `DATABASE_URL` (абсолютный путь) и что каталог `db/` существует |
| В canonical/sitemap localhost или IP | Задайте `SITE_URL` в .env и адрес в админке → перезапустите `pm2 restart pravmarshrut` |
| Сборка падает по памяти | Увеличьте swap (шаг 2) или соберите на машине с 2 ГБ+ |
| Письма не приходят | Обращения всё равно видны в `/admin/submissions`; проверьте SMTP_* и `pm2 restart pravmarshrut` |

## 9. Публикация исходников на GitHub

```bash
# на своём компьютере
cd pravmarshrut
git remote add origin https://github.com/ВЫ/pravmarshrut.git
git push -u origin main
```

Файл `.env` исключён из репозитория (`.gitignore`), секреты в историю
коммитов не попадали. Архив исходников без зависимостей:
`pravmarshrut-source.tar.gz` (собирается командой
`git archive --format=tar.gz -o pravmarshrut-source.tar.gz HEAD`).
