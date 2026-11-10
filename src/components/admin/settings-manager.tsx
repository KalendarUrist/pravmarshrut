'use client'

/**
 * Настройки сайта: название, логотип, главный экран, контакты, соцсети,
 * юридические документы, SEO, аналитика, подвал, основной цвет.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { MediaPickerDialog } from '@/components/admin/editor/media-picker'
import { toast } from '@/hooks/use-toast'
import { Loader2, Save, Plus, Trash2, X, ImagePlus, ExternalLink } from 'lucide-react'

const EMPTY_SETTINGS: Record<string, string> = {
  siteName: '', siteDescription: '', siteUrl: '', logoUrl: '', primaryColor: '#16324f',
  heroTitle: '', heroSubtitle: '', heroCtaText: '',
  feedbackEmail: '', contactsPhone: '', contactsEmail: '', contactsAddress: '', contactsWorktime: '',
  socials: '[]',
  aboutShort: '', aboutPageHtml: '', footerText: '',
  seoHomeTitle: '', seoHomeDescription: '',
  metrikaId: '', gaId: '', yandexVerification: '', googleVerification: '',
  privacyHtml: '', consentHtml: '', termsHtml: '',
  privacyReviewed: 'false', consentReviewed: 'false', termsReviewed: 'false',
}

const PLATFORMS = [
  { id: 'telegram', label: 'Telegram' },
  { id: 'vk', label: 'ВКонтакте' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'dzen', label: 'Дзен' },
  { id: 'ok', label: 'Одноклассники' },
  { id: 'rutube', label: 'Rutube' },
  { id: 'other', label: 'Другая платформа' },
]

const COLOR_PRESETS = ['#16324f', '#1f2937', '#0f3d3e', '#3d2b3d', '#4a3728', '#234e70']

interface SocialRow { id: string; url: string }

export function SettingsManager() {
  const router = useRouter()
  const [settings, setSettings] = useState<Record<string, string> | null>(null)
  const [saving, setSaving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [socials, setSocials] = useState<SocialRow[]>([])
  const [mailConfigured, setMailConfigured] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings/')
      .then((r) => r.json())
      .then((json) => {
        setSettings({ ...EMPTY_SETTINGS, ...json.settings })
        try {
          const parsed = JSON.parse(json.settings.socials || '[]')
          if (Array.isArray(parsed)) setSocials(parsed)
        } catch { /* пустые соцсети */ }
        setMailConfigured(json.mailConfigured)
      })
      .catch(() => toast({ title: 'Не удалось загрузить настройки', variant: 'destructive' }))
  }, [])

  if (!settings) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const set = (key: string, value: string) => setSettings((prev) => ({ ...prev!, [key]: value }))

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: { ...settings, socials: JSON.stringify(socials) } }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.ok) {
        toast({ title: 'Настройки сохранены', description: 'Изменения сразу видны на сайте.' })
        router.refresh()
      } else {
        toast({ title: 'Ошибка сохранения', description: json.error, variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-16">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Настройки сайта</h1>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Сохранить
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="general">Общие</TabsTrigger>
          <TabsTrigger value="hero">Главный экран</TabsTrigger>
          <TabsTrigger value="contacts">Контакты</TabsTrigger>
          <TabsTrigger value="socials">Соцсети</TabsTrigger>
          <TabsTrigger value="legal">Юр. документы</TabsTrigger>
          <TabsTrigger value="seo">SEO и аналитика</TabsTrigger>
        </TabsList>

        {/* Общие */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Название и описание</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-name">Название сайта</Label>
                <Input id="s-name" value={settings.siteName} maxLength={120} onChange={(e) => set('siteName', e.target.value)} />
                <p className="text-xs text-muted-foreground">Временное название «{settings.siteName}» можно заменить в любой момент.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-desc">Описание сайта (подзаголовок в подвале и description)</Label>
                <Textarea id="s-desc" value={settings.siteDescription} rows={2} maxLength={500} onChange={(e) => set('siteDescription', e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="s-url">Адрес сайта (для SEO и sitemap)</Label>
                  <Input id="s-url" value={settings.siteUrl} onChange={(e) => set('siteUrl', e.target.value)} placeholder="https://вашдомен.ru" />
                  <p className="text-xs text-muted-foreground">Заполните после подключения домена — важно для canonical и sitemap.xml.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-color">Основной цвет</Label>
                  <div className="flex items-center gap-2">
                    <Input id="s-color" value={settings.primaryColor} maxLength={7} onChange={(e) => set('primaryColor', e.target.value)} placeholder="#16324f" />
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(settings.primaryColor) ? settings.primaryColor : '#16324f'}
                      onChange={(e) => set('primaryColor', e.target.value)}
                      className="h-10 w-10 shrink-0 cursor-pointer rounded border"
                      aria-label="Выбор основного цвета"
                    />
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    {COLOR_PRESETS.map((c) => (
                      <button key={c} type="button" aria-label={`Цвет ${c}`} onClick={() => set('primaryColor', c)} className="h-6 w-6 rounded border" style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Логотип</Label>
                {settings.logoUrl ? (
                  <div className="flex items-center gap-3">
                    <img src={settings.logoUrl} alt="Логотип сайта" className="h-12 w-12 rounded border object-contain" />
                    <Button type="button" variant="outline" size="sm" onClick={() => set('logoUrl', '')}>
                      <X className="mr-2 h-4 w-4" /> Убрать
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
                    <ImagePlus className="mr-2 h-4 w-4" /> Загрузить логотип
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">Если логотип не задан — используется текстовый знак.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-footer-text">Текст в подвале (дисклеймер)</Label>
                <Textarea id="s-footer-text" value={settings.footerText} rows={2} maxLength={500} onChange={(e) => set('footerText', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">О проекте</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-about-short">Краткая справка о помощи (блок на главной)</Label>
                <Textarea id="s-about-short" value={settings.aboutShort} rows={3} maxLength={2000} onChange={(e) => set('aboutShort', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-about-html">Страница «О проекте» (HTML)</Label>
                <Textarea id="s-about-html" value={settings.aboutPageHtml} rows={6} onChange={(e) => set('aboutPageHtml', e.target.value)} className="font-mono text-xs" />
                <p className="text-xs text-muted-foreground">Разрешены: заголовки, списки, таблицы, ссылки, изображения. Оставьте пустым — покажется стандартный текст.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Главный экран */}
        <TabsContent value="hero" className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Первый экран главной страницы</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-hero-title">Заголовок</Label>
                <Input id="s-hero-title" value={settings.heroTitle} maxLength={200} onChange={(e) => set('heroTitle', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-hero-sub">Подзаголовок</Label>
                <Textarea id="s-hero-sub" value={settings.heroSubtitle} rows={3} maxLength={500} onChange={(e) => set('heroSubtitle', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-hero-cta">Текст кнопки обращения</Label>
                <Input id="s-hero-cta" value={settings.heroCtaText} maxLength={60} onChange={(e) => set('heroCtaText', e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Контакты */}
        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Контактные данные</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Пустые поля не показываются на сайте. Данные не заполняются автоматически — внесите свои.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="s-phone">Телефон</Label>
                  <Input id="s-phone" value={settings.contactsPhone} maxLength={60} onChange={(e) => set('contactsPhone', e.target.value)} placeholder="+7 ..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-email">E-mail для показа на сайте</Label>
                  <Input id="s-email" value={settings.contactsEmail} maxLength={120} onChange={(e) => set('contactsEmail', e.target.value)} placeholder="info@example.ru" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-address">Адрес</Label>
                  <Input id="s-address" value={settings.contactsAddress} maxLength={300} onChange={(e) => set('contactsAddress', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-worktime">Время работы / порядок связи</Label>
                  <Input id="s-worktime" value={settings.contactsWorktime} maxLength={200} onChange={(e) => set('contactsWorktime', e.target.value)} placeholder="Ответ на обращения в течение 1–2 рабочих дней" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-feedback-email">E-mail для получения обращений с формы</Label>
                <Input id="s-feedback-email" type="email" value={settings.feedbackEmail} maxLength={120} onChange={(e) => set('feedbackEmail', e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  {mailConfigured
                    ? 'SMTP настроен: на этот адрес будет приходить письмо о каждом обращении.'
                    : 'SMTP сейчас не настроен (переменные окружения SMTP_*). Обращения сохраняются в разделе «Обращения». После настройки SMTP сюда подставьте адрес получателя.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Соцсети */}
        <TabsContent value="socials" className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Ссылки на социальные сети</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Добавляйте только реальные ссылки — пустые или вымышленные профили сайт не показывает.</p>
              {socials.map((row, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center">
                  <Select value={row.id} onValueChange={(v) => setSocials(socials.map((s, j) => j === i ? { ...s, id: v } : s))}>
                    <SelectTrigger className="sm:w-44" aria-label="Платформа"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    value={row.url}
                    onChange={(e) => setSocials(socials.map((s, j) => j === i ? { ...s, url: e.target.value } : s))}
                    placeholder="https://t.me/..."
                    aria-label="Ссылка на профиль"
                  />
                  <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setSocials(socials.filter((_, j) => j !== i))} aria-label="Удалить ссылку">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setSocials([...socials, { id: 'telegram', url: '' }])}>
                <Plus className="mr-2 h-4 w-4" aria-hidden /> Добавить ссылку
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Юридические документы */}
        <TabsContent value="legal" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Редактируемые документы</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Сейчас на страницах показываются шаблоны с пометкой «не проверен юристом». Отредактируйте тексты под
                ваш проект и отметьте «документ проверен» — пометка на сайте сменится.
              </p>
              {([
                { key: 'privacyHtml', reviewed: 'privacyReviewed', label: 'Политика конфиденциальности', href: '/privacy/' },
                { key: 'consentHtml', reviewed: 'consentReviewed', label: 'Согласие на обработку данных', href: '/consent/' },
                { key: 'termsHtml', reviewed: 'termsReviewed', label: 'Пользовательское соглашение', href: '/terms/' },
              ] as const).map((doc) => (
                <div key={doc.key} className="space-y-2 rounded-md border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor={`doc-${doc.key}`} className="text-sm font-semibold">{doc.label}</Label>
                    <a href={doc.href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      Открыть на сайте <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </div>
                  <Textarea
                    id={`doc-${doc.key}`}
                    value={settings[doc.key]}
                    rows={8}
                    onChange={(e) => set(doc.key, e.target.value)}
                    placeholder="Оставьте пустым — используется шаблон"
                    className="font-mono text-xs"
                  />
                  <div className="flex items-center justify-between rounded-md bg-muted/60 p-3">
                    <div>
                      <Label htmlFor={`rev-${doc.key}`} className="cursor-pointer text-sm">Документ проверен</Label>
                      <p className="text-xs text-muted-foreground">Снимает предупреждение на странице</p>
                    </div>
                    <Switch
                      id={`rev-${doc.key}`}
                      checked={settings[doc.reviewed] === 'true'}
                      onCheckedChange={(v) => set(doc.reviewed, v ? 'true' : 'false')}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO и аналитика */}
        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">SEO главной страницы</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-seo-title">SEO-заголовок (title)</Label>
                <Input id="s-seo-title" value={settings.seoHomeTitle} maxLength={200} onChange={(e) => set('seoHomeTitle', e.target.value)} placeholder="Если пусто — из названия сайта" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-seo-desc">Meta description</Label>
                <Textarea id="s-seo-desc" value={settings.seoHomeDescription} rows={2} maxLength={300} onChange={(e) => set('seoHomeDescription', e.target.value)} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Аналитика и верификация</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="s-metrika">Номер счётчика Яндекс Метрики</Label>
                  <Input id="s-metrika" value={settings.metrikaId} maxLength={20} onChange={(e) => set('metrikaId', e.target.value)} placeholder="например 12345678" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-ga">Идентификатор Google Analytics</Label>
                  <Input id="s-ga" value={settings.gaId} maxLength={20} onChange={(e) => set('gaId', e.target.value)} placeholder="G-XXXXXXXXXX" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-yv">Код верификации Яндекс Вебмастера</Label>
                  <Input id="s-yv" value={settings.yandexVerification} maxLength={100} onChange={(e) => set('yandexVerification', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-gv">Код верификации Google Search Console</Label>
                  <Input id="s-gv" value={settings.googleVerification} maxLength={100} onChange={(e) => set('googleVerification', e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Скрипты подключаются к страницам сразу после сохранения. Карта сайта: /sitemap.xml, robots.txt формируется автоматически.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" className="shadow-lg">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Сохранить настройки
        </Button>
      </div>

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(m) => set('logoUrl', m.url)}
        title="Выбрать логотип"
      />
    </div>
  )
}
