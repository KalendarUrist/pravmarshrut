'use client'

/** Таблица статей: фильтры, быстрые действия, публикация/снятие, удаление. */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { formatDateTime } from '@/lib/format'
import { Plus, Search, Loader2, Trash2, Eye, Undo2, Send } from 'lucide-react'

interface Row {
  id: string
  slug: string
  title: string
  status: string
  isTest: boolean
  views: number
  publishedAt: string | null
  updatedAt: string
  category: { id: string; slug: string; title: string }
}

interface Category { id: string; title: string }

export function ArticlesTable() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [categoryId, setCategoryId] = useState('all')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) })
    if (q.trim()) params.set('q', q.trim())
    if (status !== 'all') params.set('status', status)
    if (categoryId !== 'all') params.set('categoryId', categoryId)
    const res = await fetch(`/api/admin/articles/?${params}`)
    if (res.ok) {
      const json = await res.json()
      setRows(json.rows)
      setPages(json.pages)
      setCategories(json.categories || [])
    }
  }, [q, status, categoryId, page])

  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [load])

  async function togglePublish(row: Row) {
    setBusyId(row.id)
    try {
      // Для смены статуса нужен полный PUT — получаем статью и сохраняем только статус
      const resGet = await fetch(`/api/admin/articles/${row.id}/`)
      if (!resGet.ok) throw new Error()
      const { article } = await resGet.json()
      const nextStatus = row.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
      const res = await fetch(`/api/admin/articles/${row.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          contentHtml: article.contentHtml,
          categoryId: article.categoryId,
          tags: article.tags,
          coverMediaId: article.coverMediaId,
          videoUrl: article.videoUrl,
          authorName: article.authorName,
          legalBasis: article.legalBasis,
          seoTitle: article.seoTitle,
          metaDescription: article.metaDescription,
          status: nextStatus,
          publishedAt: article.publishedAt,
          checkedAt: article.checkedAt,
          isTest: article.isTest,
          relatedIds: article.relatedLinks.map((r: { relatedId: string }) => r.relatedId),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.ok) {
        toast({ title: nextStatus === 'PUBLISHED' ? 'Статья опубликована' : 'Публикация снята' })
        load()
      } else {
        toast({ title: 'Ошибка', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Не удалось изменить статус статьи', variant: 'destructive' })
    } finally {
      setBusyId('')
    }
  }

  async function remove(row: Row) {
    setBusyId(row.id)
    const res = await fetch(`/api/admin/articles/${row.id}/`, { method: 'DELETE' })
    setBusyId('')
    if (res.ok) {
      toast({ title: 'Статья удалена' })
      load()
    } else {
      toast({ title: 'Не удалось удалить статью', variant: 'destructive' })
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Статьи</h1>
        <Link
          href="/admin/articles/new"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden /> Создать статью
        </Link>
      </div>

      {/* Фильтры */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Поиск по заголовку или URL" className="pl-8" aria-label="Поиск статей" />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="sm:w-44" aria-label="Статус"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="PUBLISHED">Опубликованные</SelectItem>
            <SelectItem value="DRAFT">Черновики</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1) }}>
          <SelectTrigger className="sm:w-56" aria-label="Категория"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Таблица */}
      {rows === null ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Статей не найдено. <Link href="/admin/articles/new" className="text-primary underline">Создайте первую статью</Link>.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card custom-scrollbar">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Заголовок</th>
                <th className="px-4 py-3 font-medium">Категория</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Просмотры</th>
                <th className="px-4 py-3 font-medium">Обновлено</th>
                <th className="px-4 py-3 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-accent/40">
                  <td className="max-w-[320px] px-4 py-3">
                    <Link href={`/admin/articles/${row.id}`} className="font-medium hover:text-primary">
                      {row.title}
                    </Link>
                    {row.isTest && <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-destructive">тест</span>}
                    <p className="truncate text-xs text-muted-foreground">/{row.category.slug}/{row.slug}/</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.category.title}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-secondary text-muted-foreground'}`}>
                      {row.status === 'PUBLISHED' ? 'Опубликовано' : 'Черновик'}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{row.views}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(row.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {busyId === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Обработка" />
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            title={row.status === 'PUBLISHED' ? 'Снять с публикации' : 'Опубликовать'}
                            onClick={() => togglePublish(row)}
                          >
                            {row.status === 'PUBLISHED' ? <Undo2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                          </Button>
                          {row.status === 'PUBLISHED' && (
                            <a
                              href={`/${row.category.slug}/${row.slug}/`}
                              target="_blank"
                              rel="noopener"
                              title="Открыть на сайте"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                              <Eye className="h-4 w-4" aria-hidden />
                            </a>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button type="button" variant="ghost" size="sm" title="Удалить" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить статью?</AlertDialogTitle>
                                <AlertDialogDescription>«{row.title}» будет удалена безвозвратно.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={() => remove(row)}>Удалить</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
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
    </div>
  )
}
