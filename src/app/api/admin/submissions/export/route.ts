import { db } from '@/lib/db'
import { requireAdminApi, isAdminResponse } from '@/lib/admin-api'

export const runtime = 'nodejs'

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
}

/** Экспорт обращений в CSV (Excel-совместимый, разделитель «;»). */
export async function GET() {
  const guard = await requireAdminApi()
  if (isAdminResponse(guard)) return guard

  const rows = await db.submission.findMany({ orderBy: { createdAt: 'desc' }, take: 5000 })
  const header = 'Дата;Имя;Контакт;Тема;Сообщение;Страница;Статус'
  const lines = rows.map((s) =>
    [
      s.createdAt.toISOString(),
      csvEscape(s.name),
      csvEscape(s.contact),
      csvEscape(s.topic),
      csvEscape(s.message),
      csvEscape(s.pageUrl),
      s.status,
    ].join(';')
  )
  // BOM для корректного отображения кириллицы в Excel
  const csv = '\uFEFF' + [header, ...lines].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="submissions-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
