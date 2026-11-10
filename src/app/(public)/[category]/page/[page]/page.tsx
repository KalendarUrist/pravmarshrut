import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CategoryView, categoryMetadata } from '@/components/site/category-view'
import { getBaseUrl } from '@/lib/server-url'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ category: string; page: string }>
  searchParams: Promise<{ sort?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, page } = await params
  const pageNum = Number(page)
  if (!Number.isInteger(pageNum) || pageNum < 2) return {}
  const baseUrl = await getBaseUrl()
  return categoryMetadata(category, pageNum, baseUrl)
}

export default async function CategoryPaginatedPage({ params, searchParams }: Props) {
  const { category, page } = await params
  const { sort } = await searchParams
  const pageNum = Number(page)
  if (!Number.isInteger(pageNum) || pageNum < 2) notFound()
  return (
    <CategoryView
      slug={category}
      page={pageNum}
      sort={sort === 'asc' ? 'asc' : 'desc'}
      basePath={`/${category}`}
    />
  )
}
