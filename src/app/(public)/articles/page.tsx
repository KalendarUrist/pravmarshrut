import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getBaseUrl } from '@/lib/server-url'
import { getPublishedArticles, coverUrl, readingMinutes } from '@/lib/queries'
import { ArticleCard } from '@/components/site/article-card'
import { HelpCta } from '@/components/site/help-cta'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

const PER_PAGE = 12

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl()
  return {
    title: 'Все статьи',
    description: 'Все опубликованные юридические материалы: инструкции, разъяснения законов и пошаговые разборы.',
    alternates: { canonical: `${baseUrl}/articles/` },
    openGraph: { title: 'Все статьи', url: `${baseUrl}/articles/`, type: 'website', locale: 'ru_RU' },
  }
}

/** Полный список опубликованных материалов (пункт меню «Статьи»). */
export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const [{ rows, total, pages }, settings, baseUrl] = await Promise.all([
    getPublishedArticles({ page, perPage: PER_PAGE }),
    getSettings(),
    getBaseUrl(),
  ])

  if (page > 1 && rows.length === 0) {
    return (
      <div className="container-site py-16 text-center">
        <h1 className="font-serif text-2xl font-bold">Страница не найдена</h1>
        <p className="mt-3 text-muted-foreground">
          Такой страницы нет. <Link href="/articles/" className="text-primary underline-offset-4 hover:underline">Откройте список статей</Link>.
        </p>
      </div>
    )
  }

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
              { '@type': 'ListItem', position: 2, name: 'Статьи', item: `${baseUrl}/articles/` },
            ],
          }),
        }}
      />

      <Breadcrumbs items={[{ title: 'Статьи' }]} />

      <header className="mt-4 max-w-3xl">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-primary">Статьи</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Все опубликованные материалы проекта: пошаговые инструкции, разъяснения законов и разборы типовых ситуаций.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Всего материалов: {total}</p>
      </header>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p>Материалов пока нет — они появятся после публикации в панели управления.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((a) => (
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
      )}

      {/* Пагинация */}
      {pages > 1 && (
        <nav aria-label="Страницы статей" className="mt-10 flex items-center justify-center gap-1.5">
          {page > 1 && (
            <Link
              href={page === 2 ? '/articles/' : `/articles/?page=${page - 1}`}
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
                  href={p === 1 ? '/articles/' : `/articles/?page=${p}`}
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
              href={`/articles/?page=${page + 1}`}
              className="inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm hover:bg-accent"
              rel="next"
            >
              Вперёд <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </nav>
      )}

      <HelpCta ctaText={settings.heroCtaText} pageUrl={`${baseUrl}/articles/`} />
    </div>
  )
}
