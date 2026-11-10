/** Генерация человекопонятных URL из русского текста (транслитерация). */
const MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  і: 'i', ї: 'yi', є: 'e', ґ: 'g',
}

export function slugify(text: string): string {
  const lower = text.toLowerCase().trim()
  let out = ''
  for (const ch of lower) {
    if (MAP[ch] !== undefined) out += MAP[ch]
    else if (/[a-z0-9]/.test(ch)) out += ch
    else if (/\s|[-_/.]/.test(ch)) out += '-'
    // остальные символы пропускаются
  }
  return out.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'material'
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 100
}
