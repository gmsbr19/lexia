"use client"

import { useState, useCallback, useEffect, useRef, use } from "react"
import { ChevronLeft, ArrowRight, Sparkles, Pencil, FileText } from "lucide-react"
import { ContratoHonorariosForm, countFields, newContratoData } from "@/components/documents/forms/ContratoHonorariosForm"
import { ContratoHonorariosPreview } from "@/components/documents/ContratoHonorariosPreview"
import { coerceContratoData } from "@/components/documents/review/contrato-review"
import { EditorLexia } from "@/components/documents/editor/EditorLexia"
import type { AISuggestion } from "@/components/documents/editor/doc-changes"
import { getTemplate } from "@/lib/documents/registry"
import { apiSend } from "@/lib/client/api"
import { btn } from "@/styles/components.css"
import { tokens } from "@/styles/tokens.css"
import * as layoutStyles from "@/components/documents/editor/editor-layout.css"
import { isoToExtensa, todayISO } from "@/components/documents/forms/shared"
import {
  CLAUSULA_IDS,
  setClausulaOverride,
} from "@/lib/documents/generators/contrato-honorarios/clausulas"
import type { ContratoHonorariosData, ContratantePF } from "@/lib/types/contrato-honorarios"
import type { DocumentoDetail } from "@/lib/documentos/types"
import { redirect, useRouter, useSearchParams } from "next/navigation"

// Templates that share the ContratoHonorarios form + preview
const CONTRATO_TEMPLATE_IDS = new Set(["contrato-honorarios", "contrato-prestacao-servicos"])

const DEFAULT_ZOOM = 0.72
type PanelMode = "chat" | "form"

// Honorários keys that exist per tipo — a suggestion is only applied when its key
// is present on the current tipo (keeps the apply type-safe and faithful).
const HONORARIOS_KEYS: Record<string, ReadonlyArray<string>> = {
  avista: ["valorTotal", "dataPagamento"],
  parcelado: ["valorTotal", "qtParcelas", "valorParcelas", "dataPrimeiraParcela"],
  parcelas_diferentes: [],
  exito: ["percentual", "baseCalculo"],
  avista_exito: ["valorTotal", "dataPagamento"],
  parcelado_exito: ["valorTotal", "qtParcelas", "valorParcelas", "dataPrimeiraParcela"],
}

const CONTRATANTE_PF_KEYS = new Set<keyof ContratantePF>([
  "nome", "cpf", "rg", "endereco", "email", "nacionalidade", "estadoCivil", "profissao",
])

/** Apply an AI suggestion (dotted path) onto the contract data, type-safely. */
function applySuggestion(d: ContratoHonorariosData, field: string, value: string): ContratoHonorariosData {
  // Top-level free-text fields.
  if (field === "objeto") return { ...d, objeto: value }
  if (field === "foro") return { ...d, foro: value }
  if (field === "data") return { ...d, data: value }

  // honorarios.<key> — only when that key exists on the current tipo.
  if (field.startsWith("honorarios.")) {
    const key = field.slice("honorarios.".length)
    const allowed = HONORARIOS_KEYS[d.honorarios.tipo] ?? []
    if (allowed.includes(key)) {
      return { ...d, honorarios: { ...d.honorarios, [key]: value } as ContratoHonorariosData["honorarios"] }
    }
    return d
  }

  // contratante.<key> → contratantes[0] when it's a PF.
  if (field.startsWith("contratante.")) {
    const key = field.slice("contratante.".length) as keyof ContratantePF
    const first = d.contratantes[0]
    if (first && first.tipo === "pf" && CONTRATANTE_PF_KEYS.has(key)) {
      const next: ContratantePF = { ...first, [key]: value }
      return { ...d, contratantes: [next, ...d.contratantes.slice(1)] }
    }
    return d
  }

  // clausula.<id> → data.clausulas[id] — a full-text rewrite of a standard clause.
  if (field.startsWith("clausula.")) {
    const id = field.slice("clausula.".length)
    if (CLAUSULA_IDS.has(id) && value.trim() !== "") return setClausulaOverride(d, id, value)
    return d
  }

  return d
}

interface Props {
  params: Promise<{ templateId: string }>
}

