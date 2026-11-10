import { NextResponse } from 'next/server'
import { requireAdminApi, isAdminResponse, sameOriginGuard } from '@/lib/admin-api'
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '@/lib/settings'
import { isMailerConfigured } from '@/lib/mailer'

export const runtime = 'nodejs'

export async function GET() {
  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const settings = await getSettings()
  return NextResponse.json({ settings, mailConfigured: isMailerConfigured() })
}

/** Сохранение настроек сайта. Значения очищаются и ограничиваются по длине. */
export async function PUT(req: Request) {
  const csrf = sameOriginGuard(req)
  if (csrf) return csrf

  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос.' }, { status: 400 })
  }

  const values = body.values as Record<string, unknown> | undefined
  if (!values || typeof values !== 'object') {
    return NextResponse.json({ error: 'Не переданы значения настроек.' }, { status: 422 })
  }

  const clean: Record<string, string> = {}
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (!(key in values)) continue
    let value = String(values[key] ?? '')

    switch (key) {
      case 'siteUrl':
        // только https:// или http:// и без опасных символов
        if (value && !/^https?:\/\/[\w.-]+(:\d+)?$/.test(value.replace(/\/$/, '') + '')) {
          return NextResponse.json({ error: 'Адрес сайта должен быть вида https://example.ru' }, { status: 422 })
        }
        value = value.replace(/\/$/, '')
        break
      case 'primaryColor':
        if (value && !/^#[0-9a-fA-F]{6}$/.test(value)) {
          return NextResponse.json({ error: 'Основной цвет должен быть в формате #RRGGBB.' }, { status: 422 })
        }
        break
      case 'metrikaId':
      case 'gaId':
        value = value.trim().replace(/[^\w-]/g, '')
        break
      case 'socials': {
        // JSON-массив ссылок с валидацией URL
        try {
          const parsed = JSON.parse(value || '[]')
          if (!Array.isArray(parsed)) throw new Error()
          const valid = parsed
            .filter((s: { id?: unknown; url?: unknown }) => typeof s.url === 'string' && /^https?:\/\/.+/.test(s.url))
            .map((s: { id?: unknown; url: string }) => ({ id: String(s.id || 'other'), url: s.url.trim() }))
          value = JSON.stringify(valid)
        } catch {
          return NextResponse.json({ error: 'Некорректный формат ссылок на социальные сети.' }, { status: 422 })
        }
        break
      }
      case 'privacyHtml':
      case 'consentHtml':
      case 'termsHtml':
      case 'aboutPageHtml':
        // HTML документов санитизируется при выводе; храним как есть, ограничив объём
        if (value.length > 200000) value = value.slice(0, 200000)
        break
      default:
        value = value.slice(0, 5000)
    }

    clean[key] = value
  }

  await saveSettings(clean)
  const settings = await getSettings()
  return NextResponse.json({ ok: true, settings })
}
