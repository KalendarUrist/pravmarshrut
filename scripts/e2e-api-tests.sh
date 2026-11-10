#!/bin/bash
# E2E-тесты API юридического сайта через curl.
# Проверяет: авторизацию, CRUD статей и категорий, загрузку медиа, форму обратной связи,
# настройки, редиректы, sitemap, защиту админ-API.
BASE="http://localhost:3000"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@pravmarshal.test}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-LocalDev2026!}"
JAR="/tmp/pravo-cookies.txt"
PASS=0
FAIL=0
TEST_SLUG="e2e-test-article-$(date +%s)"

ok()   { PASS=$((PASS+1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ✗ $1 ${2:-}"; }

check() { # check "название" "ожидание" "факт"
  if [ "$2" = "$3" ]; then ok "$1"; else fail "$1 (ожидалось: $2, получено: $3)"; fi
}

echo "── 1. Защита админ-API без сессии"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/admin/articles/")
check "GET /api/admin/articles без cookie → 401" "401" "$code"

echo "── 2. Авторизация"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/login/" -H 'Content-Type: application/json' -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"wrong\"}")
check "Неверный пароль → 401" "401" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -c "$JAR" -X POST "$BASE/api/auth/login/" -H 'Content-Type: application/json' -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
check "Верный пароль → 200" "200" "$code"
grep -q "pravo_admin_session" "$JAR" && ok "Сессионная cookie установлена" || fail "Cookie сессии не найдена"

echo "── 3. Категории"
CAT_TITLE="Тестовая категория E2E"
CAT_JSON=$(curl -s -b "$JAR" -X POST "$BASE/api/admin/categories/" -H 'Content-Type: application/json' -d "{\"title\":\"$CAT_TITLE\",\"description\":\"Для проверки\"}")
CAT_ID=$(echo "$CAT_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin).get('category',{}).get('id',''))")
CAT_SLUG=$(echo "$CAT_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin).get('category',{}).get('slug',''))")
[ -n "$CAT_ID" ] && ok "Категория создана ($CAT_SLUG)" || fail "Категория не создана: $CAT_JSON"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/$CAT_SLUG/")
check "Публичная страница категории → 200" "200" "$code"

echo "── 4. Статьи: черновик → публикация → проверка → снятие"
ART=$(curl -s -b "$JAR" -X POST "$BASE/api/admin/articles/" -H 'Content-Type: application/json' -d "{
  \"title\":\"Е2Е Тестовая статья про алименты\",
  \"excerpt\":\"Проверка полного цикла публикации.\",
  \"contentHtml\":\"<h2>Раздел один</h2><p>Текст про алименты и госпошлину.</p><h3>Подраздел</h3><ul><li>пункт</li></ul><div class=\\\"faq-item\\\"><h3 class=\\\"faq-q\\\">Тестовый вопрос?</h3><div class=\\\"faq-a\\\"><p>Тестовый ответ для разметки FAQPage.</p></div></div>\",
  \"categoryId\":\"$CAT_ID\",
  \"tags\":\"тест, e2e\",
  \"status\":\"DRAFT\"
}")
ART_ID=$(echo "$ART" | python3 -c "import sys,json;print(json.load(sys.stdin).get('article',{}).get('id',''))")
[ -n "$ART_ID" ] && ok "Черновик создан" || fail "Черновик не создан: $ART"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/$CAT_SLUG/$TEST_SLUG/")
check "Черновик не виден на сайте" "404" "$code"

PUB=$(curl -s -b "$JAR" -X PUT "$BASE/api/admin/articles/$ART_ID/" -H 'Content-Type: application/json' -d "{
  \"title\":\"Е2Е Тестовая статья про алименты\",
  \"slug\":\"$TEST_SLUG\",
  \"excerpt\":\"Проверка полного цикла публикации.\",
  \"contentHtml\":\"<h2>Раздел один</h2><p>Текст про алименты и госпошлину.</p><h3>Подраздел</h3><ul><li>пункт</li></ul><div class=\\\"faq-item\\\"><h3 class=\\\"faq-q\\\">Тестовый вопрос?</h3><div class=\\\"faq-a\\\"><p>Тестовый ответ для разметки FAQPage.</p></div></div>\",
  \"categoryId\":\"$CAT_ID\",
  \"tags\":\"тест, e2e\",
  \"status\":\"PUBLISHED\"
}")
check "Статья опубликована" "True" "$(echo "$PUB" | python3 -c "import sys,json;print(json.load(sys.stdin).get('ok',''))")"

HTML=$(curl -s "$BASE/$CAT_SLUG/$TEST_SLUG/")
echo "$HTML" | grep -q "Е2Е Тестовая статья про алименты" && ok "Статья отображается на сайте" || fail "Заголовок статьи не найден"
echo "$HTML" | grep -q 'application/ld+json' && ok "JSON-LD присутствует" || fail "JSON-LD отсутствует"
echo "$HTML" | grep -q 'FAQPage' && ok "FAQPage разметка из блока вопрос-ответ" || fail "FAQPage не найден"
echo "$HTML" | grep -q 'Обратиться за' && ok "Кнопка обратной связи на статье" || fail "CTA-блок не найден"
echo "$HTML" | grep -q 'canonical' && ok "canonical на странице" || fail "canonical отсутствует"

# Смена URL → автаредирект
NEW_SLUG="e2e-renamed-$(date +%s)"
PUB2=$(curl -s -b "$JAR" -X PUT "$BASE/api/admin/articles/$ART_ID/" -H 'Content-Type: application/json' -d "{
  \"title\":\"Е2Е Тестовая статья про алименты\",
  \"slug\":\"$NEW_SLUG\",
  \"excerpt\":\"Проверка полного цикла публикации.\",
  \"contentHtml\":\"<h2>Раздел</h2><p>Текст.</p>\",
  \"categoryId\":\"$CAT_ID\",
  \"status\":\"PUBLISHED\"
}")
check "URL статьи изменён" "$NEW_SLUG" "$(echo "$PUB2" | python3 -c "import sys,json;print(json.load(sys.stdin).get('article',{}).get('slug',''))")"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/$CAT_SLUG/$TEST_SLUG/")
case "$code" in 301|308) ok "Старый URL статьи редиректит (постоянный $code)";; *) fail "Старый URL не редиректит (получено: $code)";; esac
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/$CAT_SLUG/$NEW_SLUG/")
check "Новый URL статьи работает" "200" "$code"

