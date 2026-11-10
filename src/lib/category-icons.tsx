/**
 * Подбор иконки для юридической категории по slug/названию.
 * Категории создаются в админ-панели, поэтому сопоставление идёт
 * по ключевым словам; всё неизвестное получает нейтральную иконку.
 * Экспортируется компонент CategoryIcon (объявлен на уровне модуля —
 * правило react-hooks/static-components соблюдено).
 */
import { createElement, type ReactElement } from 'react'
import {
  Users, HeartCrack, Coins, ScrollText, Home, ShoppingCart, CreditCard,
  ShieldCheck, Briefcase, Building2, HandCoins, Gavel, FileSearch,
  MessageSquareWarning, FolderOpen, type LucideIcon,
} from 'lucide-react'

const RULES: [RegExp, LucideIcon][] = [
  [/famil|semej|семеи|семей/i, Users],
  [/divorc|razvod|расторг|развод/i, HeartCrack],
  [/aliment|алимент/i, Coins],
  [/inherit|nasled|наслед/i, ScrollText],
  [/real[-_]?estate|nedvizh|kvart|house|apartment|недвиж/i, Home],
  [/consumer|potrebit|потребит/i, ShoppingCart],
  [/debt|credit|kredit|dolg|займ|кредит/i, CreditCard],
  [/bankrupt|bankrot|банкрот/i, ShieldCheck],
  [/labor|trud|труд/i, Briefcase],
  [/housing|zhilishch|zhil|жилищ|жкх/i, Building2],
  [/recovery|vzyskan|money|взыск/i, HandCoins],
  [/court|sud|isk|суд/i, Gavel],
  [/enforcement|pristav|ispoln|пристав|исполн/i, FileSearch],
  [/appeal|obzhal|gosorgan|обжал|жалоб|госорг/i, MessageSquareWarning],
]

export interface CategoryIconProps {
  slug: string
  title?: string
  className?: string
  strokeWidth?: number | string
  /** По умолчанию true — иконка декоративная. */
  ariaHidden?: boolean
}

/** Иконка категории: стабильный компонент, сопоставление по slug/названию. */
export function CategoryIcon({ slug, title = '', className, strokeWidth, ariaHidden = true }: CategoryIconProps): ReactElement {
  const haystack = `${slug} ${title}`
  const props = { className, strokeWidth, 'aria-hidden': ariaHidden }
  for (const [re, icon] of RULES) {
    if (re.test(haystack)) return createElement(icon, props)
  }
  return createElement(FolderOpen, props)
}
