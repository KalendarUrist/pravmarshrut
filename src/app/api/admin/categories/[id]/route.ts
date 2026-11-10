import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminApi, isAdminResponse, sameOriginGuard } from '@/lib/admin-api'
import { slugify, isValidSlug } from '@/lib/slug'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

/** Обновление категории. При смене URL создаётся 301-редирект раздела. */
export async function PUT(req: Request, { params }: Params) {
  const csrf = sameOriginGuard(req)
  if (csrf) return csrf

  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const { id } = await params
  const existing = await db.category.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Категория не найдена.' }, { status: 404 })

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

  const slug = String(body.slug || '').trim().toLowerCase() || slugify(title)
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: 'URL категории может содержать только латиницу, цифры и дефисы.' }, { status: 422 })
  }
  const duplicate = await db.category.findUnique({ where: { slug } })
  if (duplicate && duplicate.id !== id) {
    return NextResponse.json({ error: 'Категория с таким URL уже существует.' }, { status: 422 })
  }

  const parentId = body.parentId ? String(body.parentId) : null
  if (parentId === id) {
    return NextResponse.json({ error: 'Категория не может быть родителем самой себя.' }, { status: 422 })
  }
  if (parentId && !(await db.category.findUnique({ where: { id: parentId } }))) {
    return NextResponse.json({ error: 'Родительская категория не найдена.' }, { status: 422 })
  }

  // Изображение категории — проверяем, что запись медиатеки существует
  const imageMediaId = body.imageMediaId ? String(body.imageMediaId) : null
  if (imageMediaId && !(await db.media.findUnique({ where: { id: imageMediaId } }))) {
    return NextResponse.json({ error: 'Указанное изображение не найдено в медиатеке.' }, { status: 422 })
  }

  const category = await db.category.update({
    where: { id },
    data: {
      title,
      slug,
      description: String(body.description || '').trim().slice(0, 1000),
      seoTitle: String(body.seoTitle || '').trim().slice(0, 200),
      metaDescription: String(body.metaDescription || '').trim().slice(0, 300),
      imageMediaId,
      sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : existing.sortOrder,
      featured: body.featured === true,
      parentId,
    },
    include: { imageMedia: { select: { id: true, filename: true, alt: true } } },
  })

  // Редирект со старого адреса раздела при смене URL
  if (slug !== existing.slug) {
    await db.redirect.upsert({
      where: { fromPath: `/${existing.slug}` },
      update: { toPath: `/${slug}`, code: 301 },
      create: { fromPath: `/${existing.slug}`, toPath: `/${slug}`, code: 301 },
    })
  }

  return NextResponse.json({ ok: true, category })
}

/** Удаление категории (если в ней нет статей). */
export async function DELETE(req: Request, { params }: Params) {
  const csrf = sameOriginGuard(req)
  if (csrf) return csrf

  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const { id } = await params
  const count = await db.article.count({ where: { categoryId: id } })
  if (count > 0) {
    return NextResponse.json(
      { error: `В разделе ${count} статья(и). Сначала перенесите или удалите их.` },
      { status: 422 }
    )
  }
  // Освобождаем вложенные категории
  await db.category.updateMany({ where: { parentId: id }, data: { parentId: null } })
  await db.category.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
