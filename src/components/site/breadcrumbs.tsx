import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export interface Crumb {
  title: string
  href?: string
}

/** Хлебные крошки (визуальная часть; JSON-LD BreadcrumbList строится на страницах). */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Хлебные крошки" className="no-print">
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
        <li className="flex items-center">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-primary">
            <Home className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only sm:not-sr-only">Главная</span>
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={`${item.href}-${i}`} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />
            {item.href ? (
              <Link href={item.href} className="hover:text-primary">{item.title}</Link>
            ) : (
              <span aria-current="page" className="text-foreground/80">{item.title}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
