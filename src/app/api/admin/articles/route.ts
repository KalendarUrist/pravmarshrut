import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminApi, isAdminResponse, sameOriginGuard } from '@/lib/admin-api'
import { validateArticlePayload } from '@/lib/articles-admin'

export const runtime = 'nodejs'

/** Список статей для таблицы админки: фильтры по статусу, категории, поиску. */
export async function GET(req: Request) {
  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  const status = url.searchParams.get('status') || ''
  const categoryId = url.searchParams.get('categoryId') || ''
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const perPage = 20

  const where: Record<string, unknown> = {}
  if (status === 'PUBLISHED' || status === 'DRAFT') where.status = status
  if (categoryId) where.categoryId = categoryId
  if (q) {
    where.OR = [{ title: { contains: q } }, { slug: { contains: q } }]
  }

  const [rows, total, categories] = await Promise.all([
    db.article.findMany({
      where,
      select: {
        id: true, slug: true, title: true, status: true, isTest: true, views: true,
        publishedAt: true, updatedAt: true, categoryId: true,
        category: { select: { id: true, slug: true, title: true } },
      },
      orderBy: [{ updatedAt: 'desc' }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.article.count({ where }),
    db.category.findMany({ select: { id: true, title: true, slug: true }, orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] }),
  ])

  return NextResponse.json({ rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)), categories })
}

/** Создание статьи. */
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

  const validation = await validateArticlePayload(body)
  if (!validation.ok || !validation.data) {
    return NextResponse.json({ error: validation.errors.join(' ') }, { status: 422 })
  }

  const { relatedIds, ...data } = validation.data
  const article = await db.article.create({ data: { ...data, relatedLinks: { create: relatedIds.map((rid) => ({ relatedId: rid })) } } })
  return NextResponse.json({ ok: true, article })
}
