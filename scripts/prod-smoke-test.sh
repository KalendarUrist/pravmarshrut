#!/bin/bash
# Финальный smoke-тест production-сборки на http://localhost:3100
BASE="http://localhost:3100"
PASS=0; FAIL=0
check() { # $1 = название, $2 = условие (0 = ок)
  if [ "$2" -eq 0 ]; then PASS=$((PASS+1)); echo "✓ $1"; else FAIL=$((FAIL+1)); echo "✗ $1"; fi
}

# 1. Все публичные страницы: 200 + canonical pravmarshrut.ru + нет email
PAGES="/ /articles/ /categories/ /about/ /contacts/ /privacy/ /consent/ /terms/ /search/ /family/ /divorce/ /alimony/ /inheritance/ /real-estate/ /consumer-rights/ /debts/ /bankruptcy-individuals/ /labor/ /housing/ /court/ /money-recovery/ /enforcement/ /appeals/ /divorce/razvod-cherez-zags-i-sud/ /alimony/kak-vzyskat-alimenty-na-rebenka/ /inheritance/vstuplenie-v-nasledstvo-sroki-i-dokumenty/ /consumer-rights/vozvrat-tovara-i-otkaz-ot-uslugi/"
for p in $PAGES; do
  body=$(curl -s "$BASE$p")
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$p")
  [ "$code" = "200" ] || { echo "✗ $p → $code"; FAIL=$((FAIL+1)); continue; }
  echo "$body" | grep -q "documentonline.direct" && { echo "✗ $p содержит email!"; FAIL=$((FAIL+1)); continue; }
  echo "$body" | grep -qE 'rel="canonical" href="https://pravmarshrut\.ru/' || { echo "✗ $p: canonical без pravmarshrut.ru"; FAIL=$((FAIL+1)); continue; }
  PASS=$((PASS+1))
done
echo "  (страниц проверено: $(echo $PAGES | wc -w))"

# 2. Sitemap и robots
curl -s "$BASE/sitemap.xml" | grep -q "<loc>https://pravmarshrut.ru/</loc>" && check "sitemap.xml на домене pravmarshrut.ru" 0 || check "sitemap.xml" 1
n=$(curl -s "$BASE/sitemap.xml" | grep -c "<loc>"); [ "$n" -ge 22 ] && check "sitemap: $n URL (8 статичных + 14 категорий)" 0 || check "sitemap URL count = $n" 1
curl -s "$BASE/robots.txt" | grep -q "Sitemap: https://pravmarshrut.ru/sitemap.xml" && check "robots.txt → sitemap" 0 || check "robots.txt" 1
curl -s "$BASE/robots.txt" | grep -q "Disallow: /admin" && check "robots: /admin закрыт" 0 || check "robots admin" 1

# 3. Картинки: все 14 категорий на /categories/ + оптимизатор
n=$(curl -s "$BASE/categories/" | grep -oE '[a-z0-9]+-[a-z-]+-category\.webp' | sort -u | wc -l)
[ "$n" = "14" ] && check "каталог: 14 уникальных изображений категорий" 0 || check "каталог картинок: $n" 1
alt=$(curl -s "$BASE/categories/" | grep -oE 'alt="[^"]{30,}"' | wc -l)
[ "$alt" -ge 14 ] && check "русские alt-тексты: $alt" 0 || check "alt-тексты: $alt" 1
MEDIA=$(curl -s "$BASE/categories/" | grep -oE '/media/[a-z0-9]+/[a-z0-9-]+\.webp' | head -1)
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$MEDIA"); [ "$code" = "200" ] && check "media-файл отдаётся ($MEDIA)" 0 || check "media: $code" 1
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/_next/image/?url=$(python3 -c "import urllib.parse;print(urllib.parse.quote('$MEDIA',safe=''))")&w=1200&q=75")
[ "$code" = "200" ] && check "оптимизатор _next/image: 200" 0 || check "оптимизатор: $code" 1
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/media/nonexistent-id/file.webp"); [ "$code" = "404" ] && check "несуществующий media → 404" 0 || check "media 404: $code" 1

# 4. Форма обратной связи: сохранение + честный ответ
r=$(curl -s -X POST "$BASE/api/feedback/" -H "Content-Type: application/json" -d '{"name":"Финальный тест","contact":"final@example.com","topic":"Продакшн","message":"Финальная проверка формы.","consent":true}')
echo "$r" | grep -q '"ok":true' && check "форма: обращение принято" 0 || check "форма: $r" 1
echo "$r" | grep -q '"emailSent":false' && echo "$r" | grep -q "не подключены" && check "форма: честное сообщение о e-mail" 0 || check "форма: сообщение" 1
r=$(curl -s -X POST "$BASE/api/feedback/" -H "Content-Type: application/json" -d '{"name":"","contact":"","message":"","consent":false}')
echo "$r" | grep -q '"ok":false' && check "форма: невалидные данные отклонены" 0 || check "форма: валидация" 1

# 5. Админка: без авторизации защищена, с авторизацией работает
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/")
[ "$code" = "307" ] && check "админка без входа → редирект" 0 || check "админка без входа: $code" 1
curl -s -c /tmp/fc.txt -X POST "$BASE/api/auth/login/" -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"ChangeMe2026!"}' | grep -q '"ok":true' && check "вход администратора" 0 || check "вход" 1
for a in /admin/ /admin/articles/ /admin/categories/ /admin/media/ /admin/settings/ /admin/submissions/ /admin/redirects/; do
  code=$(curl -s -b /tmp/fc.txt -o /dev/null -w "%{http_code}" "$BASE$a"); [ "$code" = "200" ] || { echo "✗ $a → $code"; FAIL=$((FAIL+1)); continue; }
  PASS=$((PASS+1))
done
echo "  (страниц админки: 7)"
r=$(curl -s -b /tmp/fc.txt "$BASE/api/admin/submissions/")
echo "$r" | grep -q "Финальный тест" && check "обращение видно в /admin/submissions" 0 || check "submissions API" 1
r=$(curl -s "$BASE/api/admin/stats/"); echo "$r" | grep -q "Требуется авторизация" && check "admin API без cookie закрыт" 0 || check "admin API защита" 1

# 6. Редиректы и 404
r=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" "$BASE/family/razvod-cherez-zags-i-sud/")
echo "$r" | grep -q "^308.*divorce/razvod" && check "CMS-редирект 308 на правильный URL" 0 || check "редирект: $r" 1
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/no-such-page/"); [ "$code" = "404" ] && check "404 для несуществующей страницы" 0 || check "404: $code" 1

echo ""
echo "══════════════════════════════"
echo "ПРОЙДЕНО: $PASS   ПРОВАЛЕНО: $FAIL"
[ $FAIL -eq 0 ] && echo "ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ" || echo "ЕСТЬ ОШИБКИ"
