import { NextResponse } from 'next/server'
import { destroySession, SESSION_COOKIE } from '@/lib/auth'
import { requireAdminApi, isAdminResponse, sameOriginGuard } from '@/lib/admin-api'

export const runtime = 'nodejs'

/** Выход: удаляет сессию из БД и сбрасывает cookie. */
export async function POST(req: Request) {
  const csrf = sameOriginGuard(req)
  if (csrf) return csrf

  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  await destroySession()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
