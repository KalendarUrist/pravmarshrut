import Link from 'next/link'
import { db } from '@/lib/db'
import { getSettings, parseSocials } from '@/lib/settings'
import { SocialIcons } from '@/components/site/social-icons'
import { Logo } from '@/components/site/logo'
import { NavBar } from '@/components/site/nav-bar'
import { MobileMenu } from '@/components/site/mobile-menu'
import { Mail } from 'lucide-react'

/**
 * Двухъярусная шапка по макету:
 * 1) белая полоса — логотип с подписью, вертикальная черта, инфо-текст,
 *    фирменные соцсети, кнопка «Обратиться за помощью»;
 * 2) тёмно-синяя полоса навигации с полупрозрачным поиском (прилипает при прокрутке).
 */
export async function Header() {
  const [settings, categories] = await Promise.all([
    getSettings(),
    db.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }], select: { slug: true, title: true } }),
  ])
  const socials = parseSocials(settings.socials)
  const ctaText = settings.heroCtaText || 'Обратиться за помощью'

  return (
    <header className="no-print">
      {/* Ярус 1: белая полоса */}
      <div className="border-b border-border/70 bg-background">
        <div className="container-site flex items-center gap-3 py-2.5 sm:gap-5 lg:py-3">
          <Link href="/" className="flex shrink-0 items-center" aria-label={settings.siteName}>
            <Logo logoUrl={settings.logoUrl} name={settings.siteName} tagline="Юридическая помощь гражданам" />
          </Link>

          {/* Вертикальная черта + описание портала */}
          <div className="hidden h-11 w-px shrink-0 bg-border lg:block" aria-hidden />
          <p className="hidden max-w-[290px] text-[13px] leading-[1.4] text-muted-foreground lg:block">
            <span className="font-semibold text-foreground">Информационный юридический портал</span>
            <br />
            {settings.siteDescription}
          </p>

          <div className="ml-auto flex items-center gap-2 sm:gap-5">
            <SocialIcons links={socials} className="hidden md:flex" />
            <Link
              href="/contacts/"
              className="hidden h-11 shrink-0 items-center gap-2.5 rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:inline-flex"
            >
              <Mail className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
              {ctaText}
            </Link>

            {/* Мобильное меню (нативный <dialog>) */}
            <MobileMenu
              categories={categories}
              siteName={settings.siteName}
              logoUrl={settings.logoUrl}
              ctaText={ctaText}
              socials={socials}
            />
          </div>
        </div>
      </div>

      {/* Ярус 2: тёмно-синяя навигация (прилипает при прокрутке) */}
      <div className="sticky top-0 z-40">
        <NavBar categories={categories} />
      </div>
    </header>
  )
}
