'use client'

/**
 * Медиатека в диалоговом окне: выбор готового изображения или загрузка нового.
 * Используется в редакторе статей и для выбора обложки.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, Trash2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export interface PickedMedia {
  id: string
  url: string
  alt: string
  filename: string
}

interface MediaRow {
  id: string
  url: string
  filename: string
  originalName: string
  alt: string
  mime: string
  size: number
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onPick,
  title = 'Медиатека',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (media: PickedMedia) => void
  title?: string
}) {
  const [rows, setRows] = useState<MediaRow[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [alt, setAlt] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/media/?page=${p}`)
      if (res.ok) {
        const json = await res.json()
        setRows(json.rows || [])
        setPage(json.page || 1)
        setPages(json.pages || 1)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) load(1)
  }, [open, load])

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
          toast({ title: 'Ошибка загрузки', description: json.error || 'Не удалось загрузить файл.', variant: 'destructive' })
        } else {
          toast({ title: 'Изображение загружено', description: json.media.originalName || json.media.filename })
        }
      }
      await load(1)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto custom-scrollbar sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Выберите изображение из медиатеки или загрузите новое (JPG, PNG, WebP, GIF).</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-col gap-2 rounded-md border border-dashed p-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="mp-alt">Alt-текст для нового файла (описание для доступности и SEO)</Label>
              <Input id="mp-alt" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Например: документы для обращения в суд" maxLength={300} />
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => upload(e.target.files)}
              aria-label="Выбрать файлы для загрузки"
            />
            <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Загрузить файлы
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Медиатека пуста — загрузите первое изображение.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Изображения в медиатеке">
              {rows.map((m) => (
                <li key={m.id} className="group relative overflow-hidden rounded-md border">
                  <button
                    type="button"
                    className="block w-full"
                    onClick={() => {
                      onPick({ id: m.id, url: m.url, alt: m.alt, filename: m.filename })
                      onOpenChange(false)
                    }}
                    title={`Выбрать: ${m.originalName || m.filename}`}
                  >
                    <img src={m.url} alt={m.alt || m.filename} className="aspect-square w-full object-cover" loading="lazy" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Удалить файл ${m.originalName || m.filename}`}
                    title="Удалить файл"
                    className="absolute right-1.5 top-1.5 hidden rounded-md bg-destructive p-1.5 text-white group-hover:block"
                    onClick={async () => {
                      if (!confirm('Удалить файл из медиатеки? Если он используется в статьях, изображения там перестанут отображаться.')) return
                      const res = await fetch(`/api/admin/media/${m.id}/`, { method: 'DELETE' })
                      const json = await res.json().catch(() => ({}))
                      if (res.ok && json.ok) {
                        toast({ title: 'Файл удалён' })
                        load(page)
                      } else if (json.inUse) {
                        if (confirm(json.error)) {
                          await fetch(`/api/admin/media/${m.id}/?force=1`, { method: 'DELETE' })
                          toast({ title: 'Файл удалён' })
                          load(page)
                        }
                      } else {
                        toast({ title: 'Ошибка', description: json.error, variant: 'destructive' })
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <p className="truncate px-2 py-1 text-[11px] text-muted-foreground">{m.originalName || m.filename}</p>
                </li>
              ))}
            </ul>
          )}

          {pages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>Назад</Button>
              <span className="flex items-center text-sm text-muted-foreground">{page} из {pages}</span>
              <Button type="button" variant="outline" size="sm" disabled={page >= pages} onClick={() => load(page + 1)}>Вперёд</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
