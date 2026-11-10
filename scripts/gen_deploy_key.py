#!/usr/bin/env python3
"""Генерация выделенной Ed25519 пары ключей для развёртывания pravmarshrut.ru."""
import os
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization

KEY_DIR = Path("/home/z/my-project/.deploy-keys")
KEY_DIR.mkdir(mode=0o700, exist_ok=True)
priv_path = KEY_DIR / "pravmarshrut_deploy"
pub_path = KEY_DIR / "pravmarshrut_deploy.pub"

raw = Ed25519PrivateKey.generate()
priv_bytes = raw.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.OpenSSH,
    serialization.NoEncryption(),
)
priv_path.write_bytes(priv_bytes)
os.chmod(priv_path, 0o600)

pub_ssh = raw.public_key().public_bytes(
    serialization.Encoding.OpenSSH, serialization.PublicFormat.OpenSSH
)
pub = pub_ssh.decode() + " pravmarshrut-deploy\n"
pub_path.write_text(pub)
print(pub.strip())
