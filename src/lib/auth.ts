/**
 * Аутентификация администратора.
 * Пароли: scrypt со случайной солью (модуль node:crypto, без внешних зависимостей).
 * Сессии: случайный токен в httpOnly-cookie; в БД хранится только SHA-256 хеш токена.
 */
import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'crypto'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

export const SESSION_COOKIE = 'pravo_admin_session'
const SESSION_TTL_DAYS = 7

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split('$')
    if (scheme !== 'scrypt' || !salt || !hash) return false
    const candidate = scryptSync(password, salt, 64)
    const expected = Buffer.from(hash, 'hex')
    return candidate.length === expected.length && timingSafeEqual(candidate, expected)
  } catch {
    return false
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Создаёт сессию администратора и возвращает значение для cookie. */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
  await db.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  })
  // Периодическая очистка истёкших сессий
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  return { token, expiresAt }
}

/** Возвращает текущего администратора по cookie или null. */
export async function getSessionUser(): Promise<{ id: string; email: string; name: string } | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  })
  if (!session || session.expiresAt < new Date()) return null
  return { id: session.user.id, email: session.user.email, name: session.user.name }
}

/** Уничтожает текущую сессию. */
export async function destroySession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } })
  }
}

/** Проверка попыток входа: не более 8 неудачных попыток с одного IP за 15 минут. */
export async function isLoginRateLimited(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - 15 * 60 * 1000)
  const failures = await db.loginAttempt.count({
    where: { ip, success: false, createdAt: { gte: since } },
  })
  return failures >= 8
}

export async function logLoginAttempt(ip: string, email: string, success: boolean): Promise<void> {
  await db.loginAttempt.create({ data: { ip, email, success } })
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}
