import { NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { db } from '@/lib/db'
import { requireAdminApi, isAdminResponse, sameOriginGuard } from '@/lib/admin-api'
import { findMediaFile, isMediaInUse } from '@/lib/media'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

/** Обновление alt-текста и описания изображения. */
export async function PUT(req: Request, { params }: Params) {
  const csrf = sameOriginGuard(req)
  if (csrf) return csrf

  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const { id } = await params
  const media = await db.media.findUnique({ where: { id } })
  if (!media) return NextResponse.json({ error: 'Файл не найден.' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос.' }, { status: 400 })
  }

  const updated = await db.media.update({
    where: { id },
    data: {
      alt: String(body.alt || '').trim().slice(0, 300),
      description: String(body.description || '').trim().slice(0, 1000),
    },
  })
  return NextResponse.json({ ok: true, media: updated })
}

/** Удаление файла из медиатеки. */
export async function DELETE(req: Request, { params }: Params) {
  const csrf = sameOriginGuard(req)
  if (csrf) return csrf

  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const { id } = await params
  const media = await db.media.findUnique({ where: { id } })
  if (!media) return NextResponse.json({ error: 'Файл не найден.' }, { status: 404 })

  const inUse = await isMediaInUse(id, `/media/${media.id}/${media.filename}`)
  const force = new URL(req.url).searchParams.get('force') === '1'
  if (inUse && !force) {
    return NextResponse.json(
      { error: 'Файл используется в статьях. Повторное подтверждение удалит его, изображения в статьях станут недоступны.', inUse: true },
      { status: 409 }
    )
  }

  // Удаляем обложки и изображения категорий, ссылающиеся на файл
  await db.article.updateMany({ where: { coverMediaId: id }, data: { coverMediaId: null } })
  await db.category.updateMany({ where: { imageMediaId: id }, data: { imageMediaId: null } })
  await db.media.delete({ where: { id } })
  const filePath = await findMediaFile(media.filename)
  if (filePath) {
    await unlink(filePath).catch(() => {})
  }
  return NextResponse.json({ ok: true })
}
