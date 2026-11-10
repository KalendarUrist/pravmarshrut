/**
 * Обработка HTML контента:
 *  - sanitizeHtmlContent: очистка HTML из редактора от опасного содержимого (XSS);
 *  - prepareForRender: подготовка к показу на сайте (якоря у заголовков,
 *    адаптивная обёртка таблиц, iframe вместо video-embed, ссылки с rel);
 *  - extractToc: оглавление из H2/H3;
 *  - extractFaq: вопросы-ответы для разметки FAQPage;
 *  - htmlToPlain: текст для поиска и сниппетов.
 */
import sanitizeHtml from 'sanitize-html'
import { parse, HTMLElement, Node as HtmlNode } from 'node-html-parser'

const ALLOWED_TAGS = [
  'p', 'h2', 'h3', 'h4', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'mark',
  'ul', 'ol', 'li',
  'a', 'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'figure', 'figcaption',
  'div', 'span',
]

export function sanitizeHtmlContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      div: ['class', 'data-url'],
      span: ['class'],
      p: ['class'],
      h3: ['class'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedClasses: {
      div: ['callout', 'callout-info', 'callout-warning', 'callout-law', 'faq-item', 'faq-q', 'faq-a', 'video-embed', 'table-wrap'],
      span: ['callout', 'callout-info', 'callout-warning', 'callout-law'],
      p: ['callout', 'callout-info', 'callout-warning', 'callout-law'],
      h3: ['faq-q'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    // img src: относительные пути /media/... разрешены; iframe полностью запрещён
    allowProtocolRelative: false,
    transformTags: {
      // внешние ссылки — с безопасными атрибутами
      a: (tagName, attribs) => {
        const attrs = { ...attribs }
        const href = attrs.href || ''
        if (/^https?:\/\//i.test(href) && !href.includes(getSelfHostHint())) {
          attrs.rel = 'nofollow noopener noreferrer'
          attrs.target = '_blank'
        }
        return { tagName, attribs: attrs }
      },
      // data-url разрешён только у блоков видео
      div: (tagName, attribs) => {
        const attrs = { ...attribs }
        if (attrs['data-url'] && !(attrs.class || '').includes('video-embed')) {
          delete attrs['data-url']
        }
        return { tagName, attribs: attrs }
      },
    },
  })
}

// sanitize-html не знает про текущий хост; определяем его лениво из окружения
function getSelfHostHint(): string {
  return process.env.SITE_URL?.replace(/^https?:\/\//, '') || '___never___'
}

/** Конвертация URL видео в безопасный embed-адрес (только разрешённые платформы). */
export function toEmbedUrl(rawUrl: string): string | null {
  const url = rawUrl.trim()
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    // YouTube
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop()
      if (id && /^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`
    }
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1)
      if (id && /^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`
    }
    // RuTube
    if (host === 'rutube.ru') {
      const m = u.pathname.match(/\/video\/([a-z0-9]+)/i) || u.pathname.match(/\/play\/embed\/([a-z0-9]+)/i)
      if (m) return `https://rutube.ru/play/embed/${m[1]}`
    }
    // VK Видео
    if (host === 'vk.com' || host === 'vkvideo.ru' || host === 'm.vk.com') {
      const oid = u.searchParams.get('oid')
      const vid = u.searchParams.get('id') || u.searchParams.get('video_id')
      if (oid && vid) return `https://vk.com/video_ext.php?oid=${encodeURIComponent(oid)}&id=${encodeURIComponent(vid)}&hd=2`
      const m = u.pathname.match(/video(-?\d+)_(\d+)/)
      if (m) return `https://vk.com/video_ext.php?oid=${m[1]}&id=${m[2]}&hd=2`
    }
    // Дзен
    if (host === 'dzen.ru' || host === 'zen.yandex.ru') {
      const m = u.pathname.match(/\/video\/watch\/([a-z0-9-]+)/i)
      if (m) return `https://dzen.ru/embed/v1?source=${encodeURIComponent(m[1])}`
    }
  } catch {
    return null
  }
  return null
}

export interface Heading {
  id: string
  text: string
  level: 2 | 3
}

