import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { PT_Sans, PT_Serif } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { getSettings } from '@/lib/settings'
import { getBaseUrl } from '@/lib/server-url'
import './globals.css'

/* Шрифты макета: PT Sans — текст, PT Serif — заголовки (оба с кириллицей). */
const ptSans = PT_Sans({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
  display: 'swap',
})
const ptSerif = PT_Serif({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-pt-serif',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#11263c',
}

export async function generateMetadata(): Promise<Metadata> {
  const [settings, baseUrl] = await Promise.all([getSettings(), getBaseUrl()])
  const title = `${settings.siteName} — юридическая помощь гражданам`
  return {
    metadataBase: new URL(baseUrl),
    title: { default: title, template: `%s — ${settings.siteName}` },
    description: settings.siteDescription,
    formatDetection: { telephone: false },
    icons: { icon: '/favicon.svg' },
  }
}

/** Валидация hex-цвета из настроек. */
function safeColor(value: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings()
  const primary = safeColor(settings.primaryColor, '#11263c')

  return (
    <html
      lang="ru"
      data-scroll-behavior="smooth"
      className={`${ptSans.variable} ${ptSerif.variable}`}
      style={
        {
          '--primary': primary,
          '--ring': primary,
          '--sidebar-primary': primary,
        } as React.CSSProperties
      }
    >
      <body className="min-h-screen flex flex-col antialiased">
        {children}
        <Toaster />

        {/* Яндекс Метрика — подключается, если ID задан в админ-панели */}
        {settings.metrikaId && (
          <>
            <Script id="yandex-metrika" strategy="afterInteractive">
              {`
                (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
                (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
                ym(${settings.metrikaId}, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:false });
              `}
            </Script>
            <noscript>
              <div>
                <img src={`https://mc.yandex.ru/watch/${settings.metrikaId}`} style={{ position: 'absolute', left: '-9999px' }} alt="" />
              </div>
            </noscript>
          </>
        )}

        {/* Google Analytics — подключается, если ID задан в админ-панели */}
        {settings.gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${settings.gaId}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${settings.gaId}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
