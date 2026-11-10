'use client'

/** Обращения посетителей: список, статусы, детали, экспорт CSV. */
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { formatDateTime } from '@/lib/format'
import { Download, Loader2, MailWarning, Trash2 } from 'lucide-react'

interface Row {
  id: string
  name: string
  contact: string
  topic: string
  message: string
  pageUrl: string
  status: string
  emailSent: boolean
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = { NEW: 'Новый', IN_PROGRESS: 'В работе', DONE: 'Завершён' }
const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-800 border border-blue-200',
  IN_PROGRESS: 'bg-secondary text-foreground',
  DONE: 'bg-green-50 text-green-800 border border-green-200',
}

export function SubmissionsList() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [newCount, setNewCount] = useState(0)
  const [mailConfigured, setMailConfigured] = useState(true)
  const [viewing, setViewing] = useState<Row | null>(null)
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) })
    if (status !== 'all') params.set('status', status)
    const res = await fetch(`/api/admin/submissions/?${params}`)
    if (res.ok) {
      const json = await res.json()
      setRows(json.rows)
      setPages(json.pages)
      setNewCount(json.newCount)
      setMailConfigured(json.mailConfigured)
    }
  }, [status, page])

  useEffect(() => {
    const timer = setTimeout(load, 0)
    return () => clearTimeout(timer)
  }, [load])

  async function changeStatus(row: Row, next: string) {
    setBusyId(row.id)
    const res = await fetch(`/api/admin/submissions/${row.id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    setBusyId('')
    if (res.ok) {
      toast({ title: 'Статус обновлён' })
      load()
      if (viewing?.id === row.id) setViewing({ ...viewing, status: next })
    }
  }

  async function remove(row: Row) {
    setBusyId(row.id)
    const res = await fetch(`/api/admin/submissions/${row.id}/`, { method: 'DELETE' })
    setBusyId('')
    if (res.ok) {
      toast({ title: 'Обращение удалено' })
      setViewing(null)
      load()
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          Обращения{newCount > 0 && <span className="ml-2 rounded-full bg-primary px-2.5 py-1 align-middle text-xs font-medium text-primary-foreground">новых: {newCount}</span>}
        </h1>
        <a
          href="/api/admin/submissions/export/"
          className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
        >
          <Download className="mr-2 h-4 w-4" aria-hidden /> Экспорт CSV
        </a>
      </div>

      {!mailConfigured && (
        <div className="flex items-start gap-2.5 rounded-md border border-gold/40 bg-secondary/60 p-3.5 text-sm">
          <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
          <p className="leading-relaxed">
            Уведомления на e-mail не подключены. Обращения сохраняются здесь — проверяйте этот раздел регулярно или
            настройте SMTP (docs/INSTALL.md).
          </p>
        </div>
      )}

      <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
        <SelectTrigger className="sm:w-52" aria-label="Фильтр по статусу"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все статусы</SelectItem>
          <SelectItem value="NEW">Новые</SelectItem>
          <SelectItem value="IN_PROGRESS">В работе</SelectItem>
          <SelectItem value="DONE">Завершённые</SelectItem>
        </SelectContent>
      </Select>

      {rows === null ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Обращений пока нет.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card custom-scrollbar">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium">Имя / контакт</th>
                <th className="px-4 py-3 font-medium">Тема</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="cursor-pointer hover:bg-accent/40" onClick={() => setViewing(row)}>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.contact}</p>
                  </td>
                  <td className="max-w-[240px] px-4 py-3">
                    <p className="truncate">{row.topic || '—'}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.message}</p>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      {busyId === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Select value={row.status} onValueChange={(v) => changeStatus(row, v)}>
                          <SelectTrigger className={`h-8 w-36 text-xs ${STATUS_COLORS[row.status] || ''}`} aria-label="Статус обращения"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NEW">Новый</SelectItem>
                            <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                            <SelectItem value="DONE">Завершён</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => remove(row)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                      aria-label={`Удалить обращение от ${row.name}`}
                      title="Удалить"
                    >
                      {busyId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Назад</Button>
          <span className="text-sm text-muted-foreground">Страница {page} из {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Вперёд</Button>
        </div>
      )}

      {/* Просмотр обращения */}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto custom-scrollbar sm:max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>Обращение от {viewing.name}</DialogTitle>
                <DialogDescription>
                  Получено {formatDateTime(viewing.createdAt)} · статус: {STATUS_LABELS[viewing.status]}. Контакт для ответа: {viewing.contact}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground">Контакт</p><p className="font-medium break-all">{viewing.contact}</p></div>
                  <div><p className="text-xs text-muted-foreground">Тема</p><p className="font-medium">{viewing.topic || '—'}</p></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Сообщение</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 leading-relaxed">{viewing.message}</p>
                </div>
                {viewing.pageUrl && (
                  <div><p className="text-xs text-muted-foreground">Страница отправки</p><p className="break-all">{viewing.pageUrl}</p></div>
                )}
                <div className="flex items-center gap-2 rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground">
                  {viewing.emailSent ? 'Уведомление на e-mail отправлено.' : 'E-mail не отправлялся (SMTP не настроен). Обращение сохранено в базе.'}
                </div>
                {viewing.contact.includes('@') && (
                  <a href={`mailto:${viewing.contact}?subject=Ответ на обращение с сайта`} className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                    Ответить по e-mail
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
