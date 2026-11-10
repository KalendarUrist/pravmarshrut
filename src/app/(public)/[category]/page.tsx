import type { Metadata } from 'next'
import { CategoryView, categoryMetadata } from '@/components/site/category-view'
import { getBaseUrl } from '@/lib/server-url'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ category: string }>
  searchParams: Promise<{ sort?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const baseUrl = await getBaseUrl()
  return categoryMetadata(category, 1, baseUrl)
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params
  const { sort } = await searchParams
  return <CategoryView slug={category} page={1} sort={sort === 'asc' ? 'asc' : 'desc'} basePath={`/${category}`} />
}
