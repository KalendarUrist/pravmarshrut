import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { clientIp } from '@/lib/auth'
import { sendFeedbackEmail, isMailerConfigured } from '@/lib/mailer'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'

/**
 * Публичный приём обращений с сайта.
 * Защита: серверная валидация, honeypot, проверка времени заполнения,
 * ограничение частоты по IP. Обращение сохраняется в БД всегда; письмо
 * отправляется только если SMTP настроен — в ответе сообщается фактический статус.
 */
export async function POST(req: Request) {
  const ip = clientIp(req)
  const userAgent = (req.headers.get('user-agent') || '').slice(0, 300)

  // 1. Чтение и базовая валидация
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Некорректный формат запроса.' }, { status: 400 })
  }

  const name = String(body.name || '').trim()
  const contact = String(body.contact || '').trim()
  const topic = String(body.topic || '').trim().slice(0, 200)
  const message = String(body.message || '').trim()
  const consent = body.consent === true || body.consent === 'on'
  const company = String(body.company || '')
  const elapsedMs = Number(body.elapsedMs || 0)
  const pageUrl = String(body.pageUrl || '').slice(0, 500)

  const errors: string[] = []
  if (name.length < 2 || name.length > 100) errors.push('Укажите имя (2–100 символов).')
  const contactOk = /^\+?\d[\d\s()\-]{7,}\d$/.test(contact) || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact)
  if (!contactOk || contact.length > 120) errors.push('Укажите корректный телефон или e-mail.')
  if (message.length < 10 || message.length > 4000) errors.push('Опишите вопрос подробнее (10–4000 символов).')
  if (!consent) errors.push('Требуется согласие на обработку персональных данных.')
  if (errors.length > 0) {
    return NextResponse.json({ ok: false, error: errors.join(' ') }, { status: 422 })
  }

  // 2. Анти-спам: honeypot и время заполнения
  if (company) {
    // заполнено скрытое поле — вероятный бот; отвечаем как при успехе, но ничего не сохраняем
    return NextResponse.json({ ok: true, message: 'Обращение отправлено.' })
  }
  if (elapsedMs > 0 && elapsedMs < 3000) {
    return NextResponse.json(
      { ok: false, error: 'Форма заполнена слишком быстро. Проверьте данные и отправьте ещё раз.' },
      { status: 422 }
    )
  }

  // 3. Ограничение частоты по IP: не более 5 обращений в час
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recent = await db.submission.count({ where: { ip, createdAt: { gte: hourAgo } } })
  if (recent >= 5) {
    return NextResponse.json(
      { ok: false, error: 'Слишком много обращений с одного адреса за последний час. Попробуйте позже.' },
      { status: 429 }
    )
  }

  // 4. Сохранение в базу (всегда — независимо от настройки почты)
  const submission = await db.submission.create({
    data: { name, contact, topic, message, pageUrl, ip, userAgent },
  })

  // 5. Отправка уведомления на e-mail (если SMTP настроен). Сохранение выше — независимо от результата.
  const settings = await getSettings()
  const mailConfigured = isMailerConfigured()
  let emailSent = false
  if (mailConfigured) {
    const result = await sendFeedbackEmail({
      to: settings.feedbackEmail,
      siteName: settings.siteName,
      name,
      contact,
      topic,
      message,
      pageUrl,
    })
    if (result.sent) {
      emailSent = true
      await db.submission.update({ where: { id: submission.id }, data: { emailSent: true } })
    } else {
      // Причина без секретов — только текст ошибки SMTP для журнала сервера.
      console.error('[feedback] Письмо не отправлено:', result.error)
    }
  }

  // 6. Честное сообщение о статусе: обращение сохранено; статус уведомления — как есть
  return NextResponse.json({
    ok: true,
    emailSent,
    message: emailSent
      ? 'Обращение принято и отправлено редактору. Ответ будет направлен на указанный вами контакт.'
      : mailConfigured
        ? 'Обращение принято и сохранено в панели управления сайтом. Автоматическое уведомление на e-mail сейчас недоступно — администратор увидит обращение в разделе «Обращения».'
        : 'Обращение принято и сохранено в панели управления сайтом. Уведомления на e-mail сейчас не подключены — администратор увидит его в разделе «Обращения».',
    id: submission.id,
  })
}
