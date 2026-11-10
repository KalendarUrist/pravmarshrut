import type { Metadata } from 'next'
import { LegalPageBody } from '@/components/site/legal-page'
import { getBaseUrl } from '@/lib/server-url'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl()
  return {
    title: 'Согласие на обработку персональных данных',
    description: 'Согласие на обработку персональных данных при отправке обращения через сайт.',
    alternates: { canonical: `${baseUrl}/consent/` },
    openGraph: { title: 'Согласие на обработку персональных данных', url: `${baseUrl}/consent/`, type: 'website', locale: 'ru_RU' },
  }
}

export default function ConsentPage() {
  return (
    <LegalPageBody
      htmlKey="consentHtml"
      reviewedKey="consentReviewed"
      title="Согласие на обработку персональных данных"
      slug="consent"
    />
  )
}
