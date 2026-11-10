import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { Search, ArrowRight, MoreHorizontal } from 'lucide-react'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { getBaseUrl } from '@/lib/server-url'
import { getPopularArticles, getLatestArticles, coverUrl, readingMinutes, type ArticleRow } from '@/lib/queries'
import { CategoryIcon } from '@/lib/category-icons'
import { ArticleFeatured, ArticleListItem, type ArticleCardData } from '@/components/site/article-card'
import { HelpCard, AboutCard } from '@/components/site/help-card'
import { HelpCta } from '@/components/site/help-cta'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const [settings, baseUrl] = await Promise.all([getSettings(), getBaseUrl()])
  const title = settings.seoHomeTitle || `${settings.siteName} — юридическая помощь гражданам`
  const description = settings.seoHomeDescription || settings.siteDescription
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${baseUrl}/` },
    openGraph: { title, description, url: `${baseUrl}/`, siteName: settings.siteName, type: 'website', locale: 'ru_RU' },
  }
}

export default async function HomePage() {
  const [settings, popular, latest, categories, baseUrl] = await Promise.all([
    getSettings(),
    getPopularArticles(4),
    getLatestArticles(5),
    db.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: { imageMedia: { select: { id: true, filename: true, alt: true } } },
    }),
    getBaseUrl(),
  ])

  const featured = popular[0]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: settings.siteName,
        description: settings.siteDescription,
        url: `${baseUrl}/`,
        inLanguage: 'ru-RU',
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${baseUrl}/search/?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        name: settings.siteName,
        url: `${baseUrl}/`,
        description: settings.siteDescription,
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ─── Главный экран: заголовок, поиск, иллюстрация до края экрана ── */}
      <section className="hero-band relative overflow-hidden border-b border-border/60">
        {/* Иллюстрация: Фемида и книги кодексов, правая часть до края экрана */}
        <div className="absolute inset-y-0 right-0 hidden w-[50%] lg:block" aria-hidden>
          <Image
            src="/images/hero-justice.jpg"
            alt=""
            fill
            priority
            sizes="50vw"
            className="object-cover object-left [mask-image:linear-gradient(to_right,transparent_0%,black_16%)]"
          />
        </div>

        <div className="container-site relative py-8 lg:py-9">
          <div className="max-w-[600px]">
            <h1 className="max-w-[540px] font-serif text-[34px] font-bold leading-[1.22] tracking-tight text-primary sm:text-[42px] sm:leading-[1.25]">
              {settings.heroTitle}
            </h1>
            <p className="mt-4 max-w-[400px] text-[16px] leading-[1.55] text-foreground/85">{settings.heroSubtitle}</p>

            {/* Поиск по юридическим материалам: слитная строка, как в макете */}
            <form action="/search" method="GET" role="search" className="mt-6 flex h-[46px] max-w-[555px]">
              <label htmlFor="home-search" className="sr-only">Найти статью, закон или тему</label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-primary" aria-hidden />
                <input
                  id="home-search"
                  name="q"
                  type="search"
                  placeholder="Найти статью, закон или тему..."
                  className="h-full w-full rounded-l-xl border border-input border-r-0 bg-white pl-11 pr-4 text-[15px] text-foreground outline-none ring-primary/30 transition-shadow placeholder:text-muted-foreground focus:ring-2"
                />
              </div>
              <button
                type="submit"
                className="h-full shrink-0 rounded-r-xl bg-primary px-7 text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Найти
              </button>
            </form>
          </div>

          {/* Иллюстрация на мобильных: под текстом, со скруглением */}
          <div className="relative mt-7 aspect-[16/9] w-full overflow-hidden rounded-xl sm:max-w-[560px] lg:hidden">
            <Image
              src="/images/hero-justice.jpg"
              alt="Статуя Фемиды с весами и книги законодательных кодексов"
              fill
              sizes="(max-width: 1024px) 92vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ─── Контент: категории и публикации + боковой блок ───────────── */}
      <div className="container-site grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:py-12">
        <div className="min-w-0 space-y-12">
          {/* Юридические вопросы: плитки с заливкой, ширина по содержимому */}
          <section aria-labelledby="categories-title">
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 id="categories-title" className="font-serif text-[26px] font-bold leading-tight tracking-tight text-primary">
                Юридические вопросы
              </h2>
              <Link
                href="/categories/"
                className="inline-flex shrink-0 items-center gap-1.5 text-[15px] font-medium text-primary underline underline-offset-4 transition-opacity hover:opacity-80"
              >
                Все категории <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <ul className="flex flex-wrap gap-2.5">
              {categories.slice(0, 11).map((c) => {
                return (
                  <li key={c.slug}>
                    <Link
                      href={`/${c.slug}/`}
                      className="chip-card flex min-h-[70px] items-center gap-3 rounded-xl px-4 py-3"
                    >
                      {c.imageMedia ? (
                        <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                          <Image
                            src={`/media/${c.imageMedia.id}/${c.imageMedia.filename}`}
                            alt={c.imageMedia.alt || `Раздел «${c.title}»`}
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        </span>
                      ) : (
                        <CategoryIcon slug={c.slug} title={c.title} className="h-7 w-7 shrink-0 text-primary" strokeWidth={1.5} />
                      )}
                      <span className="max-w-[150px] text-[14px] font-medium leading-[1.25]">{c.title}</span>
                    </Link>
                  </li>
                )
              })}
              <li>
                <Link href="/categories/" className="chip-card flex min-h-[70px] items-center gap-3 rounded-xl px-4 py-3">
                  <MoreHorizontal className="h-7 w-7 shrink-0 text-primary" strokeWidth={1.5} aria-hidden />
                  <span className="max-w-[150px] text-[14px] font-medium leading-[1.25]">Другие вопросы</span>
                </Link>
              </li>
            </ul>
          </section>

          {/* Популярные материалы и Последние публикации — два столбца, как в макете */}
          <div className="grid gap-x-10 gap-y-12 lg:grid-cols-2">
            {featured && (
              <section aria-labelledby="popular-title">
                <h2 id="popular-title" className="mb-5 font-serif text-[26px] font-bold leading-tight tracking-tight text-primary">
                  Популярные материалы
                </h2>
                <ArticleFeatured article={toCard(featured)} />
              </section>
            )}

            {latest.length > 0 && (
              <section aria-labelledby="latest-title">
                <h2 id="latest-title" className="mb-2 font-serif text-[26px] font-bold leading-tight tracking-tight text-primary">
                  Последние публикации
                </h2>
                <div className="divide-y">
                  {latest.map((a) => (
                    <ArticleListItem key={a.slug} article={toCard(a)} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Боковая колонка: помощь + о проекте */}
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start" aria-label="Юридическая помощь и информация о проекте">
          <HelpCard pageUrl="/" ctaText={settings.heroCtaText} />
          <AboutCard text={settings.aboutShort} />
        </aside>
      </div>

      {/* Текстовый блок о портале — понимание тематики для людей и поисковых систем */}
      <section aria-labelledby="about-portal-title" className="container-site border-t border-border/60 py-10 lg:py-12">
        <div className="max-w-3xl">
          <h2 id="about-portal-title" className="font-serif text-[26px] font-bold leading-tight tracking-tight text-primary">
            О портале «{settings.siteName}»
          </h2>
          <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-foreground/85">
            <p>
              «{settings.siteName}» — информационный юридический портал для граждан. Здесь собраны юридические
              статьи и пошаговые правовые инструкции, которые объясняют простым языком, как устроены права
              граждан и что делать в типовых ситуациях: развод и алименты, вступление в наследство, сделки
              с недвижимостью, споры с продавцами, трудовые и жилищные вопросы, кредиты и судебные разбирательства.
            </p>
            <p>
              Каждый материал отвечает на конкретный юридический вопрос: разъясняет нормы закона, показывает
              порядок действий — от досудебной претензии до обращения в суд, перечисляет нужные документы
              и сроки. В статьях есть ответы на часто задаваемые вопросы и образцы документов, а нормативная
              база указана так, что информацию можно проверить по первоисточнику.
            </p>
            <p>
              Материалы носят справочный характер и не заменяют юридическую консультацию: их задача — правовая
              информация для граждан, помощь в решении правовых вопросов на этапе, когда важно точно понимать
              свои права и порядок действий. Если ситуация нестандартная — опишите её через форму обратной
              связи, и мы подскажем возможные варианты решения.
            </p>
          </div>
        </div>
      </section>

      <div className="container-site no-print">
        <HelpCta ctaText={settings.heroCtaText} />
      </div>
    </>
  )
}

function toCard(a: ArticleRow): ArticleCardData {
  return {
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
  }
}
