/** Логотип: загруженная картинка или залитый знак в стиле макета (фронтон суда) + serif-название. */
import Image from 'next/image'

interface LogoProps {
  logoUrl: string
  name: string
  /** Подпись под названием (как в макете шапки). */
  tagline?: string
  /** dark — для тёмно-синего футера. */
  variant?: 'light' | 'dark'
  /** Крупный вариант для шапки, компактный — для меню и подвала. */
  size?: 'sm' | 'lg'
}

/** Залитый знак классического фронтона (по макету): фронтон, четыре колонны, основание. */
function PorticoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="currentColor" className={className} aria-hidden focusable="false">
      {/* Фронтон */}
      <path d="M24 3 3 14v4h42v-4L24 3Z" />
      {/* Архитрав */}
      <rect x="4" y="21" width="40" height="3.4" rx="1" />
      {/* Колонны */}
      <rect x="7.5" y="27.4" width="5.4" height="12.2" rx="1" />
      <rect x="16.4" y="27.4" width="5.4" height="12.2" rx="1" />
      <rect x="26.2" y="27.4" width="5.4" height="12.2" rx="1" />
      <rect x="35.1" y="27.4" width="5.4" height="12.2" rx="1" />
      {/* Основание */}
      <rect x="3" y="42" width="42" height="3.6" rx="1" />
    </svg>
  )
}

export function Logo({ logoUrl, name, tagline, variant = 'light', size = 'lg' }: LogoProps) {
  const big = size === 'lg'
  const iconBox = big ? 'h-12 w-12' : 'h-9 w-9'
  const nameColor = variant === 'dark' ? 'text-white' : 'text-primary'
  const nameSize = big ? 'text-[25px] sm:text-[27px] lg:text-[29px]' : 'text-[17px]'
  const taglineSize = big ? 'text-[14.5px]' : 'text-[12px]'

  return (
    <span className="flex items-center gap-3">
      {logoUrl && /^\/media\//.test(logoUrl) ? (
        <Image
          src={logoUrl}
          alt={`Логотип — ${name}`}
          width={52}
          height={52}
          className={`${iconBox} shrink-0 object-contain`}
        />
      ) : (
        <PorticoMark className={`${iconBox} shrink-0 ${variant === 'dark' ? 'text-white' : 'text-primary'}`} />
      )}
      <span className="flex min-w-0 flex-col justify-center gap-0.5">
        <span className={`${nameSize} font-serif font-bold leading-none tracking-tight ${nameColor}`}>{name}</span>
        {tagline && big && (
          <span className={`${taglineSize} leading-tight ${variant === 'dark' ? 'text-white/70' : 'text-foreground/80'}`}>
            {tagline}
          </span>
        )}
      </span>
    </span>
  )
}
