import Link from 'next/link'
import Image from 'next/image'
import { formatDateShort } from '@/lib/format'
import { CategoryIcon } from '@/lib/category-icons'
import { Clock } from 'lucide-react'

export interface ArticleCardData {
  slug: string
  title: string
  excerpt: string
  categorySlug: string
  categoryTitle: string
  coverUrl: string | null
  coverAlt: string
  publishedAt: Date | null
  views: number
  readingMinutes?: number
  isTest?: boolean
}

function Cover({ article, className }: { article: ArticleCardData; className?: string }) {
  const href = `/${article.categorySlug}/${article.slug}/`
  if (article.coverUrl) {
    return (
      <Link href={href} className={`relative block overflow-hidden bg-muted ${className}`} tabIndex={-1} aria-hidden>
        <Image
          src={article.coverUrl}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </Link>
    )
  }
  return (
    <Link href={href} className={`block overflow-hidden bg-secondary ${className}`} tabIndex={-1} aria-hidden>
      <div className="flex h-full items-center justify-center px-3 text-center">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
          {article.categoryTitle}
        </span>
      </div>
    </Link>
  )
}

function TestMark({ isTest }: { isTest?: boolean }) {
  if (!isTest) return null
  return <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wide text-destructive">тест</span>
}

/** Строковая карточка-ссылка: иконка конкретной категории + дата, как в макете. */
export function ArticleMeta({
  article,
  showDate = true,
  showReadingTime = false,
}: {
  article: Pick<ArticleCardData, 'categorySlug' | 'categoryTitle' | 'publishedAt' | 'readingMinutes'>
  showDate?: boolean
  showReadingTime?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-muted-foreground">
      <Link
        href={`/${article.categorySlug}/`}
        className="inline-flex items-center gap-2 hover:text-primary"
      >
        <CategoryIcon slug={article.categorySlug} title={article.categoryTitle} className="h-[18px] w-[18px]" strokeWidth={1.6} />
        {article.categoryTitle}
      </Link>
      {showReadingTime && article.readingMinutes != null && (
        <span className="inline-flex items-center gap-2">
          <Clock className="h-4 w-4" strokeWidth={1.6} aria-hidden /> {article.readingMinutes} мин чтения
        </span>
      )}
      {showDate && article.publishedAt && (
        <span className="inline-flex items-center gap-2">
          <Clock className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          <time dateTime={article.publishedAt.toISOString()}>{formatDateShort(article.publishedAt)}</time>
        </span>
      )}
    </div>
  )
}

/** Карточка статьи в сетках (категория, поиск, «Читайте также», «Статьи»). */
export function ArticleCard({ article }: { article: ArticleCardData }) {
  const href = `/${article.categorySlug}/${article.slug}/`
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <Cover article={article} className="aspect-[16/9]" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-[16px] font-bold leading-snug">
          <Link href={href} className="transition-colors hover:text-primary">
            {article.title}
            <TestMark isTest={article.isTest} />
          </Link>
        </h3>
        {article.excerpt && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{article.excerpt}</p>
        )}
        <div className="mt-auto border-t pt-3">
          <ArticleMeta article={article} showDate showReadingTime />
        </div>
      </div>
    </article>
  )
}

/** Крупная карточка «Популярные материалы»: панорамная обложка с внутренней отбивкой, как в макете. */
export function ArticleFeatured({ article }: { article: ArticleCardData }) {
  const href = `/${article.categorySlug}/${article.slug}/`
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <div className="p-2.5 pb-0">
        <Cover article={article} className="aspect-[4/1] w-full rounded-lg" />
      </div>
      <div className="flex flex-1 flex-col gap-2 px-5 pb-4.5 pt-3.5">
        <h3 className="text-[20px] font-bold leading-[1.3] tracking-tight">
          <Link href={href} className="transition-colors hover:text-primary">
            {article.title}
            <TestMark isTest={article.isTest} />
          </Link>
        </h3>
        {article.excerpt && (
          <p className="line-clamp-3 text-[15px] leading-relaxed text-muted-foreground">{article.excerpt}</p>
        )}
        <div className="mt-auto pt-2">
          <ArticleMeta article={article} showDate={false} showReadingTime />
        </div>
      </div>
    </article>
  )
}

/** Компактная горизонтальная строка публикации (последние/популярные списки) — плотный ритм по макету. */
export function ArticleListItem({ article }: { article: ArticleCardData }) {
  const href = `/${article.categorySlug}/${article.slug}/`
  return (
    <article className="group flex items-start gap-4 py-2.5 first:pt-0 last:pb-0">
      <Cover article={article} className="aspect-[16/10] w-[100px] shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <h3 className="text-[16px] font-bold leading-[1.3]">
          <Link href={href} className="transition-colors hover:text-primary">
            {article.title}
            <TestMark isTest={article.isTest} />
          </Link>
        </h3>
        <div className="mt-2">
          <ArticleMeta article={article} showDate showReadingTime={false} />
        </div>
      </div>
    </article>
  )
}
