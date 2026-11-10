import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminApi, isAdminResponse, sameOriginGuard } from '@/lib/admin-api'

export const runtime = 'nodejs'

/** Список редиректов. */
export async function GET() {
  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const rows = await db.redirect.findMany({ orderBy: { createdAt: 'desc' }, take: 500 })
  return NextResponse.json({ rows })
}

/** Добавление редиректа: со старого адреса на новый (301/302). */
export async function POST(req: Request) {
  const csrf = sameOriginGuard(req)
  if (csrf) return csrf

  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос.' }, { status: 400 })
  }

  const normalizePath = (raw: string): string => {
    let p = String(raw || '').trim()
    if (!p) return ''
    if (/^https?:\/\//i.test(p)) {
      try {
        p = new URL(p).pathname
      } catch {
        return ''
      }
    }
    p = p.replace(/\s+/g, '-')
    if (!p.startsWith('/')) p = `/${p}`
    return p.replace(/\/+$/, '') || '/'
  }

  const fromPath = normalizePath(String(body.fromPath || ''))
  const toPath = normalizePath(String(body.toPath || ''))
  const code = Number(body.code) === 302 ? 302 : 301

  if (!fromPath || fromPath === '/' || !toPath || toPath === '/') {
    return NextResponse.json({ error: 'Укажите старый и новый адреса (пути вида /family/old-article).' }, { status: 422 })
  }
  if (await db.redirect.findUnique({ where: { fromPath } })) {
    return NextResponse.json({ error: 'Редирект для этого адреса уже существует.' }, { status: 422 })
  }

  const redirect = await db.redirect.create({ data: { fromPath, toPath, code } })
  return NextResponse.json({ ok: true, redirect })
}
