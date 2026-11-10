'use client'

/**
 * Тёмно-синяя полоса навигации (второй ярус шапки, по макету):
 * активный пункт — светлая пилюля с белым подчёркиванием,
 * «Юридические вопросы» — выпадающий список категорий,
 * справа — полупрозрачное поисковое поле-пилюля.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export interface NavCategory {
  slug: string
  title: string
}

const LINKS = [
  { href: '/', label: 'Главная', exact: true },
  { href: '/articles/', label: 'Статьи' },
  { href: '/about/', label: 'О проекте' },
  { href: '/contacts/', label: 'Контакты' },
]

export function NavBar({ categories }: { categories: NavCategory[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href || pathname === href.replace(/\/$/, '') : pathname.startsWith(href.replace(/\/$/, ''))

  const categoriesActive = !LINKS.some((l) => isActive(l.href, l.exact)) && pathname !== '/categories/' && pathname !== '/search/'

  const baseCls =
    'inline-flex h-[50px] items-center gap-1.5 rounded-none px-4 text-[15px] font-medium transition-colors'
  const linkCls = (active: boolean) =>
    active ? `${baseCls} bg-white/10 font-semibold text-white` : `${baseCls} text-white/90 hover:bg-white/5 hover:text-white`

  return (
    <nav aria-label="Основная навигация" className="bg-primary text-white no-print">
      <div className="container-site flex items-stretch gap-1">
        {/* Пункты меню (десктоп) */}
        <div className="hidden items-stretch md:flex">
          <Link href="/" className={linkCls(isActive('/', true))} aria-current={isActive('/', true) ? 'page' : undefined}>
            <span className="relative">
              Главная
              {isActive('/', true) && (
                <span className="absolute -bottom-[6px] left-0 right-0 h-[2.5px] rounded-full bg-white" aria-hidden />
              )}
            </span>
          </Link>
          <Link href="/articles/" className={linkCls(isActive('/articles/'))} aria-current={isActive('/articles/') ? 'page' : undefined}>
            Статьи
          </Link>

          {/* Выпадающий список категорий */}
          <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="true"
              onClick={() => setOpen((v) => !v)}
              className={linkCls(categoriesActive)}
            >
              <span className="relative">
                Юридические вопросы
                {categoriesActive && (
                  <span className="absolute -bottom-[6px] left-0 right-0 h-[2.5px] rounded-full bg-white" aria-hidden />
                )}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {open && (
              <div className="absolute left-0 top-full z-50 w-[560px] rounded-b-xl border border-border bg-popover p-2 shadow-lg">
                <div className="grid grid-cols-2 gap-0.5">
                  {categories.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/${c.slug}/`}
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-3 py-2 text-sm text-foreground/90 transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {c.title}
                    </Link>
                  ))}
                </div>
                <div className="mt-1 border-t pt-1">
                  <Link
                    href="/categories/"
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-accent"
                  >
                    Все категории
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link href="/about/" className={linkCls(isActive('/about/'))} aria-current={isActive('/about/') ? 'page' : undefined}>
            О проекте
          </Link>
          <Link href="/contacts/" className={linkCls(isActive('/contacts/'))} aria-current={isActive('/contacts/') ? 'page' : undefined}>
            Контакты
          </Link>
        </div>

        {/* Поиск (десктоп): полупрозрачная пилюля, как в макете */}
        <form action="/search" method="GET" role="search" className="ml-auto hidden items-center lg:flex">
          <label htmlFor="nav-search" className="sr-only">Поиск по статьям</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white" aria-hidden />
            <input
              id="nav-search"
              name="q"
              type="search"
              placeholder="Поиск по статьям..."
              className="h-10 w-[270px] rounded-full border border-white/10 bg-white/15 pl-10 pr-4 text-[14px] text-white outline-none transition-[width,background-color] placeholder:text-white/70 focus:w-[310px] focus:bg-white/20"
            />
          </div>
        </form>
      </div>
    </nav>
  )
}
