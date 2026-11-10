/**
 * Кастомные узлы редактора TipTap:
 *  - Callout: выделенные информационные блоки (информация / важно / нормативная база);
 *  - FaqItem / FaqQuestion / FaqAnswer: блоки «Вопрос — ответ» (впоследствии размечаются FAQPage);
 *  - VideoEmbed: видео с внешнего хостинга по URL.
 * Все узлы рендерятся в простые HTML-классы, которые проходит серверный санитайзер.
 */
import { Node, mergeAttributes } from '@tiptap/core'

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      variant: { default: 'info' },
    }
  },
  parseHTML() {
    return [
      { tag: 'div.callout-info', attrs: { variant: 'info' } },
      { tag: 'div.callout-warning', attrs: { variant: 'warning' } },
      { tag: 'div.callout-law', attrs: { variant: 'law' } },
    ]
  },
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: `callout callout-${node.attrs.variant}` }), 0]
  },
})

export const FaqQuestion = Node.create({
  name: 'faqQuestion',
  group: 'block',
  content: 'inline*',
  defining: true,
  parseHTML() {
    return [{ tag: 'h3.faq-q' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['h3', mergeAttributes(HTMLAttributes, { class: 'faq-q' }), 0]
  },
})

export const FaqAnswer = Node.create({
  name: 'faqAnswer',
  group: 'block',
  content: 'block+',
  defining: true,
  parseHTML() {
    return [{ tag: 'div.faq-a' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'faq-a' }), 0]
  },
})

export const FaqItem = Node.create({
  name: 'faqItem',
  group: 'block',
  content: 'faqQuestion faqAnswer',
  defining: true,
  isolating: true,
  parseHTML() {
    return [{ tag: 'div.faq-item' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'faq-item' }), 0]
  },
})

export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      url: { default: '' },
    }
  },
  parseHTML() {
    return [{ tag: 'div.video-embed' }]
  },
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'video-embed', 'data-url': node.attrs.url })]
  },
  renderText({ node }) {
    return `Видео: ${node.attrs.url}`
  },
})
