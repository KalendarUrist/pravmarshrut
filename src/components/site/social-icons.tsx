/** Иконки социальных сетей: фирменно-залитые сквирклы, как в макете шапки. */
import { SOCIAL_LABELS } from '@/lib/settings'
import type { SocialLink } from '@/lib/settings'
import { PlayCircle, Circle, Globe, Sparkle } from 'lucide-react'

/** Фирменные глифы (simple-icons, CC0) — сами по себе являются залитым сквирклом. */
const BRAND_PATHS: Record<string, { d: string; fill: string }> = {
  telegram: {
    d: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
    fill: '#29A9EB',
  },
  vk: {
    d: 'm9.489.004.729-.003h3.564l.73.003.914.01.433.007.418.011.403.014.388.016.374.021.36.025.345.03.333.033c1.74.196 2.933.616 3.833 1.516.9.9 1.32 2.092 1.516 3.833l.034.333.029.346.025.36.02.373.025.588.012.41.013.644.009.915.004.98-.001 3.313-.003.73-.01.914-.007.433-.011.418-.014.403-.016.388-.021.374-.025.36-.03.345-.033.333c-.196 1.74-.616 2.933-1.516 3.833-.9.9-2.092 1.32-3.833 1.516l-.333.034-.346.029-.36.025-.373.02-.588.025-.41.012-.644.013-.915.009-.98.004-3.313-.001-.73-.003-.914-.01-.433-.007-.418-.011-.403-.014-.388-.016-.374-.021-.36-.025-.345-.03-.333-.033c-1.74-.196-2.933-.616-3.833-1.516-.9-.9-1.32-2.092-1.516-3.833l-.034-.333-.029-.346-.025-.36-.02-.373-.025-.588-.012-.41-.013-.644-.009-.915-.004-.98.001-3.313.003-.73.01-.914.007-.433.011-.418.014-.403.016-.388.021-.374.025-.36.03-.345.033-.333c.196-1.74.616-2.933 1.516-3.833.9-.9 2.092-1.32 3.833-1.516l.333-.034.346-.029.36-.025.373-.02.588-.025.41-.012.644-.013.915-.009ZM6.79 7.3H4.05c.13 6.24 3.25 9.99 8.72 9.99h.31v-3.57c2.01.2 3.53 1.67 4.14 3.57h2.84c-.78-2.84-2.83-4.41-4.11-5.01 1.28-.74 3.08-2.54 3.51-4.98h-2.58c-.56 1.98-2.22 3.78-3.8 3.95V7.3H10.5v6.92c-1.6-.4-3.62-2.34-3.71-6.92Z',
    fill: '#0077FF',
  },
  youtube: {
    d: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
    fill: '#E02F2F',
  },
}

/** Платформы без готового глифа: цветной сквиркл + белая иконка. */
const FALLBACK: Record<string, { bg: string; rounded: string }> = {
  dzen: { bg: '#1B1B1F', rounded: 'rounded-[26%]' },
  ok: { bg: '#EE8208', rounded: 'rounded-full' },
  rutube: { bg: '#B52CE8', rounded: 'rounded-[26%]' },
  other: { bg: 'var(--primary)', rounded: 'rounded-[26%]' },
}

const FALLBACK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dzen: Sparkle,
  ok: Circle,
  rutube: PlayCircle,
  other: Globe,
}

function BrandIcon({ id }: { id: string }) {
  const brand = BRAND_PATHS[id]
  if (brand) {
    return (
      <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden focusable="false">
        <path d={brand.d} fill={brand.fill} />
      </svg>
    )
  }
  const meta = FALLBACK[id] || FALLBACK.other
  const Icon = FALLBACK_ICONS[id] || Globe
  return (
    <span
      className={`flex h-full w-full items-center justify-center ${meta.rounded}`}
      style={{ background: meta.bg }}
      aria-hidden
    >
      <Icon className={id === 'dzen' ? 'h-[46%] w-[46%] text-white' : 'h-[52%] w-[52%] text-white'} />
    </span>
  )
}

export function SocialIcons({
  links,
  size = 'md',
  className = '',
  variant = 'light',
}: {
  links: SocialLink[]
  size?: 'sm' | 'md'
  className?: string
  variant?: 'light' | 'dark'
}) {
  if (!links.length) return null
  const box = size === 'sm' ? 'h-8 w-8' : 'h-[42px] w-[42px]'

  if (variant === 'dark') {
    // В тёмном футере — монохромные глифы на полупрозрачной подложке
    return (
      <ul className={`flex flex-wrap items-center gap-2 ${className}`} aria-label="Ссылки на социальные сети">
        {links.map((link) => (
          <li key={`${link.id}-${link.url}`}>
            <a
              href={link.url}
              target="_blank"
              rel="nofollow noopener noreferrer"
              title={SOCIAL_LABELS[link.id] || 'Социальная сеть'}
              aria-label={SOCIAL_LABELS[link.id] || 'Социальная сеть'}
              className={`flex ${box} items-center justify-center rounded-[26%] border border-white/25 bg-white/5 text-white/75 transition-colors hover:border-white hover:text-white`}
            >
              <FallbackMono id={link.id} />
            </a>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className={`flex flex-wrap items-center gap-2.5 ${className}`} aria-label="Ссылки на социальные сети">
      {links.map((link) => (
        <li key={`${link.id}-${link.url}`}>
          <a
            href={link.url}
            target="_blank"
            rel="nofollow noopener noreferrer"
            title={SOCIAL_LABELS[link.id] || 'Социальная сеть'}
            aria-label={SOCIAL_LABELS[link.id] || 'Социальная сеть'}
            className={`block ${box} transition-opacity hover:opacity-85`}
          >
            <BrandIcon id={link.id} />
          </a>
        </li>
      ))}
    </ul>
  )
}

function FallbackMono({ id }: { id: string }) {
  const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    telegram: BRAND_PATHS.telegram ? TelegramMono : Globe,
    vk: VkMono,
    youtube: YoutubeMono,
    dzen: Sparkle,
    ok: Circle,
    rutube: PlayCircle,
    other: Globe,
  }
  const Icon = ICONS[id] || Globe
  return <Icon className="h-[52%] w-[52%]" />
}

const TelegramMono = () => (
  <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
    <path
      d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
      fill="currentColor"
    />
  </svg>
)

const VkMono = () => (
  <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
    <path
      d="M6.79 7.3H4.05c.13 6.24 3.25 9.99 8.72 9.99h.31v-3.57c2.01.2 3.53 1.67 4.14 3.57h2.84c-.78-2.84-2.83-4.41-4.11-5.01 1.28-.74 3.08-2.54 3.51-4.98h-2.58c-.56 1.98-2.22 3.78-3.8 3.95V7.3H10.5v6.92c-1.6-.4-3.62-2.34-3.71-6.92Z"
      fill="currentColor"
    />
  </svg>
)

const YoutubeMono = () => (
  <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
    <path
      d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
      fill="currentColor"
    />
  </svg>
)
