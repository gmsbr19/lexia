"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, FilePlus, FileText } from "lucide-react"
import { apiSend } from "@/lib/client/api"
import { emptyDoc } from "@/lib/documents/model/types"
import type { TemplateRow } from "@/lib/documentos/types"
import { tokens } from "@/styles/tokens.css"

export default function NovoDocumentoPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    apiSend<{ templates: TemplateRow[] }>("/api/documentos/templates", "GET")
      .then((r) => setTemplates(r.templates))
      .catch(() => {})
  }, [])

  const novoEmBranco = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await apiSend<{ ok: boolean; result: { id: number } }>("/api/documentos", "POST", {
        nome: "Documento sem título",
        template: "livre",
        status: "rascunho",
        conteudo: emptyDoc(),
      })
      router.push(`/documents/doc/${res.result.id}`)
    } catch {
      setBusy(false)
    }
  }

  const usarTemplate = async (t: TemplateRow) => {
    if (busy) return
    setBusy(true)
    try {
      const res = await apiSend<{ ok: boolean; result: { id: number } }>("/api/documentos/de-template", "POST", { templateId: t.id })
      router.push(`/documents/doc/${res.result.id}`)
    } catch {
      setBusy(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    textAlign: "left",
    padding: 16,
    borderRadius: 12,
    border: `1px solid ${tokens.color.border}`,
    background: tokens.color.surface,
    cursor: busy ? "default" : "pointer",
    opacity: busy ? 0.6 : 1,
    minHeight: 104,
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 24px", width: "100%" }}>
      <button
        onClick={() => router.push("/documents")}
        style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", color: tokens.color.textMuted, cursor: "pointer", fontSize: 13, marginBottom: 16 }}
      >
        <ChevronLeft size={14} /> Documentos
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 600, color: tokens.color.text, marginBottom: 4 }}>Novo documento</h1>
      <p style={{ fontSize: 14, color: tokens.color.textMuted, marginBottom: 24 }}>
        Comece em branco sobre um papel timbrado ou a partir de um modelo.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {/* Blank */}
        <button onClick={novoEmBranco} disabled={busy} style={{ ...cardStyle, borderStyle: "dashed", alignItems: "flex-start" }}>
          <span style={{ width: 34, height: 34, borderRadius: 8, background: tokens.color.bgSunken, display: "flex", alignItems: "center", justifyContent: "center", color: tokens.color.accent }}>
            <FilePlus size={18} />
          </span>
          <span style={{ fontSize: 14, fontWeight: 500, color: tokens.color.text }}>Em branco</span>
          <span style={{ fontSize: 12, color: tokens.color.textSubtle }}>Documento livre, rich text.</span>
        </button>

        {/* Templates */}
        {templates.map((t) => (
          <button key={t.id} onClick={() => usarTemplate(t)} disabled={busy} style={cardStyle}>
            <span style={{ width: 34, height: 34, borderRadius: 8, background: tokens.color.bgSunken, display: "flex", alignItems: "center", justifyContent: "center", color: tokens.color.accent }}>
              <FileText size={18} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 500, color: tokens.color.text }}>{t.nome}</span>
            <span style={{ fontSize: 12, color: tokens.color.textSubtle, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {t.descricao || t.categoria}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
