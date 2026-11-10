import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminApi, isAdminResponse, sameOriginGuard } from '@/lib/admin-api'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

const ALLOWED_STATUSES = ['NEW', 'IN_PROGRESS', 'DONE']

/** Изменение статуса обращения. */
export async function PUT(req: Request, { params }: Params) {
  const csrf = sameOriginGuard(req)
  if (csrf) return csrf

  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const { id } = await params
  const submission = await db.submission.findUnique({ where: { id } })
  if (!submission) return NextResponse.json({ error: 'Обращение не найдено.' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос.' }, { status: 400 })
  }

  const status = String(body.status || '')
  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Недопустимый статус.' }, { status: 422 })
  }

  const updated = await db.submission.update({ where: { id }, data: { status } })
  return NextResponse.json({ ok: true, submission: updated })
}

/** Удаление обращения. */
export async function DELETE(req: Request, { params }: Params) {
  const csrf = sameOriginGuard(req)
  if (csrf) return csrf

  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const { id } = await params
  await db.submission.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
