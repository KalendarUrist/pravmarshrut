import { NextResponse } from 'next/server'
import { readFileSync, statSync } from 'fs'
import path from 'path'
import { db } from '@/lib/db'
import { findMediaFile, UPLOAD_DIR } from '@/lib/media'

export const runtime = 'nodejs'

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

/**
 * Раздача загруженных изображений: /media/{id}/{filename}
 * Путь берётся из записи БД (защита от обхода каталогов), отдаётся с
 * агрессивным кешированием и корректным Content-Type.
 * Файлы читаются целиком (лимит загрузки — 5 МБ, см. MAX_UPLOAD_MB):
 * это исключает ошибки стрима «ReadableStream is already closed»
 * при досрочном закрытии соединения оптимизатором изображений.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; filename: string }> }) {
  const { id } = await params

  const media = await db.media.findUnique({ where: { id } })
  if (!media) return new NextResponse('Not found', { status: 404 })

  const ext = path.extname(media.filename).replace('.', '').toLowerCase()
  const contentType = MIME_BY_EXT[ext] || media.mime || 'application/octet-stream'

  const filePath = await findMediaFile(media.filename)
  if (!filePath || !filePath.startsWith(UPLOAD_DIR)) {
    return new NextResponse('Not found', { status: 404 })
  }

  try {
    statSync(filePath)
    const data = readFileSync(filePath)
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(data.byteLength),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
