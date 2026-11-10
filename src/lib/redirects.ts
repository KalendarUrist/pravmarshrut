/** Проверка редиректов, заданных администратором (для старых URL). */
import { db } from '@/lib/db'

export interface RedirectTarget {
  toPath: string
  code: number
}

export async function findRedirect(fromPath: string): Promise<RedirectTarget | null> {
  const target = await db.redirect.findUnique({ where: { fromPath } })
  if (!target) return null
  // защита от зацикливания
  if (target.toPath === target.fromPath) return null
  return { toPath: target.toPath, code: target.code === 302 ? 302 : 301 }
}
