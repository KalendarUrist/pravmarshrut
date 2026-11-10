'use client'

/**
 * Мобильное меню сайта: выезжающая панель на нативном <dialog>.
 * Не использует Radix (генерация id вызывала гидрационные ошибки React 19).
 */
import { useRef } from 'react'
import Link from 'next/link'
import { Search, X, Mail, Menu } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { SocialIcons } from '@/components/site/social-icons'
import { Logo } from '@/components/site/logo'
import type { SocialLink } from '@/lib/settings'

interface Props {
  categories: { slug: string; title: string }[]
  siteName: string
  logoUrl: string
  ctaText: string
  socials: SocialLink[]
}

export function MobileMenu({ categories, siteName, logoUrl, ctaText, socials }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const open = () => dialogRef.current?.showModal()
  const close = () => dialogRef.current?.close()

  function onDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) close()
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-label="Открыть меню"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-foreground transition-colors hover:bg-accent md:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <dialog
        ref={dialogRef}
        onClick={onDialogClick}
        onClose={() => {
          document.body.style.overflow = ''
        }}
        aria-label="Меню сайта"
        className="site-drawer m-0 ml-auto mr-0 h-dvh max-h-none w-80 max-w-[85vw] border-l bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/50"
      >
        <div className="flex h-full flex-col overflow-y-auto p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <Logo logoUrl={logoUrl} name={siteName} size="sm" />
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Закрыть меню"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <form action="/search" method="GET" role="search" className="mb-4 mt-4">
            <label htmlFor="mobile-search" className="sr-only">Поиск по материалам</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input id="mobile-search" name="q" type="search" placeholder="Поиск по материалам" className="pl-8" />
            </div>
          </form>

          <nav aria-label="Мобильная навигация" className="flex flex-col gap-1">
            <Link href="/" onClick={close} className="rounded-md px-2 py-2.5 text-[15px] font-medium hover:bg-accent">Главная</Link>
            <Link href="/articles/" onClick={close} className="rounded-md px-2 py-2.5 text-[15px] font-medium hover:bg-accent">Статьи</Link>
            <p className="px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Юридические вопросы</p>
            {categories.map((c) => (
              <Link key={c.slug} href={`/${c.slug}/`} onClick={close} className="rounded-md px-2 py-2.5 text-[15px] hover:bg-accent">
                {c.title}
              </Link>
            ))}
            <p className="px-2 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Информация</p>
            <Link href="/about/" onClick={close} className="rounded-md px-2 py-2.5 text-[15px] hover:bg-accent">О проекте</Link>
            <Link href="/contacts/" onClick={close} className="rounded-md px-2 py-2.5 text-[15px] hover:bg-accent">Контакты</Link>
          </nav>

          <Link
            href="/contacts/"
            onClick={close}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-center text-[15px] font-semibold text-primary-foreground"
          >
            <Mail className="h-4 w-4" aria-hidden />
            {ctaText}
          </Link>

          {socials.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <SocialIcons links={socials} size="sm" />
            </div>
          )}
        </div>
      </dialog>
    </>
  )
}
