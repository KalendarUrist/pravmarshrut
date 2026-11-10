import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound, redirect, permanentRedirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getBaseUrl } from '@/lib/server-url'
import { getPublishedArticles, coverUrl, readingMinutes, type ArticleRow } from '@/lib/queries'
import { findRedirect } from '@/lib/redirects'
import { Breadcrumbs, type Crumb } from '@/components/site/breadcrumbs'
import { ArticleCard } from '@/components/site/article-card'
import { HelpCta } from '@/components/site/help-cta'
import { getSettings } from '@/lib/settings'
import { CategoryIcon } from '@/lib/category-icons'
import { ChevronLeft, ChevronRight, ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react'

export const dynamic = 'force-dynamic'

export interface CategoryViewProps {
  slug: string
  page: number
  sort: 'desc' | 'asc'
  basePath: string
}

/** Общий каркас страницы категории (используется для /{категория}/ и /{категория}/page/N/). */
export async function CategoryView({ slug, page, sort, basePath }: CategoryViewProps) {
  const category = await db.category.findUnique({
    where: { slug },
    include: { imageMedia: { select: { id: true, filename: true, alt: true } } },
  })
  if (!category) {
    const target = await findRedirect(`/${slug}`)
    if (target) {
      if (target.code === 301) permanentRedirect(target.toPath)
      redirect(target.toPath)
    }
    notFound()
  }

  const { rows, total, pages } = await getPublishedArticles({ categoryId: category.id, page, order: sort })
  const [settings, baseUrl] = await Promise.all([getSettings(), getBaseUrl()])

  if (page > 1 && rows.length === 0) notFound()

  const crumbs: Crumb[] = [{ title: category.title }]
  const canonical = page > 1 ? `${baseUrl}${basePath}/page/${page}/` : `${baseUrl}/${slug}/`

  return (
    <div className="container-site py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Главная', item: `${baseUrl}/` },
              { '@type': 'ListItem', position: 2, name: category.title, item: `${baseUrl}/${slug}/` },
            ],
          }),
        }}
      />

      <Breadcrumbs items={crumbs} />

      <header className="mt-4 grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(220px,300px)] sm:items-center">
        <div className="max-w-3xl">
          <h1 className="flex items-center gap-3 font-serif text-[28px] font-bold leading-tight tracking-tight text-primary sm:text-3xl">
            <CategoryIcon slug={category.slug} title={category.title} className="h-8 w-8 shrink-0" strokeWidth={1.6} />
            {category.title}
          </h1>
          {category.description && (
            <p className="mt-3 leading-relaxed text-muted-foreground">{category.description}</p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            Публикаций в разделе: {total}
          </p>
        </div>
        {category.imageMedia && (
          <span
            className="relative block aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted sm:aspect-auto sm:h-[180px]"
            aria-hidden={category.imageMedia.alt ? undefined : true}
          >
            <Image
              src={`/media/${category.imageMedia.id}/${category.imageMedia.filename}`}
              alt={category.imageMedia.alt || `Раздел «${category.title}»`}
              fill
              sizes="(max-width: 640px) 100vw, 300px"
              className="object-cover"
              priority={page === 1}
            />
          </span>
        )}
      </header>

      {/* Сортировка по дате */}
      <div className="mt-6 flex items-center gap-2 border-b pb-4">
        <span className="text-sm text-muted-foreground">Сортировка:</span>
        <Link
          href={`/${slug}/`}
          aria-current={sort === 'desc' ? 'true' : undefined}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
            sort === 'desc' ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'
          }`}
        >
          <ArrowDownWideNarrow className="h-3.5 w-3.5" aria-hidden /> Сначала новые
        </Link>
        <Link
          href={`/${slug}/?sort=asc`}
          aria-current={sort === 'asc' ? 'true' : undefined}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
            sort === 'asc' ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'
          }`}
        >
          <ArrowUpNarrowWide className="h-3.5 w-3.5" aria-hidden /> Сначала старые
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p>В этом разделе пока нет опубликованных материалов.</p>
          <p className="mt-2 text-sm">Загляните на <Link href="/" className="text-primary underline-offset-4 hover:underline">главную страницу</Link> или воспользуйтесь поиском.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((a: ArticleRow) => (
              <ArticleCard
                key={a.slug}
                article={{
                  slug: a.slug,
                  title: a.title,
                  excerpt: a.excerpt,
                  categorySlug: a.category.slug,
                  categoryTitle: a.category.title,
                  coverUrl: coverUrl(a),
                  coverAlt: a.coverMedia?.alt || '',
                  publishedAt: a.publishedAt,
                  views: a.views,
                  readingMinutes: readingMinutes(a.contentPlain),
                  isTest: a.isTest,
                }}
              />
            ))}
          </div>

          {/* Пагинация */}
          {pages > 1 && (
            <nav aria-label="Страницы раздела" className="mt-10 flex items-center justify-center gap-1.5">
              {page > 1 && (
                <Link
                  href={page === 2 ? `${basePath}/` : `${basePath}/page/${page - 1}/`}
                  className="inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm hover:bg-accent"
                  rel="prev"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Назад
                </Link>
              )}
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center gap-1.5">
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-muted-foreground">…</span>}
                    <Link
                      href={p === 1 ? `${basePath}/` : `${basePath}/page/${p}/`}
                      aria-current={p === page ? 'page' : undefined}
                      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm ${
                        p === page ? 'bg-primary font-medium text-primary-foreground' : 'hover:bg-accent'
                      }`}
                    >
                      {p}
                    </Link>
                  </span>
                ))}
              {page < pages && (
                <Link
                  href={`${basePath}/page/${page + 1}/`}
                  className="inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm hover:bg-accent"
                  rel="next"
                >
                  Вперёд <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
            </nav>
          )}
        </>
      )}

      <HelpCta ctaText={settings.heroCtaText} pageUrl={canonical} />
    </div>
  )
}

/** Метаданные страницы категории. */
export async function categoryMetadata(slug: string, page: number, baseUrl: string): Promise<Metadata> {
  const category = await db.category.findUnique({
    where: { slug },
    include: { imageMedia: { select: { id: true, filename: true } } },
  })
  if (!category) return {}
  const title = category.seoTitle || category.title
  const description = category.metaDescription || category.description.slice(0, 300)
  const canonical = page > 1 ? `${baseUrl}/${slug}/page/${page}/` : `${baseUrl}/${slug}/`
  return {
    title: page > 1 ? `${title} — страница ${page}` : title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      locale: 'ru_RU',
      ...(category.imageMedia && {
        images: [{ url: `${baseUrl}/media/${category.imageMedia.id}/${category.imageMedia.filename}` }],
      }),
    },
  }
}
