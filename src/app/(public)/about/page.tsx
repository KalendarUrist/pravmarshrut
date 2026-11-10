import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { getBaseUrl } from '@/lib/server-url'
import { sanitizeHtmlContent, htmlToPlain } from '@/lib/content'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { HelpCta } from '@/components/site/help-cta'
import { SocialIcons } from '@/components/site/social-icons'
import { parseSocials } from '@/lib/settings'
import { BookOpen, FileQuestion, ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl()
  return {
    title: 'О проекте',
    description: 'Информация о проекте юридической помощи гражданам.',
    alternates: { canonical: `${baseUrl}/about/` },
    openGraph: { title: 'О проекте', url: `${baseUrl}/about/`, type: 'website', locale: 'ru_RU' },
  }
}

export default async function AboutPage() {
  const [settings, articlesCount, categoriesCount] = await Promise.all([
    getSettings(),
    db.article.count({ where: { status: 'PUBLISHED' } }),
    db.category.count(),
  ])
  const socials = parseSocials(settings.socials)

  // Текст по умолчанию — редактируется в админ-панели (HTML)
  const defaultHtml = `
<p>Этот сайт создан, чтобы гражданин России мог самостоятельно разобраться в своих правах: в семейных,
жилищных, трудовых и других вопросах. Мы пишем простым языком, приводим пошаговые инструкции и указываем
нормативную базу, чтобы каждый материал можно было проверить по первоисточнику.</p>
<h2>Какие принципы мы соблюдаем</h2>
<ul>
<li><strong>Понятность.</strong> Никаких сложных формулировок там, где можно объяснить человеческим языком.</li>
<li><strong>Проверяемость.</strong> В каждом материале указывается нормативная база и дата последней проверки.</li>
<li><strong>Честность.</strong> Мы не обещаем гарантированных результатов и не выдаём справочную информацию за юридическую консультацию.</li>
</ul>
<h2>Что на сайте</h2>
<p>Материалы сгруппированы по разделам: семейные споры, развод и раздел имущества, алименты, наследство,
недвижимость, защита прав потребителей, кредиты и долги, банкротство физических лиц, трудовые и жилищные споры,
судебные споры, исполнительное производство и обжалование решений госорганов.</p>
<h2>Обратная связь</h2>
<p>Если материал устарел или в нём есть неточность — напишите нам через <a href="/contacts/">форму обратной связи</a>.
Мы читаем все обращения и обновляем материалы по мере изменения законодательства.</p>
`
  const html = sanitizeHtmlContent(settings.aboutPageHtml || defaultHtml)
  const hasText = htmlToPlain(html).trim().length > 0

  return (
    <div className="container-site py-6">
      <Breadcrumbs items={[{ title: 'О проекте' }]} />

      <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight text-primary">О проекте «{settings.siteName}»</h1>

      <div className="article-content mt-6" dangerouslySetInnerHTML={{ __html: html }} />

      {/* Факты о проекте — только реальные данные, без выдуманных рейтингов */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <BookOpen className="mb-2 h-5 w-5 text-primary" aria-hidden />
          <p className="text-2xl font-bold">{articlesCount}</p>
          <p className="text-sm text-muted-foreground">опубликованных материалов</p>
        </div>
        <div className="rounded-lg border p-4">
          <FileQuestion className="mb-2 h-5 w-5 text-primary" aria-hidden />
          <p className="text-2xl font-bold">{categoriesCount}</p>
          <p className="text-sm text-muted-foreground">тематических разделов</p>
        </div>
        <div className="rounded-lg border p-4">
          <ShieldCheck className="mb-2 h-5 w-5 text-primary" aria-hidden />
          <p className="text-sm font-semibold leading-snug">Дата проверки указывается в каждом материале</p>
        </div>
      </div>

      {socials.length > 0 && (
        <div className="mt-8">
          <p className="mb-2 text-sm font-medium">Мы в социальных сетях:</p>
          <SocialIcons links={socials} />
        </div>
      )}

      <HelpCta ctaText={settings.heroCtaText} pageUrl="/about/" />

      <p className="text-sm text-muted-foreground">
        Остались вопросы о работе сайта? Страница{' '}
        <Link href="/contacts/" className="text-primary underline-offset-4 hover:underline">контактов</Link> — здесь
        форма обратной связи и порядок обращения.
      </p>
    </div>
  )
}
