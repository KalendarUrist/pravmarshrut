import type { Metadata } from 'next'
import { LegalPageBody } from '@/components/site/legal-page'
import { getBaseUrl } from '@/lib/server-url'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl()
  return {
    title: 'Пользовательское соглашение',
    description: 'Условия использования сайта и характер размещённой информации.',
    alternates: { canonical: `${baseUrl}/terms/` },
    openGraph: { title: 'Пользовательское соглашение', url: `${baseUrl}/terms/`, type: 'website', locale: 'ru_RU' },
  }
}

export default function TermsPage() {
  return (
    <LegalPageBody
      htmlKey="termsHtml"
      reviewedKey="termsReviewed"
      title="Пользовательское соглашение"
      slug="terms"
    />
  )
}
