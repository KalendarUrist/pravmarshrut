'use client'

/** Управление редиректами: добавление 301/302 со старых адресов на новые. */
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/format'
import { Plus, Trash2 } from 'lucide-react'

interface Row { id: string; fromPath: string; toPath: string; code: number; createdAt: string }

export function RedirectsManager() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [fromPath, setFromPath] = useState('')
  const [toPath, setToPath] = useState('')
  const [code, setCode] = useState('301')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/redirects/')
    if (res.ok) setRows((await res.json()).rows)
  }, [])

  useEffect(() => { load() }, [load])

  async function add() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/redirects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromPath, toPath, code: Number(code) }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.ok) {
        toast({ title: 'Редирект добавлен' })
        setFromPath(''); setToPath('')
        load()
      } else {
        toast({ title: 'Ошибка', description: json.error, variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function remove(row: Row) {
    const res = await fetch(`/api/admin/redirects/${row.id}/`, { method: 'DELETE' })
    if (res.ok) { toast({ title: 'Редирект удалён' }); load() }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Редиректы</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Перенаправления со старых адресов на новые. Редиректы при изменении URL статей и категорий создаются
        автоматически — здесь можно добавить свои (например, при переносе материалов со старого сайта).
      </p>

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_100px_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="r-from">Старый адрес</Label>
            <Input id="r-from" value={fromPath} onChange={(e) => setFromPath(e.target.value)} placeholder="/family/old-article" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-to">Новый адрес</Label>
            <Input id="r-to" value={toPath} onChange={(e) => setToPath(e.target.value)} placeholder="/family/new-article" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-code">Код</Label>
            <Select value={code} onValueChange={setCode}>
              <SelectTrigger id="r-code"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="301">301</SelectItem>
                <SelectItem value="302">302</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={add} disabled={saving || !fromPath.trim() || !toPath.trim()}>
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Добавить
          </Button>
        </div>
      </div>

      {rows === null ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Редиректов пока нет.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card custom-scrollbar">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Откуда</th>
                <th className="px-4 py-3 font-medium">Куда</th>
                <th className="px-4 py-3 font-medium">Код</th>
                <th className="px-4 py-3 font-medium">Добавлен</th>
                <th className="px-4 py-3 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-accent/40">
                  <td className="px-4 py-3"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.fromPath}</code></td>
                  <td className="px-4 py-3"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.toPath}</code></td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{row.code}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(row)} aria-label={`Удалить редирект ${row.fromPath}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
