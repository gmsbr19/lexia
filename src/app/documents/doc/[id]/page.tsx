"use client"

import { memo, use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronLeft, FileDown, FileText, PanelLeft, PanelRight, Save } from "lucide-react"
import { apiSend } from "@/lib/client/api"
import {
  DocEditor,
  type ArmClickInfo,
  type DocEditorHandle,
  type DocSelecao,
  type FieldClickInfo,
  type MarkState,
} from "@/components/documents/editor2/DocEditor"
import { ArmFieldPopover, FieldFillPopover, SelectionToolbar, type AnchorRect } from "@/components/documents/editor2/EditorPopovers"
import { TimbradoPicker } from "@/components/documents/editor2/TimbradoPicker"
import { fieldTypeMeta } from "@/components/documents/editor2/field-types"
import { LexiaChat } from "@/components/lexia/LexiaChat"
import type { DocPatchPayload } from "@/components/lexia/DocPatchCard"
import type { DocumentoContexto } from "@/components/lexia/types"
import { extractPlaceholders } from "@/lib/documents/model/placeholders"
import { aplicarCampos, lexDocText, type CampoDetectado } from "@/lib/documents/model/campos"
import { aplicarOps, partitionOps, type DocOp } from "@/lib/documents/model/ops"
import { DEFAULT_MARGINS_MM, emptyDoc, type LexDoc, type MarginsMm } from "@/lib/documents/model/types"
import type { DocumentoDetail, TimbradoDetail, TimbradoRow } from "@/lib/documentos/types"
import { btn } from "@/styles/components.css"
import { tokens } from "@/styles/tokens.css"

