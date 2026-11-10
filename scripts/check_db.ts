import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const cats = await db.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }], include: { _count: { select: { articles: true } } } })
  console.log('CATEGORIES:', cats.length)
  for (const c of cats) console.log(`- ${c.slug} | ${c.title} | sort=${c.sortOrder} | featured=${c.featured} | articles=${c._count.articles}`)
  const articles = await db.article.findMany({ select: { slug: true, title: true, status: true, isTest: true, coverMediaId: true, categoryId: true }, take: 50 })
  console.log('ARTICLES:', articles.length)
  for (const a of articles) console.log(`* ${a.slug} | ${a.status} | test=${a.isTest} | cover=${a.coverMediaId ? 'yes' : 'no'}`)
  const media = await db.media.count()
  console.log('MEDIA COUNT:', media)
  const settings = await db.setting.findMany()
  for (const s of settings) console.log(`S ${s.key} = ${s.value.slice(0, 80)}`)
  await db.$disconnect()
}
main()
