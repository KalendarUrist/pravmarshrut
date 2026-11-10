import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminApi, isAdminResponse, sameOriginGuard } from '@/lib/admin-api'
import { validateArticlePayload, createRedirectForSlugChange } from '@/lib/articles-admin'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

/** Полные данные статьи для редактора. */
export async function GET(_req: Request, { params }: Params) {
  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const { id } = await params
  const article = await db.article.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, slug: true, title: true } },
      coverMedia: { select: { id: true, filename: true, alt: true } },
      relatedLinks: {
        include: {
          related: {
            select: { id: true, title: true, slug: true, status: true, category: { select: { title: true } } },
          },
        },
      },
    },
  })
  if (!article) return NextResponse.json({ error: 'Статья не найдена.' }, { status: 404 })
  return NextResponse.json({ article })
}

/** Обновление статьи (включая публикацию/снятие с публикации). */
export async function PUT(req: Request, { params }: Params) {
  const csrf = sameOriginGuard(req)
  if (csrf) return csrf

  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const { id } = await params
  const existing = await db.article.findUnique({
    where: { id },
    select: { id: true, slug: true, categoryId: true, status: true, publishedAt: true },
  })
  if (!existing) return NextResponse.json({ error: 'Статья не найдена.' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос.' }, { status: 400 })
  }

  const validation = await validateArticlePayload(body, id)
  if (!validation.ok || !validation.data) {
    return NextResponse.json({ error: validation.errors.join(' ') }, { status: 422 })
  }
  const { relatedIds, ...data } = validation.data

  // Снятие с публикации: статус DRAFT — статья исчезает с сайта, даты сохраняются
  const wasPublished = existing.status === 'PUBLISHED'
  const nowPublished = data.status === 'PUBLISHED'
  if (wasPublished && !nowPublished) {
    // сохраняем исходную дату публикации, чтобы не потерять историю
    data.publishedAt = existing.publishedAt
  }

  const article = await db.$transaction(async (tx) => {
    await tx.relatedArticle.deleteMany({ where: { articleId: id } })
    return tx.article.update({
      where: { id },
      data: {
        ...data,
        relatedLinks: { create: relatedIds.map((rid) => ({ relatedId: rid })) },
      },
    })
  })

  // Автоматический 301-редирект при смене URL или категории
  if (wasPublished || nowPublished) {
    await createRedirectForSlugChange(id, existing.slug, existing.categoryId)
  }

  return NextResponse.json({ ok: true, article })
}

/** Удаление статьи (вместе со связями). */
export async function DELETE(req: Request, { params }: Params) {
  const csrf = sameOriginGuard(req)
  if (csrf) return csrf

  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const { id } = await params
  try {
    await db.article.delete({ where: { id } })
  } catch {
    return NextResponse.json({ error: 'Не удалось удалить статью.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
