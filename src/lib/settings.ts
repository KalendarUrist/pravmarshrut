/**
 * Настройки сайта: key-value хранилище в БД с типизированными значениями по умолчанию.
 */
import { db } from '@/lib/db'

export const DEFAULT_SETTINGS = {
  // Общие
  siteName: 'Правовой маршрут',
  siteDescription: 'Актуальные разъяснения законов, практика и полезные рекомендации',
  siteUrl: '',
  logoUrl: '',
  primaryColor: '#11263C',
  // Главный экран
  heroTitle: 'Понятно о ваших правах и способах их защиты',
  heroSubtitle: 'Разъяснения законов, практические инструкции и ответы на актуальные юридические вопросы для граждан России.',
  heroCtaText: 'Обратиться за помощью',
  // Контакты
  feedbackEmail: '',
  contactsPhone: '',
  contactsEmail: '',
  contactsAddress: '',
  contactsWorktime: '',
  // Соцсети: JSON-массив [{ id: 'telegram', url: '...' }]
  socials: '[]',
  // О проекте
  aboutShort: '«Правовой маршрут» — информационный юридический портал для граждан. Публикуем актуальные разъяснения законов, инструкции и практические рекомендации.',
  aboutPageHtml: '',
  footerText: '',
  // SEO
  seoHomeTitle: '',
  seoHomeDescription: '',
  // Аналитика и верификация
  metrikaId: '',
  gaId: '',
  yandexVerification: '',
  googleVerification: '',
  // Юридические документы (HTML) и отметки о проверке
  privacyHtml: '',
  consentHtml: '',
  termsHtml: '',
  privacyReviewed: 'false',
  consentReviewed: 'false',
  termsReviewed: 'false',
} as const

export type SettingsKey = keyof typeof DEFAULT_SETTINGS
export type SiteSettings = Record<SettingsKey, string>

export async function getSettings(): Promise<SiteSettings> {
  const rows = await db.setting.findMany()
  const map: Record<string, string> = { ...DEFAULT_SETTINGS }
  for (const row of rows) {
    if (row.key in map) map[row.key] = row.value
  }
  return map as SiteSettings
}

export async function saveSettings(values: Record<string, string>): Promise<void> {
  const entries = Object.entries(values).filter(([key]) => key in DEFAULT_SETTINGS)
  for (const [key, value] of entries) {
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
  }
}

export interface SocialLink {
  id: string
  url: string
}

export function parseSocials(raw: string): SocialLink[] {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((s): s is SocialLink => !!s && typeof s.url === 'string' && !!s.url.trim())
      .map((s) => ({ id: String(s.id || 'other'), url: s.url.trim() }))
  } catch {
    return []
  }
}

export const SOCIAL_LABELS: Record<string, string> = {
  telegram: 'Telegram',
  vk: 'ВКонтакте',
  youtube: 'YouTube',
  dzen: 'Дзен',
  ok: 'Одноклассники',
  rutube: 'Rutube',
  other: 'Другая платформа',
}
