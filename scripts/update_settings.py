"""Обновление настроек сайта в БД под согласованный макет."""
import sqlite3
import json

DB = "/home/z/my-project/db/custom.db"

VALUES = {
    "siteName": "Правовой маршрут",
    "siteDescription": "Актуальные разъяснения законов, практика и полезные рекомендации",
    "primaryColor": "#11263C",
    "heroTitle": "Понятно о ваших правах и способах их защиты",
    "heroSubtitle": "Разъяснения законов, практические инструкции и ответы на актуальные юридические вопросы для граждан России",
    "aboutShort": "«Правовой маршрут» — информационный юридический портал для граждан. Публикуем актуальные разъяснения законов, инструкции и практические рекомендации.",
}

con = sqlite3.connect(DB)
cur = con.cursor()
for k, v in VALUES.items():
    row = cur.execute("SELECT key FROM Setting WHERE key=?", (k,)).fetchone()
    if row:
        cur.execute("UPDATE Setting SET value=? WHERE key=?", (v, k))
    else:
        cur.execute("INSERT INTO Setting (key, value) VALUES (?, ?)", (k, v))
    print("set", k, "=", v[:60])
con.commit()

print("\nпроверка:")
for k in VALUES:
    print(" ", k, "=", cur.execute("SELECT value FROM Setting WHERE key=?", (k,)).fetchone()[0][:70])
con.close()
