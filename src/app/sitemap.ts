import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { getBaseUrl } from '@/lib/server-url'

export const dynamic = 'force-dynamic'

/** Карта сайта: статические страницы + категории + опубликованные материалы. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, baseUrl] = await Promise.all([getSettings(), getBaseUrl()])
  const base = baseUrl.replace(/\/$/, '')

  const [categories, articles] = await Promise.all([
    db.category.findMany({ select: { slug: true, updatedAt: true }, orderBy: { sortOrder: 'asc' } }),
    db.article.findMany({
      where: { status: 'PUBLISHED', isTest: false },
      select: { slug: true, updatedAt: true, publishedAt: true, category: { select: { slug: true } } },
      orderBy: { publishedAt: 'desc' },
    }),
  ])

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/articles/`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/categories/`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/about/`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/contacts/`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/privacy/`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/consent/`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/terms/`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${base}/${c.slug}/`,
    lastModified: c.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const articlePages: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${base}/${a.category.slug}/${a.slug}/`,
    lastModified: a.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticPages, ...categoryPages, ...articlePages]
}
