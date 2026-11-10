#!/usr/bin/env python3
"""Тестовое SSH-подключение к серверу pravmarshrut.ru и осмотр системы."""
import sys

import paramiko

HOST = "152.228.112.83"
USER = "root"
KEY = "/home/z/my-project/.deploy-keys/pravmarshrut_deploy"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, key_filename=KEY, timeout=15, banner_timeout=15)
    print("✓ Подключение установлено")
    commands = [
        ("ОС", "cat /etc/os-release | grep PRETTY_NAME | cut -d '\"' -f2"),
        ("Ядро", "uname -r"),
        ("CPU/RAM", "nproc; free -h | awk '/Mem|Swap/ {print $1, $2}' | tr '\\n' ' '"),
        ("Диск", "df -h / | tail -1 | awk '{print $2\" всего, \"$4\" свободно\"}'"),
        ("Node", "node -v 2>/dev/null || echo 'не установлен'"),
        ("Занято портов", "ss -tlnp 2>/dev/null | tail -n +2 | awk '{print $4}' | tr '\\n' ' '"),
        ("Что в /var/www", "ls /var/www 2>/dev/null || echo 'пусто/нет'"),
    ]
    for label, cmd in commands:
        _, out, err = client.exec_command(cmd, timeout=15)
        o, e = out.read().decode().strip(), err.read().decode().strip()
        print(f"{label}: {o or e or '—'}")
finally:
    client.close()
