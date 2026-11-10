import Link from 'next/link'
import { Search } from 'lucide-react'

export const metadata = {
  title: 'Страница не найдена',
  robots: { index: false },
}

/**
 * 404 для всех адресов публичной части (внутри группы (public)).
 * Шапка и подвал уже добавлены каркасом (public)/layout.tsx —
 * поэтому здесь без <Header/> и <Footer/> (иначе они дублируются).
 */
export default function PublicNotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="max-w-md text-center">
        <p className="text-7xl font-bold text-primary/20" aria-hidden>404</p>
        <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-primary">Страница не найдена</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Возможно, материал перенесён в другой раздел или его адрес изменился. Воспользуйтесь поиском или
          откройте главную страницу.
        </p>
        <form action="/search" method="GET" role="search" className="mt-6 flex gap-2">
          <label htmlFor="nf-search" className="sr-only">Поиск по материалам</label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              id="nf-search"
              name="q"
              type="search"
              placeholder="Поиск по материалам"
              className="h-10 w-full rounded-md border border-input bg-background px-9 text-sm outline-none ring-primary/30 transition-shadow focus:ring-2"
            />
          </div>
          <button
            type="submit"
            className="h-10 shrink-0 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Найти
          </button>
        </form>
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
          <Link href="/" className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90">
            На главную страницу
          </Link>
          <Link href="/contacts/" className="rounded-md border px-4 py-2 font-medium transition-colors hover:bg-accent">
            Задать вопрос
          </Link>
        </div>
      </div>
    </main>
  )
}
