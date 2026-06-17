"use client"

// Lightweight Markdown renderer — headings, bold/italic, inline + block code,
// lists, links and paragraphs. No dependency, no dangerouslySetInnerHTML.
import { Fragment, type ReactNode } from "react"

const codeInline: React.CSSProperties = {
  fontFamily: "var(--font-mono, ui-monospace, monospace)",
  fontSize: "0.92em",
  background: "var(--bg-sunken)",
  padding: "1px 5px",
  borderRadius: 6,
}
const codeBlock: React.CSSProperties = {
  fontFamily: "var(--font-mono, ui-monospace, monospace)",
  fontSize: 12,
  background: "var(--bg-sunken)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 12px",
  overflowX: "auto",
  margin: "6px 0",
  whiteSpace: "pre",
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

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    // fenced code
    if (line.trim().startsWith("```")) {
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith("```")) body.push(lines[i++])
      if (i < lines.length) i++ // closing fence
      blocks.push(
        <pre key={key++} style={codeBlock}>
          {body.join("\n")}
        </pre>,
      )
      continue
    }

    // heading
    const h = line.match(/^(#{1,3})\s+(.*)$/)
    if (h) {
      const lvl = h[1].length
      const size = lvl === 1 ? 16 : lvl === 2 ? 14 : 14
      blocks.push(
        <div key={key++} style={{ fontSize: size, fontWeight: 500, margin: "6px 0 2px", letterSpacing: "-0.01em" }}>
          {inline(h[2])}
        </div>,
      )
      i++
      continue
    }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: ReactNode[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(<li key={items.length}>{inline(lines[i].replace(/^\s*[-*]\s+/, ""))}</li>)
        i++
      }
      blocks.push(
        <ul key={key++} style={{ margin: "4px 0", paddingLeft: 20 }}>
          {items}
        </ul>,
      )
      continue
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: ReactNode[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(<li key={items.length}>{inline(lines[i].replace(/^\s*\d+\.\s+/, ""))}</li>)
        i++
      }
      blocks.push(
        <ol key={key++} style={{ margin: "4px 0", paddingLeft: 22 }}>
          {items}
        </ol>,
      )
      continue
    }

    // table
    if (line.trim().startsWith("|")) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const rawCells = lines[i]
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim())
        
        // Skip markdown separator row eg: |---|---|
        const isSeparator = rawCells.length > 0 && rawCells.every((c) => /^[:-]+$/.test(c))
        if (isSeparator) {
          i++
          continue
        }

        if (rawCells.length > 0) {
          rows.push(rawCells)
        }
        i++
      }

      if (rows.length > 0) {
        const [headerRow, ...bodyRows] = rows
        blocks.push(
          <div key={key++} style={{ overflowX: "auto", margin: "8px 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {headerRow.map((h, idx) => (
                    <th
                      key={idx}
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        borderBottom: "1px solid var(--border)",
                        fontWeight: 500,
                        color: "var(--text-soft)",
                      }}
                    >
                      {inline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: "1px solid var(--bg-sunken)" }}>
                    {row.map((c, cIdx) => (
                      <td key={cIdx} style={{ padding: "6px 8px" }}>
                        {inline(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    // blank line
    if (!line.trim()) {
      i++
      continue
    }

    // paragraph (gather consecutive non-empty, non-special lines)
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith("|")
    ) {
      para.push(lines[i])
      i++
    }
    blocks.push(
      <p key={key++} style={{ margin: "4px 0", lineHeight: 1.55 }}>
        {para.map((p, idx) => (
          <Fragment key={idx}>
            {idx > 0 && <br />}
            {inline(p)}
          </Fragment>
        ))}
      </p>,
    )
  }

  return <div style={{ fontSize: 14, color: "var(--text)" }}>{blocks}</div>
}
