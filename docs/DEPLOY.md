# Размещение на российском хостинге: домен и HTTPS

Сайт — это одно Node.js-приложение с файловой базой SQLite. Ему не нужны
дорогие облака: достаточно минимального VPS.

---

## 1. Что понадобится (и сколько это стоит)

| Компонент | Вариант | Стоимость |
|---|---|---|
| VPS 1 vCPU / 1–2 ГБ | Timeweb Cloud, Beget VPS, REG.RU, Selectel | ~200–400 ₽/мес |
| Домен .ru | любой аккредитованный регистратор | ~200–600 ₽/год |
| SSL-сертификат | Let's Encrypt через Caddy | бесплатно, авто-продление |
| ОС на сервере | Ubuntu 22.04/24.04 | бесплатно |
| Caddy (веб-сервер + HTTPS) | официальный пакет | бесплатно |
| PM2 (автозапуск Node) | npm | бесплатно |

Итого: **~250–450 ₽/мес**. Платных подписок и обязательных внешних сервисов нет.

Подойдёт ли обычный shared-хостинг (только PHP)? Нет — приложению нужен
Node.js. Если провайдер предлагает «хостинг с Node.js» — уточните, что
поддерживается `npm run build` и долгоживущий процесс; чаще всего это
равноценно дешёвому VPS.

## 2. Подготовка сервера (Ubuntu)

```bash
# Обновления и базовые пакеты
apt update && apt upgrade -y
apt install -y curl git

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # ожидается v20.x

# (Альтернатива — Bun: curl -fsSL https://bun.sh/install | bash)

# PM2 — менеджер процессов
npm install -g pm2

# Caddy — веб-сервер с автоматическим HTTPS
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

## 3. Домен

1. Купите домен у регистратора (REG.RU, Timeweb, nic.ru и т. д.).
2. В DNS-панели создайте **A-запись**: `@ → IP вашего сервера`
   (и `www → IP`, если нужен поддомен www).
3. Дождитесь обновления DNS (обычно 10 минут – 2 часа):
   `ping вашдомен.ru` должен показывать IP сервера.

## 4. Загрузка сайта на сервер

```bash
# Вариант А: через git (рекомендуется)
cd /var/www && git clone <ваш-репозиторий> pravo-site && cd pravo-site

# Вариант Б: просто скопировать каталог проекта
scp -r ./pravo-site user@сервер:/var/www/

cd /var/www/pravo-site

# Зависимости и сборка
npm install
npx prisma db push

# .env (продакшн-значения)
# Полный шаблон переменных — в .env.example (включая SMTP, см. docs/EMAIL-SMTP.md).
# SITE_URL обязателен: из него формируются canonical, sitemap.xml и Open Graph.
cat > .env << 'EOF'
DATABASE_URL=file:/var/www/pravo-site/db/app.db
SITE_URL=https://вашдомен.ru
NODE_ENV=production
EOF

# Сборка продакшен-версии
npm run build

# Создание администратора (однократно)
ADMIN_EMAIL="ваш@email.ru" ADMIN_PASSWORD="СложныйПароль!" npx tsx prisma/seed.ts
# (или bun prisma/seed.ts при использовании Bun)
```

> В package.json скрипт `build` собирает standalone-версию Next.js,
> а `start` запускает её: `NODE_ENV=production bun .next/standalone/server.js`.
> Если Bun на сервере не используется, замените start на
> `node .next/standalone/server.js` — обе команды эквивалентны.

## 5. Автозапуск через PM2

```bash
pm2 start npm --name pravo-site -- start
pm2 save          # сохранить список процессов
pm2 startup        # автозапуск после перезагрузки сервера (выполнить выведенную команду)
pm2 logs pravo-site   # смотреть логи
pm2 restart pravo-site  # перезапуск после обновления
```

## 6. Caddy: обратный прокси + бесплатный HTTPS

Создайте `/etc/caddy/Caddyfile`:

```
вашдомен.ru, www.вашдомен.ru {
    reverse_proxy localhost:3000
    encode gzip
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

```bash
systemctl reload caddy
```

Caddy **сам** получит и будет продлевать сертификаты Let's Encrypt —
никаких certbot и ручных действий. Через минуту сайт откроется по
`https://вашдомен.ru`.

## 7. После запуска: чек-лист

1. Откройте `https://вашдомен.ru` — главная страница.
2. `/admin/login` — войдите, смените временные материалы.
3. Настройки → «Адрес сайта» = `https://вашдомен.ru` (нужен для canonical/sitemap).
4. Проверьте `https://вашдомен.ru/sitemap.xml` и `/robots.txt`.
5. Добавьте сайт в [Яндекс Вебмастер](https://webmaster.yandex.ru):
   - возьмите код верификации (meta-тег), вставьте в Настройки → SEO →
     «Код верификации Яндекс Вебмастера», сохраните, подтвердите в Вебмастере;
   - там же укажите `https://вашдомен.ru/sitemap.xml`.
6. То же самое в [Google Search Console](https://search.google.com/search-console).
7. Создайте счётчик [Яндекс Метрики](https://metrika.yandex.ru) и вставьте
   его номер в Настройки → «Номер счётчика Яндекс Метрики».

## 8. Обновление сайта (новая версия кода)

```bash
cd /var/www/pravo-site
git pull                  # или загрузите новые файлы
npm install               # если менялись зависимости
npx prisma db push        # если менялась схема БД (не теряет данные)
npm run build
pm2 restart pravo-site
```

## 9. Перенос на другой сервер

Скопируйте три вещи:
1. каталог проекта (без `node_modules` и `.next`),
2. файл базы `db/app.db`,
3. каталог `uploads/`.

На новом сервере повторите шаги 2–6 — сайт поднимется с тем же контентом.

## 10. Если что-то не работает

| Симптом | Причина и решение |
|---|---|
| 502 Bad Gateway | Node-процесс не запущен: `pm2 status`, `pm2 logs pravo-site` |
| Сайт не получает HTTPS | DNS ещё не обновился или 80/443 порт закрыт: `ufw allow 80,443` |
| Картинки не открываются | Проверьте, что каталог `uploads/` перенесён и права на чтение есть |
| Ошибка базы | Проверьте `DATABASE_URL` в .env и наличие каталога `db/` |
| Не приходят письма о обращениях | Обращения всё равно видны в админке; проверьте SMTP_* в .env и перезапустите PM2 |
