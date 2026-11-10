/**
 * Безопасная загрузка изображений.
 * Проверяются: расширение, MIME по магическим байтам (не по заявленному типу), размер.
 * SVG запрещён (векторные файлы — вектор вектора XSS). Файлы складываются в UPLOAD_DIR.
 */
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
export const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 5)
export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const

const SIGNATURES: { ext: string; mime: string; test: (b: Buffer) => boolean }[] = [
  { ext: 'jpg', mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', mime: 'image/png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: 'gif', mime: 'image/gif', test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  { ext: 'webp', mime: 'image/webp', test: (b) => b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP' },
]

export interface UploadResult {
  ok: true
  media: { id: string; url: string; filename: string; originalName: string; mime: string; size: number; width: number | null; height: number | null }
}

export interface UploadError {
  ok: false
  error: string
}

export async function saveUploadedFile(file: File, alt: string, description: string): Promise<UploadResult | UploadError> {
  if (!file || typeof file.arrayBuffer !== 'function') {
    return { ok: false, error: 'Файл не получен.' }
  }
  if (file.size <= 0) return { ok: false, error: 'Файл пустой.' }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return { ok: false, error: `Размер файла превышает ограничение ${MAX_UPLOAD_MB} МБ.` }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const signature = SIGNATURES.find((s) => s.test(buffer))
  if (!signature) {
    return { ok: false, error: 'Не поддерживаемый или повреждённый формат. Разрешены: JPG, PNG, WebP, GIF.' }
  }

  const now = new Date()
  const subdir = path.join(UPLOAD_DIR, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'))
  await mkdir(subdir, { recursive: true })

  const stored = `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${signature.ext}`
  await writeFile(path.join(subdir, stored), buffer)

  const width = await tryImageSize(buffer, signature.mime)

  const media = await db.media.create({
    data: {
      filename: stored,
      originalName: sanitizeOriginalName(file.name),
      mime: signature.mime,
      size: file.size,
      width: width?.width ?? null,
      height: width?.height ?? null,
      alt: alt.slice(0, 300),
      description: description.slice(0, 1000),
    },
  })

  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  return {
    ok: true,
    media: {
      id: media.id,
      url: `/media/${media.id}/${media.filename}`,
      filename: media.filename,
      originalName: media.originalName,
      mime: media.mime,
      size: media.size,
      width: media.width,
      height: media.height,
    },
  }
}

function sanitizeOriginalName(name: string): string {
  return (name || 'file')
    .replace(/[^\p{L}\p{N}\._-]/gu, '_')
    .slice(0, 120)
}

async function tryImageSize(buffer: Buffer, mime: string): Promise<{ width: number; height: number } | null> {
  try {
    // Лёгкое чтение размеров без тяжёлых зависимостей
    if (mime === 'image/png' && buffer.length > 24) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
    }
    if (mime === 'image/gif' && buffer.length > 10) {
      return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) }
    }
    if (mime === 'image/jpeg') {
      let offset = 2
      while (offset < buffer.length - 9) {
        if (buffer[offset] !== 0xff) { offset++; continue }
        const marker = buffer[offset + 1]
        const len = buffer.readUInt16BE(offset + 2)
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) }
        }
        offset += 2 + len
      }
    }
    if (mime === 'image/webp' && buffer.length > 30) {
      const format = buffer.slice(12, 16).toString('ascii')
      if (format === 'VP8 ' && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
        return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff }
      }
      if (format === 'VP8X') {
        return {
          width: 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)),
          height: 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)),
        }
      }
    }
  } catch {
    // размеры не критичны
  }
  return null
}

/** Поиск файла на диске по имени записи (перебор год/месяц). */
export async function findMediaFile(filename: string): Promise<string | null> {
  const fs = await import('fs/promises')
  const years = await fs.readdir(UPLOAD_DIR).catch(() => [])
  for (const year of years) {
    const months = await fs.readdir(path.join(UPLOAD_DIR, year)).catch(() => [])
    for (const month of months) {
      const candidate = path.join(UPLOAD_DIR, year, month, path.basename(filename))
      const stat = await fs.stat(candidate).catch(() => null)
      if (stat?.isFile()) return candidate
    }
  }
  return null
}

/** Проверка, используется ли файл в статьях или как изображение категории (для предупреждения перед удалением). */
export async function isMediaInUse(mediaId: string, url: string): Promise<boolean> {
  const asCover = await db.article.count({ where: { coverMediaId: mediaId } })
  if (asCover > 0) return true
  const asCategoryImage = await db.category.count({ where: { imageMediaId: mediaId } })
  if (asCategoryImage > 0) return true
  const inContent = await db.article.count({
    where: { contentHtml: { contains: url.slice(0, 40) } },
  })
  return inContent > 0
}
