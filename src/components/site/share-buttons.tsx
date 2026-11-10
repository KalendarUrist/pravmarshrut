'use client'

/** Кнопки «поделиться» для страниц статей: VK, Telegram, WhatsApp, копирование ссылки. */
import { useState } from 'react'
import { Share2, Link2, Check } from 'lucide-react'

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const links = [
    { id: 'vk', label: 'Поделиться во ВКонтакте', href: `https://vk.com/share.php?url=${encodedUrl}&title=${encodedTitle}` },
    { id: 'telegram', label: 'Отправить в Telegram', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}` },
    { id: 'whatsapp', label: 'Отправить в WhatsApp', href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
  ]

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // буфер обмена недоступен
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Share2 className="h-4 w-4" aria-hidden /> Поделиться:
      </span>
      {links.map((l) => (
        <a
          key={l.id}
          href={l.href}
          target="_blank"
          rel="nofollow noopener noreferrer"
          aria-label={l.label}
          title={l.label}
          className="inline-flex h-9 items-center rounded-md border px-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {l.id === 'vk' ? 'ВКонтакте' : l.id === 'telegram' ? 'Telegram' : 'WhatsApp'}
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        aria-label="Скопировать ссылку на статью"
        className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        {copied ? <Check className="h-4 w-4 text-green-700" /> : <Link2 className="h-4 w-4" />}
        {copied ? 'Скопировано' : 'Скопировать ссылку'}
      </button>
    </div>
  )
}