# Снятие с публикации
curl -s -b "$JAR" -X PUT "$BASE/api/admin/articles/$ART_ID/" -H 'Content-Type: application/json' -d "{
  \"title\":\"Е2Е Тестовая статья про алименты\",
  \"slug\":\"$NEW_SLUG\",
  \"excerpt\":\"Проверка.\",
  \"contentHtml\":\"<h2>Раздел</h2><p>Текст.</p>\",
  \"categoryId\":\"$CAT_ID\",
  \"status\":\"DRAFT\"
}" > /dev/null
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/$CAT_SLUG/$NEW_SLUG/")
check "После снятия с публикации страница скрыта" "404" "$code"

echo "── 5. Медиа"
python3 - << 'PYEOF'
try:
    from PIL import Image
    img = Image.new('RGB', (600, 400), (22, 50, 79))
    img.save('/tmp/e2e-test-image.png')
except ImportError:
    import zlib, struct
    def png(w, h, rgb):
        def chunk(t, d):
            c = t + d
            return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c))
        raw = b''
        for _ in range(h):
            raw += b'\x00' + bytes(rgb) * w
        return (b'\x89PNG\r\n\x1a\n'
                + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
                + chunk(b'IDAT', zlib.compress(raw))
                + chunk(b'IEND', b''))
    open('/tmp/e2e-test-image.png', 'wb').write(png(600, 400, (22, 50, 79)))
PYEOF
MEDIA=$(curl -s -b "$JAR" -X POST "$BASE/api/admin/media/" -F "file=@/tmp/e2e-test-image.png" -F "alt=Тестовое изображение синего цвета")
MEDIA_ID=$(echo "$MEDIA" | python3 -c "import sys,json;print(json.load(sys.stdin).get('media',{}).get('id',''))")
MEDIA_URL=$(echo "$MEDIA" | python3 -c "import sys,json;print(json.load(sys.stdin).get('media',{}).get('url',''))")
[ -n "$MEDIA_ID" ] && ok "Изображение загружено: $MEDIA_URL" || fail "Загрузка не удалась: $MEDIA"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$MEDIA_URL")
check "Файл раздаётся по /media/..." "200" "$code"
ctype=$(curl -s -o /dev/null -w "%{content_type}" "$BASE$MEDIA_URL")
check "Content-Type изображения" "image/png" "$ctype"
TXT=$(curl -s -b "$JAR" -X PUT "$BASE/api/admin/media/$MEDIA_ID/" -H 'Content-Type: application/json' -d '{"alt":"Обновлённый alt","description":"описание"}')
check "Alt-текст обновлён" "Обновлённый alt" "$(echo "$TXT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('media',{}).get('alt',''))")"

echo "── 6. SVG отклоняется"
printf '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' > /tmp/e2e-test.svg
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -X POST "$BASE/api/admin/media/" -F "file=@/tmp/e2e-test.svg")
check "SVG отклонён → 422" "422" "$code"

