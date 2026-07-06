"use client"

import { memo, use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, FileDown, FileText, PanelLeft, PanelRight, Save } from "lucide-react"
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
import { DocFormPanel } from "@/components/documents/editor2/DocFormPanel"
import { autofillFromCliente, clienteCreateFromValores } from "@/components/documents/editor2/cliente-fill"
import { LexiaChat } from "@/components/lexia/LexiaChat"
import type { DocPatchPayload } from "@/components/lexia/DocPatchCard"
import type { DocumentoContexto } from "@/components/lexia/types"
import { extractPlaceholders } from "@/lib/documents/model/placeholders"
import { aplicarCampos, lexDocText, type CampoDetectado } from "@/lib/documents/model/campos"
import { aplicarOps, partitionOps, type DocOp } from "@/lib/documents/model/ops"
import { DEFAULT_MARGINS_MM, emptyDoc, type LexDoc, type MarginsMm } from "@/lib/documents/model/types"
import type { DocumentoDetail, TimbradoDetail, TimbradoRow } from "@/lib/documentos/types"
import type { ClienteRow } from "@/lib/finance/types"
import type { ClienteDetail } from "@/lib/clientes/types"
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
  // Cliente vinculado (auto-preenche os campos por tipo; ou cria um novo do form).
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [clienteNome, setClienteNome] = useState<string | null>(null)
  const [flashNames, setFlashNames] = useState<Set<string>>(() => new Set())
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
  // Bump p/ focar o composer da LexIA (barra flutuante "Editar com a LexIA").
  const [lexiaFocusSeq, setLexiaFocusSeq] = useState(0)
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
        setClienteId(d.clienteId ?? null)
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

  // Nome do cliente vinculado (só busca ao carregar; pick/create já definem o nome).
  useEffect(() => {
    if (clienteId == null || clienteNome != null) return
    let cancelled = false
    apiSend<ClienteDetail>(`/api/clientes/${clienteId}`, "GET")
      .then((c) => {
        if (!cancelled) setClienteNome(c.header.nome)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [clienteId, clienteNome])

  // ── autosave (debounced) ───────────────────────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const stateRef = useRef({ nome, doc, valores, timbradoId, clienteId })
  stateRef.current = { nome, doc, valores, timbradoId, clienteId }

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
        clienteId: cur.clienteId,
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
  }, [nome, doc, valores, timbradoId, clienteId, hydrated, persist])

  useEffect(() => {
    const i = setInterval(() => setSavedAgo((s) => s + 1), 1000)
    return () => clearInterval(i)
  }, [])
  useEffect(() => {
    setSavedAgo(0)
  }, [nome, doc, valores, timbradoId, clienteId])

  const placeholders = useMemo(() => extractPlaceholders(doc), [doc])
  const margins: MarginsMm = useMemo(
    () =>
      timbrado
        ? { top: timbrado.margemTop, right: timbrado.margemRight, bottom: timbrado.margemBottom, left: timbrado.margemLeft }
        : DEFAULT_MARGINS_MM,
    [timbrado],
  )

  const exportar = (formato: "pdf" | "docx") => window.open(`/api/documentos/${docId}/exportar?formato=${formato}`, "_blank")

  // ── apply LexIA suggestions / ops onto the live document ────────────────────
  // Ao detectar campos sobre um texto que JÁ existe, o texto casado vira o VALOR
  // do campo (não esvazia) — o documento continua mostrando o conteúdo, agora
  // como um campo preenchido, e o painel conta como preenchido.
  const onApplyCampos = useCallback((campos: CampoDetectado[]) => {
    setDoc((d) => aplicarCampos(d, campos))
    setValores((v) => {
      const next = { ...v }
      for (const c of campos) {
        const val = (c.exactText ?? "").trim()
        if (c.name && val && !(next[c.name] ?? "").trim()) next[c.name] = val
      }
      return next
    })
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

  // ── cliente vinculado (auto-preenche / cria) ────────────────────────────────
  const setValor = useCallback((name: string, value: string) => setValores((v) => ({ ...v, [name]: value })), [])

  const flashCampos = useCallback((names: string[]) => {
    if (!names.length) return
    setFlashNames(new Set(names))
    window.setTimeout(() => setFlashNames(new Set()), 1100)
  }, [])

  const onPickCliente = useCallback(
    (c: ClienteRow) => {
      setClienteId(c.id)
      setClienteNome(c.nome)
      apiSend<ClienteDetail>(`/api/clientes/${c.id}`, "GET")
        .then((detail) => {
          const fill = autofillFromCliente(extractPlaceholders(stateRef.current.doc), detail.header)
          const keys = Object.keys(fill)
          if (keys.length) {
            setValores((v) => ({ ...v, ...fill }))
            flashCampos(keys)
          }
        })
        .catch(() => {})
    },
    [flashCampos],
  )

  const onCreateCliente = useCallback((nomeHint: string) => {
    const body = clienteCreateFromValores(extractPlaceholders(stateRef.current.doc), stateRef.current.valores, nomeHint)
    apiSend<{ id: number; nome?: string }>("/api/clientes", "POST", body)
      .then((c) => {
        setClienteId(c.id)
        setClienteNome(c.nome ?? body.nome)
      })
      .catch((e) => window.alert(e instanceof Error ? e.message : "Falha ao criar cliente."))
  }, [])

  const onUnlinkCliente = useCallback(() => {
    setClienteId(null)
    setClienteNome(null)
  }, [])

  const onLocateField = useCallback((name: string) => editorRef.current?.locateField(name), [])

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

  // Barra flutuante → "Editar com a LexIA": abre o painel, foca o composer (a
  // seleção já vira chip) e dá um feedback visual (pulse no composer).
  const editWithLexia = useCallback(() => {
    setLexiaOpen(true)
    setLexiaFocusSeq((n) => n + 1)
  }, [])
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
        <button onClick={() => setPanelOpen((o) => !o)} className={btn({ variant: "ghost" })} style={toggleBtn(panelOpen)} title="Mostrar/ocultar campos & papel timbrado">
          <PanelLeft size={17} />
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

      {/* Body: formulário (esq, toggle) | editor | LexIA (dir, toggle) */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Form panel (design "LexIA - Documentos": filled inputs + cliente + timbrado) */}
        {panelOpen && (
          <div style={{ width: 320, flexShrink: 0, minHeight: 0 }}>
            <DocFormPanel
              placeholders={placeholders}
              valores={valores}
              setValor={setValor}
              timbrados={timbrados}
              timbradoId={timbradoId}
              setTimbradoId={setTimbradoId}
              timbradoImagem={timbrado?.imagem ?? null}
              clienteId={clienteId}
              clienteNome={clienteNome}
              onPickCliente={onPickCliente}
              onCreateCliente={onCreateCliente}
              onUnlinkCliente={onUnlinkCliente}
              onLocateField={onLocateField}
              flashNames={flashNames}
            />
          </div>
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
              focusSeq={lexiaFocusSeq}
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
