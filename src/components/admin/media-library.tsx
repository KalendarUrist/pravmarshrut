'use client'

/** Медиатека: загрузка, просмотр, alt и описание, копирование URL, удаление. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { formatBytes, formatDate } from '@/lib/format'
import { Upload, Loader2, Pencil, Copy, Trash2, Search } from 'lucide-react'

interface Row {
  id: string
  url: string
  filename: string
  originalName: string
  mime: string
  size: number
  width: number | null
  height: number | null
  alt: string
  description: string
  createdAt: string
}

export function MediaLibrary() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [maxMb, setMaxMb] = useState(5)
  const [uploading, setUploading] = useState(false)
  const [alt, setAlt] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)
  const [editAlt, setEditAlt] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [filter, setFilter] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (p: number) => {
    const res = await fetch(`/api/admin/media/?page=${p}`)
    if (res.ok) {
      const json = await res.json()
      setRows(json.rows)
      setPage(json.page)
      setPages(json.pages)
      setMaxMb(json.maxUploadMb)
    }
  }, [])

  useEffect(() => { load(1) }, [load])

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('alt', alt || file.name.replace(/\.[^.]+$/, ''))
        const res = await fetch('/api/admin/media/', { method: 'POST', body: fd })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.ok) {
          toast({ title: `Ошибка загрузки: ${file.name}`, description: json.error, variant: 'destructive' })
        }
      }
      toast({ title: 'Загрузка завершена' })
      setAlt('')
      if (fileRef.current) fileRef.current.value = ''
      load(1)
    } finally {
      setUploading(false)
    }
  }

  async function saveEdit() {
    if (!editing) return
    const res = await fetch(`/api/admin/media/${editing.id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alt: editAlt, description: editDesc }),
    })
    if (res.ok) {
      toast({ title: 'Данные изображения обновлены' })
      setEditing(null)
      load(page)
    } else {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' })
    }
  }

  async function remove(row: Row) {
    const res = await fetch(`/api/admin/media/${row.id}/`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (res.ok && json.ok) {
      toast({ title: 'Файл удалён' })
      load(page)
    } else if (json.inUse) {
      if (confirm(json.error)) {
        const res2 = await fetch(`/api/admin/media/${row.id}/?force=1`, { method: 'DELETE' })
        if (res2.ok) { toast({ title: 'Файл удалён' }); load(page) }
      }
    } else {
      toast({ title: 'Не удалось удалить файл', description: json.error, variant: 'destructive' })
    }
  }

  function copyUrl(row: Row) {
    navigator.clipboard.writeText(row.url).then(
      () => toast({ title: 'Ссылка скопирована', description: row.url }),
      () => toast({ title: 'Не удалось скопировать', variant: 'destructive' })
    )
  }

  const visible = (rows || []).filter((r) =>
    filter ? (r.originalName + r.filename + r.alt).toLowerCase().includes(filter.toLowerCase()) : true
  )

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Медиатека</h1>

      {/* Загрузка */}
      <div className="space-y-3 rounded-lg border border-dashed p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="media-alt">Alt-текст нового изображения</Label>
            <Input id="media-alt" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Подробное описание изображения для доступности и SEO" maxLength={300} />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => upload(e.target.files)}
            aria-label="Выбрать изображения"
          />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="sm:mb-0">
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Загрузить изображения
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Форматы: JPG, PNG, WebP, GIF. Максимальный размер файла — {maxMb} МБ. SVG не поддерживается из соображений безопасности.
        </p>
      </div>

      {/* Фильтр */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Поиск по имени или alt-тексту" className="pl-8" aria-label="Поиск в медиатеке" />
      </div>

      {rows === null ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-square w-full" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {rows.length === 0 ? 'Медиатека пуста. Загрузите первое изображение.' : 'Ничего не найдено по фильтру.'}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6" aria-label="Изображения">
          {visible.map((row) => (
            <li key={row.id} className="group overflow-hidden rounded-lg border bg-card">
              <div className="relative aspect-square bg-muted">
                <img src={row.url} alt={row.alt || row.filename} loading="lazy" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button type="button" onClick={() => { setEditing(row); setEditAlt(row.alt); setEditDesc(row.description) }} className="rounded bg-white/90 p-1.5 hover:bg-white" aria-label={`Изменить данные: ${row.originalName}`} title="Изменить alt и описание">
                    <Pencil className="h-3.5 w-3.5 text-gray-800" />
                  </button>
                  <button type="button" onClick={() => copyUrl(row)} className="rounded bg-white/90 p-1.5 hover:bg-white" aria-label={`Скопировать ссылку: ${row.originalName}`} title="Скопировать ссылку">
                    <Copy className="h-3.5 w-3.5 text-gray-800" />
                  </button>
                  <button type="button" onClick={() => remove(row)} className="rounded bg-white/90 p-1.5 hover:bg-white" aria-label={`Удалить: ${row.originalName}`} title="Удалить">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              </div>
              <div className="space-y-0.5 p-2">
                <p className="truncate text-xs font-medium" title={row.originalName || row.filename}>{row.originalName || row.filename}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(row.size)}{row.width && row.height ? ` · ${row.width}×${row.height}` : ''} · {formatDate(row.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>Назад</Button>
          <span className="text-sm text-muted-foreground">Страница {page} из {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => load(page + 1)}>Вперёд</Button>
        </div>
      )}

      {/* Диалог редактирования alt/описания */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Данные изображения</DialogTitle>
            <DialogDescription>{editing?.originalName || editing?.filename}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <img src={editing.url} alt={editing.alt || ''} className="max-h-48 w-full rounded-md border object-contain" />
              <div className="space-y-1.5">
                <Label htmlFor="edit-alt">Alt-текст</Label>
                <Input id="edit-alt" value={editAlt} maxLength={300} onChange={(e) => setEditAlt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-desc">Описание</Label>
                <Textarea id="edit-desc" value={editDesc} rows={3} maxLength={1000} onChange={(e) => setEditDesc(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">Ссылка: <code className="rounded bg-muted px-1.5 py-0.5">{editing.url}</code></p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Отмена</Button>
            <Button onClick={saveEdit}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
