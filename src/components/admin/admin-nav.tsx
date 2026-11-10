'use client'

/** Боковая навигация админ-панели с подсветкой активного раздела. */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FileText, FolderTree, Images, Inbox, Settings, ArrowLeftRight, LogOut, ExternalLink,
} from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'

const NAV = [
  { href: '/admin', label: 'Дашборд', icon: LayoutDashboard, exact: true },
  { href: '/admin/articles', label: 'Статьи', icon: FileText },
  { href: '/admin/categories', label: 'Категории', icon: FolderTree },
  { href: '/admin/media', label: 'Медиатека', icon: Images },
  { href: '/admin/submissions', label: 'Обращения', icon: Inbox },
  { href: '/admin/redirects', label: 'Редиректы', icon: ArrowLeftRight },
  { href: '/admin/settings', label: 'Настройки сайта', icon: Settings },
]

export function AdminNav({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function logout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout/', { method: 'POST' })
      router.push('/admin/login')
    } catch {
      toast({ title: 'Не удалось выйти', variant: 'destructive' })
      setLoggingOut(false)
    }
  }

  return (
    <nav aria-label="Навигация панели управления" className="flex h-full flex-col gap-1 p-3 text-white">
      <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-white/50">
        Панель управления
      </p>
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        )
      })}

      <div className="mt-auto space-y-1 border-t border-white/15 pt-3">
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" aria-hidden /> Открыть сайт
        </a>
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" aria-hidden /> Выйти
        </button>
        <p className="px-3 pt-1 text-xs text-white/45">{userName}</p>
      </div>
    </nav>
  )
}
