"use client"

import { useEffect, useRef } from "react"
import { btn } from "@/styles/components.css"

// Barra da página de impressão: chama o diálogo de impressão UMA vez ao abrir
// (a aba é aberta pelo botão "Imprimir / PDF" do relatório) e deixa os botões
// para reimprimir ou fechar. Some inteira no papel (.rel-print-bar).
export function PrintBar({ titulo, auto }: { titulo: string; auto: boolean }) {
  const disparado = useRef(false)
  useEffect(() => {
    if (!auto || disparado.current) return
    disparado.current = true
    // Um frame depois do paint: fontes/ícones já aplicados quando o diálogo abre.
    const t = setTimeout(() => window.print(), 350)
    return () => clearTimeout(t)
  }, [auto])

  return (
    <div className="rel-print-bar">
      <span className="rel-print-hint">
        {titulo} · no diálogo de impressão, escolha <strong>Salvar como PDF</strong> e mantenha
        &ldquo;Gráficos de segundo plano&rdquo; ligado para preservar as cores.
      </span>
      <span style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className={btn({ variant: "secondary" })}
          style={{ height: 32, fontSize: 12, padding: "0 12px" }}
          onClick={() => window.close()}
        >
          Fechar
        </button>
        <button
          type="button"
          className={btn({ variant: "gold" })}
          style={{ height: 32, fontSize: 12, padding: "0 12px" }}
          onClick={() => window.print()}
        >
          Imprimir
        </button>
      </span>
    </div>
  )
}
