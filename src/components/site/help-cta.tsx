import Link from 'next/link'
import { FeedbackDialog } from '@/components/site/feedback-dialog'
import { Scale } from 'lucide-react'

/**
 * Блок с призывом обратиться за юридической помощью (внутри статей и на главной).
 * Показывает кнопку на страницу контактов и форму обращения.
 */
export function HelpCta({
  ctaText = 'Обратиться за помощью',
  pageUrl = '',
}: {
  ctaText?: string
  pageUrl?: string
}) {
  return (
    <section className="no-print my-10 overflow-hidden rounded-2xl bg-accent" aria-label="Юридическая помощь">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="max-w-2xl space-y-2">
          <h2 className="flex items-center gap-3 text-xl font-bold tracking-tight text-primary">
            <Scale className="h-6 w-6 shrink-0 text-primary" strokeWidth={1.6} aria-hidden />
            Нужна помощь с вашей ситуацией?
          </h2>
          <p className="pl-9 text-[15px] leading-relaxed text-foreground/85">
            Материалы сайта носят общий характер. Если ситуация нестандартная — опишите её: вы получите ответ на
            указанный контакт, а при необходимости обсудим дальнейшие шаги.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2.5 sm:items-end">
          <Link
            href="/contacts/"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {ctaText}
          </Link>
          <FeedbackDialog
            pageUrl={pageUrl}
            variant="ghost"
            label="Задать вопрос"
            className="text-[15px] font-semibold text-primary"
          />
        </div>
      </div>
    </section>
  )
}