// Memoizado: digitar no editor re-renderiza a page, mas com props estáveis o chat
// (mesma superfície da LexIA global) NÃO re-renderiza a cada tecla.
const EmbeddedLexiaChat = memo(LexiaChat)
const NOOP = () => {}
const NO_MARKS: MarkState = { bold: false, italic: false, underline: false }

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
  const [salvandoModelo, setSalvandoModelo] = useState(false)
  // Ambos os painéis abrem por padrão: campos & timbrado (esq) + LexIA (dir).
  // Recolhíveis pelos toggles do cabeçalho.
  const [panelOpen, setPanelOpen] = useState(true)
  const [lexiaOpen, setLexiaOpen] = useState(true)
  // Seleção de texto no editor → chip "Trecho" no composer da LexIA + barra flutuante.
  const [selection, setSelection] = useState<DocSelecao | null>(null)
  const [selRect, setSelRect] = useState<AnchorRect | null>(null)
  const [selMarks, setSelMarks] = useState<MarkState>(NO_MARKS)
  // Popovers do editor (glass): preencher campo no papel · posicionar novo campo.
  const [fillField, setFillField] = useState<FieldClickInfo | null>(null)
  const [armPopover, setArmPopover] = useState<ArmClickInfo | null>(null)
  const editorRef = useRef<DocEditorHandle>(null)
  const selectionRef = useRef<DocSelecao | null>(null)
  selectionRef.current = selection

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

  // Aplica as edições propostas pela LexIA (card "Aplicar"). Ops por POSIÇÃO (seleção)
  // vão pelo editor VIVO (sem remontar, preservam undo + realce de IA); se o intervalo
  // ficou obsoleto, caem p/ busca textual (op.de). Ops de texto/campo vão por aplicarOps
  // + remontagem (p/ os chips aparecerem). Passes separados — posição primeiro.
  const onDocAccept = useCallback(
    (payload: DocPatchPayload) => {
      if (payload.campos?.length) {
        onApplyCampos(payload.campos)
        return
      }
      const ops = payload.ops ?? []
      if (!ops.length) return
      const { jsonOps, posOps } = partitionOps(ops)
      const fallback: DocOp[] = []
      let anyPos = false
      for (const op of posOps) {
        if (editorRef.current?.applyPosOp(op)) anyPos = true
        else if (op.tipo === "substituir_selecao" && op.de) fallback.push({ tipo: "substituir_texto", de: op.de, para: op.para ?? "" })
        else if (op.tipo === "inserir_apos_selecao" && op.texto?.trim()) fallback.push({ tipo: "inserir_paragrafo", texto: op.texto })
        else if (op.tipo === "formatar_selecao" && op.de && op.marca) fallback.push({ tipo: "formatar_texto", de: op.de, marca: op.marca, remover: op.remover })
      }
      const allJson = [...jsonOps, ...fallback]
      if (allJson.length) {
        const base = anyPos && editorRef.current ? editorRef.current.getDoc() : stateRef.current.doc
        const res = aplicarOps(base, stateRef.current.valores, allJson)
        setDoc(res.doc)
        setValores(res.valores)
        setEditorKey((k) => k + 1)
      }
      setSelection(null)
      setSelRect(null)
    },
    [onApplyCampos],
  )

  const clearSelection = useCallback(() => {
    setSelection(null)
    setSelRect(null)
  }, [])

  // Seleção do editor → estado da page (chip da LexIA + barra flutuante + marcas).
  const handleSelectionChange = useCallback((sel: DocSelecao | null) => {
    setSelection(sel)
    if (sel && editorRef.current) {
      setSelRect(editorRef.current.rectOfRange(sel.from, sel.to))
      setSelMarks(editorRef.current.markState())
    } else {
      setSelRect(null)
    }
  }, [])

  // Reancora a barra flutuante quando o editor rola / redimensiona.
  useEffect(() => {
    const recompute = () => {
      const sel = selectionRef.current
      if (sel && editorRef.current) setSelRect(editorRef.current.rectOfRange(sel.from, sel.to))
    }
    window.addEventListener("scroll", recompute, true)
    window.addEventListener("resize", recompute)
    return () => {
      window.removeEventListener("scroll", recompute, true)
      window.removeEventListener("resize", recompute)
    }
  }, [])

  // O chat lê texto/campos/valores/seleção LAZILY no envio (getter estável), então
  // digitar o corpo não re-renderiza o chat memoizado.
  const getChatContext = useCallback(
    (): DocumentoContexto => ({
      id: docId,
      texto: lexDocText(stateRef.current.doc),
      campos: extractPlaceholders(stateRef.current.doc).map((p) => ({ name: p.name, label: p.label })),
      valores: stateRef.current.valores,
      selecao: editorRef.current?.getSelection() ?? undefined,
    }),
    [docId],
  )

  // Barra flutuante → "Editar com a LexIA": abre o painel (a seleção já vira chip).
  const editWithLexia = useCallback(() => setLexiaOpen(true), [])
  const formatSelection = useCallback((mark: "bold" | "italic" | "underline") => {
    editorRef.current?.toggleMark(mark)
    const sel = selectionRef.current
    if (sel && editorRef.current) {
      setSelMarks(editorRef.current.markState())
      setSelRect(editorRef.current.rectOfRange(sel.from, sel.to))
    }
  }, [])

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
  const toggleBtn = (active: boolean): React.CSSProperties => ({ width: 34, height: 34, padding: 0, borderRadius: 9, flexShrink: 0, color: active ? tokens.color.accent : tokens.color.textMuted })

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
        <button onClick={() => router.push("/documents")} className={btn({ variant: "ghost" })} style={{ width: 34, height: 34, padding: 0, borderRadius: 9, flexShrink: 0 }} title="Voltar para documentos">
          <ChevronLeft size={18} />
        </button>
        <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: tokens.color.bgSunken, color: tokens.color.textMuted, flexShrink: 0 }}>
          <FileText size={16} />
        </span>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do documento"
          style={{ border: "none", background: "transparent", fontSize: 15, fontWeight: 500, letterSpacing: "-0.02em", color: tokens.color.text, outline: "none", minWidth: 0, width: "min(420px, 34vw)" }}
        />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: tokens.color.textMuted, flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: tokens.color.ok, display: "inline-block" }} />
          {savedLabel}
        </span>

        <span style={{ flex: 1 }} />

        <button onClick={() => setPanelOpen((o) => !o)} className={btn({ variant: "ghost" })} style={toggleBtn(panelOpen)} title="Mostrar/ocultar campos & papel timbrado">
          <PanelLeft size={17} />
        </button>
        <button onClick={() => setLexiaOpen((o) => !o)} className={btn({ variant: "ghost" })} style={toggleBtn(lexiaOpen)} title="Mostrar/ocultar a LexIA">
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

      {/* Body: campos (esq, toggle) | editor | LexIA (dir, toggle) */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Fields & letterhead panel */}
        {panelOpen && (
          <aside style={{ width: 272, flexShrink: 0, overflowY: "auto", padding: 16, background: tokens.color.bgSoft, borderRight: `1px solid ${tokens.color.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: tokens.color.textSubtle, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 9 }}>Papel timbrado</div>
            <TimbradoPicker timbrados={timbrados} value={timbradoId} onChange={setTimbradoId} selectedImage={timbrado?.imagem ?? null} />

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
                  const { Icon, label: typeLabel } = fieldTypeMeta(ph.dataType)
                  return (
                    <div key={ph.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 9, border: `1px solid ${tokens.color.border}`, background: tokens.color.surface }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: "grid", placeItems: "center", background: isFilled ? tokens.color.okSoft : tokens.color.accentSoft, color: isFilled ? tokens.color.ok : tokens.color.accent }}>
                        {isFilled ? <Check size={14} /> : <Icon size={14} />}
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: "block", fontSize: 12, color: tokens.color.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ph.label}</span>
                        <input
                          value={val}
                          onChange={(e) => setValores((v) => ({ ...v, [ph.name]: e.target.value }))}
                          placeholder={`A preencher · ${typeLabel}`}
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
            <DocEditor
              key={editorKey}
              ref={editorRef}
              initialDoc={doc}
              onChange={setDoc}
              letterheadDataUrl={timbrado?.imagem ?? null}
              marginsMm={margins}
              valores={valores}
              onSelectionChange={handleSelectionChange}
              onMarksChange={setSelMarks}
              onFieldClick={setFillField}
              onArmClick={setArmPopover}
            />
          ) : (
            <div style={{ padding: 24, color: tokens.color.textMuted, fontSize: 14 }}>Carregando…</div>
          )}
        </section>

        {/* LexIA — painel DOCADO à direita (mesma superfície da global). Recolhível. */}
        {lexiaOpen && (
          <aside style={{ width: 384, flexShrink: 0, minWidth: 0, borderLeft: `1px solid ${tokens.color.border}`, overflow: "hidden" }}>
            <EmbeddedLexiaChat
              open
              embedded
              greetingName=""
              page="documents"
              mode="float"
              onModeChange={NOOP}
              askSeq={0}
              bottomInset={0}
              onMinimize={NOOP}
              docContext={getChatContext}
              onDocAccept={onDocAccept}
              selection={selection}
              onClearSelection={clearSelection}
            />
          </aside>
        )}
      </div>

      {/* Glass popovers do editor */}
      {selection && selRect && !fillField && !armPopover && (
        <SelectionToolbar rect={selRect} active={selMarks} onFormat={formatSelection} onEditWithLexia={editWithLexia} />
      )}
      {fillField && (
        <FieldFillPopover
          field={fillField}
          value={valores[fillField.name] ?? ""}
          rect={fillField.rect}
          onChange={(v) => setValores((prev) => ({ ...prev, [fillField.name]: v }))}
          onClear={() => setValores((prev) => ({ ...prev, [fillField.name]: "" }))}
          onClose={() => setFillField(null)}
        />
      )}
      {armPopover && (
        <ArmFieldPopover
          rect={armPopover.rect}
          onSubmit={(field) => {
            editorRef.current?.insertFieldAt(armPopover.pos, field)
            setArmPopover(null)
          }}
          onClose={() => setArmPopover(null)}
        />
      )}
    </div>
  )
}
