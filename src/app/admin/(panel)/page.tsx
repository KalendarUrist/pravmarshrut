import Link from 'next/link'
import { formatDateTime } from '@/lib/format'
import { FileText, FolderTree, Images, Inbox, FlaskConical, MailWarning, BarChart3, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = { NEW: 'Новый', IN_PROGRESS: 'В работе', DONE: 'Завершено' }

export default async function AdminDashboard() {
  // Данные запрашиваются напрямую из БД (серверный компонент)
  const { db } = await import('@/lib/db')
  const { isMailerConfigured } = await import('@/lib/mailer')

  const [published, drafts, categories, media, newSubmissions, testArticles, recentSubmissions, recentArticles] =
    await Promise.all([
      db.article.count({ where: { status: 'PUBLISHED' } }),
      db.article.count({ where: { status: 'DRAFT' } }),
      db.category.count(),
      db.media.count(),
      db.submission.count({ where: { status: 'NEW' } }),
      db.article.count({ where: { isTest: true, status: 'PUBLISHED' } }),
      db.submission.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      db.article.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, slug: true, status: true, updatedAt: true, category: { select: { title: true, slug: true } } },
      }),
    ])

  const mailConfigured = isMailerConfigured()

  const stats = [
    { label: 'Опубликовано', value: published, href: '/admin/articles', icon: FileText },
    { label: 'Черновики', value: drafts, href: '/admin/articles', icon: FileText },
    { label: 'Категории', value: categories, href: '/admin/categories', icon: FolderTree },
    { label: 'Файлы в медиатеке', value: media, href: '/admin/media', icon: Images },
    { label: 'Новые обращения', value: newSubmissions, href: '/admin/submissions', icon: Inbox },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Дашборд</h1>

      {/* Предупреждения, требующие действия */}
      {(testArticles > 0 || !mailConfigured) && (
        <div className="space-y-2">
          {testArticles > 0 && (
            <div className="flex items-start gap-2.5 rounded-md border border-gold/40 bg-secondary/60 p-3.5 text-sm">
              <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
              <p className="leading-relaxed">
                На сайте опубликовано тестовых материалов: <strong>{testArticles}</strong>. Перед запуском проекта
                удалите их в разделе <Link href="/admin/articles" className="underline hover:text-primary">«Статьи»</Link>.
              </p>
            </div>
          )}
          {!mailConfigured && (
            <div className="flex items-start gap-2.5 rounded-md border border-gold/40 bg-secondary/60 p-3.5 text-sm">
              <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
              <p className="leading-relaxed">
                Уведомления о новых обращениях на e-mail не подключены (переменные SMTP_*). Обращения сохраняются в
                базе и доступны в разделе «Обращения». Инструкция: docs/INSTALL.md.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Счётчики */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm">
            <s.icon className="mb-2 h-4 w-4 text-muted-foreground" aria-hidden />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Последние обращения */}
        <section className="rounded-lg border bg-card" aria-labelledby="dash-subs">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 id="dash-subs" className="font-semibold">Последние обращения</h2>
            <Link href="/admin/submissions" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Все <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          {recentSubmissions.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Обращений пока нет.</p>
          ) : (
            <ul className="divide-y">
              {recentSubmissions.map((s) => (
                <li key={s.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                      {STATUS_LABELS[s.status] || s.status}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{s.topic || s.message}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDateTime(s.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Недавно изменённые статьи */}
        <section className="rounded-lg border bg-card" aria-labelledby="dash-arts">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 id="dash-arts" className="font-semibold">Недавно изменённые статьи</h2>
            <Link href="/admin/articles" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Все <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          {recentArticles.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Статей пока нет. <Link href="/admin/articles/new" className="text-primary underline">Создать первую</Link>.</p>
          ) : (
            <ul className="divide-y">
              {recentArticles.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/articles/${a.id}`} className="block truncate text-sm font-medium hover:text-primary">
                      {a.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{a.category.title} · {formatDateTime(a.updatedAt)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${a.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-secondary text-muted-foreground'}`}>
                    {a.status === 'PUBLISHED' ? 'Опубликовано' : 'Черновик'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Подсказки по SEO-подключениям */}
      <section className="rounded-lg border bg-card p-4" aria-labelledby="dash-seo">
        <h2 id="dash-seo" className="mb-2 flex items-center gap-2 font-semibold">
          <BarChart3 className="h-4 w-4 text-primary" aria-hidden /> Аналитика и вебмастер
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Счётчики и коды подтверждения настраиваются в разделе{' '}
          <Link href="/admin/settings" className="underline hover:text-primary">«Настройки сайта»</Link>: Яндекс
          Метрика, Google Analytics, коды верификации Яндекс Вебмастера и Google Search Console. Карта сайта
          доступна по адресу <code className="rounded bg-muted px-1.5 py-0.5">/sitemap.xml</code>.
        </p>
      </section>
    </div>
  )
}
