import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminApi, isAdminResponse, sameOriginGuard } from '@/lib/admin-api'
import { saveUploadedFile, MAX_UPLOAD_MB } from '@/lib/media'

export const runtime = 'nodejs'

/** Список медиафайлов (медиатека). */
export async function GET(req: Request) {
  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const url = new URL(req.url)
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const perPage = 24

  const [rows, total] = await Promise.all([
    db.media.findMany({
      select: { id: true, filename: true, originalName: true, mime: true, size: true, width: true, height: true, alt: true, description: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.media.count(),
  ])

  return NextResponse.json({
    rows: rows.map((m) => ({ ...m, url: `/media/${m.id}/${m.filename}` })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    maxUploadMb: MAX_UPLOAD_MB,
  })
}

/** Загрузка изображения. */
export async function POST(req: Request) {
  const csrf = sameOriginGuard(req)
  if (csrf) return csrf

  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Ожидаются данные формы (multipart/form-data).' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Файл не выбран.' }, { status: 422 })
  }
  const alt = String(form.get('alt') || '').slice(0, 300)
  const description = String(form.get('description') || '').slice(0, 1000)

  const result = await saveUploadedFile(file, alt, description)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 })
  }
  return NextResponse.json({ ok: true, media: result.media })
}
