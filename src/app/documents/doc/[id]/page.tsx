"use client"

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Braces, Check, ChevronLeft, FileDown, FileText, PanelRight, Save } from "lucide-react"
import { apiSend } from "@/lib/client/api"
import { Icon } from "@/components/crm/crm-icons"
import { DocEditor } from "@/components/documents/editor2/DocEditor"
import { DocLexiaChat } from "@/components/documents/editor2/DocLexiaChat"
import { extractPlaceholders } from "@/lib/documents/model/placeholders"
import { aplicarCampos, lexDocText, type CampoDetectado } from "@/lib/documents/model/campos"
import { aplicarOps, type DocOp } from "@/lib/documents/model/ops"
import { DEFAULT_MARGINS_MM, emptyDoc, type LexDoc, type MarginsMm } from "@/lib/documents/model/types"
import type { DocumentoDetail, TimbradoDetail, TimbradoRow } from "@/lib/documentos/types"
import { btn } from "@/styles/components.css"
import { tokens } from "@/styles/tokens.css"

interface Props {
  params: Promise<{ id: string }>
}

export default function DocFlexEditorPage({ params }: Props) {
  const { id } = use(params)
  const docId = Number(id)
  const router = useRouter()

  const [nome, setNome] = useState("")
  const [doc, setDoc] = useState<LexDoc>(() => emptyDoc())
  const [valores, setValores] = useState<Record<string, string>>({})
  const [timbradoId, setTimbradoId] = useState<number | null>(null)
  const [timbrados, setTimbrados] = useState<TimbradoRow[]>([])
  const [timbrado, setTimbrado] = useState<TimbradoDetail | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [savedAgo, setSavedAgo] = useState(0)
  // editorKey bumps to remount the editor when the doc is mutated EXTERNALLY
  // (applying detected fields / LexIA ops) so the chips show up; typing never bumps it.
  const [editorKey, setEditorKey] = useState(0)
  const [opus, setOpus] = useState(false)
  const [salvandoModelo, setSalvandoModelo] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [chatOpen, setChatOpen] = useState(true)

  // ── load the document ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await apiSend<DocumentoDetail>(`/api/documentos/${docId}`, "GET")
        if (cancelled) return
        setNome(d.nome)
        if (d.conteudo && typeof d.conteudo === "object") setDoc(d.conteudo as LexDoc)
        if (d.valores) setValores(d.valores)
        setTimbradoId(d.timbradoId)
      } catch {
        // start blank on failure
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [docId])

  // ── letterheads (list + selected detail with the image) ────────────────────
  useEffect(() => {
    apiSend<{ timbrados: TimbradoRow[] }>(`/api/documentos/timbrados`, "GET")
      .then((r) => setTimbrados(r.timbrados))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (timbradoId == null) {
      setTimbrado(null)
      return
    }
    let cancelled = false
    apiSend<TimbradoDetail>(`/api/documentos/timbrados/${timbradoId}`, "GET")
      .then((t) => {
        if (!cancelled) setTimbrado(t)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [timbradoId])

  // ── autosave (debounced) ───────────────────────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const stateRef = useRef({ nome, doc, valores, timbradoId })
  stateRef.current = { nome, doc, valores, timbradoId }

  const persist = useCallback(async () => {
    if (savingRef.current) return
    savingRef.current = true
    try {
      const cur = stateRef.current
      await apiSend(`/api/documentos/${docId}`, "PATCH", {
        nome: cur.nome,
        conteudo: cur.doc,
        valores: cur.valores,
        timbradoId: cur.timbradoId,
      })
      setSavedAgo(0)
    } catch {
      // best-effort
    } finally {
      savingRef.current = false
    }
  }, [docId])

  useEffect(() => {
    if (!hydrated) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void persist(), 1200)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [nome, doc, valores, timbradoId, hydrated, persist])

  useEffect(() => {
    const i = setInterval(() => setSavedAgo((s) => s + 1), 1000)
    return () => clearInterval(i)
  }, [])
  useEffect(() => {
    setSavedAgo(0)
  }, [nome, doc, valores, timbradoId])

  const placeholders = useMemo(() => extractPlaceholders(doc), [doc])
  const filled = placeholders.filter((p) => (valores[p.name] ?? "").trim().length > 0).length
  const margins: MarginsMm = useMemo(
    () =>
      timbrado
        ? { top: timbrado.margemTop, right: timbrado.margemRight, bottom: timbrado.margemBottom, left: timbrado.margemLeft }
        : DEFAULT_MARGINS_MM,
    [timbrado],
  )

  const exportar = (formato: "pdf" | "docx") => window.open(`/api/documentos/${docId}/exportar?formato=${formato}`, "_blank")

  // ── apply LexIA suggestions / ops onto the live document ────────────────────
  const onApplyCampos = useCallback((campos: CampoDetectado[]) => {
    setDoc((d) => aplicarCampos(d, campos))
    setEditorKey((k) => k + 1)
  }, [])
  const onApplyOps = useCallback((ops: DocOp[]) => {
    const res = aplicarOps(stateRef.current.doc, stateRef.current.valores, ops)
    setDoc(res.doc)
    setValores(res.valores)
    setEditorKey((k) => k + 1)
  }, [])
  const closeChat = useCallback(() => setChatOpen(false), [])

  // The chat reads the doc text / fields / values LAZILY at send time (stable getter),
  // so typing body text doesn't re-render the memoized chat.
  const getChatContext = useCallback(
    () => ({
      texto: lexDocText(stateRef.current.doc),
      campos: extractPlaceholders(stateRef.current.doc).map((p) => ({ name: p.name, label: p.label })),
      valores: stateRef.current.valores,
    }),
    [],
  )

  const salvarModelo = async () => {
    if (salvandoModelo) return
    const nomeModelo = window.prompt("Nome do modelo (ficará disponível na aba Modelos):", nome)?.trim()
    if (!nomeModelo) return
    setSalvandoModelo(true)
    try {
      await apiSend("/api/documentos/templates", "POST", {
        nome: nomeModelo,
        categoria: "Outro",
        conteudo: doc,
        placeholders: extractPlaceholders(doc),
        timbradoId,
      })
      window.alert("Modelo salvo — disponível em Documentos → Modelos.")
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Falha ao salvar (apenas sócios podem criar modelos).")
    } finally {
      setSalvandoModelo(false)
    }
  }

  const savedLabel = savedAgo < 5 ? "Salvo agora" : savedAgo < 60 ? `Salvo há ${savedAgo}s` : `Salvo há ${Math.floor(savedAgo / 60)}min`

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
          height: 58,
          padding: "0 16px",
          borderBottom: `1px solid ${tokens.color.border}`,
          background: tokens.color.bg,
        }}
      >
        <button
          onClick={() => router.push("/documents")}
          className={btn({ variant: "ghost" })}
          style={{ width: 34, height: 34, padding: 0, borderRadius: 9, flexShrink: 0 }}
          title="Voltar para documentos"
        >
          <ChevronLeft size={18} />
        </button>
        <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: tokens.color.bgSunken, color: tokens.color.textMuted, flexShrink: 0 }}>
          <FileText size={16} />
        </span>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do documento"
          style={{
            border: "none",
            background: "transparent",
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: tokens.color.text,
            outline: "none",
            minWidth: 0,
            width: "min(420px, 40vw)",
          }}
        />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: tokens.color.textMuted, flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: savedAgo < 2 ? tokens.color.ok : tokens.color.ok, display: "inline-block" }} />
          {savedLabel}
        </span>

        <span style={{ flex: 1 }} />

        <button
          onClick={() => setPanelOpen((o) => !o)}
          className={btn({ variant: "ghost" })}
          style={{ width: 34, height: 34, padding: 0, borderRadius: 9 }}
          title="Campos & timbrado"
        >
          <PanelRight size={17} />
        </button>
        <button onClick={() => void salvarModelo()} disabled={salvandoModelo} className={btn({ variant: "ghost" })} style={{ height: 34, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Save size={14} /> {salvandoModelo ? "Salvando…" : "Salvar como modelo"}
        </button>
        <button onClick={() => exportar("docx")} className={btn({ variant: "secondary" })} style={{ height: 34, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <FileText size={14} /> DOCX
        </button>
        <button onClick={() => exportar("pdf")} className={btn({ variant: "primary" })} style={{ height: 34, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <FileDown size={14} /> PDF
        </button>
      </div>

      {/* Body: fields panel | editor | preview, with a floating LexIA chat */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, position: "relative" }}>
        {/* Fields & letterhead panel */}
        {panelOpen && (
          <aside style={{ width: 264, flexShrink: 0, overflowY: "auto", padding: 16, background: tokens.color.bgSoft, borderRight: `1px solid ${tokens.color.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: tokens.color.textSubtle, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 9 }}>Papel timbrado</div>
            <select
              value={timbradoId ?? ""}
              onChange={(e) => setTimbradoId(e.target.value ? Number(e.target.value) : null)}
              style={{ width: "100%", height: 40, borderRadius: 10, border: `1px solid ${tokens.color.border}`, background: tokens.color.surface, color: tokens.color.text, padding: "0 11px", fontSize: 13, fontFamily: tokens.font.sans }}
            >
              <option value="">Sem timbrado</option>
              {timbrados.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                  {t.padrao ? " (padrão)" : ""}
                </option>
              ))}
            </select>
            <a href="/documents/timbrados" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 12, color: tokens.color.accent, textDecoration: "none", fontWeight: 500 }}>
              Gerenciar papéis timbrados
            </a>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "22px 0 10px" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: tokens.color.textSubtle, textTransform: "uppercase", letterSpacing: "0.07em" }}>Campos</div>
              <span style={{ fontSize: 11, color: tokens.color.textMuted, fontVariantNumeric: "tabular-nums" }}>
                {filled}/{placeholders.length} preenchidos
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 999, background: tokens.color.bgSunken, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ height: "100%", width: `${placeholders.length ? (filled / placeholders.length) * 100 : 0}%`, background: tokens.color.accentStrong, borderRadius: 999, transition: "width .3s" }} />
            </div>

            {placeholders.length === 0 ? (
              <div style={{ fontSize: 12, color: tokens.color.textSubtle, lineHeight: 1.5, padding: "4px 2px" }}>
                Nenhum campo ainda. Use <strong style={{ color: tokens.color.textMuted }}>Campo</strong> na barra ou peça à LexIA para <strong style={{ color: tokens.color.accent }}>detectar campos</strong>.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {placeholders.map((ph) => {
                  const val = valores[ph.name] ?? ""
                  const isFilled = val.trim().length > 0
                  return (
                    <div key={ph.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 9, border: `1px solid ${tokens.color.border}`, background: tokens.color.surface }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: "grid", placeItems: "center", background: isFilled ? tokens.color.okSoft : tokens.color.accentSoft, color: isFilled ? tokens.color.ok : tokens.color.accent }}>
                        {isFilled ? <Check size={14} /> : <Braces size={14} />}
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: "block", fontSize: 12, color: tokens.color.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ph.label}</span>
                        <input
                          value={val}
                          onChange={(e) => setValores((v) => ({ ...v, [ph.name]: e.target.value }))}
                          placeholder={ph.defaultValue || ph.dataType}
                          style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontFamily: tokens.font.sans, fontSize: 12.5, fontWeight: 500, color: tokens.color.text, padding: 0, marginTop: 1 }}
                        />
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </aside>
        )}

        {/* Editor — Word-style A4 page view with the letterhead behind the text */}
        <section style={{ flex: "1 1 0", minWidth: 0 }}>
          {hydrated ? (
            <DocEditor key={editorKey} initialDoc={doc} onChange={setDoc} letterheadDataUrl={timbrado?.imagem ?? null} marginsMm={margins} />
          ) : (
            <div style={{ padding: 24, color: tokens.color.textMuted, fontSize: 14 }}>Carregando…</div>
          )}
        </section>

        {/* Floating LexIA chat */}
        {chatOpen ? (
          <DocLexiaChat
            getContext={getChatContext}
            opus={opus}
            setOpus={setOpus}
            onApplyCampos={onApplyCampos}
            onApplyOps={onApplyOps}
            onClose={closeChat}
          />
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            aria-label="Abrir LexIA"
            title="Abrir LexIA"
            className="crm-scope lex-aura-edge"
            style={{
              position: "absolute",
              bottom: 22,
              right: 22,
              zIndex: 60,
              width: 58,
              height: 58,
              padding: 0,
              cursor: "pointer",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)",
              // tinted-glass launcher orb: sheen over the acrylic pill tint +
              // rotating gold aura (the doc editor's own chat surface).
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.02) 52%, rgba(255,255,255,0) 72%), var(--lex-acrylic-pill)",
              backdropFilter: "blur(34px) saturate(1.7)",
              WebkitBackdropFilter: "blur(34px) saturate(1.7)",
              border: "1px solid var(--lex-acrylic-border)",
              boxShadow: "0 12px 28px rgba(2,13,37,0.34), 0 2px 6px rgba(2,13,37,0.22), inset 0 1px 0 rgba(255,255,255,0.2)",
              transition: "transform .42s cubic-bezier(.34,1.3,.5,1)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)" }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)" }}
          >
            <span aria-hidden="true" className="lex-icon-glow" style={{ position: "absolute", inset: "20%", borderRadius: "50%", background: "radial-gradient(circle, rgba(192,161,71,0.85), rgba(192,161,71,0) 70%)", filter: "blur(5px)", pointerEvents: "none" }} />
            <Icon name="sparkles" size={26} strokeWidth={2} style={{ position: "relative", zIndex: 1 }} />
          </button>
        )}
      </div>
    </div>
  )
}
