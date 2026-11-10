/**
 * Регистрация сгенерированных изображений категорий в медиатеке CMS.
 * 1. Конвертирует PNG из scripts/generated-categories в WebP (sharp, quality 82).
 * 2. Копирует в uploads/{год}/{месяц} — та же структура, что использует медиатека.
 * 3. Создаёт записи Media (alt-тексты на русском) и привязывает к категориям (Category.imageMediaId).
 *
 * Повторный запуск безопасен: категория перепривязывается, дубли файлов не создаются
 * (ищем существующую запись по originalName).
 * Запуск: bun scripts/register_category_images.ts
 */
import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const db = new PrismaClient()
// Пути переносимые: работают и в песочнице, и на сервере (относительно корня проекта)
const WEBP_DIR = path.join(process.cwd(), 'scripts', 'generated-categories-webp')
const PNG_DIR = path.join(process.cwd(), 'scripts', 'generated-categories')
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

/** Alt-тексты: описание изображения + название раздела (для доступности и SEO). */
const META: Record<string, { alt: string; description: string }> = {
  family: {
    alt: 'Семейные споры — семейный фотоальбом, детские кубики и папка с документами на столе дома',
    description: 'Изображение раздела «Семейные споры»: домашняя сцена с семейными документами',
  },
  divorce: {
    alt: 'Развод и раздел имущества — два обручальных кольца рядом с папкой документов',
    description: 'Изображение раздела «Развод и раздел имущества»: нейтральный натюрморт с кольцами и документами',
  },
  alimony: {
    alt: 'Алименты — детские ботиночки и копилка с монетами на столе у окна',
    description: 'Изображение раздела «Алименты»: детские вещи и копилка',
  },
  inheritance: {
    alt: 'Наследство — старинные часы, ключи и семейный альбом на столе',
    description: 'Изображение раздела «Наследство»: семейные ценности и документы',
  },
  'real-estate': {
    alt: 'Недвижимость — ключи от квартиры и макет многоквартирного дома на столе',
    description: 'Изображение раздела «Недвижимость»: ключи и макет дома',
  },
  'consumer-rights': {
    alt: 'Защита прав потребителей — пакет с покупками и коробка товара на кассе',
    description: 'Изображение раздела «Защита прав потребителей»: покупка и товар',
  },
  debts: {
    alt: 'Кредиты и долги — кредитная карта и калькулятор на рабочем столе',
    description: 'Изображение раздела «Кредиты и долги»: финансовые инструменты',
  },
  'bankruptcy-individuals': {
    alt: 'Банкротство физических лиц — документы, ручка и чашка чая на кухонном столе',
    description: 'Изображение раздела «Банкротство физических лиц»: разбор документов дома',
  },
  labor: {
    alt: 'Трудовые споры — рабочее место с папкой, пропуском и кружкой кофе',
    description: 'Изображение раздела «Трудовые споры»: офисное рабочее место',
  },
  housing: {
    alt: 'Жилищные споры — фасад многоквартирного жилого дома',
    description: 'Изображение раздела «Жилищные споры»: многоквартирный дом',
  },
  court: {
    alt: 'Судебные споры — судебный молоток на толковом словаре законов',
    description: 'Изображение раздела «Судебные споры»: атрибуты суда',
  },
  'money-recovery': {
    alt: 'Взыскание денежных средств — кошелёк и банкноты на столе рядом с блокнотом',
    description: 'Изображение раздела «Взыскание денежных средств»: деньги и документы',
  },
  enforcement: {
    alt: 'Исполнительное производство — связка ключей и круглый металлический жетон на папке документов',
    description: 'Изображение раздела «Исполнительное производство»: документы, ключи и жетон пристава',
  },
  appeals: {
    alt: 'Обжалование решений госорганов — руки пишут официальное письмо за столом у окна',
    description: 'Изображение раздела «Обжалование решений госорганов»: написание обращения',
  },
}

async function main() {
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const subdir = path.join(UPLOAD_DIR, yyyy, mm)
  fs.mkdirSync(subdir, { recursive: true })

  const categories = await db.category.findMany({ orderBy: { sortOrder: 'asc' } })
  const bySlug = new Map(categories.map((c) => [c.slug, c]))

  for (const [slug, meta] of Object.entries(META)) {
    const category = bySlug.get(slug)
    if (!category) {
      console.error(`✗ категория «${slug}» не найдена в БД — пропуск`)
      continue
    }
    // Приоритет WebP (лёгкий деплой), fallback на исходный PNG
    let srcPath = path.join(WEBP_DIR, `${slug}.webp`)
    if (!fs.existsSync(srcPath)) srcPath = path.join(PNG_DIR, `${slug}.png`)
    if (!fs.existsSync(srcPath)) {
      console.error(`✗ файл не найден (${slug}.webp / .png) — пропуск`)
      continue
    }

    // Уже зарегистрировано? (ищем по originalName)
    const originalName = `category-${slug}.webp`
    let media = await db.media.findFirst({ where: { originalName } })

    if (!media) {
      const png = fs.readFileSync(srcPath)
      const webp = await sharp(png).webp({ quality: 82 }).toBuffer()
      const stored = `${Date.now().toString(36)}-${slug}-category.webp`
      fs.writeFileSync(path.join(subdir, stored), webp)
      const image = sharp(webp)
      const dims = await image.metadata()
      media = await db.media.create({
        data: {
          filename: stored,
          originalName,
          mime: 'image/webp',
          size: webp.length,
          width: dims.width ?? null,
          height: dims.height ?? null,
          alt: meta.alt,
          description: meta.description,
        },
      })
      console.log(`✓ ${slug}: media ${media.id}, ${(webp.length / 1024).toFixed(0)} КБ, ${dims.width}x${dims.height}`)
    } else {
      console.log(`• ${slug}: уже зарегистрировано (${media.id})`)
    }

    if (category.imageMediaId !== media.id) {
      await db.category.update({ where: { id: category.id }, data: { imageMediaId: media.id } })
      console.log(`  ↳ привязано к категории «${category.title}»`)
    }
  }
  console.log('Готово.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
