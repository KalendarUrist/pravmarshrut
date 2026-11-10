/**
 * Серверная обработка данных статьи: валидация, санитизация, автоматические
 * редиректы при смене URL. Используется API админ-панели.
 */
import { db } from '@/lib/db'
import { slugify, isValidSlug } from '@/lib/slug'
import { sanitizeHtmlContent, htmlToPlain } from '@/lib/content'

export interface ArticlePayload {
  title: string
  slug: string
  excerpt: string
  contentHtml: string
  categoryId: string
  tags: string
  coverMediaId: string | null
  videoUrl: string
  authorName: string
  legalBasis: string
  deadlines: string
  documents: string
  seoTitle: string
  metaDescription: string
  status: 'DRAFT' | 'PUBLISHED'
  publishedAt: string | null
  checkedAt: string | null
  relatedIds: string[]
  isTest: boolean
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
  data?: {
    title: string
    slug: string
    excerpt: string
    contentHtml: string
    contentPlain: string
    categoryId: string
    tags: string
    coverMediaId: string | null
    videoUrl: string
    authorName: string
    legalBasis: string
    courtPractice: string
    deadlines: string
    documents: string
    seoTitle: string
    metaDescription: string
    status: 'DRAFT' | 'PUBLISHED'
    publishedAt: Date | null
    checkedAt: Date | null
    isTest: boolean
    relatedIds: string[]
  }
}

function toDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function validateArticlePayload(raw: Record<string, unknown>, currentId?: string): Promise<ValidationResult> {
  const errors: string[] = []

  const title = String(raw.title || '').trim()
  if (title.length < 3 || title.length > 200) errors.push('Заголовок должен содержать от 3 до 200 символов.')

  let slug = String(raw.slug || '').trim().toLowerCase()
  if (!slug) slug = slugify(title)
  if (!isValidSlug(slug)) errors.push('URL может содержать только латинские буквы, цифры и дефисы.')
  else {
    const existing = await db.article.findUnique({ where: { slug } })
    if (existing && existing.id !== currentId) errors.push('Статья с таким URL уже существует.')
  }

  const categoryId = String(raw.categoryId || '')
  const category = categoryId ? await db.category.findUnique({ where: { id: categoryId } }) : null
  if (!category) errors.push('Выберите категорию.')

  const contentHtml = sanitizeHtmlContent(String(raw.contentHtml || ''))
  const excerpt = String(raw.excerpt || '').trim().slice(0, 600)
  const tags = String(raw.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10)
    .join(', ')

  const coverMediaId = raw.coverMediaId ? String(raw.coverMediaId) : null
  if (coverMediaId) {
    const media = await db.media.findUnique({ where: { id: coverMediaId } })
    if (!media) errors.push('Выбранная обложка не найдена в медиатеке.')
  }

  const videoUrl = String(raw.videoUrl || '').trim().slice(0, 500)
  const status = raw.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'

  const publishedAt = toDate(raw.publishedAt) ?? (status === 'PUBLISHED' ? new Date() : null)
  const checkedAt = toDate(raw.checkedAt)

  // Связанные статьи: проверяем существование
  const relatedIds = Array.isArray(raw.relatedIds) ? raw.relatedIds.map(String).filter(Boolean).slice(0, 8) : []
  if (relatedIds.length > 0) {
    const found = await db.article.findMany({ where: { id: { in: relatedIds } }, select: { id: true } })
    for (const id of relatedIds) {
      if (!found.some((f) => f.id === id)) errors.push('Одна из выбранных связанных статей не найдена.')
    }
  }

  if (errors.length > 0) return { ok: false, errors }

  return {
    ok: true,
    errors: [],
    data: {
      title,
      slug,
      excerpt,
      contentHtml,
      contentPlain: htmlToPlain(contentHtml),
      categoryId,
      tags,
      coverMediaId,
      videoUrl,
      authorName: String(raw.authorName || '').trim().slice(0, 120),
      legalBasis: String(raw.legalBasis || '').trim().slice(0, 500),
      courtPractice: String(raw.courtPractice || '').trim().slice(0, 500),
      deadlines: String(raw.deadlines || '').trim().slice(0, 800),
      documents: String(raw.documents || '').trim().slice(0, 1000),
      seoTitle: String(raw.seoTitle || '').trim().slice(0, 200),
      metaDescription: String(raw.metaDescription || '').trim().slice(0, 300),
      status,
      publishedAt,
      checkedAt,
      isTest: raw.isTest === true,
      relatedIds,
    },
  }
}

/** При изменении URL опубликованной статьи создаёт 301-редирект со старого адреса. */
export async function createRedirectForSlugChange(
  articleId: string,
  oldSlug: string,
  oldCategoryId: string
): Promise<void> {
  const article = await db.article.findUnique({
    where: { id: articleId },
    select: { slug: true, categoryId: true, status: true, category: { select: { slug: true } } },
  })
  if (!article || article.slug === oldSlug) return

  const [oldCategory, newCategory] = await Promise.all([
    db.category.findUnique({ where: { id: oldCategoryId }, select: { slug: true } }),
    db.category.findUnique({ where: { id: article.categoryId }, select: { slug: true } }),
  ])
  if (!oldCategory || !newCategory) return

  const fromPath = `/${oldCategory.slug}/${oldSlug}`
  const toPath = `/${newCategory.slug}/${article.slug}`
  if (fromPath === toPath) return

  await db.redirect.upsert({
    where: { fromPath },
    update: { toPath, code: 301 },
    create: { fromPath, toPath, code: 301 },
  })
}
