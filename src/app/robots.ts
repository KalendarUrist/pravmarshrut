import type { MetadataRoute } from 'next'
import { getBaseUrl } from '@/lib/server-url'

export const dynamic = 'force-dynamic'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = (await getBaseUrl()).replace(/\/$/, '')
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/admin', '/api/', '/search'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
