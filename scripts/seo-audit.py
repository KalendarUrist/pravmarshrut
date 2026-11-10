"""Финальный SEO-аудит production-сборки «Правовой маршрут» по фактическому HTML.

Проверяет: один H1, уникальность title/description, canonical, og:url, noindex,
JSON-LD (валидность и типы), sitemap.xml, robots.txt, отсутствие localhost,
mailto-ссылки, доступность картинок категорий и внутренних ссылок.

Режим проверки задаётся BASE env: базовый адрес, под которым сервер отдаёт страницы.
"""
import json
import os
import re
import sys
import urllib.request
from html.parser import HTMLParser
from urllib.parse import urljoin

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000").rstrip("/")
FETCH_BASE = (sys.argv[2] if len(sys.argv) > 2 else BASE).rstrip("/")  # как стучаться (при нестандартном Host)
# Если AUDIT_HOST задан — запросы идут с X-Forwarded-Host (симуляция обратного прокси).
AUDIT_HOST = os.environ.get("AUDIT_HOST", "")
AUDIT_PROTO = os.environ.get("AUDIT_PROTO", "https")

issues = []
notes = []


def fetch(path, host=None, proto=None, timeout=30):
    url = urljoin(FETCH_BASE + "/", path.lstrip("/"))
    req = urllib.request.Request(url)
    hh = host or AUDIT_HOST
    if hh:
        req.add_header("X-Forwarded-Host", hh)
        req.add_header("X-Forwarded-Proto", proto or AUDIT_PROTO)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "replace"), dict(r.headers)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:200]
        return e.code, body, dict(e.headers)
    except Exception as e:
        return 0, str(e), {}


