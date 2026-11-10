/**
 * Генерация единого комплекта изображений для категорий права.
 * Стиль: спокойная редакционная фотография, мягкий свет, сине-бежевая палитра сайта,
 * без людей крупным планом, без текста и надписей, без водяных знаков.
 * Запуск: bun scripts/generate_category_images.ts
 */
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'

const OUT_DIR = '/home/z/my-project/scripts/generated-categories'

const STYLE =
  'professional editorial stock photography, soft diffused natural daylight, ' +
  'calm muted color palette with deep navy blue and warm beige tones, clean uncluttered composition, ' +
  'shallow depth of field, photorealistic, high quality, ' +
  'no people faces, no visible text, no letters, no numbers, no watermarks, no logos'

const TASKS: { slug: string; prompt: string }[] = [
  {
    slug: 'family',
    prompt:
      'cozy home scene: closed family photo album, children wooden blocks and a document folder on a light wooden table in living room, warm peaceful atmosphere',
  },
  {
    slug: 'divorce',
    prompt:
      'two wedding rings lying separately on a beige linen tablecloth next to a closed leather document folder, quiet symbolic still life about separation',
  },
  {
    slug: 'alimony',
    prompt:
      'small children sneakers and a ceramic piggy bank with few coins on a bright wooden table near a window, gentle caring mood',
  },
  {
    slug: 'inheritance',
    prompt:
      'vintage family heirlooms on a dark wooden table: antique pocket watch, old keys, closed leather-bound album and glasses, warm nostalgic light',
  },
  {
    slug: 'real-estate',
    prompt:
      'metal house keys with a small keychain placed on a notebook next to a tiny white architectural model of an apartment building, bright clean desk',
  },
  {
    slug: 'consumer-rights',
    prompt:
      'paper shopping bag with folded clothes and a small plain cardboard box on a light store counter, minimalist retail scene',
  },
  {
    slug: 'debts',
    prompt:
      'blue credit card and a neat calculator lying on a dark wooden desk with a closed notebook, soft office light, calm financial planning mood',
  },
  {
    slug: 'bankruptcy-individuals',
    prompt:
      'tidy stack of blank papers, a pen and a cup of tea on a home kitchen table in soft morning light, thoughtful fresh start mood',
  },
  {
    slug: 'labor',
    prompt:
      'office workplace corner with a closed work folder, ID badge lanyard and a coffee mug on a light desk near a window, calm professional mood',
  },
  {
    slug: 'housing',
    prompt:
      'facade of a modern residential apartment building with regular windows, clear sky, daytime, straight architectural photography from street level',
  },
  {
    slug: 'court',
    prompt:
      'wooden judge gavel resting on a closed thick law book on a dark polished desk, classical courtroom interior blurred in background, dignified mood',
  },
  {
    slug: 'money-recovery',
    prompt:
      'plain leather wallet and a few folded banknotes on a light wooden table next to a closed notebook, neutral everyday scene',
  },
  {
    slug: 'enforcement',
    prompt:
      'set of metal keys with an official-looking badge lying on a document folder on a wooden desk, soft light, orderly institutional mood',
  },
  {
    slug: 'appeals',
    prompt:
      'hands of a person writing with a pen in a notebook at a bright desk near a large window with a laptop aside, only hands visible, calm focused mood',
  },
]

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const zai = await ZAI.create()
  const failed: string[] = []

  for (const task of TASKS) {
    const outPath = path.join(OUT_DIR, `${task.slug}.png`)
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 50000) {
      console.log(`• ${task.slug}: уже есть, пропускаю`)
      continue
    }
    let done = false
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try {
        const res = await zai.images.generations.create({
          prompt: `${task.prompt}, ${STYLE}`,
          size: '1344x768',
        })
        const b64 = res?.data?.[0]?.base64
        if (!b64) throw new Error('пустой ответ')
        const buf = Buffer.from(b64, 'base64')
        if (buf.length < 30000) throw new Error(`подозрительно маленький файл: ${buf.length}`)
        fs.writeFileSync(outPath, buf)
        console.log(`✓ ${task.slug}: ${(buf.length / 1024).toFixed(0)} КБ`)
        done = true
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`✗ ${task.slug} (попытка ${attempt}): ${msg}`)
        if (attempt === 3) failed.push(task.slug)
        else await new Promise((r) => setTimeout(r, 2000 * attempt))
      }
    }
  }

  if (failed.length) {
    console.error(`НЕ УДАЛОСЬ: ${failed.join(', ')}`)
    process.exit(1)
  }
  console.log('Готово: все изображения сгенерированы.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
