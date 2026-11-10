import Link from 'next/link'
import { db } from '@/lib/db'
import { getSettings, parseSocials } from '@/lib/settings'
import { SocialIcons } from '@/components/site/social-icons'
import { Logo } from '@/components/site/logo'

/** Подвал в тёмно-синей палитре сайта (по макету). */
export async function Footer() {
  const [settings, categories] = await Promise.all([
    getSettings(),
    db.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: { slug: true, title: true },
      take: 10,
    }),
  ])
  const socials = parseSocials(settings.socials)
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto bg-primary text-white/75 no-print">
      <div className="container-site py-12 lg:py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* О проекте */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Logo logoUrl={settings.logoUrl} name={settings.siteName} variant="dark" size="sm" />
            </div>
            <p className="text-sm leading-relaxed text-white/60">{settings.siteDescription}</p>
            {socials.length > 0 && <SocialIcons links={socials} variant="dark" size="sm" />}
          </div>

          {/* Разделы */}
          <nav aria-label="Разделы сайта">
            <h2 className="mb-4 text-[15px] font-bold uppercase tracking-wide text-white">Юридические вопросы</h2>
            <ul className="space-y-2.5 text-sm">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/${c.slug}/`} className="text-white/65 transition-colors hover:text-white">
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Информация */}
          <nav aria-label="Информация о проекте">
            <h2 className="mb-4 text-[15px] font-bold uppercase tracking-wide text-white">Информация</h2>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/articles/" className="text-white/65 transition-colors hover:text-white">Все статьи</Link></li>
              <li><Link href="/about/" className="text-white/65 transition-colors hover:text-white">О проекте</Link></li>
              <li><Link href="/contacts/" className="text-white/65 transition-colors hover:text-white">Контакты</Link></li>
              <li><Link href="/search/" className="text-white/65 transition-colors hover:text-white">Поиск по материалам</Link></li>
              <li><Link href="/privacy/" className="text-white/65 transition-colors hover:text-white">Политика конфиденциальности</Link></li>
              <li><Link href="/consent/" className="text-white/65 transition-colors hover:text-white">Согласие на обработку данных</Link></li>
              <li><Link href="/terms/" className="text-white/65 transition-colors hover:text-white">Пользовательское соглашение</Link></li>
            </ul>
          </nav>

          {/* Контакты */}
          <div>
            <h2 className="mb-4 text-[15px] font-bold uppercase tracking-wide text-white">Контакты</h2>
            <ul className="space-y-2.5 text-sm text-white/65">
              {settings.contactsPhone && (
                <li>
                  <a href={`tel:${settings.contactsPhone.replace(/[^\d+]/g, '')}`} className="transition-colors hover:text-white">
                    {settings.contactsPhone}
                  </a>
                </li>
              )}
              {settings.contactsAddress && <li>{settings.contactsAddress}</li>}
              {settings.contactsWorktime && <li>{settings.contactsWorktime}</li>}
              {!settings.contactsPhone && !settings.contactsAddress && !settings.contactsWorktime && (
                <li className="text-white/40">Контактные данные появятся после заполнения в админ-панели.</li>
              )}
            </ul>
            <Link
              href="/contacts/"
              className="mt-5 inline-flex items-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-opacity hover:opacity-90"
            >
              Задать вопрос
            </Link>
          </div>
        </div>

        <div className="mt-12 border-t border-white/15 pt-6">
          <p className="text-xs leading-relaxed text-white/50">
            {settings.footerText || 'Информация на сайте носит справочный характер и не является юридической консультацией.'}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
            <span>© {year} {settings.siteName}. Все права защищены.</span>
            <Link href="/admin/login/" className="text-white/35 transition-colors hover:text-white/70">
              Вход для редактора
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
