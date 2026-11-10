import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession, isLoginRateLimited, logLoginAttempt, clientIp, SESSION_COOKIE } from '@/lib/auth'
import { sameOriginGuard } from '@/lib/admin-api'

export const runtime = 'nodejs'

/** Вход администратора: email + пароль. Ставит httpOnly-cookie сессии. */
export async function POST(req: Request) {
  const csrf = sameOriginGuard(req)
  if (csrf) return csrf

  const ip = clientIp(req)

  if (await isLoginRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Слишком много неудачных попыток входа. Повторите через 15 минут.' },
      { status: 429 }
    )
  }

  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос.' }, { status: 400 })
  }

  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  if (!email || !password) {
    return NextResponse.json({ error: 'Укажите e-mail и пароль.' }, { status: 400 })
  }

  const user = await db.adminUser.findUnique({ where: { email } })
  if (!user || !verifyPassword(password, user.passwordHash)) {
    await logLoginAttempt(ip, email, false)
    // Единое сообщение — не раскрываем, существует ли аккаунт
    return NextResponse.json({ error: 'Неверный e-mail или пароль.' }, { status: 401 })
  }

  const { token, expiresAt } = await createSession(user.id)
  await logLoginAttempt(ip, email, true)

  const isHttps = req.headers.get('x-forwarded-proto') === 'https'
  const res = NextResponse.json({ ok: true, user: { email: user.email, name: user.name } })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    path: '/',
    expires: expiresAt,
  })
  return res
}
