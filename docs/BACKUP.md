# Резервное копирование и восстановление

Весь контент сайта — это **один файл базы SQLite + каталог картинок**.
Резервная копия делается одной командой, восстановление — тоже.

---

## 1. Что копировать

| Что | Где | Объём |
|---|---|---|
| База данных (статьи, категории, настройки, обращения, редиректы) | `db/app.db` (путь из `DATABASE_URL`) | единицы МБ |
| Загруженные изображения | `uploads/` | растёт со временем |
| `.env` | корень проекта | 1 КБ |
| Код проекта | git-репозиторий | — |

## 2. Ручная резервная копия (на сервере)

```bash
cd /var/www/pravo-site

# папка для бэкапов
mkdir -p /var/backups/pravo

# бэкап: БД + uploads + env одной командой
tar -czf /var/backups/pravo/pravo-$(date +%F).tar.gz \
    db/app.db uploads .env

# проверить содержимое
tar -tf /var/backups/pravo/pravo-$(date +%F).tar.gz | head
```

> База SQLite поддерживает одновременное чтение — копировать можно «на живую»,
> но для идеальной консистентности выполните команду, когда сервер наименее
> нагружен, либо используйте `sqlite3 db/app.db ".backup '/tmp/app-backup.db'"`.

## 3. Автоматическая копия каждый день (cron)

Создайте файл `/etc/cron.d/pravo-backup`:

```
# Ежедневная копия в 03:15, хранить 30 копий
15 3 * * * root cd /var/www/pravo-site && tar -czf /var/backups/pravo/pravo-$(date +\%F).tar.gz db/app.db uploads .env && ls -1t /var/backups/pravo/pravo-*.tar.gz | tail -n +31 | xargs -r rm -f
```

Права: `chmod 644 /etc/cron.d/pravo-backup`.

Проверить: `ls /var/backups/pravo/` — на следующий день должен появиться архив.

## 4. Дополнительная защита: копия на другой диск/облако

Любой из вариантов (все бесплатные по базовому объёму или дешёвые):

```bash
# Вариант А: rclone на любой S3-совместимый склад (Яндекс Объектное хранилище,
# Selectel S3 и т.п.) — по расписанию после tar:
rclone copy /var/backups/pravo remote:pravo-backups

# Вариант Б: scp на другой ваш сервер / домашний NAS:
scp /var/backups/pravo/pravo-$(date +%F).tar.gz user@домашний-nas:/backups/
```

## 5. Восстановление

```bash
cd /var/www/pravo-site
pm2 stop pravo-site

# распаковать архив поверх проекта
tar -xzf /var/backups/pravo/pravo-2026-01-31.tar.gz -C .

pm2 start pravo-site
# проверить сайт и админку
```

Восстановление занимает меньше минуты: файл БД заменяется целиком.

## 6. Проверка резервных копий

Раз в месяц стоит убедиться, что копия реально разворачивается:

```bash
mkdir -p /tmp/restore-test && cd /tmp/restore-test
tar -xzf /var/backups/pravo/pravo-<дата>.tar.gz
sqlite3 db/app.db "SELECT count(*) FROM Article;"   # число статей > 0
ls uploads/                                          # картинки на месте
```
