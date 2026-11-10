'use client'

/** Управление категориями: создание, изменение, порядок, признак «подборка», SEO-поля. */
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { slugify } from '@/lib/slug'
import { MediaPickerDialog } from '@/components/admin/editor/media-picker'
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2, Star, ImagePlus, X } from 'lucide-react'

interface Row {
  id: string
  slug: string
  title: string
  description: string
  seoTitle: string
  metaDescription: string
  imageMediaId: string | null
  imageMedia: { id: string; filename: string; alt: string } | null
  sortOrder: number
  featured: boolean
  parentId: string | null
  parent: { id: string; title: string } | null
  _count: { articles: number }
}

const EMPTY = {
  id: '', title: '', slug: '', description: '', seoTitle: '', metaDescription: '',
  imageMediaId: '' as string,
  sortOrder: 0, featured: false, parentId: '' as string,
}

export function CategoriesManager() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickedImage, setPickedImage] = useState<{ id: string; url: string; alt: string } | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/categories/')
    if (res.ok) setRows((await res.json()).rows)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    const maxOrder = Math.max(0, ...(rows || []).map((r) => r.sortOrder))
    setForm({ ...EMPTY, sortOrder: maxOrder + 1 })
    setPickedImage(null)
    setSlugTouched(false)
    setDialogOpen(true)
  }

  function openEdit(row: Row) {
    setForm({
      id: row.id, title: row.title, slug: row.slug, description: row.description,
      seoTitle: row.seoTitle, metaDescription: row.metaDescription,
      imageMediaId: row.imageMediaId || '',
      sortOrder: row.sortOrder, featured: row.featured, parentId: row.parentId || '',
    })
    setPickedImage(
      row.imageMedia
        ? { id: row.imageMedia.id, url: `/media/${row.imageMedia.id}/${row.imageMedia.filename}`, alt: row.imageMedia.alt }
        : null
    )
    setSlugTouched(true)
    setDialogOpen(true)
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(form.id ? `/api/admin/categories/${form.id}/` : '/api/admin/categories/', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, parentId: form.parentId || null, imageMediaId: pickedImage?.id || null }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.ok) {
        toast({ title: form.id ? 'Категория обновлена' : 'Категория создана' })
        setDialogOpen(false)
        load()
      } else {
        toast({ title: 'Ошибка', description: json.error, variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function remove(row: Row) {
    const res = await fetch(`/api/admin/categories/${row.id}/`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (res.ok && json.ok) {
      toast({ title: 'Категория удалена' })
      load()
    } else {
      toast({ title: 'Ошибка', description: json.error, variant: 'destructive' })
    }
  }

  async function move(row: Row, dir: -1 | 1) {
    if (!rows) return
    const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = sorted.findIndex((r) => r.id === row.id)
    const target = sorted[idx + dir]
    if (!target) return
    // Меняем sortOrder местами
    await Promise.all([
      fetch(`/api/admin/categories/${row.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...row, parentId: row.parentId, sortOrder: target.sortOrder }),
      }),
      fetch(`/api/admin/categories/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, parentId: target.parentId, sortOrder: row.sortOrder }),
      }),
    ])
    load()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Категории</h1>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" aria-hidden /> Создать категорию</Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Порядок отображения влияет на меню и главную страницу. Отметка «Тематическая подборка» выводит раздел в блок подборок.
      </p>

      {rows === null ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card custom-scrollbar">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Название</th>
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">Статей</th>
                <th className="px-4 py-3 font-medium">Подборка</th>
                <th className="px-4 py-3 font-medium text-right">Порядок и действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...rows].sort((a, b) => a.sortOrder - b.sortOrder).map((row) => (
                <tr key={row.id} className="hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.title}{row.parent && <span className="ml-2 text-xs text-muted-foreground">↳ вложена в «{row.parent.title}»</span>}</p>
                    {row.description && <p className="line-clamp-1 text-xs text-muted-foreground">{row.description}</p>}
                  </td>
                  <td className="px-4 py-3"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">/{row.slug}/</code></td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{row._count.articles}</td>
                  <td className="px-4 py-3">{row.featured && <Star className="h-4 w-4 text-gold" aria-label="Тематическая подборка" />}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button type="button" variant="ghost" size="sm" aria-label={`Переместить ${row.title} выше`} onClick={() => move(row, -1)}><ArrowUp className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="sm" aria-label={`Переместить ${row.title} ниже`} onClick={() => move(row, 1)}><ArrowDown className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="sm" aria-label={`Редактировать ${row.title}`} onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" aria-label={`Удалить ${row.title}`}><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
                            <AlertDialogDescription>
                              «{row.title}» будет удалена. Удаление доступно только для пустых разделов.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(row)}>Удалить</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Диалог создания/редактирования */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto custom-scrollbar sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Редактирование категории' : 'Новая категория'}</DialogTitle>
            <DialogDescription>URL, SEO-поля и описание используются на странице раздела.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-title">Название *</Label>
              <Input id="c-title" value={form.title} maxLength={120} onChange={(e) => {
                setForm({ ...form, title: e.target.value })
                if (!slugTouched) setForm((f) => ({ ...f, title: e.target.value, slug: slugify(e.target.value) }))
              }} placeholder="Например: Наследство" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-slug">URL (латиницей) *</Label>
              <Input id="c-slug" value={form.slug} maxLength={100} onChange={(e) => {
                setSlugTouched(true)
                setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') })
              }} placeholder="inheritance" />
              <p className="text-xs text-muted-foreground">При изменении URL опубликованного раздела 301-редирект создаётся автоматически.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-desc">Описание раздела</Label>
              <Textarea id="c-desc" value={form.description} rows={2} maxLength={1000} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Что читатель найдёт в этом разделе" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-image">Изображение категории</Label>
              {pickedImage ? (
                <div className="flex items-start gap-3 rounded-md border p-3">
                  <img src={pickedImage.url} alt={pickedImage.alt || 'Изображение категории'} className="h-20 w-32 shrink-0 rounded object-cover" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="line-clamp-2 text-xs text-muted-foreground">{pickedImage.alt || 'Без alt-описания'}</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                        <ImagePlus className="mr-2 h-4 w-4" aria-hidden /> Заменить
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setPickedImage(null)}
                      >
                        <X className="mr-2 h-4 w-4" aria-hidden /> Убрать
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full" onClick={() => setPickerOpen(true)}>
                  <ImagePlus className="mr-2 h-4 w-4" aria-hidden /> Выбрать из медиатеки
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Показывается в карточке раздела в каталоге «Юридические вопросы» и в Open Graph. Без изображения карточка выглядит как обычно — с иконкой.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c-seo">SEO-заголовок</Label>
                <Input id="c-seo" value={form.seoTitle} maxLength={200} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-parent">Родительская категория</Label>
                <Select value={form.parentId || 'none'} onValueChange={(v) => setForm({ ...form, parentId: v === 'none' ? '' : v })}>
                  <SelectTrigger id="c-parent"><SelectValue placeholder="Нет" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Нет (раздел верхнего уровня)</SelectItem>
                    {(rows || []).filter((r) => r.id !== form.id).map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-meta">Meta description</Label>
              <Textarea id="c-meta" value={form.metaDescription} rows={2} maxLength={300} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-order">Порядок отображения</Label>
                <Input id="c-order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </div>
              <div className="flex items-end justify-between rounded-md border p-3">
                <div>
                  <Label htmlFor="c-featured" className="cursor-pointer">Тематическая подборка</Label>
                  <p className="text-xs text-muted-foreground">Блок на главной</p>
                </div>
                <Switch id="c-featured" checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button type="button" onClick={save} disabled={saving || form.title.trim().length < 2 || !form.slug}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Выбор изображения категории из медиатеки */}
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(m) => setPickedImage({ id: m.id, url: m.url, alt: m.alt })}
        title="Выбрать изображение категории"
      />
    </div>
  )
}