export default function EditorPage({ params }: Props) {
  const { templateId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const documentoParam = searchParams.get("documento")
  const template = getTemplate(templateId)

  // Unknown or unavailable template → back to documents
  if (!template || !template.available) {
    redirect("/documents")
  }

  const [data, setData] = useState<ContratoHonorariosData>(() => ({
    ...newContratoData(),
    data: isoToExtensa(todayISO()),
  }))
  const [panelMode, setPanelMode] = useState<PanelMode>("chat")
  const [savedAgo, setSavedAgo] = useState(0)
  const [docId, setDocId] = useState<number | null>(null)
  const [docNome, setDocNome] = useState<string | null>(null)
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [generating, setGenerating] = useState(false)

  const isContratoTemplate = CONTRATO_TEMPLATE_IDS.has(templateId)
  const { total, filled } = countFields(data)

  // ── reopen: seed from ?documento=ID ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    if (!documentoParam) {
      setHydrated(true)
      return
    }
    ;(async () => {
      try {
        const doc = await apiSend<DocumentoDetail>(`/api/documentos/${documentoParam}`, "GET")
        if (cancelled) return
        if (doc.payload && typeof doc.payload === "object") {
          setData(coerceContratoData(doc.payload))
        }
        setDocId(doc.id)
        setDocNome(doc.nome)
        if (doc.clienteId != null) setClienteId(doc.clienteId)
      } catch {
        // Swallow — start a fresh draft if it can't be loaded.
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })()
    return () => { cancelled = true }
  }, [documentoParam])

  // ── derive a stable document name from the contract ──────────────────────
  const contratanteNome = (() => {
    const c = data.contratantes[0]
    if (!c) return ""
    return c.tipo === "pf" ? c.nome : c.razaoSocial
  })()
  const computedNome = docNome ?? `${template.name}${contratanteNome ? ` — ${contratanteNome}` : ""}`

  // ── autosave: debounce-save the form (best-effort) ───────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const docIdRef = useRef<number | null>(null)
  docIdRef.current = docId
  const savingRef = useRef(false)

  useEffect(() => {
    if (!hydrated || !isContratoTemplate) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { void persist() }, 1200)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
    // persist() is a stable useCallback; template is derived from immutable
    // params and never changes — re-run only when the form/cliente/hydration change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, clienteId, hydrated, isContratoTemplate])

  const persist = useCallback(async (): Promise<number | null> => {
    if (savingRef.current) return docIdRef.current
    savingRef.current = true
    try {
      const nome = (() => {
        const c = data.contratantes[0]
        const cn = c ? (c.tipo === "pf" ? c.nome : c.razaoSocial) : ""
        return docNome ?? `${template.name}${cn ? ` — ${cn}` : ""}`
      })()
      const body = { nome, payload: data, clienteId, status: "rascunho" as const }
      if (docIdRef.current == null) {
        const res = await apiSend<{ ok: boolean; result: { id: number } }>(
          "/api/documentos", "POST",
          { ...body, template: templateId },
        )
        const id = res.result.id
        setDocId(id)
        docIdRef.current = id
        setSavedAgo(0)
        return id
      } else {
        await apiSend(`/api/documentos/${docIdRef.current}`, "PATCH", body)
        setSavedAgo(0)
        return docIdRef.current
      }
    } catch {
      return docIdRef.current
    } finally {
      savingRef.current = false
    }
  }, [data, clienteId, docNome, template.name, templateId])

  // Auto-save "salvo há …" ticker.
  useEffect(() => {
    const id = setInterval(() => setSavedAgo((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => { setSavedAgo(0) }, [data])

  const handleChange = useCallback((updated: ContratoHonorariosData) => {
    setData(updated)
  }, [])

  // ── AI edits → live preview highlight ────────────────────────────────────
  const [flashKeys, setFlashKeys] = useState<string[]>([])
  const dataRef = useRef(data)
  dataRef.current = data
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerFlash = useCallback((keys: string[]) => {
    if (keys.length === 0) return
    setFlashKeys(keys)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashKeys([]), 2800)
  }, [])
  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current) }, [])

  // Apply one or many AI suggestions from the LexIA chat: patch the live document
  // and flash each changed block in the A4 preview.
  const acceptSuggestions = useCallback((sugs: AISuggestion[]) => {
    if (sugs.length === 0) return
    let next = dataRef.current
    const touched: string[] = []
    for (const s of sugs) {
      const applied = applySuggestion(next, s.field, s.value)
      if (applied === next) continue // not applicable on the current tipo/contratante — skip
      touched.push(s.field)
      next = applied
    }
    if (touched.length === 0) return
    dataRef.current = next
    setData(next)
    triggerFlash(touched)
  }, [triggerFlash])

  const savedLabel = savedAgo < 5
    ? "Salvo agora"
    : savedAgo < 60
    ? `Salvo há ${savedAgo}s`
    : `Salvo há ${Math.floor(savedAgo / 60)}min`

  // ── Gerar documento: ensure saved → finalizado → preview ─────────────────
  const gerarDocumento = useCallback(async () => {
    if (generating) return
    setGenerating(true)
    try {
      let id = docIdRef.current
      if (saveTimer.current) clearTimeout(saveTimer.current)
      id = await persist()
      if (id != null) {
        try {
          await apiSend(`/api/documentos/${id}`, "PATCH", { status: "finalizado" })
        } catch {
          // best-effort
        }
        router.push(`/documents/preview?documento=${id}`)
      } else {
        router.push(`/documents/preview`)
      }
    } finally {
      setGenerating(false)
    }
  }, [generating, persist, router])

  // ── Header (breadcrumb + save status + Gerar documento) ──────────────────
  const header = (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      flexShrink: 0,
      height: 58,
      padding: "0 28px",
      borderBottom: `1px solid ${tokens.color.border}`,
      background: tokens.color.bg,
    }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
        <button
          onClick={() => router.push("/documents")}
          className={btn({ variant: "ghost" })}
          style={{ height: 28, padding: "0 8px 0 4px", display: "inline-flex", alignItems: "center", gap: 4, fontSize: "14px", color: tokens.color.textMuted }}
          title="Voltar para documentos"
        >
          <ChevronLeft size={14} />
          Contrato
        </button>
        <span style={{ color: tokens.color.textSubtle, fontSize: "14px" }}>/</span>
        <span style={{
          fontSize: "14px", fontWeight: 500, color: tokens.color.text,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          Honorários — {contratanteNome || "Novo"}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: "12px", color: tokens.color.textSubtle, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: tokens.color.ok, display: "inline-block" }} />
          {savedLabel}
        </span>

        {/* toggle: switch the docked panel between the LexIA chat and the manual form */}
        {isContratoTemplate && (
          <div className={layoutStyles.seg}>
            <SegBtn mode="chat" active={panelMode === "chat"} onClick={() => setPanelMode("chat")} icon={<Sparkles size={13} />}>
              LexIA
            </SegBtn>
            <SegBtn mode="form" active={panelMode === "form"} onClick={() => setPanelMode("form")} icon={<Pencil size={13} />}>
              Formulário
            </SegBtn>
          </div>
        )}

        <button
          onClick={() => void gerarDocumento()}
          disabled={generating}
          className={btn({ variant: "primary" })}
          style={{ height: 32, fontSize: "14px", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {generating ? "Gerando…" : "Gerar documento"}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {header}
      <div className={layoutStyles.editorBody}>
        {/* ── Center: A4 paper on a recessed well ─────────────────────── */}
        <section className={layoutStyles.previewWell}>
          <div className={layoutStyles.previewMeta}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: filled >= total ? tokens.color.ok : tokens.color.accent, flexShrink: 0 }} />
            {filled} / {total} campos · {Math.round((filled / total) * 100)}% preenchido
          </div>
          {isContratoTemplate ? (
            <ContratoHonorariosPreview data={data} zoom={DEFAULT_ZOOM} flashKeys={flashKeys} />
          ) : (
            <div style={{ color: tokens.color.textMuted, fontSize: 14 }}>Preview em breve.</div>
          )}
        </section>

        {/* ── Right: the manual form docks as a frosted side panel; the LexIA chat
              floats as the embedded popup in the lateral position ───────────── */}
        {panelMode === "form" && isContratoTemplate ? (
          <aside className={layoutStyles.docPanel}>
            <div className={layoutStyles.docPanelHeader}>
              <span className={layoutStyles.docPanelMark}>
                <span className="lex-orb-grad" style={{ position: "absolute", inset: -15, borderRadius: "50%" }} />
                <span style={{ position: "absolute", inset: 1.5, borderRadius: 6.5, background: "rgba(2,13,37,0.78)", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5E9C6" }}>
                  <Pencil size={14} strokeWidth={2} />
                </span>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.02em" }}>Preencher manualmente</div>
                <div style={{ fontSize: 11, color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: tokens.color.ok }} />
                  Campos do documento
                </div>
              </div>
            </div>

            {computedNome && (
              <div className={layoutStyles.docContextRow}>
                <FileText size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{computedNome}</span>
              </div>
            )}

            <div className={layoutStyles.formScroll}>
              <ContratoHonorariosForm
                data={data}
                onChange={handleChange}
                templateName={template.name}
                clienteId={clienteId}
                onClienteChange={(id) => setClienteId(id)}
              />
            </div>
          </aside>
        ) : (
          <EditorLexia
            dataRef={dataRef}
            docId={docId}
            templateId={templateId}
            computedNome={computedNome}
            onDocAccept={acceptSuggestions}
          />
        )}
      </div>
    </div>
  )
}

// segmented toggle button [LexIA | Formulário]
function SegBtn({ active, onClick, icon, children }: { mode: PanelMode; active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, height: 26, padding: "0 11px",
        borderRadius: 6, border: "none", cursor: "pointer",
        background: active ? tokens.color.surface : "transparent",
        color: active ? tokens.color.accent : tokens.color.textMuted,
        fontFamily: tokens.font.sans, fontSize: 12, fontWeight: 500, letterSpacing: "-0.01em",
        boxShadow: active ? tokens.color.shadowSm : "none",
        transition: "background 140ms ease-out, color 140ms ease-out",
      }}
    >
      {icon}
      {children}
    </button>
  )
}
