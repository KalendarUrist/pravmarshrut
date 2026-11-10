import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AdminNav } from '@/components/admin/admin-nav'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Панель управления',
  robots: { index: false, follow: false },
}

/** Защищённый каркас админ-панели: без сессии — редирект на страницу входа. */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="flex min-h-screen">
      {/* Боковая панель */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 bg-primary md:block no-print">
        <div className="flex h-full flex-col">
          <AdminNav userName={user.email} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Мобильная навигация */}
        <div className="bg-primary md:hidden">
          <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
            <AdminNav userName={user.email} />
          </div>
        </div>
        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  )
}
