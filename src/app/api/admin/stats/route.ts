import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminApi, isAdminResponse } from '@/lib/admin-api'
import { isMailerConfigured } from '@/lib/mailer'

export const runtime = 'nodejs'

/** Сводка для дашборда. */
export async function GET() {
  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const [published, drafts, categories, media, newSubmissions, testArticles, recentSubmissions, recentArticles] =
    await Promise.all([
      db.article.count({ where: { status: 'PUBLISHED' } }),
      db.article.count({ where: { status: 'DRAFT' } }),
      db.category.count(),
      db.media.count(),
      db.submission.count({ where: { status: 'NEW' } }),
      db.article.count({ where: { isTest: true } }),
      db.submission.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      db.article.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, slug: true, status: true, updatedAt: true, category: { select: { title: true, slug: true } } },
      }),
    ])

  return NextResponse.json({
    published,
    drafts,
    categories,
    media,
    newSubmissions,
    testArticles,
    recentSubmissions,
    recentArticles,
    mailConfigured: isMailerConfigured(),
  })
}
