import type { Metadata } from 'next'
import { getSettings, parseSocials } from '@/lib/settings'
import { getBaseUrl } from '@/lib/server-url'
import { FeedbackForm } from '@/components/site/feedback-form'
import { SocialIcons } from '@/components/site/social-icons'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { MapPin, Clock, Phone } from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl()
  return {
    title: 'Контакты',
    description: 'Форма обратной связи и порядок обращения за юридической помощью.',
    alternates: { canonical: `${baseUrl}/contacts/` },
    openGraph: { title: 'Контакты', url: `${baseUrl}/contacts/`, type: 'website', locale: 'ru_RU' },
  }
}

export default async function ContactsPage() {
  const settings = await getSettings()
  const socials = parseSocials(settings.socials)
  const hasContacts = Boolean(settings.contactsPhone || settings.contactsAddress || settings.contactsWorktime)

  return (
    <div className="container-site py-6">
      <Breadcrumbs items={[{ title: 'Контакты' }]} />

      <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight text-primary">Контакты и обращение за помощью</h1>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Заполните форму — опишите ситуацию и укажите контакт для ответа. Обращения обрабатываются в порядке
        поступления.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* Форма обратной связи */}
        <section aria-labelledby="feedback-form-title" className="min-w-0 rounded-lg border bg-card p-6">
          <h2 id="feedback-form-title" className="mb-5 text-xl font-semibold">Форма обратной связи</h2>
          <FeedbackForm pageUrl="/contacts/" />
        </section>

        <div className="space-y-6">
          {/* Контактные данные (заполняются в админ-панели) */}
          <section aria-labelledby="contacts-data-title" className="rounded-lg border p-6">
            <h2 id="contacts-data-title" className="mb-4 text-lg font-semibold">Контактные данные</h2>
            {hasContacts ? (
              <ul className="space-y-3 text-sm">
                {settings.contactsPhone && (
                  <li className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <a href={`tel:${settings.contactsPhone.replace(/[^\d+]/g, '')}`} className="hover:text-primary">
                      {settings.contactsPhone}
                    </a>
                  </li>
                )}
                {settings.contactsAddress && (
                  <li className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span>{settings.contactsAddress}</span>
                  </li>
                )}
                {settings.contactsWorktime && (
                  <li className="flex items-start gap-2.5">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span>{settings.contactsWorktime}</span>
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Контактные данные пока не опубликованы. Используйте форму обращения — она работает независимо от
                заполнения этого блока.
              </p>
            )}
            {socials.length > 0 && (
              <div className="mt-5 border-t pt-4">
                <p className="mb-2 text-sm font-medium">Социальные сети</p>
                <SocialIcons links={socials} />
              </div>
            )}
          </section>

          {/* Порядок обращения */}
          <section aria-labelledby="order-title" className="rounded-lg border bg-secondary/50 p-6">
            <h2 id="order-title" className="mb-3 text-lg font-semibold">Как проходит обращение</h2>
            <ol className="list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Вы описываете ситуацию в форме и указываете контакт для ответа.</li>
              <li>Обращение регистрируется и попадает к редактору проекта.</li>
              <li>Ответ направляется на указанный вами телефон или e-mail.</li>
              <li>При необходимости обсуждаются дальнейшие шаги — от досудебной претензии до обращения в суд.</li>
            </ol>
            <p className="mt-4 rounded-md bg-background p-3 text-xs leading-relaxed text-muted-foreground">
              Отправляя обращение, вы соглашаетесь на{' '}
              <a href="/consent/" className="underline hover:text-primary">обработку персональных данных</a>.
              Информация, которую вы сообщаете, используется только для ответа на ваше обращение.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
