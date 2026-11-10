/**
 * Отправка уведомлений о новых обращениях по e-mail (Nodemailer).
 * Работает ТОЛЬКО если заданы переменные окружения SMTP_* — иначе письма не отправляются,
 * обращения сохраняются в базе и доступны в админ-панели (/admin/submissions).
 * Никогда не возвращает «успех», если письмо фактически не отправлено.
 *
 * Получатель (приоритет): FEEDBACK_TO_EMAIL (env) → to из настроек CMS (feedbackEmail) → SMTP_USER.
 * Пароль берётся только из SMTP_PASSWORD и никуда не логируется и не попадает в клиентский код.
 */
export function isMailerConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_FROM &&
    (process.env.FEEDBACK_TO_EMAIL || process.env.SMTP_USER)
  )
}

interface FeedbackEmail {
  /** Получатель из настроек CMS (feedbackEmail) — используется, если не задан FEEDBACK_TO_EMAIL. */
  to: string
  /** Название сайта для темы письма. */
  siteName: string
  name: string
  contact: string
  topic: string
  message: string
  pageUrl: string
}

export async function sendFeedbackEmail(data: FeedbackEmail): Promise<{ sent: boolean; error?: string }> {
  if (!isMailerConfigured()) {
    return { sent: false, error: 'SMTP не настроен (переменные SMTP_HOST, SMTP_PORT, SMTP_FROM, FEEDBACK_TO_EMAIL).' }
  }
  const recipient = process.env.FEEDBACK_TO_EMAIL || data.to || process.env.SMTP_USER || ''
  if (!recipient) {
    return { sent: false, error: 'Не указан получатель уведомлений (FEEDBACK_TO_EMAIL).' }
  }
  try {
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    })
    const siteName = data.siteName || process.env.SITE_NAME || 'Правовой маршрут'
    // UTF-8 в теме и тексте Nodemailer кодирует корректно (RFC 2047 / 8bit MIME).
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: recipient,
      replyTo: data.contact.includes('@') ? data.contact : undefined,
      subject: `Обращение с сайта «${siteName}»: ${data.topic || 'без темы'}`,
      text: [
        `Новое обращение, отправленное через форму обратной связи сайта «${siteName}».`,
        '',
        `Имя: ${data.name}`,
        `Контакт для ответа: ${data.contact}`,
        `Тема: ${data.topic || '—'}`,
        `Страница отправки: ${data.pageUrl || '—'}`,
        '',
        'Текст обращения:',
        data.message,
      ].join('\n'),
    })
    return { sent: true }
  } catch (e) {
    // В лог попадает только сообщение об ошибке SMTP (без реквизитов авторизации).
    return { sent: false, error: e instanceof Error ? e.message : 'Ошибка отправки письма' }
  }
}
