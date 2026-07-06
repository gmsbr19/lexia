"use client"

// LexIA · Chat — tabela markdown com scroll contido (x/y) e cabeçalho fixo
// (Fase 2, R3 do handoff). Renderiza a partir do bloco `table` de parse.ts.
import type { ReactNode } from "react"
import "./md.css"

export function LongTable({ header, rows, renderInline }: { header: string[]; rows: string[][]; renderInline: (s: string) => ReactNode }) {
  return (
    <div className="cc-tablewrap">
      <table className="cc-table">
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i}>{renderInline(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((c, ci) => (
                <td key={ci}>{renderInline(c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
