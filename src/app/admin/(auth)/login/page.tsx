import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { LoginForm } from '@/components/admin/login-form'
import { Scale } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Вход в панель управления',
  robots: { index: false, follow: false },
}

export default async function LoginPage() {
  const user = await getSessionUser()
  if (user) redirect('/admin')

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scale className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold">Панель управления</span>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Доступ только для администратора сайта. Все попытки входа регистрируются.
        </p>
      </div>
    </main>
  )
}
