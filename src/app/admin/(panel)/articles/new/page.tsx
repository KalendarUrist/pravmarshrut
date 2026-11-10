import { ArticleEditor, EMPTY_ARTICLE } from '@/components/admin/articles/article-editor'

export const dynamic = 'force-dynamic'

export default function NewArticlePage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Новая статья</h1>
      <ArticleEditor initial={EMPTY_ARTICLE} />
    </div>
  )
}
