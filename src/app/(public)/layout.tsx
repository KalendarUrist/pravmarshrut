import { Header } from '@/components/site/header'
import { Footer } from '@/components/site/footer'

/** Каркас публичной части сайта: шапка + контент + прижатый подвал. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
