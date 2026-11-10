/**
 * Серверная защита административных API:
 *  - requireAdminApi: проверка сессии (cookie) для всех /api/admin/* и /api/auth/logout;
 *  - sameOriginGuard: проверка Origin против Host (защита от CSRF для POST/PUT/DELETE).
 */
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'

export type AdminUser = { id: string; email: string; name: string }

export async function requireAdminApi(): Promise<AdminUser | NextResponse> {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 })
  }
  return user
}

export function isAdminResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse
}

export function sameOriginGuard(req: Request): NextResponse | null {
  const origin = req.headers.get('origin')
  if (!origin) return null // не-CORS запрос (curl, same-origin form)
  try {
    const originHost = new URL(origin).host
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
    if (originHost !== host) {
      return NextResponse.json({ error: 'Запрос с другого источника запрещён.' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Некорректный источник запроса.' }, { status: 403 })
  }
  return null
}

export function unauthorized() {
  return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 })
}
