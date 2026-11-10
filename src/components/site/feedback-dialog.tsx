'use client'

/**
 * Кнопка «Задать вопрос», открывающая форму обратной связи.
 * Реализована на нативном <dialog>: без генерации id на клиенте
 * (исключает гидрационные ошибки React 19), легче по весу.
 */
import { useRef } from 'react'
import { twMerge } from 'tailwind-merge'
import { FeedbackForm } from '@/components/site/feedback-form'
import { MessageCircleQuestion, Mail, X } from 'lucide-react'

interface Props {
  pageUrl: string
  variant?: 'default' | 'outline' | 'ghost'
  label?: string
  className?: string
  icon?: 'question' | 'mail'
  /** Растянуть кнопку на всю ширину (для боковых блоков). */
  fullWidth?: boolean
}

export function FeedbackDialog({ pageUrl, variant = 'outline', label = 'Задать вопрос', className = '', icon = 'question', fullWidth = false }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const Icon = icon === 'mail' ? Mail : MessageCircleQuestion

  const open = () => dialogRef.current?.showModal()
  const close = () => dialogRef.current?.close()

  /** Клик по подложке (вне содержимого) закрывает окно. */
  function onDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) close()
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className={twMerge(
          `inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${
            variant === 'outline'
              ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4'
              : variant === 'ghost'
                ? 'hover:bg-accent h-10 px-4'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4'
          } ${fullWidth ? 'w-full' : ''}`,
          className,
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
        {label}
      </button>

      <dialog
        ref={dialogRef}
        onClick={onDialogClick}
        aria-label="Форма обращения"
        className="site-modal m-auto w-[calc(100vw-2rem)] max-w-lg rounded-xl border bg-background p-0 text-foreground shadow-xl backdrop:bg-black/50"
      >
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold leading-tight">Задать вопрос</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Опишите ситуацию — ответ придёт на указанный вами телефон или e-mail.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Закрыть окно"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <FeedbackForm pageUrl={pageUrl} compact onSent={close} />
        </div>
      </dialog>
    </>
  )
}
