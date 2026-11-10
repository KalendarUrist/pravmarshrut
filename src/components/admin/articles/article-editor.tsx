'use client'

/**
 * Редактор статьи: контент, категория, теги, обложка, видео, автор,
 * даты публикации и проверки, SEO-поля, связанные статьи, тестовая пометка.
 * Статусы: черновик / опубликовано. Снятие с публикации — одной кнопкой.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RichEditor } from '@/components/admin/editor/rich-editor'
import { MediaPickerDialog } from '@/components/admin/editor/media-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'
import { slugify } from '@/lib/slug'
import { Loader2, Save, Send, Eye, Trash2, ImagePlus, X, Undo2, Link as LinkIcon } from 'lucide-react'

interface Category { id: string; title: string; slug: string }

interface RelatedItem { id: string; title: string; slug: string; categoryTitle: string }

export interface ArticleData {
  id?: string
  title: string
  slug: string
  excerpt: string
  contentHtml: string
  categoryId: string
  tags: string
  coverMediaId: string | null
  coverUrl: string
  videoUrl: string
  authorName: string
  legalBasis: string
  courtPractice: string
  deadlines: string
  documents: string
  seoTitle: string
  metaDescription: string
  status: 'DRAFT' | 'PUBLISHED'
  publishedAt: string
  checkedAt: string
  isTest: boolean
  related: RelatedItem[]
}

export const EMPTY_ARTICLE: ArticleData = {
  title: '', slug: '', excerpt: '', contentHtml: '', categoryId: '', tags: '',
  coverMediaId: null, coverUrl: '', videoUrl: '', authorName: '', legalBasis: '',
  courtPractice: '', deadlines: '', documents: '',
  seoTitle: '', metaDescription: '', status: 'DRAFT', publishedAt: '', checkedAt: '',
  isTest: false, related: [],
}

export function ArticleEditor({ initial }: { initial: ArticleData }) {
  const router = useRouter()
  const isNew = !initial.id
  const [article, setArticle] = useState<ArticleData>(initial)
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState<'idle' | 'draft' | 'publish'>('idle')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [relatedSearch, setRelatedSearch] = useState('')
  const [relatedResults, setRelatedResults] = useState<RelatedItem[]>([])
  const [slugTouched, setSlugTouched] = useState(!isNew)

  const set = useCallback(<K extends keyof ArticleData>(key: K, value: ArticleData[K]) => {
    setArticle((prev) => ({ ...prev, [key]: value }))
  }, [])

  useEffect(() => {
    fetch('/api/admin/categories/')
      .then((r) => r.json())
      .then((json) => setCategories(json.rows || []))
      .catch(() => toast({ title: 'Не удалось загрузить категории', variant: 'destructive' }))
  }, [])

  // Поиск статей для блока «Связанные материалы»
  useEffect(() => {
    if (!relatedSearch.trim()) {
      setRelatedResults([])
      return
    }
    const timer = setTimeout(() => {
      fetch(`/api/admin/articles/?q=${encodeURIComponent(relatedSearch.trim())}`)
        .then((r) => r.json())
        .then((json) => {
          setRelatedResults(
            (json.rows || [])
              .filter((r: { id: string }) => r.id !== initial.id && !article.related.some((rel) => rel.id === r.id))
              .map((r: { id: string; title: string; slug: string; category: { title: string } }) => ({
                id: r.id, title: r.title, slug: r.slug, categoryTitle: r.category.title,
              }))
          )
        })
        .catch(() => {})
    }, 300)
    return () => clearTimeout(timer)
  }, [relatedSearch, initial.id, article.related])

  const slugPreview = useMemo(() => (article.slug ? `/${categories.find((c) => c.id === article.categoryId)?.slug || '…'}/${article.slug}/` : ''), [article.slug, article.categoryId, categories])

  async function save(status: 'DRAFT' | 'PUBLISHED'): Promise<void> {
    if (article.title.trim().length < 3) {
      toast({ title: 'Введите заголовок (минимум 3 символа)', variant: 'destructive' })
      return
    }
    if (!article.categoryId) {
      toast({ title: 'Выберите категорию', variant: 'destructive' })
      return
    }
    setSaving(status === 'DRAFT' ? 'draft' : 'publish')
    try {
      const payload = {
        ...article,
        status,
        publishedAt: article.publishedAt || null,
        checkedAt: article.checkedAt || null,
        relatedIds: article.related.map((r) => r.id),
      }
      const res = await fetch(isNew ? '/api/admin/articles/' : `/api/admin/articles/${initial.id}/`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.ok) {
        toast({
          title: status === 'PUBLISHED' ? 'Статья опубликована' : 'Черновик сохранён',
          description: `Адрес: /${json.article.slug}`,
        })
        const id = json.article?.id || initial.id
        setArticle((prev) => ({
          ...prev,
          id,
          status,
          slug: json.article.slug,
          publishedAt: json.article.publishedAt || prev.publishedAt,
        }))
        if (isNew && id) {
          router.replace(`/admin/articles/${id}`)
        } else {
          router.refresh()
        }
      } else {
        toast({ title: 'Ошибка сохранения', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Сеть недоступна. Изменения не сохранены.', variant: 'destructive' })
    } finally {
      setSaving('idle')
    }
  }

  async function unpublish() {
    await save('DRAFT')
  }

  async function remove() {
    if (!initial.id) return
    const res = await fetch(`/api/admin/articles/${initial.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Статья удалена' })
      router.push('/admin/articles')
    } else {
      toast({ title: 'Не удалось удалить статью', variant: 'destructive' })
    }
  }

  const publishedNow = article.status === 'PUBLISHED'

  return (
    <div className="space-y-6">
      {/* Панель действий */}
      <div className="sticky top-16 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button type="button" variant="outline" onClick={() => save('DRAFT')} disabled={saving !== 'idle'}>
          {saving === 'draft' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Сохранить черновик
        </Button>
        {publishedNow ? (
          <>
            <Button type="button" onClick={() => save('PUBLISHED')} disabled={saving !== 'idle'}>
              {saving === 'publish' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Сохранить изменения
            </Button>
            <Button type="button" variant="secondary" onClick={unpublish} disabled={saving !== 'idle'}>
              <Undo2 className="mr-2 h-4 w-4" /> Снять с публикации
            </Button>
          </>
        ) : (
          <Button type="button" onClick={() => save('PUBLISHED')} disabled={saving !== 'idle'}>
            {saving === 'publish' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Опубликовать
          </Button>
        )}
        {publishedNow && article.slug && (
          <Link
            href={`/${categories.find((c) => c.id === article.categoryId)?.slug || ''}/${article.slug}/`}
            target="_blank"
            className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
          >
            <Eye className="mr-2 h-4 w-4" /> Открыть на сайте
          </Link>
        )}
        <div className="ml-auto flex items-center gap-2">
          {!isNew && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Удалить</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить статью?</AlertDialogTitle>
                  <AlertDialogDescription>
                    «{article.title}» будет удалена безвозвратно. Рекомендуем сначала снять её с публикации.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={remove}>Удалить</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${publishedNow ? 'bg-green-100 text-green-800' : 'bg-secondary text-muted-foreground'}`}>
            {publishedNow ? 'Опубликована' : 'Черновик'}
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Основная колонка */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Заголовок и адрес</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="a-title">Заголовок (H1) *</Label>
                <Input
                  id="a-title"
                  value={article.title}
                  maxLength={200}
                  onChange={(e) => set('title', e.target.value)}
                  onBlur={() => {
                    if (!slugTouched && article.title) set('slug', slugify(article.title))
                  }}
                  placeholder="Например: Как взыскать алименты: пошаговая инструкция"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-slug">URL статьи (латиницей)</Label>
                <div className="flex gap-2">
                  <Input
                    id="a-slug"
                    value={article.slug}
                    maxLength={100}
                    onChange={(e) => {
                      setSlugTouched(true)
                      set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))
                    }}
                    placeholder="kak-vzyskat-alimenty"
                  />
                  <Button type="button" variant="outline" size="sm" className="h-10 shrink-0" onClick={() => { setSlugTouched(true); set('slug', slugify(article.title)) }}>
                    Сгенерировать
                  </Button>
                </div>
                {slugPreview && <p className="text-xs text-muted-foreground">Адрес на сайте: <code className="rounded bg-muted px-1.5 py-0.5">{slugPreview}</code></p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-excerpt">Краткое вступление (лид)</Label>
                <Textarea id="a-excerpt" value={article.excerpt} maxLength={600} rows={3} onChange={(e) => set('excerpt', e.target.value)} placeholder="1–2 предложения о чём материал — показывается в списках и в описании страницы" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-1.5">
            <Label>Текст материала</Label>
            <RichEditor value={article.contentHtml} onChange={(html) => set('contentHtml', html)} />
            <p className="text-xs text-muted-foreground">
              Оглавление статьи формируется автоматически из заголовков H2 и H3. Вставка из Word сохраняет списки и таблицы.
            </p>
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">SEO</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="a-seo-title">SEO-заголовок (title) — {article.seoTitle.length}/200</Label>
                <Input id="a-seo-title" value={article.seoTitle} maxLength={200} onChange={(e) => set('seoTitle', e.target.value)} placeholder="Если пусто — используется заголовок статьи" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-meta-desc">Meta description — {article.metaDescription.length}/300</Label>
                <Textarea id="a-meta-desc" value={article.metaDescription} maxLength={300} rows={2} onChange={(e) => set('metaDescription', e.target.value)} placeholder="Если пусто — используется краткое вступление" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Боковая колонка */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Публикация</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Категория *</Label>
                <Select value={article.categoryId || undefined} onValueChange={(v) => set('categoryId', v)}>
                  <SelectTrigger aria-label="Категория"><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-published">Дата публикации</Label>
                <Input id="a-published" type="datetime-local" value={article.publishedAt} onChange={(e) => set('publishedAt', e.target.value)} />
                <p className="text-xs text-muted-foreground">Оставьте пустой — проставится автоматически при публикации.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-checked">Дата последней проверки материала</Label>
                <Input id="a-checked" type="date" value={article.checkedAt} onChange={(e) => set('checkedAt', e.target.value)} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label htmlFor="a-test" className="cursor-pointer">Тестовая публикация</Label>
                  <p className="text-xs text-muted-foreground">Показывает предупреждение на сайте</p>
                </div>
                <Switch id="a-test" checked={article.isTest} onCheckedChange={(v) => set('isTest', v)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Обложка и видео</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Изображение статьи</Label>
                {article.coverUrl ? (
                  <div className="relative overflow-hidden rounded-md border">
                    <img src={article.coverUrl} alt="Обложка статьи" className="aspect-[16/9] w-full object-cover" />
                    <button
                      type="button"
                      aria-label="Убрать обложку"
                      className="absolute right-2 top-2 rounded-md bg-background/90 p-1.5 hover:bg-background"
                      onClick={() => { set('coverUrl', ''); set('coverMediaId', null) }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground hover:bg-accent"
                  >
                    <ImagePlus className="h-6 w-6" aria-hidden /> Выбрать из медиатеки
                  </button>
                )}
                {article.coverUrl && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>Заменить</Button>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-video">Ссылка на видео (YouTube, RuTube, VK, Дзен)</Label>
                <Input id="a-video" value={article.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Автор и нормативная база</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="a-author">Автор материала</Label>
                <Input id="a-author" value={article.authorName} maxLength={120} onChange={(e) => set('authorName', e.target.value)} placeholder="Например: Редакция проекта" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-legal">Нормативные акты</Label>
                <Textarea id="a-legal" value={article.legalBasis} maxLength={500} rows={2} onChange={(e) => set('legalBasis', e.target.value)} placeholder="Семейный кодекс РФ, глава 13" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-court">Связанные судебные материалы / практика</Label>
                <Textarea id="a-court" value={article.courtPractice} maxLength={500} rows={2} onChange={(e) => set('courtPractice', e.target.value)} placeholder="Например: обзор практики ВС РФ по данным спорам, типичные решения" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-deadlines">Ключевые сроки</Label>
                <Textarea id="a-deadlines" value={article.deadlines} maxLength={800} rows={2} onChange={(e) => set('deadlines', e.target.value)} placeholder="Например: срок исковой давности — 3 года; ответ на претензию — 10 дней" />
                <p className="text-xs text-muted-foreground">Каждый срок — с новой строки. Блок показывается на сайте, только если заполнен.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-documents">Список документов</Label>
                <Textarea id="a-documents" value={article.documents} maxLength={1000} rows={3} onChange={(e) => set('documents', e.target.value)} placeholder="Например: исковое заявление; квитанция об уплате госпошлины; свидетельство о рождении ребёнка" />
                <p className="text-xs text-muted-foreground">Каждый документ — с новой строки. Блок показывается на сайте, только если заполнен.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-tags">Теги (через запятую)</Label>
                <Input id="a-tags" value={article.tags} onChange={(e) => set('tags', e.target.value)} placeholder="алименты, дети, суд" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Связанные статьи («Читайте также»)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {article.related.length > 0 && (
                <ul className="space-y-2">
                  {article.related.map((r) => (
                    <li key={r.id} className="flex items-start justify-between gap-2 rounded-md border p-2.5 text-sm">
                      <div>
                        <p className="font-medium leading-snug">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.categoryTitle}</p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Убрать связь со статьёй ${r.title}`}
                        onClick={() => set('related', article.related.filter((x) => x.id !== r.id))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="a-related-search">Найти статью</Label>
                <Input id="a-related-search" value={relatedSearch} onChange={(e) => setRelatedSearch(e.target.value)} placeholder="Начните вводить заголовок…" />
              </div>
              {relatedResults.length > 0 && (
                <ul className="max-h-56 space-y-1 overflow-y-auto custom-scrollbar rounded-md border p-1.5">
                  {relatedResults.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          set('related', [...article.related, r])
                          setRelatedResults([])
                          setRelatedSearch('')
                        }}
                      >
                        <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="line-clamp-2">{r.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">Если связи не выбраны, автоматически показываются свежие материалы той же категории.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(m) => { set('coverUrl', m.url); set('coverMediaId', m.id) }}
        title="Выбрать обложку статьи"
      />
    </div>
  )
}