class PageParser(HTMLParser):
    """Извлекает title, meta, h1, links, json-ld, images, mailto."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ""
        self._in_title = False
        self.h1 = []
        self.h1_tags = 0
        self._in_h1 = 0
        self.meta = []
        self.links = []
        self.jsonld = []
        self._in_ld = 0
        self._ld_buf = []
        self.canonical = ""
        self.og = {}
        self.robots = ""
        self.description = ""
        self.images = []
        self.mailto = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self._in_title = True
        elif tag == "h1":
            self._in_h1 += 1
            self.h1_tags += 1
        elif tag == "meta":
            if a.get("name") == "description" and a.get("content"):
                self.description = a["content"]
            if a.get("name") == "robots":
                self.robots = a.get("content", "")
            if a.get("property", "").startswith("og:"):
                self.og[a["property"]] = a.get("content", "")
        elif tag == "link" and a.get("rel") == "canonical":
            self.canonical = a.get("href", "")
        elif tag == "a" and a.get("href"):
            href = a["href"]
            self.links.append(href)
            if href.lower().startswith("mailto:"):
                self.mailto.append(href[7:])
        elif tag == "img":
            self.images.append(a.get("src", ""))
        elif tag == "script" and a.get("type") == "application/ld+json":
            self._in_ld += 1

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        elif tag == "h1":
            self._in_h1 = max(0, self._in_h1 - 1)
        elif tag == "script" and self._in_ld:
            self._in_ld -= 1
            raw = "".join(self._ld_buf).strip()
            self._ld_buf = []
            if raw:
                try:
                    self.jsonld.append(json.loads(raw))
                except json.JSONDecodeError as e:
                    issues.append(f"{FETCH_BASE}: JSON-LD не валиден: {e}")

    def handle_data(self, data):
        if self._in_title:
            self.title += data.strip()
        if self._in_h1:
            self.h1.append(data.strip())
        if self._in_ld:
            self._ld_buf.append(data)


PUBLIC_PAGES = [
    "/", "/articles/", "/categories/", "/about/", "/contacts/",
    "/privacy/", "/consent/", "/terms/", "/search/",
]

# категории и статьи из sitemap
st, sm_body, _ = fetch("/sitemap.xml")
sitemap_urls = []
if st == 200 and sm_body.lstrip().startswith("<?xml"):
    sitemap_urls = re.findall(r"<loc>(.*?)</loc>", sm_body)
    notes.append(f"sitemap.xml: {len(sitemap_urls)} URL, хост {sitemap_urls[0].split('/')[2] if sitemap_urls else '—'}")
else:
    issues.append(f"sitemap.xml: статус {st}, тело: {sm_body[:120]}")

cat_paths = sorted({u.replace(BASE, "") for u in sitemap_urls
                    if u.startswith(BASE) and len(u.replace(BASE, "").rstrip("/").split("/")) == 2})
art_paths = sorted({u.replace(BASE, "") for u in sitemap_urls
                    if u.startswith(BASE) and len(u.replace(BASE, "").rstrip("/").split("/")) == 3})
pages = sorted(set(PUBLIC_PAGES + cat_paths + art_paths))

results = {}
seen_titles, seen_desc = {}, {}
all_internal = set()

for path in pages:
    st, html, _ = fetch(path)
    if st != 200:
        issues.append(f"{path}: HTTP {st}")
        continue
    p = PageParser()
    p.feed(html)
    results[path] = p

    # H1 (считаем теги, не текстовые куски — React SSR вставляет <!-- --> между узлами)
    h1_count = p.h1_tags
    if h1_count != 1:
        issues.append(f"{path}: H1 = {h1_count} (должен быть 1)")
    if path == "/search/" and "noindex" not in p.robots.lower():
        issues.append("/search/: нет noindex")
    if path != "/search/" and "noindex" in p.robots.lower():
        issues.append(f"{path}: неожиданный noindex")
    if not p.canonical:
        issues.append(f"{path}: нет canonical")
    elif not p.canonical.startswith(BASE + "/"):
        issues.append(f"{path}: canonical вне BASE: {p.canonical}")
    if path != "/search/":
        expect = BASE + path
        if p.canonical and p.canonical.rstrip("/") != expect.rstrip("/"):
            issues.append(f"{path}: canonical={p.canonical} ≠ {expect}")
        if p.og.get("og:url", "").rstrip("/") != p.canonical.rstrip("/"):
            issues.append(f"{path}: og:url={p.og.get('og:url','')} ≠ canonical")
    if p.title:
        key = p.title.lower()
        if key in seen_titles:
            issues.append(f"Дубликат title: {path} и {seen_titles[key]}")
        seen_titles[key] = path
    if p.description:
        key = p.description.lower()
        if key in seen_desc:
            issues.append(f"Дубликат description: {path} и {seen_desc[key]}")
        seen_desc[key] = path
    if "localhost" in html:
        issues.append(f"{path}: 'localhost' встречается в HTML")
    all_internal.update(l for l in p.links if l.startswith("/") or l.startswith(BASE))

# JSON-LD типы
def ld_collect(obj, acc):
    if isinstance(obj, dict):
        t = obj.get("@type")
        if isinstance(t, str):
            acc.add(t)
        for x in (obj.get("@graph") or []):
            ld_collect(x, acc)
    elif isinstance(obj, list):
        for x in obj:
            ld_collect(x, acc)

ld_types = {}
for path, r in results.items():
    if r.jsonld:
        acc = set()
        ld_collect(r.jsonld, acc)
        ld_types[path] = sorted(acc)

# robots.txt
st, rb, _ = fetch("/robots.txt")
robots_ok = st == 200 and "Sitemap:" in rb and f"{BASE}/sitemap.xml" in rb and "/admin/" in rb and "/api/" in rb
if not robots_ok:
    issues.append(f"robots.txt некорректен (статус {st}): {rb[:200]}")
else:
    notes.append("robots.txt: Sitemap + Disallow(/admin/, /api/, /search) на месте")

# картинки категорий из /categories/
st, cats_html, _ = fetch("/categories/")
media_urls = re.findall(r'src="(/media/[^"]+)"', cats_html)
notes.append(f"Страница /categories/: {len(media_urls)} img /media/")
bad_media = [m for m in media_urls if fetch(m)[0] != 200]
if bad_media:
    issues.append(f"Картинки категорий не открываются: {bad_media[:3]}")

# внутренние ссылки → HTTP 200
internal = sorted({l.replace(BASE, "") for l in all_internal if l.startswith("/") and not l.startswith("//")} |
                  {l.replace(BASE, "") for l in all_internal if l.startswith(BASE)})
checked = 0
bad_links = []
for l in internal:
    if l.startswith(("/api/", "/admin/", "/media/", "/_next/", "/images/", "/favicon")):
        continue
    checked += 1
    code = fetch(l)[0]
    if code != 200:
        bad_links.append((l, code))
if bad_links:
    issues.append(f"Внутренние ссылки не 200: {bad_links[:8]}")
else:
    notes.append(f"Внутренние ссылки: {checked} проверено, все 200")

# mailto
mailto_pages = {path: r.mailto for path, r in results.items() if r.mailto}

print("=== NOTES ===")
for n in notes:
    print(" •", n)
print("\n=== JSON-LD типы ===")
for path in PUBLIC_PAGES + art_paths:
    if path in ld_types:
        print(f" {path}: {ld_types[path]}")
print("\n=== mailto на страницах ===")
for path, m in mailto_pages.items():
    print(f" {path}: {m}")
print("\n=== title/     description (уникальность уже проверена) ===")
for path in PUBLIC_PAGES:
    if path in results:
        print(f" {path}\n   T: {results[path].title}\n   D: {results[path].description[:90]}")
print("\n=== ИТОГ ===")
if issues:
    print(f"❌ Проблем ({len(issues)}):")
    for i in issues:
        print("  -", i)
    sys.exit(1)
print("✅ Все проверки пройдены")
