import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { getBaseUrl } from '@/lib/server-url'
import { CategoryIcon } from '@/lib/category-icons'
import { HelpCta } from '@/components/site/help-cta'
import { Breadcrumbs } from '@/components/site/breadcrumbs'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl()
  return {
    title: 'Юридические вопросы — все категории',
    description: 'Каталог тематических разделов: семейные, жилищные, трудовые и другие юридические вопросы для граждан.',
    alternates: { canonical: `${baseUrl}/categories/` },
    openGraph: { title: 'Юридические вопросы', url: `${baseUrl}/categories/`, type: 'website', locale: 'ru_RU' },
  }
}

/** Каталог всех категорий («Все категории» с главной страницы). */
export default async function CategoriesPage() {
  const [categories, settings, baseUrl] = await Promise.all([
    db.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: {
        _count: { select: { articles: { where: { status: 'PUBLISHED' } } } },
        imageMedia: { select: { id: true, filename: true, alt: true } },
      },
    }),
    getSettings(),
    getBaseUrl(),
  ])

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
              { '@type': 'ListItem', position: 2, name: 'Юридические вопросы', item: `${baseUrl}/categories/` },
            ],
          }),
        }}
      />

      <Breadcrumbs items={[{ title: 'Юридические вопросы' }]} />

      <header className="mt-4 max-w-3xl">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-primary">Юридические вопросы</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Выберите тему — внутри пошаговые инструкции, разъяснения законов и разборы типовых ситуаций.
        </p>
      </header>

      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const image = c.imageMedia
          return (
            <li key={c.slug}>
              <Link
                href={`/${c.slug}/`}
                className="chip-card group flex h-full flex-col overflow-hidden rounded-lg border bg-card"
              >
                {image && (
                  <span className="relative block aspect-[3/2] w-full overflow-hidden bg-muted">
                    <Image
                      src={`/media/${image.id}/${image.filename}`}
                      alt={image.alt || `Раздел «${c.title}»`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </span>
                )}
                <span className="flex flex-1 flex-col p-5">
                  <span className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent">
                      <CategoryIcon slug={c.slug} title={c.title} className="h-6 w-6 text-primary" strokeWidth={1.7} />
                    </span>
                    <span className="font-semibold leading-snug">{c.title}</span>
                  </span>
                  {c.description && (
                    <span className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{c.description}</span>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                    {c._count.articles > 0
                      ? `Материалов в разделе: ${c._count.articles}`
                      : 'Раздел наполняется'}
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      {categories.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p>Категории появятся после их создания в панели управления.</p>
        </div>
      )}

      <HelpCta ctaText={settings.heroCtaText} pageUrl={`${baseUrl}/categories/`} />
    </div>
  )
}
