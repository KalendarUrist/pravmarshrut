'use client'

/**
 * Форма обратной связи.
 * Защита от спама: honeypot-поле + проверка времени заполнения на сервере.
 * Сообщение об успехе показывается ТОЛЬКО при подтверждённой сервером записи.
 */
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, XCircle, ChevronDown } from 'lucide-react'
import Link from 'next/link'

const TOPICS = [
  'Семейные споры, развод, алименты',
  'Наследство',
  'Недвижимость и жильё',
  'Защита прав потребителей',
  'Кредиты, долги, банкротство',
  'Трудовые споры',
  'Судебные споры и исполнительное производство',
  'Другой вопрос',
]

interface Props {
  pageUrl?: string
  compact?: boolean
  onSent?: () => void
}

export function FeedbackForm({ pageUrl = '', compact = false, onSent }: Props) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [serverMessage, setServerMessage] = useState('')
  const [topic, setTopic] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const mountedAt = useRef(Date.now())

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const data = {
      name: String(fd.get('name') || ''),
      contact: String(fd.get('contact') || ''),
      topic: String(fd.get('topic') || ''),
      message: String(fd.get('message') || ''),
      consent: fd.get('consent') === 'on',
      company: String(fd.get('company') || ''), // honeypot
      elapsedMs: Date.now() - mountedAt.current,
      pageUrl,
    }

    // Клиентская проверка
    const errs: Record<string, string> = {}
    if (data.name.trim().length < 2) errs.name = 'Укажите имя (минимум 2 символа).'
    if (!/^(?:\+?\d[\d\s()\-]{7,}\d|[^\s@]+@[^\s@]+\.[^\s@]{2,})$/.test(data.contact.trim())) {
      errs.contact = 'Укажите корректный телефон или адрес электронной почты.'
    }
    if (data.message.trim().length < 10) errs.message = 'Опишите вопрос подробнее (минимум 10 символов).'
    if (!data.consent) errs.consent = 'Без согласия на обработку персональных данных отправить обращение нельзя.'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setStatus('sending')
    try {
      const res = await fetch('/api/feedback/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.ok) {
        setStatus('success')
        setServerMessage(String(json.message || 'Обращение отправлено.'))
        form.reset()
        setTopic('')
        onSent?.()
      } else {
        setStatus('error')
        setServerMessage(String(json.error || 'Не удалось отправить обращение. Попробуйте позже.'))
      }
    } catch {
      setStatus('error')
      setServerMessage('Сеть недоступна или произошла ошибка соединения. Попробуйте ещё раз.')
    }
  }

  if (status === 'success') {
    return (
      <Alert className="border-green-700/30 bg-green-50 text-green-900">
        <CheckCircle2 className="h-4 w-4 text-green-700" />
        <AlertDescription className="text-sm leading-relaxed">{serverMessage}</AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {/* honeypot — скрыто от людей */}
      <div className="hp-field" aria-hidden="true">
        <label>
          Компания
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className={compact ? 'space-y-4' : 'grid min-w-0 gap-4 sm:grid-cols-2'}>
        <div className="min-w-0 space-y-2">
          <Label htmlFor={`fb-name-${pageUrl.slice(-8)}`}>Имя <span className="text-destructive">*</span></Label>
          <Input id={`fb-name-${pageUrl.slice(-8)}`} name="name" placeholder="Как к вам обращаться" required maxLength={100} />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor={`fb-contact-${pageUrl.slice(-8)}`}>Телефон или e-mail <span className="text-destructive">*</span></Label>
          <Input id={`fb-contact-${pageUrl.slice(-8)}`} name="contact" placeholder="+7 ... или mail@example.com" required maxLength={120} />
          {errors.contact && <p className="text-xs text-destructive">{errors.contact}</p>}
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        <Label htmlFor={`fb-topic-${pageUrl.slice(-8)}`}>Тема обращения</Label>
        <div className="relative">
          <select
            id={`fb-topic-${pageUrl.slice(-8)}`}
            name="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm shadow-xs outline-none ring-ring/30 transition-shadow focus-visible:ring-2"
          >
            <option value="">Выберите тему или оставьте пустым</option>
            {TOPICS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        <Label htmlFor={`fb-message-${pageUrl.slice(-8)}`}>Описание вопроса <span className="text-destructive">*</span></Label>
        <Textarea
          id={`fb-message-${pageUrl.slice(-8)}`}
          name="message"
          placeholder="Кратко опишите ситуацию: что произошло, какие документы есть, что вы хотите добиться"
          rows={compact ? 4 : 5}
          required
          maxLength={4000}
        />
        {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
      </div>

      <div className="flex items-start gap-2.5">
        <Checkbox id={`fb-consent-${pageUrl.slice(-8)}`} name="consent" required className="mt-0.5" />
        {/* Один span-обёртка: Label у shadcn — flex, и без обёртки каждая ссылка
            становится flex-item без переноса строк (горизонтальный overflow на мобильных) */}
        <Label htmlFor={`fb-consent-${pageUrl.slice(-8)}`} className="text-xs font-normal leading-relaxed text-muted-foreground">
          <span className="block">
            Я даю{' '}
            <Link href="/consent/" target="_blank" className="underline hover:text-primary">
              согласие на обработку персональных данных
            </Link>{' '}
            и ознакомлен(а) с{' '}
            <Link href="/privacy/" target="_blank" className="underline hover:text-primary">
              политикой конфиденциальности
            </Link>
            . <span className="text-destructive">*</span>
          </span>
        </Label>
      </div>
      {errors.consent && <p className="text-xs text-destructive">{errors.consent}</p>}

      {status === 'error' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{serverMessage}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={status === 'sending'} className="w-full sm:w-auto">
        {status === 'sending' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Отправить обращение
      </Button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Ответ будет направлен на указанный вами контакт. Обращение не заменяет заключение договора об оказании юридических услуг.
      </p>
    </form>
  )
}
