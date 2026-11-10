/**
 * Аудит текущего состояния БД: категории, настройки, статьи, медиа.
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const categories = await db.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    include: { _count: { select: { articles: true } } },
  })
  console.log('=== КАТЕГОРИИ ===')
  for (const c of categories) {
    console.log(`${c.sortOrder}. ${c.slug} | ${c.title} | статей: ${c._count.articles}`)
  }

  const settings = await db.setting.findMany()
  console.log('\n=== НАСТРОЙКИ (непустые) ===')
  for (const s of settings) {
    if (s.value && s.value !== '[]') console.log(`${s.key} = ${s.value.slice(0, 120)}`)
  }

  const articles = await db.article.findMany({ select: { slug: true, status: true, isTest: true, categoryId: true } })
  console.log(`\n=== СТАТЬИ: всего ${articles.length} ===`)
  const byStatus = articles.reduce<Record<string, number>>((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc }, {})
  console.log('по статусам:', byStatus)
  const testCount = articles.filter((a) => a.isTest).length
  console.log(`тестовых: ${testCount}`)

  const media = await db.media.findMany({ select: { id: true, filename: true, originalName: true, alt: true } })
  console.log(`\n=== МЕДИА: всего ${media.length} ===`)
  for (const m of media) console.log(`${m.id} | ${m.filename} | ${m.originalName} | alt: ${m.alt}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
