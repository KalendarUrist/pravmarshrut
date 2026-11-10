'use client'

/**
 * Визуальный редактор контента на TipTap.
 * Поддержка: H2/H3/H4, жирный/курсив/подчёркнутый/зачёркнутый, списки,
 * таблицы, ссылки, изображения из медиатеки, видео по URL, цитаты,
 * информационные блоки, блоки «Вопрос — ответ», отмена/повтор.
 * Вставка из Word: списки, таблицы и форматирование переносятся штатным парсером TipTap.
 */
import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Image as TipTapImage } from '@tiptap/extension-image'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Callout, FaqItem, FaqQuestion, FaqAnswer, VideoEmbed } from '@/components/admin/editor/extensions'
import { MediaPickerDialog } from '@/components/admin/editor/media-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote, Table as TableIcon,
  Link2, Link2Off, ImagePlus, Video, Lightbulb, AlertTriangle, Scale, HelpCircle,
  Undo2, Redo2, RemoveFormatting, Heading2, Heading3, Heading4, Trash2, SquarePlus, SquareMinus,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Props {
  value: string
  onChange: (html: string) => void
}

export function RichEditor({ value, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [videoOpen, setVideoOpen] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true },
        codeBlock: false,
      }),
      TipTapImage.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: 'Начните писать текст материала…' }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Callout,
      FaqItem,
      FaqQuestion,
      FaqAnswer,
      VideoEmbed,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'article-content min-h-[420px] focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Синхронизация при загрузке данных статьи с сервера
  useEffect(() => {
    if (editor && value && editor.getHTML() !== value && !editor.isFocused) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [editor, value])

  function insertFaq() {
    if (!editor) return
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'faqItem',
        content: [
          { type: 'faqQuestion', content: [{ type: 'text', text: 'Вопрос' }] },
          { type: 'faqAnswer', content: [{ type: 'paragraph' }] },
        ],
      })
      .run()
  }

  function toggleCallout(variant: 'info' | 'warning' | 'law') {
    if (!editor) return
    const chain = editor.chain().focus()
    if (editor.isActive('callout')) {
      // уже внутри блока — снимаем
      chain.lift('callout').run()
    } else {
      chain.wrapIn('callout', { variant }).run()
    }
  }

  function insertImage(media: { url: string; alt: string }) {
    editor?.chain().focus().setImage({ src: media.url, alt: media.alt || '' }).run()
  }

  function insertVideo() {
    if (!editor) return
    const url = videoUrl.trim()
    if (!/^https?:\/\/.+/.test(url)) {
      toast({ title: 'Укажите корректную ссылку на видео', variant: 'destructive' })
      return
    }
    editor.chain().focus().insertContent({ type: 'videoEmbed', attrs: { url } }).run()
    setVideoUrl('')
    setVideoOpen(false)
  }

  function applyLink() {
    if (!editor) return
    const url = linkUrl.trim()
    if (!url) return
    if (!/^(https?:\/\/|\/|mailto:|tel:)/.test(url)) {
      toast({ title: 'Ссылка должна начинаться с http://, https:// или /', variant: 'destructive' })
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    setLinkUrl('')
    setLinkOpen(false)
  }

  if (!editor) {
    return <div className="min-h-[420px] animate-pulse rounded-md border bg-muted" aria-busy="true" />
  }

  const chain = () => editor.chain().focus()
  const btn =
    'h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent data-[active=true]:bg-primary data-[active=true]:text-primary-foreground'

  return (
    <div className="rounded-md border" data-testid="rich-editor">
      {/* Панель инструментов */}
      <div
        className="sticky top-16 z-10 flex flex-wrap items-center gap-0.5 border-b bg-muted/80 p-1.5 backdrop-blur"
        role="toolbar"
        aria-label="Форматирование текста"
      >
        <Button type="button" variant="ghost" size="sm" className={btn} data-active={editor.isActive('heading', { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()} title="Заголовок H2"><Heading2 className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} data-active={editor.isActive('heading', { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()} title="Заголовок H3"><Heading3 className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} data-active={editor.isActive('heading', { level: 4 })} onClick={() => chain().toggleHeading({ level: 4 }).run()} title="Заголовок H4"><Heading4 className="h-4 w-4" /></Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button type="button" variant="ghost" size="sm" className={btn} data-active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()} title="Жирный"><Bold className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} data-active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()} title="Курсив"><Italic className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} data-active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()} title="Подчёркнутый"><Underline className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} data-active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()} title="Зачёркнутый"><Strikethrough className="h-4 w-4" /></Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button type="button" variant="ghost" size="sm" className={btn} data-active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()} title="Маркированный список"><List className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} data-active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()} title="Нумерованный список"><ListOrdered className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} data-active={editor.isActive('blockquote')} onClick={() => chain().toggleBlockquote().run()} title="Цитата"><Quote className="h-4 w-4" /></Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => setLinkOpen(true)} title="Вставить ссылку"><Link2 className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => chain().unsetLink().run()} title="Убрать ссылку" disabled={!editor.isActive('link')}><Link2Off className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => setPickerOpen(true)} title="Вставить изображение из медиатеки"><ImagePlus className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => setVideoOpen(true)} title="Вставить видео по ссылке"><Video className="h-4 w-4" /></Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Вставить таблицу"><TableIcon className="h-4 w-4" /></Button>
        {editor.isActive('table') && (
          <>
            <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => chain().addRowAfter().run()} title="Добавить строку"><SquarePlus className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => chain().deleteRow().run()} title="Удалить строку"><SquareMinus className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => chain().deleteTable().run()} title="Удалить таблицу"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </>
        )}
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => toggleCallout('info')} title="Информационный блок"><Lightbulb className="h-4 w-4 text-[#3e6b99]" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => toggleCallout('warning')} title="Важное предупреждение"><AlertTriangle className="h-4 w-4 text-gold" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => toggleCallout('law')} title="Нормативная база"><Scale className="h-4 w-4 text-primary" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={insertFaq} title="Блок «Вопрос — ответ»"><HelpCircle className="h-4 w-4" /></Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => chain().undo().run()} title="Отменить"><Undo2 className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => chain().redo().run()} title="Повторить"><Redo2 className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => chain().unsetAllMarks().clearNodes().run()} title="Очистить форматирование"><RemoveFormatting className="h-4 w-4" /></Button>
      </div>

      <EditorContent editor={editor} className="px-4 py-4" />

      {/* Медиатека */}
      <MediaPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onPick={insertImage} title="Вставить изображение" />

      {/* Видео по URL */}
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Вставить видео</DialogTitle>
            <DialogDescription>
              Поддерживаются YouTube, RuTube, VK Видео и Дзен. Видео не загружается на сервер — вставляется безопасный плеер.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="video-url">Ссылка на видео</Label>
            <Input id="video-url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVideoOpen(false)}>Отмена</Button>
            <Button type="button" onClick={insertVideo}>Вставить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ссылка */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ссылка</DialogTitle>
            <DialogDescription>Внешние ссылки открываются в новой вкладке с rel="nofollow".</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="link-url">Адрес ссылки</Label>
            <Input id="link-url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://... или /family/" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkOpen(false)}>Отмена</Button>
            <Button type="button" onClick={applyLink}>Применить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
