import Link from 'next/link'
import { Scale, Phone, Info, ArrowRight } from 'lucide-react'
import { FeedbackDialog } from '@/components/site/feedback-dialog'

/**
 * Боковой блок «Нужна юридическая помощь?» — по макету главной страницы:
 * светлая серо-голубая заливка без рамки, текст по линии заголовка,
 * крупная синяя кнопка и контурная кнопка.
 * Кнопки рабочие: «Задать вопрос» открывает форму обратной связи,
 * «Обратиться за помощью» ведёт на страницу контактов.
 */
export function HelpCard({
  pageUrl,
  ctaText = 'Обратиться за помощью',
}: {
  pageUrl: string
  ctaText?: string
}) {
  return (
    <section aria-labelledby="help-card-title" className="rounded-2xl bg-accent p-6">
      <h2 id="help-card-title" className="flex items-center gap-3 text-[19px] font-bold leading-snug text-primary">
        <Scale className="h-[26px] w-[26px] shrink-0" strokeWidth={1.6} aria-hidden />
        Нужна юридическая помощь?
      </h2>
      <p className="mt-3.5 pl-[38px] text-[14.5px] leading-relaxed text-foreground/85">
        Опишите вашу ситуацию — мы подскажем возможные решения, порядок действий и необходимые документы.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <FeedbackDialog
          pageUrl={pageUrl}
          variant="default"
          icon="mail"
          label="Задать вопрос"
          fullWidth
          className="h-12 rounded-xl text-[15px] font-semibold"
        />
        <Link
          href="/contacts/"
          className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-primary/60 bg-transparent text-[15px] font-semibold text-primary transition-colors hover:bg-secondary"
        >
          <Phone className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
          {ctaText}
        </Link>
      </div>
    </section>
  )
}

/** Боковой блок «О проекте» с кратким описанием (текст редактируется в админ-панели). */
export function AboutCard({ text }: { text: string }) {
  return (
    <section aria-labelledby="about-card-title" className="rounded-2xl bg-secondary p-6">
      <h2 id="about-card-title" className="flex items-center gap-3 text-[19px] font-bold leading-snug text-primary">
        <Info className="h-[26px] w-[26px] shrink-0" strokeWidth={1.6} aria-hidden />
        О проекте
      </h2>
      <p className="mt-3.5 line-clamp-6 pl-[38px] text-[14.5px] leading-relaxed text-foreground/85">
        {text ||
          'Информационный проект для граждан: публикуем разъяснения законов, инструкции и практические рекомендации.'}
      </p>
      <Link
        href="/about/"
        className="mt-3.5 inline-flex items-center gap-1.5 pl-[38px] text-[14.5px] font-medium text-primary underline underline-offset-4 hover:opacity-80"
      >
        Подробнее о проекте <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  )
}
