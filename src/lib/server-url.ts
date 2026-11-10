import { headers } from 'next/headers'
import { getSettings } from '@/lib/settings'

/**
 * Базовый URL сайта для canonical/sitemap/OG/JSON-LD.
 * Приоритет: настройки в админ-панели (siteUrl) → переменная окружения SITE_URL → заголовки запроса.
 *
 * На production обязательно задайте адрес сайта (админка → «Настройки» → «Адрес сайта»
 * или переменная SITE_URL в .env) — иначе база URL определяется по заголовкам запроса,
 * что надёжно только за обратным прокси, передающим x-forwarded-host/x-forwarded-proto.
 */
export async function getBaseUrl(): Promise<string> {
  const settings = await getSettings()
  if (settings.siteUrl) return normalize(settings.siteUrl)
  if (process.env.SITE_URL) return normalize(process.env.SITE_URL)

  const base = await baseUrlFromHeaders()
  // Напоминание один раз на процесс: localhost не должен попадать в публичные метаданные.
  if (
    process.env.NODE_ENV === 'production' &&
    !warned &&
    /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(base.replace(/^https?:\/\//, ''))
  ) {
    warned = true
    console.warn(
      '[pravo-site] Базовый URL сайта не задан: в метаданные (canonical, sitemap, OG) попадает localhost. ' +
        'Укажите адрес сайта в админ-панели («Настройки» → «Адрес сайта») или переменную SITE_URL в .env.'
    )
  }
  return base
}

let warned = false

/** Нормализация адреса: без хвостового слеша, без дублирующихся слешей в пути. */
function normalize(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

/** Базовый URL из заголовков обратного прокси или прямого запроса. */
async function baseUrlFromHeaders(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000'
  const forwardedProto = h.get('x-forwarded-proto')?.split(',')[0].trim()
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host)
  const proto = forwardedProto || (isLocal ? 'http' : 'https')
  return `${proto}://${host}`
}
