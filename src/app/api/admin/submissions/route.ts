import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminApi, isAdminResponse } from '@/lib/admin-api'
import { isMailerConfigured } from '@/lib/mailer'

export const runtime = 'nodejs'

/** Список обращений с фильтром по статусу. */
export async function GET(req: Request) {
  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const url = new URL(req.url)
  const status = url.searchParams.get('status') || ''
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const perPage = 20

  const where: Record<string, unknown> = {}
  if (['NEW', 'IN_PROGRESS', 'DONE'].includes(status)) where.status = status

  const [rows, total, newCount] = await Promise.all([
    db.submission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.submission.count({ where }),
    db.submission.count({ where: { status: 'NEW' } }),
  ])

  return NextResponse.json({ rows, total, page, pages: Math.max(1, Math.ceil(total / perPage)), newCount, mailConfigured: isMailerConfigured() })
}