echo "── 7. Обратная связь"
FB=$(curl -s -X POST "$BASE/api/feedback/" -H 'Content-Type: application/json' -d '{"name":"Иван Тестов","contact":"ivan@example.com","topic":"Наследство","message":"Тестовое обращение через E2E тест, прошу ответить.","consent":true,"elapsedMs":10000}')
check "Валидное обращение принято" "True" "$(echo "$FB" | python3 -c "import sys,json;print(json.load(sys.stdin).get('ok',''))")"
FBID=$(echo "$FB" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))")
FB_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/feedback/" -H 'Content-Type: application/json' -d '{"name":"Бот","contact":"bot@example.com","message":"Слишком быстрый бот, спам-проверка.","consent":true,"elapsedMs":500}')
check "Слишком быстрое заполнение отклонено → 422" "422" "$FB_CODE"
FB3=$(curl -s -X POST "$BASE/api/feedback/" -H 'Content-Type: application/json' -d '{"name":"Иван","contact":"не-валидный","message":"Сообщение больше десяти символов","consent":true,"elapsedMs":9000}')
check "Невалидный контакт отклонён" "False" "$(echo "$FB3" | python3 -c "import sys,json;print(json.load(sys.stdin).get('ok',''))")"
FB_CODE2=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/feedback/" -H 'Content-Type: application/json' -d '{"name":"Иван","contact":"ivan@example.com","message":"Сообщение без согласия на обработку","elapsedMs":9000}')
check "Без согласия → 422" "422" "$FB_CODE2"
SUBS=$(curl -s -b "$JAR" "$BASE/api/admin/submissions/")
check "Обращение видно в админке" "$FBID" "$(echo "$SUBS" | python3 -c "import sys,json;print(json.load(sys.stdin)['rows'][0]['id'])")"
ST=$(curl -s -b "$JAR" -X PUT "$BASE/api/admin/submissions/$FBID/" -H 'Content-Type: application/json' -d '{"status":"IN_PROGRESS"}')
check "Статус обращения меняется" "True" "$(echo "$ST" | python3 -c "import sys,json;print(json.load(sys.stdin).get('ok',''))")"
csv=$(curl -s -b "$JAR" "$BASE/api/admin/submissions/export/" | head -1)
echo "$csv" | grep -q "Дата" && ok "CSV-экспорт работает" || fail "CSV-экспорт сломан"

echo "── 8. Настройки сайта"
ST2=$(curl -s -b "$JAR" -X PUT "$BASE/api/admin/settings/" -H 'Content-Type: application/json' -d '{"values":{"heroTitle":"Понятно о ваших правах и способах их защиты (E2E)"}}')
check "Настройки сохраняются" "True" "$(echo "$ST2" | python3 -c "import sys,json;print(json.load(sys.stdin).get('ok',''))")"
curl -s "$BASE/" | grep -q "E2E" && ok "Новый заголовок главного экрана на сайте" || fail "Заголовок не обновился"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -X PUT "$BASE/api/admin/settings/" -H 'Content-Type: application/json' -d '{"values":{"primaryColor":"javascript:alert(1)"}}')
check "Некорректный цвет отклонён → 422" "422" "$code"

echo "── 9. Редиректы"
RD=$(curl -s -b "$JAR" -X POST "$BASE/api/admin/redirects/" -H 'Content-Type: application/json' -d '{"fromPath":"/e2e-old-path/","toPath":"/family/","code":301}')
check "Редирект создан" "True" "$(echo "$RD" | python3 -c "import sys,json;print(json.load(sys.stdin).get('ok',''))")"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/e2e-old-path/")
case "$code" in 301|308) ok "Редирект работает на сайте (постоянный $code)";; *) fail "Редирект не работает (получено: $code)";; esac

echo "── 10. Sitemap и robots"
SM=$(curl -s "$BASE/sitemap.xml")
echo "$SM" | grep -q "$CAT_SLUG" && ok "Новая категория в sitemap" || fail "Категории нет в sitemap"
RB=$(curl -s "$BASE/robots.txt")
echo "$RB" | grep -q "Disallow: /admin" && ok "robots.txt закрывает /admin" || fail "robots.txt не закрывает /admin"
echo "$RB" | grep -q "Sitemap" && ok "robots.txt ссылается на sitemap" || fail "Sitemap не указан в robots.txt"

echo "── 11. Очистка тестовых данных"
curl -s -b "$JAR" -X DELETE "$BASE/api/admin/articles/$ART_ID/" > /dev/null
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -X DELETE "$BASE/api/admin/categories/$CAT_ID/")
check "Пустая тестовая категория удалена" "200" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -X DELETE "$BASE/api/admin/media/$MEDIA_ID/")
check "Тестовое изображение удалено" "200" "$code"
RD_ID=$(curl -s -b "$JAR" "$BASE/api/admin/redirects/" | python3 -c "
import sys, json
rows = json.load(sys.stdin)['rows']
match = [r['id'] for r in rows if r['fromPath'] == '/e2e-old-path']
print(match[0] if match else '')")
[ -n "$RD_ID" ] && curl -s -b "$JAR" -X DELETE "$BASE/api/admin/redirects/$RD_ID/" > /dev/null && ok "Тестовый редирект удалён"
curl -s -b "$JAR" -X PUT "$BASE/api/admin/settings/" -H 'Content-Type: application/json' -d '{"values":{"heroTitle":"Понятно о ваших правах и способах их защиты"}}' > /dev/null
SUB_CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -X DELETE "$BASE/api/admin/submissions/$FBID/")
check "Тестовое обращение удалено" "200" "$SUB_CODE"

echo ""
echo "══════════════════════════════════"
echo "ИТОГО: пройдено $PASS, провалено $FAIL"
[ $FAIL -eq 0 ] && echo "ВСЕ API-ТЕСТЫ ПРОЙДЕНЫ" || echo "ЕСТЬ НЕПРОЙДЕННЫЕ ТЕСТЫ"
