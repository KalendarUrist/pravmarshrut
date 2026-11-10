/** Типовые выборки статей для публичных страниц. */
import { db } from '@/lib/db'

export const ARTICLES_PER_PAGE = 12

const cardSelect = {
  slug: true,
  title: true,
  excerpt: true,
  contentPlain: true,
  isTest: true,
  views: true,
  publishedAt: true,
  coverMedia: { select: { id: true, filename: true, alt: true } },
  category: { select: { slug: true, title: true } },
} as const

export type ArticleRow = {
  slug: string
  title: string
  excerpt: string
  contentPlain: string
  isTest: boolean
  views: number
  publishedAt: Date | null
  coverMedia: { id: string; filename: string; alt: string } | null
  category: { slug: string; title: string }
}

export function coverUrl(row: ArticleRow): string | null {
  return row.coverMedia ? `/media/${row.coverMedia.id}/${row.coverMedia.filename}` : null
}

export function readingMinutes(plain: string): number {
  const words = plain.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 150))
}

/** Опубликованные статьи с пагинацией. */
export async function getPublishedArticles(options: {
  categoryId?: string
  page?: number
  perPage?: number
  order?: 'desc' | 'asc'
}) {
  const { categoryId, page = 1, perPage = ARTICLES_PER_PAGE, order = 'desc' } = options
  const where = { status: 'PUBLISHED' as const, ...(categoryId ? { categoryId } : {}) }
  const [rows, total] = await Promise.all([
    db.article.findMany({
      where,
      select: cardSelect,
      orderBy: [{ publishedAt: order }, { createdAt: order }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.article.count({ where }),
  ])
  return { rows: rows as ArticleRow[], total, pages: Math.max(1, Math.ceil(total / perPage)) }
}

/** Популярные статьи (по числу просмотров). */
export async function getPopularArticles(limit = 6) {
  const rows = await db.article.findMany({
    where: { status: 'PUBLISHED' },
    select: cardSelect,
    orderBy: [{ views: 'desc' }, { publishedAt: 'desc' }],
    take: limit,
  })
  return rows as ArticleRow[]
}

/** Последние публикации. */
export async function getLatestArticles(limit = 6) {
  const rows = await db.article.findMany({
    where: { status: 'PUBLISHED' },
    select: cardSelect,
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })
  return rows as ArticleRow[]
}

/** Статьи той же категории для блока «Читайте также». */
export async function getRelatedFromCategory(categoryId: string, excludeId: string, limit = 4) {
  const rows = await db.article.findMany({
    where: { status: 'PUBLISHED', categoryId, id: { not: excludeId } },
    select: cardSelect,
    orderBy: [{ publishedAt: 'desc' }],
    take: limit,
  })
  return rows as ArticleRow[]
}
