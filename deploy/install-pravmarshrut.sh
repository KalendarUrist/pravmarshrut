#!/bin/bash
# ============================================================================
# Автоустановка сайта «Правовой маршрут» на сервер (одной командой).
# Скрипт сам: получит исходники (из архива или GitHub) → установит Node.js 22,
# PM2, Caddy → создаст БД, администратора, 14 категорий с картинками → соберёт
# сайт → запустит через PM2 → настроит HTTPS (Let's Encrypt) для домена.
#
# ИДЭМПОТЕНТЕН: повторный запуск ничего не ломает и не удаляет.
# Пароль администратора генерируется автоматически и сохраняется в
# /root/ADMIN-CREDENTIALS.txt (плюс выводится в консоль в конце установки).
#
# Запуск: bash /root/install-pravmarshrut.sh
#         (или: GIT_REPO="https://github.com/USER/pravmarshrut.git" bash install-pravmarshrut.sh)
# ============================================================================
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# ─────────────────────────── НАСТРОЙКИ ──────────────────────────────────────
DOMAIN="pravmarshrut.ru"
ARCHIVE="/root/pravmarshrut-source.tar.gz"   # если исходники лежат архивом
GIT_REPO="${GIT_REPO:-}"                     # либо клон: GIT_REPO="https://github.com/USER/pravmarshrut.git"
APP_DIR="/var/www/pravmarshrut"
APP_PORT="3000"

# Логин администратора; пароль генерируется автоматически, если не задан
ADMIN_EMAIL="admin@pravmarshrut.ru"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

# Пароль приложения Яндекс.Почты для писем о обращениях (можно вписать сразу
# или добавить позже — форма и тогда сохраняет обращения в админку)
SMTP_PASSWORD="${SMTP_PASSWORD:-}"
SMTP_USER="documentonline.direct@yandex.ru"
# ────────────────────────────────────────────────────────────────────────────

say() { echo -e "\033[1;34m▸ $1\033[0m"; }
ok()  { echo -e "\033[1;32m✓ $1\033[0m"; }
warn(){ echo -e "\033[1;33m! $1\033[0m"; }

[ "$(id -u)" -eq 0 ] || { echo "Запустите от root: sudo bash $0"; exit 1; }

# Автогенерация надёжного пароля администратора (без SIGPIPE-ловушек)
if [ -z "$ADMIN_PASSWORD" ]; then
  ADMIN_PASSWORD="$(dd if=/dev/urandom bs=256 count=1 2>/dev/null | LC_ALL=C tr -dc 'A-Za-z0-9')"
  ADMIN_PASSWORD="${ADMIN_PASSWORD:0:16}"
fi
[ -n "$ADMIN_PASSWORD" ] || { echo "ОШИБКА: не удалось задать ADMIN_PASSWORD"; exit 1; }

# ─── 1. Системные пакеты ────────────────────────────────────────────────────
say "Обновление системы и базовых пакетов"
apt-get update -qq
apt-get install -y -qq curl git ufw sqlite3 >/dev/null

