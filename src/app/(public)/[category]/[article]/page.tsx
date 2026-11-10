import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect, permanentRedirect } from 'next/navigation'
import { after } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { getBaseUrl } from '@/lib/server-url'
import { prepareForRender, toEmbedUrl } from '@/lib/content'
import { formatDate, formatDateTime } from '@/lib/format'
import { findRedirect } from '@/lib/redirects'
import { Breadcrumbs, type Crumb } from '@/components/site/breadcrumbs'
import { ShareButtons } from '@/components/site/share-buttons'
import { HelpCta } from '@/components/site/help-cta'
import { ArticleCard } from '@/components/site/article-card'
import { coverUrl, readingMinutes, getRelatedFromCategory, type ArticleRow } from '@/lib/queries'
import { AlertTriangle, CalendarCheck, CalendarClock, CalendarDays, Eye, FileText, FolderOpen, RefreshCw, Info, Scale } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ category: string; article: string }>
}

const relatedSelect = {
  slug: true, title: true, excerpt: true, contentPlain: true, isTest: true, views: true, publishedAt: true,
  coverMedia: { select: { id: true, filename: true, alt: true } },
  category: { select: { slug: true, title: true } },
} as const

async function loadArticle(categorySlug: string, articleSlug: string) {
  // Черновики тоже загружаются — их видит только администратор (предпросмотр перед публикацией)
  return db.article.findFirst({
    where: { slug: articleSlug },
    include: {
      category: { select: { id: true, slug: true, title: true } },
      coverMedia: { select: { id: true, filename: true, alt: true } },
      relatedLinks: {
        orderBy: { id: 'asc' },
        take: 4,
        include: {
          related: { select: relatedSelect },
        },
      },
    },
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, article } = await params
  const [found, settings, baseUrl] = await Promise.all([
    db.article.findFirst({
      where: { slug: article, status: 'PUBLISHED' },
      select: {
        title: true, seoTitle: true, metaDescription: true, excerpt: true, publishedAt: true, authorName: true, isTest: true,
        coverMedia: { select: { id: true, filename: true, alt: true } },
        category: { select: { slug: true } },
      },
    }),
    getSettings(),
    getBaseUrl(),
  ])
  if (!found || found.category.slug !== category) return {}

  const title = found.seoTitle || found.title
  const description = found.metaDescription || found.excerpt.slice(0, 300)
  const url = `${baseUrl}/${found.category.slug}/${article}/`
  const cover = found.coverMedia ? `${baseUrl}/media/${found.coverMedia.id}/${found.coverMedia.filename}` : undefined

  return {
    title,
    description,
    alternates: { canonical: url },
    // Тестовые публикации не индексируются (баннер «Тестовая публикация» на странице)
    ...(found.isTest ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      siteName: settings.siteName,
      locale: 'ru_RU',
      publishedTime: found.publishedAt?.toISOString(),
      authors: found.authorName ? [found.authorName] : undefined,
      images: cover ? [{ url: cover, alt: found.coverMedia?.alt || found.title }] : undefined,
    },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { category: categorySlug, article: articleSlug } = await params
  const path = `/${categorySlug}/${articleSlug}`

  const [article, adminUser] = await Promise.all([
    loadArticle(categorySlug, articleSlug),
    getSessionUser(),
  ])

  const isAdminPreview = Boolean(article && article.status !== 'PUBLISHED' && adminUser)

  // Статья есть, но опубликована в другой категории — перенаправляем на правильный адрес (защита от дублей)
  if (article && article.status === 'PUBLISHED' && article.category.slug !== categorySlug) {
    const target = await findRedirect(path)
    if (target) {
      if (target.code === 301) permanentRedirect(target.toPath)
      redirect(target.toPath)
    }
    permanentRedirect(`/${article.category.slug}/${article.slug}`)
  }

  // Статьи нет или она не опубликована — возможно, URL изменился и для него задан редирект
  if (!article || (article.status !== 'PUBLISHED' && !isAdminPreview)) {
    const target = await findRedirect(path)
    if (target) {
      if (target.code === 301) permanentRedirect(target.toPath)
      redirect(target.toPath)
    }
    notFound()
  }

  // Счётчик просмотров — только для опубликованных статей
  const articleId = article.id
  if (!isAdminPreview) {
    after(async () => {
      try {
        await db.article.update({ where: { id: articleId }, data: { views: { increment: 1 } } })
      } catch {
        // счётчик не критичен
      }
    })
  }

  const [settings, baseUrl, sameCategory] = await Promise.all([
    getSettings(),
    getBaseUrl(),
    article.relatedLinks.length === 0
      ? getRelatedFromCategory(article.category.id, article.id, 4)
      : Promise.resolve([] as ArticleRow[]),
  ])

  const prepared = prepareForRender(article.contentHtml)
  const embed = toEmbedUrl(article.videoUrl)
  const url = `${baseUrl}/${article.category.slug}/${article.slug}/`
  const updatedLongAgo = article.updatedAt.getTime() - (article.publishedAt?.getTime() ?? 0) > 24 * 60 * 60 * 1000

  const crumbs: Crumb[] = [
    { title: article.category.title, href: `/${article.category.slug}/` },
    { title: article.title },
  ]

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${baseUrl}/` },
      { '@type': 'ListItem', position: 2, name: article.category.title, item: `${baseUrl}/${article.category.slug}/` },
      { '@type': 'ListItem', position: 3, name: article.title, item: url },
    ],
  }

  const articleLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.metaDescription || article.excerpt.slice(0, 300),
    inLanguage: 'ru-RU',
    url,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: article.authorName
      ? { '@type': 'Person', name: article.authorName }
      : { '@type': 'Organization', name: settings.siteName, url: `${baseUrl}/` },
    publisher: { '@type': 'Organization', name: settings.siteName, url: `${baseUrl}/` },
  }
  if (article.coverMedia) {
    articleLd.image = [`${baseUrl}/media/${article.coverMedia.id}/${article.coverMedia.filename}`]
  }

  const jsonLd: Record<string, unknown>[] = [breadcrumbLd, articleLd]
  // FAQPage — разметка добавляется только при наличии реальных блоков «Вопрос — ответ» в материале
  if (prepared.faq.length > 0) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: prepared.faq.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    })
  }

  return (
    <div className="container-site py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Breadcrumbs items={crumbs} />

      {/* Оглавление — компактный блок на мобильных и планшетах */}
      {prepared.toc.length >= 3 && (
        <details className="no-print mt-4 rounded-lg border bg-card p-4 xl:hidden">
          <summary className="flex cursor-pointer items-center gap-2 font-semibold">
            <FileText className="h-4 w-4 text-primary" aria-hidden /> Содержание статьи
          </summary>
          <TocList toc={prepared.toc} />
        </details>
      )}

      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="min-w-0">
          <header className="space-y-4">
            {isAdminPreview && (
              <div className="flex items-start gap-2.5 rounded-lg border border-primary/40 bg-accent p-3.5 text-sm">
                <Eye className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <p className="leading-relaxed">
                  <strong>Предпросмотр черновика.</strong> Статья ещё не опубликована и видна только администраторам
                  сайта. Публикация — в панели управления.
                </p>
              </div>
            )}

            {article.isTest && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3.5 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                <p className="leading-relaxed">
                  <strong className="text-destructive">Тестовая публикация.</strong> Материал размещён для проверки
                  работы сайта и будет удалён перед запуском проекта.
                </p>
              </div>
            )}

            <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-[2rem] sm:leading-snug">
              {article.title}
            </h1>

            {/* Метаданные: даты публикации, обновления, проверки, просмотры */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                <time dateTime={article.publishedAt?.toISOString()}>Опубликовано {formatDate(article.publishedAt)}</time>
              </span>
              {updatedLongAgo && (
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  <time dateTime={article.updatedAt.toISOString()}>Обновлено {formatDate(article.updatedAt)}</time>
                </span>
              )}
              {article.checkedAt && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
                  Проверено {formatDate(article.checkedAt)}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" aria-hidden /> {article.views}
              </span>
            </div>

            {article.excerpt && (
              <p className="border-l-2 border-primary/30 pl-4 text-[1.05rem] leading-relaxed text-muted-foreground">
                {article.excerpt}
              </p>
            )}
          </header>

          {/* Обложка */}
          {article.coverMedia && (
            <figure className="mt-6">
              <Image
                src={`/media/${article.coverMedia.id}/${article.coverMedia.filename}`}
                alt={article.coverMedia.alt || article.title}
                width={1200}
                height={675}
                priority
                sizes="(max-width: 1024px) 100vw, 780px"
                className="aspect-[16/9] w-full rounded-lg border object-cover"
              />
            </figure>
          )}

          {/* Видео (добавляется редактором через URL) */}
          {embed && (
            <div className="mt-6 aspect-video w-full overflow-hidden rounded-lg border">
              <iframe
                src={embed}
                title={`Видео: ${article.title}`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          )}

          {/* Основной текст */}
          <div className="article-content mt-8" dangerouslySetInnerHTML={{ __html: prepared.html }} />

          {/* Нормативная база */}
          {article.legalBasis && (
            <div className="mt-8 flex items-start gap-2.5 rounded-lg border bg-secondary/50 p-4 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <p>
                <strong>Нормативная база:</strong> {article.legalBasis}
              </p>
            </div>
          )}

          {/* Судебная практика */}
          {article.courtPractice && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border bg-secondary/50 p-4 text-sm">
              <Scale className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
              <p>
                <strong>Судебная практика:</strong> {article.courtPractice}
              </p>
            </div>
          )}

          {/* Ключевые сроки (структурированное поле, показывается только при заполнении) */}
          {article.deadlines && (
            <div className="mt-4 rounded-lg border bg-secondary/50 p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <CalendarClock className="h-4 w-4 shrink-0 text-primary" aria-hidden /> Ключевые сроки
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {article.deadlines.split('\n').map((line) => line.trim()).filter(Boolean).map((line, i) => (
                  <li key={i} className="flex gap-2 leading-relaxed">
                    <span aria-hidden>—</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Список документов (структурированное поле, показывается только при заполнении) */}
          {article.documents && (
            <div className="mt-4 rounded-lg border bg-secondary/50 p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <FolderOpen className="h-4 w-4 shrink-0 text-primary" aria-hidden /> Какие документы понадобятся
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {article.documents.split('\n').map((line) => line.trim()).filter(Boolean).map((line, i) => (
                  <li key={i} className="flex gap-2 leading-relaxed">
                    <span aria-hidden>—</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Предупреждение о характере информации */}
          <div className="mt-4 rounded-lg border p-4 text-[13px] leading-relaxed text-muted-foreground">
            Информация на этой странице носит общий справочный характер, не является юридической консультацией и не
            учитывает особенности конкретной ситуации. Перед принятием решений сверьте положения с действующей
            редакцией нормативных актов или обратитесь за консультацией.
          </div>

          {/* Теги */}
          {article.tags && (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Теги материала">
              {article.tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                <li key={t} className="rounded-full border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground">
                  #{t}
                </li>
              ))}
            </ul>
          )}

          {/* Автор */}
          {article.authorName && (
            <p className="mt-4 text-sm text-muted-foreground">
              Автор материала: <span className="font-medium text-foreground">{article.authorName}</span>
            </p>
          )}

          {/* Кнопки социальных сетей */}
          <div className="mt-8 border-t pt-6">
            <ShareButtons url={url} title={article.title} />
          </div>

          {/* Призыв обратиться за юридической помощью */}
          <HelpCta ctaText={settings.heroCtaText} pageUrl={url} />
        </article>

        {/* Правая колонка: оглавление и «Читайте также» */}
        <aside className="no-print hidden lg:block">
          <div className="sticky top-24 space-y-6">
            {prepared.toc.length >= 3 && (
              <nav aria-label="Содержание статьи" className="rounded-lg border bg-card p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4 text-primary" aria-hidden /> Содержание
                </p>
                <TocList toc={prepared.toc} />
              </nav>
            )}
            <RelatedBlock
              adminPicks={article.relatedLinks.map((l) => l.related)}
              sameCategory={sameCategory}
            />
          </div>
        </aside>
      </div>

      {/* «Читайте также» — на мобильных */}
      <section className="no-print mt-10 border-t pt-8 lg:hidden" aria-label="Читайте также">
        <h2 className="mb-5 text-xl font-bold tracking-tight text-primary">Читайте также</h2>
        <RelatedList
          adminPicks={article.relatedLinks.map((l) => l.related)}
          sameCategory={sameCategory}
        />
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Последнее обновление материала: {formatDateTime(article.updatedAt)}
      </p>
    </div>
  )
}

function TocList({ toc }: { toc: { id: string; text: string; level: 2 | 3 }[] }) {
  return (
    <ol className="space-y-1.5 text-sm">
      {toc.map((h) => (
        <li key={h.id} className={h.level === 3 ? 'pl-4' : ''}>
          <a
            href={`#${h.id}`}
            className={`leading-snug transition-colors hover:text-primary ${h.level === 2 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ol>
  )
}

function RelatedBlock({ adminPicks, sameCategory }: { adminPicks: ArticleRow[]; sameCategory: ArticleRow[] }) {
  const items = adminPicks.length > 0 ? adminPicks : sameCategory
  if (items.length === 0) return null
  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Читайте также
      </h2>
      <ul className="space-y-3">
        {items.slice(0, 4).map((a) => (
          <li key={a.slug}>
            <Link
              href={`/${a.category.slug}/${a.slug}/`}
              className="block text-sm font-medium leading-snug transition-colors hover:text-primary"
            >
              {a.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RelatedList({ adminPicks, sameCategory }: { adminPicks: ArticleRow[]; sameCategory: ArticleRow[] }) {
  const items = adminPicks.length > 0 ? adminPicks : sameCategory
  if (items.length === 0) return null
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.slice(0, 4).map((a) => (
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
  )
}