/** Уникальные человекопонятные якоря из текста заголовка. */
function makeHeadingIds(headings: { text: string; level: 2 | 3 }[]): string[] {
  const used = new Map<string, number>()
  return headings.map(({ text }) => {
    let base = text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'razdel'
    const n = used.get(base) || 0
    used.set(base, n + 1)
    return n ? `${base}-${n}` : base
  })
}

export interface PreparedContent {
  html: string
  toc: Heading[]
  faq: { question: string; answer: string }[]
}

/** Полная подготовка HTML к отрисовке на публичной странице. */
export function prepareForRender(html: string): PreparedContent {
  const root = parse(`<div id="__root">${html}</div>`, { blockTextElements: { script: false, style: false, pre: true } })
  const container = root.querySelector('#__root')
  if (!container) return { html: sanitizeHtmlContent(html), toc: [], faq: [] }

  // 1. Якоря для H2/H3 + сбор оглавления
  const headings = container.querySelectorAll('h2, h3')
  const infos: { text: string; level: 2 | 3 }[] = []
  for (const h of headings) {
    infos.push({ text: h.text.trim(), level: h.tagName === 'H2' ? 2 : 3 })
  }
  const ids = makeHeadingIds(infos)
  headings.forEach((h, i) => h.setAttribute('id', ids[i]))

  const toc: Heading[] = infos.map((info, i) => ({ id: ids[i], text: info.text, level: info.level }))

  // 2. Блоки видео — превращаем в iframe разрешённых платформ
  for (const embed of container.querySelectorAll('div.video-embed')) {
    const url = embed.getAttribute('data-url') || ''
    const src = toEmbedUrl(url)
    const parent = embed.parentNode as HTMLElement | null
    if (!parent) continue
    if (src) {
      const iframe = new HTMLElement(
        'iframe',
        {
          src,
          title: 'Видео',
          loading: 'lazy',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen',
          allowfullscreen: '',
        },
        '',
        root
      )
      parent.exchangeChild(embed, iframe)
    } else {
      parent.removeChild(embed)
    }
  }

  // 3. Таблицы — обёртка для горизонтальной прокрутки на мобильных
  for (const table of container.querySelectorAll('table')) {
    const parent = table.parentNode as HTMLElement | null
    if (!parent) continue
    if (parent.classList?.contains('table-wrap')) continue
    const wrap = new HTMLElement('div', { class: 'table-wrap' }, '', root)
    parent.exchangeChild(table, wrap)
    wrap.appendChild(table)
  }

  // 4. Ссылки: для внешних — атрибуты безопасности
  for (const a of container.querySelectorAll('a')) {
    const href = a.getAttribute('href') || ''
    if (/^https?:\/\//i.test(href)) {
      a.setAttribute('rel', 'nofollow noopener noreferrer')
      if (!a.getAttribute('target')) a.setAttribute('target', '_blank')
    }
  }

  // 5. Вопросы-ответы (для FAQPage разметки)
  const faq: { question: string; answer: string }[] = []
  for (const item of container.querySelectorAll('.faq-item')) {
    const q = item.querySelector('.faq-q')
    const a = item.querySelector('.faq-a')
    if (q && a && q.text.trim() && a.text.trim()) {
      faq.push({ question: q.text.trim(), answer: a.text.trim() })
    }
  }

  return { html: container.innerHTML, toc, faq }
}

/** Чистый текст из HTML (для поиска, сниппетов, description). */
export function htmlToPlain(html: string, limit = 100000): string {
  const text = html
    .replace(/<(h2|h3|h4|p|li|tr|blockquote|div)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
  return text.slice(0, limit)
}

/** Сниппет вокруг найденного вхождения для страницы поиска. */
export function makeSnippet(plain: string, query: string, radius = 160): string {
  const idx = plain.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return plain.slice(0, radius * 2) + (plain.length > radius * 2 ? '…' : '')
  const start = Math.max(0, idx - radius)
  const end = Math.min(plain.length, idx + query.length + radius)
  return (start > 0 ? '…' : '') + plain.slice(start, end) + (end < plain.length ? '…' : '')
}
