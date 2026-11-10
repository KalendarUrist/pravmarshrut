import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { ArticleEditor, type ArticleData } from '@/components/admin/articles/article-editor'

export const dynamic = 'force-dynamic'

function toLocalInput(date: Date | null): string {
  if (!date) return ''
  // формат datetime-local: YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const article = await db.article.findUnique({
    where: { id },
    include: {
      coverMedia: { select: { id: true, filename: true } },
      relatedLinks: { include: { related: { select: { id: true, title: true, slug: true, category: { select: { title: true } } } } } },
    },
  })
  if (!article) notFound()

  const initial: ArticleData = {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    contentHtml: article.contentHtml,
    categoryId: article.categoryId,
    tags: article.tags,
    coverMediaId: article.coverMediaId,
    coverUrl: article.coverMedia ? `/media/${article.coverMedia.id}/${article.coverMedia.filename}` : '',
    videoUrl: article.videoUrl,
    authorName: article.authorName,
    legalBasis: article.legalBasis,
    courtPractice: article.courtPractice,
    deadlines: article.deadlines,
    documents: article.documents,
    seoTitle: article.seoTitle,
    metaDescription: article.metaDescription,
    status: article.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
    publishedAt: toLocalInput(article.publishedAt),
    checkedAt: article.checkedAt ? article.checkedAt.toISOString().slice(0, 10) : '',
    isTest: article.isTest,
    related: article.relatedLinks.map((l) => ({
      id: l.related.id,
      title: l.related.title,
      slug: l.related.slug,
      categoryTitle: l.related.category.title,
    })),
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="sr-only">Редактирование статьи</h1>
      <ArticleEditor initial={initial} />
    </div>
  )
}
