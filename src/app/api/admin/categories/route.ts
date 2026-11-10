import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminApi, isAdminResponse, sameOriginGuard } from '@/lib/admin-api'
import { slugify, isValidSlug } from '@/lib/slug'

export const runtime = 'nodejs'

/** Список категорий с числом статей. */
export async function GET() {
  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    include: {
      _count: { select: { articles: true } },
      parent: { select: { id: true, title: true } },
      imageMedia: { select: { id: true, filename: true, alt: true } },
    },
  })
  return NextResponse.json({ rows })
}

/** Создание категории. */
export async function POST(req: Request) {
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

  const title = String(body.title || '').trim()
  if (title.length < 2 || title.length > 120) {
    return NextResponse.json({ error: 'Название категории: от 2 до 120 символов.' }, { status: 422 })
  }

  let slug = String(body.slug || '').trim().toLowerCase() || slugify(title)
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: 'URL категории может содержать только латиницу, цифры и дефисы.' }, { status: 422 })
  }
  if (await db.category.findUnique({ where: { slug } })) {
    return NextResponse.json({ error: 'Категория с таким URL уже существует.' }, { status: 422 })
  }

  const parentId = body.parentId ? String(body.parentId) : null
  if (parentId && !(await db.category.findUnique({ where: { id: parentId } }))) {
    return NextResponse.json({ error: 'Родительская категория не найдена.' }, { status: 422 })
  }

  // Изображение категории — проверяем, что запись медиатеки существует
  const imageMediaId = body.imageMediaId ? String(body.imageMediaId) : null
  if (imageMediaId && !(await db.media.findUnique({ where: { id: imageMediaId } }))) {
    return NextResponse.json({ error: 'Указанное изображение не найдено в медиатеке.' }, { status: 422 })
  }

  const maxOrder = await db.category.aggregate({ _max: { sortOrder: true } })
  const category = await db.category.create({
    data: {
      title,
      slug,
      description: String(body.description || '').trim().slice(0, 1000),
      seoTitle: String(body.seoTitle || '').trim().slice(0, 200),
      metaDescription: String(body.metaDescription || '').trim().slice(0, 300),
      imageMediaId,
      sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : (maxOrder._max.sortOrder || 0) + 1,
      featured: body.featured === true,
      parentId,
    },
    include: { imageMedia: { select: { id: true, filename: true, alt: true } } },
  })
  return NextResponse.json({ ok: true, category })
}
