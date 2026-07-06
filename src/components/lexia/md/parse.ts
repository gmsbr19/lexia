// LexIA · Chat — parser de markdown puro (sem React/JSX), extraído do antigo
// Markdown.tsx p/ ficar testável isoladamente (Fase 2, "conteúdo rico" — R3 do
// handoff). Segmenta o texto em blocos; a formatação INLINE (negrito/itálico/
// código/links) e o JSX ficam em Markdown.tsx (que consome MdBlock[] daqui).
// Sem dependências externas — o app já rejeitava libs de markdown por escolha.

export type MdListItem = {
  text: string
  /** Presente = item de tarefa ("- [ ]"/"- [x]"); valor = marcado. */
  checked?: boolean
  /** Lista aninhada (por indentação), mesma forma recursiva. */
  children?: MdList
}

export type MdList = { ordered: boolean; items: MdListItem[] }

export type MdBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "blockquote"; lines: string[] }
  | { type: "hr" }
  | { type: "code"; lang: string; code: string; aberto: boolean }
  | ({ type: "list" } & MdList)
  | { type: "table"; header: string[]; rows: string[][] }

const RE_HEADING = /^(#{1,3})\s+(.*)$/
const RE_HR = /^(-{3,}|\*{3,}|_{3,})$/
const RE_BLOCKQUOTE = /^>\s?(.*)$/
const RE_LIST_ITEM = /^(\s*)([-*]|\d+\.)\s+(.*)$/
const RE_TASK = /^\[([ xX])\]\s+(.*)$/
const RE_TABLE_ROW = /^\s*\|/

function isFence(line: string): { lang: string } | null {
  const m = line.trim().match(/^```(\S*)\s*$/)
  return m ? { lang: m[1] || "texto" } : null
}

/** Constrói uma MdList aninhada a partir das linhas de item já casadas (indent preservado). */
function buildList(rawItems: { indent: number; ordered: boolean; text: string }[]): MdList {
  if (rawItems.length === 0) return { ordered: false, items: [] }
  const ordered = rawItems[0].ordered
  const items: MdListItem[] = []
  let i = 0
  const baseIndent = rawItems[0].indent
  while (i < rawItems.length) {
    const cur = rawItems[i]
    const task = cur.text.match(RE_TASK)
    const item: MdListItem = task ? { text: task[2], checked: task[1].toLowerCase() === "x" } : { text: cur.text }
    i++
    // linhas seguintes com indent maior pertencem a uma lista aninhada deste item
    const nested: typeof rawItems = []
    while (i < rawItems.length && rawItems[i].indent > baseIndent) {
      nested.push(rawItems[i])
      i++
    }
    if (nested.length) item.children = buildList(nested)
    items.push(item)
  }
  return { ordered, items }
}

/** Segmenta markdown em blocos. `streaming`: uma cerca de código sem fechamento
 * no fim do texto vira um bloco `code` com `aberto: true` (não quebra o layout
 * enquanto a resposta ainda está chegando). */
export function parseMarkdown(text: string, opts: { streaming?: boolean } = {}): MdBlock[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const blocks: MdBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // fenced code
    const fence = isFence(line)
    if (fence) {
      const body: string[] = []
      i++
      let closed = false
      while (i < lines.length) {
        if (isFence(lines[i]) && lines[i].trim() === "```") {
          closed = true
          i++
          break
        }
        body.push(lines[i])
        i++
      }
      blocks.push({ type: "code", lang: fence.lang, code: body.join("\n"), aberto: !closed && !!opts.streaming })
      continue
    }

    // regra horizontal
    if (RE_HR.test(line.trim()) && line.trim().length >= 3) {
      blocks.push({ type: "hr" })
      i++
      continue
    }

    // heading
    const h = line.match(RE_HEADING)
    if (h) {
      blocks.push({ type: "heading", level: h[1].length as 1 | 2 | 3, text: h[2] })
      i++
      continue
    }

    // blockquote
    if (RE_BLOCKQUOTE.test(line)) {
      const qLines: string[] = []
      while (i < lines.length && RE_BLOCKQUOTE.test(lines[i])) {
        qLines.push(lines[i].replace(RE_BLOCKQUOTE, "$1"))
        i++
      }
      blocks.push({ type: "blockquote", lines: qLines })
      continue
    }

    // lista (com/sem tarefa), aninhada por indentação
    if (RE_LIST_ITEM.test(line)) {
      const raw: { indent: number; ordered: boolean; text: string }[] = []
      while (i < lines.length && RE_LIST_ITEM.test(lines[i])) {
        const m = lines[i].match(RE_LIST_ITEM)!
        raw.push({ indent: m[1].length, ordered: /\d+\./.test(m[2]), text: m[3] })
        i++
      }
      const list = buildList(raw)
      blocks.push({ type: "list", ordered: list.ordered, items: list.items })
      continue
    }

    // tabela
    if (RE_TABLE_ROW.test(line)) {
      const rows: string[][] = []
      while (i < lines.length && RE_TABLE_ROW.test(lines[i])) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim())
        const isSeparator = cells.length > 0 && cells.every((c) => /^[:-]+$/.test(c))
        if (!isSeparator && cells.length > 0) rows.push(cells)
        i++
      }
      if (rows.length > 0) {
        const [header, ...body] = rows
        blocks.push({ type: "table", header, rows: body })
      }
      continue
    }

    // linha em branco
    if (!line.trim()) {
      i++
      continue
    }

    // parágrafo (linhas consecutivas não-especiais)
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !RE_LIST_ITEM.test(lines[i]) &&
      !RE_HEADING.test(lines[i]) &&
      !isFence(lines[i]) &&
      !RE_TABLE_ROW.test(lines[i]) &&
      !RE_BLOCKQUOTE.test(lines[i]) &&
      !(RE_HR.test(lines[i].trim()) && lines[i].trim().length >= 3)
    ) {
      para.push(lines[i])
      i++
    }
    blocks.push({ type: "paragraph", lines: para })
  }

  return blocks
}