say "Проверка Node.js"
if ! command -v node >/dev/null || [ "$(node -e 'console.log(parseInt(process.versions.node))')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
ok "Node.js $(node -v)"

say "PM2 (процесс-менеджер)"
command -v pm2 >/dev/null || npm install -g pm2 >/dev/null 2>&1
ok "PM2 $(pm2 -v 2>/dev/null | head -1)"

# ─── 2. Swap (нужен для сборки при 1 ГБ RAM) ────────────────────────────────
if [ "$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)" -lt 2 ] && [ ! -f /swapfile ]; then
  say "Мало RAM — создаю swap 2 ГБ"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ok "Swap включён"
fi

# ─── 3. Файрвол ─────────────────────────────────────────────────────────────
say "Файрвол: SSH, HTTP, HTTPS"
ufw allow OpenSSH >/dev/null 2>&1; ufw allow 80,443/tcp >/dev/null 2>&1
ufw --force enable >/dev/null 2>&1 || true
ok "Порты 22/80/443 открыты (внутри сервера; файрвол провайдера правится в панели)"

# ─── 4. Исходники ───────────────────────────────────────────────────────────
if [ -f "$APP_DIR/package.json" ]; then
  ok "Исходники уже распакованы — пропускаю"
elif [ -f "$ARCHIVE" ]; then
  say "Распаковка исходников в $APP_DIR"
  mkdir -p "$APP_DIR"
  tar -xzf "$ARCHIVE" -C "$APP_DIR"
  ok "Распаковано"
elif [ -n "$GIT_REPO" ]; then
  say "Клонирование исходников из GitHub"
  rm -rf "$APP_DIR"
  git clone --depth 1 "$GIT_REPO" "$APP_DIR"
  ok "Склонировано"
else
  warn "Нет исходников: положите архив $ARCHIVE на сервер"
  warn "или запустите: GIT_REPO=\"https://github.com/USER/pravmarshrut.git\" bash $0"
  exit 1
fi
cd "$APP_DIR"

# ─── 5. .env ────────────────────────────────────────────────────────────────
if [ -f .env ]; then
  ok ".env уже существует — не изменяю"
else
  say "Создание .env"
  SMTP_BLOCK=""
  if [ -n "$SMTP_PASSWORD" ]; then
    SMTP_BLOCK="SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=$SMTP_USER
SMTP_FROM=$SMTP_USER
SMTP_PASSWORD=$SMTP_PASSWORD
FEEDBACK_TO_EMAIL=$SMTP_USER"
  else
    SMTP_BLOCK="# SMTP не настроен: обращения сохраняются в админке (/admin/submissions).
# Добавьте переменные из docs/EMAIL-SMTP.md и выполните:
#   cp .env .next/standalone/.env && pm2 restart pravmarshrut"
  fi
  cat > .env <<EOF
DATABASE_URL=$APP_DIR/db/app.db
SITE_URL=https://$DOMAIN
NODE_ENV=production
UPLOAD_DIR=$APP_DIR/uploads
SITE_NAME=Правовой маршрут
$SMTP_BLOCK
EOF
  chmod 600 .env
  ok ".env создан"
fi

# ─── 6. Зависимости и база ──────────────────────────────────────────────────
say "Установка зависимостей (несколько минут)"
npm install --no-audit --no-fund >/dev/null 2>&1
ok "npm install"

say "База данных (SQLite, без потери данных)"
mkdir -p db uploads
npx prisma db push >/dev/null 2>&1   # применяет схему и генерирует Prisma Client
ok "Схема применена"

say "Первый администратор и контент (сид)"
ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" npx tsx prisma/seed.ts 2>&1 | grep -E "✓|⚠|админ" || true

say "Изображения 14 категорий → медиатека"
npx tsx scripts/register_category_images.ts 2>&1 | tail -1

# ─── 7. Сборка и запуск ─────────────────────────────────────────────────────
say "Сборка production-версии (3–6 минут)"
npm run build >/dev/null 2>&1
ok "Сборка завершена"

say "Копирование .env в standalone (важно!)"
cp .env .next/standalone/.env

say "Запуск через PM2"
if pm2 describe pravmarshrut >/dev/null 2>&1; then
  pm2 restart pravmarshrut >/dev/null
else
  (cd "$APP_DIR" && pm2 start "node .next/standalone/server.js" --name pravmarshrut --time >/dev/null)
fi
pm2 save >/dev/null
pm2 startup 2>/dev/null | tail -1 | bash >/dev/null 2>&1 || true
ok "Сайт работает на localhost:$APP_PORT"

# ─── 8. Caddy: HTTPS + www-редирект ────────────────────────────────────────
if ! command -v caddy >/dev/null; then
  say "Установка Caddy"
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https >/dev/null
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -qq && apt-get install -y -qq caddy >/dev/null
fi
say "Настройка Caddy ($DOMAIN + www-редирект)"
cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
    reverse_proxy localhost:$APP_PORT
    encode gzip
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}

www.$DOMAIN {
    redir https://$DOMAIN{uri} permanent
}
EOF
caddy validate --config /etc/caddy/Caddyfile >/dev/null
systemctl reload caddy 2>/dev/null || systemctl restart caddy
ok "Caddy настроен, сертификат Let's Encrypt будет получен автоматически"

# ─── 9. Итог ────────────────────────────────────────────────────────────────
sleep 3
CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$APP_PORT/" || echo "—")

cat > /root/ADMIN-CREDENTIALS.txt <<EOF
Панель управления сайтом «Правовой маршрут»
Адрес:  https://$DOMAIN/admin/login
Логин:  $ADMIN_EMAIL
Пароль: $ADMIN_PASSWORD
(смените пароль после первого входа: раздел «Настройки»)
EOF
chmod 600 /root/ADMIN-CREDENTIALS.txt

echo ""
echo "════════════════════════════════════════════════════════"
ok "Готово! Локальный ответ приложения: HTTP $CODE"
echo ""
echo "Доступ в панель управления (также сохранён в /root/ADMIN-CREDENTIALS.txt):"
echo "  Адрес:  https://$DOMAIN/admin/login"
echo "  Логин:  $ADMIN_EMAIL"
echo "  Пароль: $ADMIN_PASSWORD"
echo "  (смените пароль после первого входа: раздел «Настройки»)"
echo ""
echo "Дальше:"
echo "  1. Откройте https://$DOMAIN (HTTPS появится через 1–3 минуты)"
echo "  2. Настройки → «Адрес сайта» = https://$DOMAIN (обычно уже так)"
echo "  3. Удалите 4 тестовые статьи в разделе «Статьи»"
echo "  4. Проверьте: https://$DOMAIN/sitemap.xml и /robots.txt"
echo "  5. Логи сайта: pm2 logs pravmarshrut"
[ -z "$SMTP_PASSWORD" ] && echo "  6. Письма: впишите SMTP_PASSWORD в /var/www/pravmarshrut/.env (см. docs/EMAIL-SMTP.md), затем: cp .env .next/standalone/.env && pm2 restart pravmarshrut"
echo "════════════════════════════════════════════════════════"
