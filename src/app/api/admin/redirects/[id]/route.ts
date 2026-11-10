import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminApi, isAdminResponse, sameOriginGuard } from '@/lib/admin-api'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

/** Удаление редиректа. */
export async function DELETE(req: Request, { params }: Params) {
  const csrf = sameOriginGuard(req)
  if (csrf) return csrf

  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const { id } = await params
  await db.redirect.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
