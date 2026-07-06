"use client"

// LexIA · Chat — bloco de código (Fase 2, R3 do handoff). Barra com a
// linguagem + "Copiar" (vira "Copiado ✓"); blocos longos colapsam atrás de um
// fade com "Mostrar mais"; variante de streaming mostra um spinner na barra +
// o caret dourado no fim do código ainda "abrindo" (cerca não fechada).
import { useState } from "react"
import { Icon } from "@/components/crm/crm-icons"
import { StreamCaret } from "../cc/motion"
import "./md.css"

const COLLAPSE_MAX_HEIGHT = 168

export function CodeBlock({ lang = "texto", code, streaming = false }: { lang?: string; code: string; streaming?: boolean }) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const collapsible = !streaming && code.split("\n").length > 12

  const copy = () => {
    try {
      void navigator.clipboard?.writeText(code)
    } catch {
      /* degrada em silêncio — sem clipboard, só não copia */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const collapsed = collapsible && !open

  return (
    <div className="cc-code">
      <div className="cc-code-bar">
        <span>
          {streaming && <Icon name="refreshCw" size={11} className="lx-spin" style={{ marginRight: 5, verticalAlign: "-1px" }} />}
          {lang}
        </span>
        {!streaming && (
          <button className="cc-code-copy" onClick={copy}>
            <Icon name={copied ? "check" : "copy"} size={12} style={copied ? { color: "var(--ok)" } : undefined} />
            {copied ? "Copiado" : "Copiar"}
          </button>
        )}
      </div>
      <div className="cc-code-body" style={collapsed ? { maxHeight: COLLAPSE_MAX_HEIGHT, overflow: "hidden" } : undefined}>
        <pre className="cc-pre">
          <code>
            {code}
            {streaming && <StreamCaret />}
          </code>
        </pre>
        {collapsed && (
          <div className="cc-code-fade">
            <button className="btn btn-secondary btn-sm" onClick={() => setOpen(true)} style={{ fontSize: 12 }}>
              <Icon name="chevronDown" size={13} />
              Mostrar mais
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
