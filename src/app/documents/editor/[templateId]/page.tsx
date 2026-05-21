"use client"

import { useState, useCallback, useEffect } from "react"
import { Eye, FileDown, Printer, Sparkles, ChevronRight } from "lucide-react"
import { AppShell } from "@/components/shell/AppShell"
import { ContratoHonorariosForm, countFields, newContratoData } from "@/components/documents/forms/ContratoHonorariosForm"
import { ContratoHonorariosPreview } from "@/components/documents/ContratoHonorariosPreview"
import { AIPanel } from "@/components/documents/editor/AIPanel"
import { getTemplate, templateEditorPath } from "@/lib/documents/registry"
import { btn } from "@/styles/components.css"
import { tokens } from "@/styles/tokens.css"
import { isoToExtensa, todayISO } from "@/components/documents/forms/shared"
import type { ContratoHonorariosData } from "@/lib/types/contrato-honorarios"
import { redirect } from "next/navigation"

// Templates that share the ContratoHonorarios form + preview
const CONTRATO_TEMPLATE_IDS = new Set(["contrato-honorarios", "contrato-prestacao-servicos"])

const DEFAULT_ZOOM = 0.75

interface Props {
  params: { templateId: string }
}

export default function EditorPage({ params }: Props) {
  const { templateId } = params
  const template = getTemplate(templateId)

  // Unknown or unavailable template → back to documents
  if (!template || !template.available) {
    redirect("/documents")
  }

  const [data, setData] = useState<ContratoHonorariosData>(() => ({
    ...newContratoData(),
    data: isoToExtensa(todayISO()),
  }))
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [aiOpen, setAiOpen] = useState(true)
  const [downloading, setDownloading] = useState<"docx" | "pdf" | null>(null)
  const [showFormatMenu, setShowFormatMenu] = useState(false)
  const [savedAgo, setSavedAgo] = useState(0)

  // Auto-save ticker (visual only for now)
  useEffect(() => {
    const id = setInterval(() => setSavedAgo((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => { setSavedAgo(0) }, [data])

  const { total, filled } = countFields(data)
  const pending = total - filled

  const handleChange = useCallback((updated: ContratoHonorariosData) => {
    setData(updated)
  }, [])

  async function download(format: "docx" | "pdf") {
    setDownloading(format)
    setShowFormatMenu(false)
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "contrato-honorarios", format, data }),
      })
      if (!res.ok) throw new Error("Falha ao gerar documento")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${template.name}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      setDownloading(null)
    }
  }

  const savedLabel = savedAgo < 5
    ? "Salvo agora"
    : savedAgo < 60
    ? `Salvo há ${savedAgo}s`
    : `Salvo há ${Math.floor(savedAgo / 60)}min`

  const isContratoTemplate = CONTRATO_TEMPLATE_IDS.has(templateId)

  const topbarActions = (
    <>
      {/* Auto-save status */}
      <span style={{ fontSize: "12px", color: tokens.color.textSubtle, display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2ea043", display: "inline-block" }} />
        {savedLabel}
      </span>

      {/* AI toggle */}
      <button
        onClick={() => setAiOpen((o) => !o)}
        className={btn({ variant: aiOpen ? "secondary" : "ghost" })}
        style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 5 }}
      >
        <Sparkles size={13} />
        IA
      </button>

      {/* Visualizar */}
      <button
        className={btn({ variant: "secondary" })}
        style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 5 }}
      >
        <Eye size={13} />
        Visualizar
      </button>

      {/* Gerar documento (split: pdf / docx) */}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", borderRadius: tokens.radius.sm, overflow: "hidden", boxShadow: tokens.color.shadowSm }}>
          <button
            onClick={() => download("pdf")}
            disabled={!!downloading}
            className={btn({ variant: "primary" })}
            style={{ height: 32, fontSize: "12.5px", borderRadius: 0, paddingRight: 10, display: "flex", alignItems: "center", gap: 5 }}
          >
            <FileDown size={13} />
            {downloading ? "Gerando…" : "Gerar documento"}
          </button>
          <button
            onClick={() => setShowFormatMenu((m) => !m)}
            className={btn({ variant: "primary" })}
            style={{ height: 32, borderRadius: 0, borderLeft: "1px solid rgba(255,255,255,0.2)", padding: "0 8px", display: "flex", alignItems: "center" }}
          >
            <ChevronRight size={12} style={{ transform: showFormatMenu ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
          </button>
        </div>
        {showFormatMenu && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 20,
            background: tokens.color.surface, border: `1px solid ${tokens.color.border}`,
            borderRadius: 10, padding: 4, boxShadow: tokens.color.shadowMd, minWidth: 140,
          }}>
            {[
              { format: "pdf" as const, label: "Baixar PDF", Icon: FileDown },
              { format: "docx" as const, label: "Baixar DOCX", Icon: Printer },
            ].map(({ format, label, Icon }) => (
              <button
                key={format}
                onClick={() => download(format)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "8px 10px", borderRadius: 7, border: "none",
                  background: "transparent", cursor: "pointer", fontFamily: tokens.font.sans,
                  fontSize: "13px", color: tokens.color.text, textAlign: "left",
                }}
              >
                <Icon size={14} color={tokens.color.textMuted} />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )

  return (
    <AppShell
      active="documentos"
      breadcrumb={["Documentos", template.name]}
      actions={topbarActions}
    >
      <div style={{
        display: "grid",
        gridTemplateColumns: aiOpen ? "280px 1fr 320px" : "280px 1fr",
        height: "100%",
        minHeight: 0,
        transition: "grid-template-columns 0.2s ease",
      }}>
        {/* ── Form panel ──────────────────────────────────────────────── */}
        <section style={{
          borderRight: `1px solid ${tokens.color.border}`,
          overflow: "hidden",
          background: tokens.color.bg,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}>
          {isContratoTemplate ? (
            <ContratoHonorariosForm
              data={data}
              onChange={handleChange}
              templateName={template.name}
            />
          ) : (
            <div style={{ padding: 24, color: tokens.color.textMuted, fontSize: 14 }}>
              Formulário para <strong>{template.name}</strong> em breve.
            </div>
          )}
        </section>

        {/* ── Preview panel ────────────────────────────────────────────── */}
        <section style={{
          background: tokens.color.bgSunken,
          overflow: "auto",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}>
          {/* Preview toolbar */}
          <div style={{
            position: "sticky", top: 0, zIndex: 5,
            background: tokens.color.bgSunken,
            padding: "16px 28px 12px",
            borderBottom: `1px solid ${tokens.color.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: tokens.color.text }}>Pré-visualização</div>
              <div style={{ fontSize: "11px", color: tokens.color.textSubtle }}>
                {pending > 0
                  ? `${pending} campo${pending !== 1 ? "s" : ""} pendente${pending !== 1 ? "s" : ""} · atualiza ao digitar`
                  : "Pronto para gerar"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <button onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(1)))}
                style={{ width: 26, height: 26, borderRadius: tokens.radius.sm, border: `1px solid ${tokens.color.border}`, background: tokens.color.surface, color: tokens.color.text, cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: tokens.font.sans }}>−</button>
              <button onClick={() => setZoom(DEFAULT_ZOOM)}
                style={{ height: 26, padding: "0 6px", borderRadius: tokens.radius.sm, border: `1px solid ${tokens.color.border}`, background: tokens.color.surface, color: tokens.color.textMuted, cursor: "pointer", fontSize: "11px", fontFamily: tokens.font.mono, minWidth: 40, textAlign: "center" }}>{Math.round(zoom * 100)}%</button>
              <button onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(1)))}
                style={{ width: 26, height: 26, borderRadius: tokens.radius.sm, border: `1px solid ${tokens.color.border}`, background: tokens.color.surface, color: tokens.color.text, cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: tokens.font.sans }}>+</button>
            </div>
          </div>

          <div style={{ padding: "16px 28px 28px", display: "flex", justifyContent: "center" }}>
            {isContratoTemplate ? (
              <ContratoHonorariosPreview data={data} zoom={zoom} />
            ) : (
              <div style={{ color: tokens.color.textMuted, fontSize: 14 }}>Preview em breve.</div>
            )}
          </div>
        </section>

        {/* ── AI panel ─────────────────────────────────────────────────── */}
        {aiOpen && (
          <AIPanel
            onClose={() => setAiOpen(false)}
            onAcceptSuggestion={(s) => {
              if (s.field === "foro") setData((d) => ({ ...d, foro: s.value }))
              if (s.field === "objeto") setData((d) => ({ ...d, objeto: s.value }))
            }}
          />
        )}
      </div>
    </AppShell>
  )
}
