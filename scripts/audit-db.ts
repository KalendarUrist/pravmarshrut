/**
 * Аудит текущего состояния БД: настройки, категории, статьи, submissions.
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const settings = await db.setting.findMany({ orderBy: { key: 'asc' } })
  console.log('=== SETTINGS ===')
  for (const s of settings) {
    const v = s.value.length > 120 ? s.value.slice(0, 120) + '…' : s.value
    console.log(`${s.key} = ${JSON.stringify(v)}`)
  }

  const categories = await db.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { slug: true, title: true, imageMediaId: true, imageMedia: { select: { filename: true, alt: true, width: true, height: true, mime: true, size: true } }, _count: { select: { articles: true } } },
  })
  console.log('\n=== CATEGORIES ===')
  for (const c of categories) {
    console.log(`${c.slug} | ${c.title} | mediaId=${c.imageMediaId} | img=${JSON.stringify(c.imageMedia)} | articles=${c._count.articles}`)
  }

  const articles = await db.article.findMany({
    select: { slug: true, title: true, status: true, category: { select: { slug: true } } },
    orderBy: { createdAt: 'asc' },
  })
  console.log('\n=== ARTICLES (count: ' + articles.length + ') ===')
  for (const a of articles) {
    console.log(`${a.category.slug}/${a.slug} | ${a.status} | ${a.title.slice(0, 60)}`)
  }

  const submissions = await db.submission.count()
  console.log('\n=== SUBMISSIONS count:', submissions)

  const media = await db.media.count()
  console.log('=== MEDIA count:', media)

  const users = await db.adminUser.count()
  console.log('=== ADMINS count:', users)
}

main().catch(console.error).finally(() => db.$disconnect())
