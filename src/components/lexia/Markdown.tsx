"use client"

// Markdown renderer — headings, bold/italic, inline + block code (com barra de
// linguagem, copiar e colapso — Fase 2/R3), listas (incl. tarefas e aninhadas),
// citação, regra horizontal, links, tabela (scroll contido + cabeçalho fixo).
// Sem dependência, sem dangerouslySetInnerHTML. O parser (blocos) mora em
// md/parse.ts, puro e testável isoladamente.
import { Fragment, useState, type ReactNode } from "react"
import { parseMarkdown, type MdList, type MdListItem } from "./md/parse"
import { CodeBlock } from "./md/CodeBlock"
import { LongTable } from "./md/LongTable"
import "./md/md.css"

const codeInline: React.CSSProperties = {
  fontFamily: "var(--font-mono, ui-monospace, monospace)",
  fontSize: "0.92em",
  background: "var(--bg-sunken)",
  padding: "1px 5px",
  borderRadius: 6,
}

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let rest = text
  const patterns: { re: RegExp; node: (m: RegExpMatchArray) => ReactNode }[] = [
    { re: /`([^`]+)`/, node: (m) => <code style={codeInline}>{m[1]}</code> },
    { re: /\*\*([^*]+)\*\*/, node: (m) => <strong>{inline(m[1])}</strong> },
    { re: /(?:\*([^*\n]+)\*|_([^_\n]+)_)/, node: (m) => <em>{inline(m[1] ?? m[2])}</em> },
    {
      re: /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/,
      node: (m) => (
        <a href={m[2]} target={m[2].startsWith("http") ? "_blank" : undefined} rel="noreferrer" style={{ color: "var(--accent)" }}>
          {m[1]}
        </a>
      ),
    },
  ]
  while (rest) {
    let best: { idx: number; len: number; node: ReactNode } | null = null
    for (const p of patterns) {
      const m = rest.match(p.re)
      if (m && m.index !== undefined && (!best || m.index < best.idx)) {
        best = { idx: m.index, len: m[0].length, node: p.node(m) }
      }
    }
    if (!best) {
      out.push(rest)
      break
    }
    if (best.idx > 0) out.push(rest.slice(0, best.idx))
    out.push(<Fragment key={out.length}>{best.node}</Fragment>)
    rest = rest.slice(best.idx + best.len)
  }
  return out
}

/** Item de lista de tarefa — toggle visual local (sem persistência; a resposta é estática). */
function TaskItem({ initial, children }: { initial: boolean; children: ReactNode }) {
  const [done, setDone] = useState(initial)
  return (
    <li className="cc-task" data-done={done ? "1" : "0"}>
      <button
        type="button"
        className="cc-check"
        onClick={() => setDone((d) => !d)}
        role="checkbox"
        aria-checked={done}
        style={{ background: done ? undefined : "transparent" }}
      >
        {done && (
          <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <span>{children}</span>
    </li>
  )
}

function renderList(list: MdList, keyPrefix: string): ReactNode {
  const Tag = list.ordered ? "ol" : "ul"
  const hasTasks = list.items.some((it) => it.checked !== undefined)
  return (
    <Tag key={keyPrefix} style={{ margin: "4px 0", paddingLeft: hasTasks ? 2 : list.ordered ? 22 : 20, listStyle: hasTasks ? "none" : undefined, marginLeft: hasTasks ? 0 : undefined }}>
      {list.items.map((item, idx) => renderListItem(item, `${keyPrefix}-${idx}`))}
    </Tag>
  )
}

function renderListItem(item: MdListItem, key: string): ReactNode {
  const body = (
    <>
      {inline(item.text)}
      {item.children && renderList(item.children, `${key}c`)}
    </>
  )
  if (item.checked !== undefined) {
    return (
      <TaskItem key={key} initial={item.checked}>
        {body}
      </TaskItem>
    )
  }
  return <li key={key}>{body}</li>
}

export function Markdown({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const blocks = parseMarkdown(text, { streaming })
  return (
    <div style={{ fontSize: 14, color: "var(--text)" }}>
      {blocks.map((b, key) => {
        switch (b.type) {
          case "code":
            return <CodeBlock key={key} lang={b.lang} code={b.code} streaming={b.aberto} />
          case "heading": {
            const size = b.level === 1 ? 16 : 14
            return (
              <div key={key} style={{ fontSize: size, fontWeight: 500, margin: "6px 0 2px", letterSpacing: "-0.01em" }}>
                {inline(b.text)}
              </div>
            )
          }
          case "blockquote":
            return (
              <blockquote key={key} className="cc-blockquote">
                {b.lines.map((l, i) => (
                  <Fragment key={i}>
                    {i > 0 && <br />}
                    {inline(l)}
                  </Fragment>
                ))}
              </blockquote>
            )
          case "hr":
            return <hr key={key} className="cc-hr" />
          case "list":
            return renderList({ ordered: b.ordered, items: b.items }, `l${key}`)
          case "table":
            return <LongTable key={key} header={b.header} rows={b.rows} renderInline={(s) => inline(s)} />
          case "paragraph":
            return (
              <p key={key} style={{ margin: "4px 0", lineHeight: 1.55 }}>
                {b.lines.map((l, i) => (
                  <Fragment key={i}>
                    {i > 0 && <br />}
                    {inline(l)}
                  </Fragment>
                ))}
              </p>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
