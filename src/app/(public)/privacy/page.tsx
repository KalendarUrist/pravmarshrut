import type { Metadata } from 'next'
import { LegalPageBody } from '@/components/site/legal-page'
import { getBaseUrl } from '@/lib/server-url'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl()
  return {
    title: 'Политика конфиденциальности',
    description: 'Порядок обработки и защиты персональных данных пользователей сайта.',
    alternates: { canonical: `${baseUrl}/privacy/` },
    openGraph: { title: 'Политика конфиденциальности', url: `${baseUrl}/privacy/`, type: 'website', locale: 'ru_RU' },
  }
}

export default function PrivacyPage() {
  return (
    <LegalPageBody
      htmlKey="privacyHtml"
      reviewedKey="privacyReviewed"
      title="Политика конфиденциальности"
      slug="privacy"
    />
  )
}
