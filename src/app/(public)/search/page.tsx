import Link from 'next/link'
import type { Metadata } from 'next'
import Image from 'next/image'
import { db } from '@/lib/db'
import { getBaseUrl } from '@/lib/server-url'
import { htmlToPlain, makeSnippet } from '@/lib/content'
import { formatDateShort } from '@/lib/format'
import { Search as SearchIcon, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PER_PAGE = 10

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl()
  return {
    title: 'Поиск по материалам',
    description: 'Поиск по юридическим материалам сайта.',
    robots: { index: false },
    alternates: { canonical: `${baseUrl}/search/` },
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q = '', page: pageParam } = await searchParams
  const query = q.trim().slice(0, 200)
  const page = Math.max(1, Number(pageParam) || 1)

  let results: {
    id: string
    slug: string
    title: string
    excerpt: string
    contentPlain: string
    publishedAt: Date | null
    coverMedia: { id: string; filename: string; alt: string } | null
    category: { slug: string; title: string }
  }[] = []
  let total = 0

  if (query.length >= 2) {
    const where = {
      status: 'PUBLISHED' as const,
      OR: [
        { title: { contains: query } },
        { excerpt: { contains: query } },
        { contentPlain: { contains: query } },
        { tags: { contains: query } },
      ],
    }
    ;[results, total] = await Promise.all([
      db.article.findMany({
        where,
        select: {
          id: true, slug: true, title: true, excerpt: true, contentPlain: true, publishedAt: true,
          coverMedia: { select: { id: true, filename: true, alt: true } },
          category: { select: { slug: true, title: true } },
        },
        orderBy: [{ publishedAt: 'desc' }],
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
      db.article.count({ where }),
    ])
  }

  const pages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div className="container-site py-8">
      <h1 className="font-serif text-3xl font-bold tracking-tight text-primary">Поиск по материалам</h1>

      <form action="/search" method="GET" role="search" className="mt-6 flex gap-2">
        <label htmlFor="search-page-input" className="sr-only">Поисковый запрос</label>
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            id="search-page-input"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Введите запрос: развод, алименты, наследство…"
            className="h-12 w-full rounded-lg border border-input bg-background px-10 text-sm outline-none ring-primary/30 transition-shadow placeholder:text-muted-foreground focus:ring-2"
          />
        </div>
        <button
          type="submit"
          className="h-12 shrink-0 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Найти
        </button>
      </form>

      {query.length > 0 && query.length < 2 && (
        <p className="mt-6 text-sm text-muted-foreground">Введите не менее двух символов.</p>
      )}

      {query.length >= 2 && (
        <p className="mt-6 text-sm text-muted-foreground" role="status">
          {total > 0
            ? `Найдено материалов: ${total}. Запрос: «${query}».`
            : `По запросу «${query}» ничего не найдено.`}
        </p>
      )}

      <div className="mt-2 divide-y">
        {results.map((r) => {
          const plain = r.contentPlain || htmlToPlain(r.excerpt)
          const snippet = makeSnippet(plain, query)
          return (
            <article key={r.id} className="group flex items-start gap-4 py-4 first:pt-0">
              {r.coverMedia ? (
                <Link
                  href={`/${r.category.slug}/${r.slug}/`}
                  tabIndex={-1}
                  aria-hidden
                  className="relative block aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-md border bg-muted sm:w-28"
                >
                  <Image
                    src={`/media/${r.coverMedia.id}/${r.coverMedia.filename}`}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </Link>
              ) : (
                <Link
                  href={`/${r.category.slug}/${r.slug}/`}
                  tabIndex={-1}
                  aria-hidden
                  className="flex aspect-[4/3] w-24 shrink-0 items-center justify-center rounded-md border bg-secondary px-2 text-center sm:w-28"
                >
                  <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
                    {r.category.title}
                  </span>
                </Link>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Link href={`/${r.category.slug}/`} className="font-medium text-primary hover:underline">
                    {r.category.title}
                  </Link>
                  {r.publishedAt && <time dateTime={r.publishedAt.toISOString()}>{formatDateShort(r.publishedAt)}</time>}
                </div>
                <h2 className="text-base font-semibold leading-snug sm:text-lg">
                  <Link href={`/${r.category.slug}/${r.slug}/`} className="transition-colors hover:text-primary">
                    {r.title}
                  </Link>
                </h2>
                {snippet && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{snippet}</p>}
                <Link
                  href={`/${r.category.slug}/${r.slug}/`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden /> Читать материал
                </Link>
              </div>
            </article>
          )
        })}
      </div>

      {/* Пагинация результатов */}
      {pages > 1 && (
        <nav aria-label="Страницы результатов" className="mt-8 flex items-center justify-center gap-1.5">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/search/?q=${encodeURIComponent(query)}&page=${p}`}
              aria-current={p === page ? 'page' : undefined}
              className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm ${
                p === page ? 'bg-primary font-medium text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}

      {query.length >= 2 && total === 0 && (
        <div className="mt-8 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">Попробуйте изменить запрос или посмотрите разделы на главной странице.</p>
          <Link href="/" className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
            Вернуться на главную
          </Link>
        </div>
      )}
    </div>
  )
}
