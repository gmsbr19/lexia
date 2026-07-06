"use client"

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import clsx from "clsx"
import { lexGlassStrong } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"
import { editorExtensions } from "@/lib/documents/editor-schema"
import { DEFAULT_MARGINS_MM, type MarginsMm, type LexDoc } from "@/lib/documents/model/types"
import type { PlaceholderType } from "@/lib/documents/model/types"
import type { DocOp } from "@/lib/documents/model/ops"
import { Pagination, paginationKey } from "./pagination"
import { AiFlash, aiFlashKey } from "./ai-flash"
import { makePlaceholderNodeView, PlaceholderRefresh, placeholderRefreshKey } from "./placeholder-view"
import type { AnchorRect } from "./EditorPopovers"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  Crosshair,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  SeparatorHorizontal,
  Strikethrough,
  Underline as UnderlineIcon,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { lexToProseMirror, proseMirrorToLex, type PMNode } from "@/lib/documents/model/tiptap"
import type { Node as ProseNode } from "@tiptap/pm/model"
import * as s from "./doc-editor.css"

// ── slug helper for a new field's stable key ───────────────────────────────────
function slug(label: string): string {
  return (
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50) || "campo"
  )
}

// ── toolbar ────────────────────────────────────────────────────────────────────
function Btn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      className={clsx(s.tbtn, active && s.tbtnActive)}
      onMouseDown={(e) => e.preventDefault()} // keep the editor selection
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Toolbar({
  editor,
  armed,
  onToggleArm,
  onCampoAtCursor,
}: {
  editor: Editor
  armed: boolean
  onToggleArm: () => void
  onCampoAtCursor: () => void
}) {
  const ICON = 15
  // Comandos que trocam a ESTRUTURA/altura do bloco (align/título/lista/citação/
  // quebra) usam setNodeMarkup, que pode deixar as decorações da paginação
  // mal-mapeadas (texto "corrido" ignorando as margens das páginas 2+). Forçar um
  // recompute limpo depois — como um remount faria — reancorra as quebras.
  const blockCmd = (fn: () => void) => {
    fn()
    editor.view.dispatch(editor.state.tr.setMeta(paginationKey, "recompute"))
  }
  return (
    <div className={s.toolbar}>
      <Btn title="Negrito" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={ICON} />
      </Btn>
      <Btn title="Itálico" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={ICON} />
      </Btn>
      <Btn title="Sublinhado" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon size={ICON} />
      </Btn>
      <Btn title="Riscado" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough size={ICON} />
      </Btn>

      <span className={s.sep} />

      <Btn title="Título 1" active={editor.isActive("heading", { level: 1 })} onClick={() => blockCmd(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}>
        <Heading1 size={ICON} />
      </Btn>
      <Btn title="Título 2" active={editor.isActive("heading", { level: 2 })} onClick={() => blockCmd(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}>
        <Heading2 size={ICON} />
      </Btn>
      <Btn title="Lista" active={editor.isActive("bulletList")} onClick={() => blockCmd(() => editor.chain().focus().toggleBulletList().run())}>
        <List size={ICON} />
      </Btn>
      <Btn title="Lista numerada" active={editor.isActive("orderedList")} onClick={() => blockCmd(() => editor.chain().focus().toggleOrderedList().run())}>
        <ListOrdered size={ICON} />
      </Btn>
      <Btn title="Citação" active={editor.isActive("blockquote")} onClick={() => blockCmd(() => editor.chain().focus().toggleBlockquote().run())}>
        <Quote size={ICON} />
      </Btn>

      <span className={s.sep} />

      <Btn title="Alinhar à esquerda" active={editor.isActive({ textAlign: "left" })} onClick={() => blockCmd(() => editor.chain().focus().setTextAlign("left").run())}>
        <AlignLeft size={ICON} />
      </Btn>
      <Btn title="Centralizar" active={editor.isActive({ textAlign: "center" })} onClick={() => blockCmd(() => editor.chain().focus().setTextAlign("center").run())}>
        <AlignCenter size={ICON} />
      </Btn>
      <Btn title="Alinhar à direita" active={editor.isActive({ textAlign: "right" })} onClick={() => blockCmd(() => editor.chain().focus().setTextAlign("right").run())}>
        <AlignRight size={ICON} />
      </Btn>
      <Btn title="Justificar" active={editor.isActive({ textAlign: "justify" })} onClick={() => blockCmd(() => editor.chain().focus().setTextAlign("justify").run())}>
        <AlignJustify size={ICON} />
      </Btn>

      <span className={s.sep} />

      <Btn title="Inserir campo no cursor" onClick={onCampoAtCursor}>
        <Braces size={ICON} />
        <span style={{ fontSize: 12 }}>Campo</span>
      </Btn>
      <Btn title="Posicionar campo — clique no texto para inserir" active={armed} onClick={onToggleArm}>
        <Crosshair size={ICON} />
      </Btn>
      <Btn title="Quebra de página" onClick={() => blockCmd(() => editor.chain().focus().insertContent({ type: "pageBreak" }).run())}>
        <SeparatorHorizontal size={ICON} />
      </Btn>
    </div>
  )
}

// ── editor ─────────────────────────────────────────────────────────────────────
// Word-style "page view": the editable paper is A4-width, shows the selected
// letterhead as a per-page background (repeat-y), pads to the timbrado's safe-area
// margins, and draws a faint divider at every A4 page boundary. Content still flows
// continuously (true content-splitting needs a full pagination engine) — the
// exported PDF remains the exact paginated truth.
const PAGE_GUIDE = "linear-gradient(to bottom, transparent calc(100% - 1.5px), rgba(2,13,37,0.10) calc(100% - 1.5px))"
// A4 width in CSS px (210mm) + the editorScroll horizontal padding — used to
// fit the paper to the available column width by default.
const A4_W_PX = (210 * 96) / 25.4
const EDITOR_PAD_X = 24

// Leaf text ao ler a seleção: um campo (placeholder) aparece como {{Rótulo}} —
// legível no chip "Trecho" da LexIA e no contexto (em vez do caractere de folha
// ￼). Usado de forma CONSISTENTE em getSelection/onSelectionUpdate e na
// verificação anti-stale do applyPosOp, então os textos batem.
const LEAF = "￼"
const selLeaf = (node: ProseNode): string =>
  node.type.name === "placeholder" ? `{{${String(node.attrs.label || node.attrs.name || "campo")}}}` : LEAF

export interface DocSelecao {
  texto: string
  from: number
  to: number
}

export interface FieldClickInfo {
  name: string
  label: string
  dataType: PlaceholderType
  from: number
  to: number
  rect: AnchorRect
}
export interface ArmClickInfo {
  pos: number
  rect: AnchorRect
}
export interface MarkState {
  bold: boolean
  italic: boolean
  underline: boolean
}

// Handle imperativo: a LexIA edita o trecho selecionado de forma CIRÚRGICA (por
// posição) através do editor vivo (mantém undo/redo, sem remontar). As ops por
// posição carregam `de` (texto original da seleção) p/ verificação anti-stale.
export interface DocEditorHandle {
  getSelection: () => DocSelecao | null
  coordsOf: (pos: number) => { left: number; top: number; bottom: number } | null
  /** Retângulo (viewport) que cobre um intervalo — p/ ancorar a barra flutuante. */
  rectOfRange: (from: number, to: number) => AnchorRect | null
  /** Estado das marcas na seleção atual (barra flutuante). */
  markState: () => MarkState
  /** Alterna uma marca na seleção (barra flutuante). */
  toggleMark: (mark: "bold" | "italic" | "underline" | "strike") => void
  /** Insere um placeholder numa posição do documento (Campo / posicionar campo). */
  insertFieldAt: (pos: number, field: { label: string; dataType: PlaceholderType }) => void
  /** Realce dourado transitório num intervalo (edição aplicada pela IA). */
  flashRange: (from: number, to: number) => void
  /** Rola até o campo (placeholder) com este `name` no documento e o realça. */
  locateField: (name: string) => void
  /** Aplica uma op de POSIÇÃO; devolve false se o intervalo ficou obsoleto (o page faz fallback). */
  applyPosOp: (op: DocOp) => boolean
  /** LexDoc atual do editor (após as ops por posição) — base p/ aplicar as ops em JSON. */
  getDoc: () => LexDoc
}

export const DocEditor = forwardRef<DocEditorHandle, {
  initialDoc: LexDoc
  onChange: (doc: LexDoc) => void
  letterheadDataUrl?: string | null
  marginsMm?: MarginsMm
  valores?: Record<string, string>
  onSelectionChange?: (sel: DocSelecao | null) => void
  onMarksChange?: (marks: MarkState) => void
  onFieldClick?: (info: FieldClickInfo) => void
  onArmClick?: (info: ArmClickInfo) => void
}>(function DocEditor(
  { initialDoc, onChange, letterheadDataUrl, marginsMm, valores, onSelectionChange, onMarksChange, onFieldClick, onArmClick },
  ref,
) {
  // Refs p/ callbacks sempre frescos (o useEditor captura closures só na criação).
  const onSelRef = useRef(onSelectionChange)
  onSelRef.current = onSelectionChange
  const onMarksRef = useRef(onMarksChange)
  onMarksRef.current = onMarksChange
  const onFieldClickRef = useRef(onFieldClick)
  onFieldClickRef.current = onFieldClick
  const onArmClickRef = useRef(onArmClick)
  onArmClickRef.current = onArmClick
  // valores lido pelo NodeView do placeholder (mostra o valor no papel quando preenchido).
  const valoresRef = useRef(valores)
  valoresRef.current = valores

  // Modo "posicionar campo" (mira): o próximo clique no texto insere um campo.
  const [armed, setArmed] = useState(false)
  const armedRef = useRef(false)
  armedRef.current = armed

  // Zoom da folha (0.4–2.0). Aplicado via CSS `zoom` (escala de LAYOUT) — a paginação
  // compara clientWidth × getBoundingClientRect, ambos no mesmo espaço escalado, então
  // os cálculos de quebra continuam consistentes em qualquer zoom. Por padrão a folha
  // ENCAIXA na largura disponível (entre os painéis); zoom manual desliga o auto-fit.
  const scrollRef = useRef<HTMLDivElement>(null)
  const manualZoomRef = useRef(false)
  const [zoom, setZoom] = useState(1)
  const fitZoom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const avail = el.clientWidth - EDITOR_PAD_X * 2
    if (avail <= 0) return
    setZoom(Math.max(0.4, Math.min(1, Math.round((avail / A4_W_PX) * 100) / 100)))
  }, [])
  const zoomIn = () => {
    manualZoomRef.current = true
    setZoom((z) => Math.min(2, Math.round((z + 0.1) * 100) / 100))
  }
  const zoomOut = () => {
    manualZoomRef.current = true
    setZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 100) / 100))
  }
  const zoomFit = () => {
    manualZoomRef.current = false
    fitZoom()
  }

  const editor = useEditor({
    immediatelyRender: false, // SSR-safe in the App Router
    extensions: [...editorExtensions, Pagination, AiFlash, PlaceholderRefresh],
    content: lexToProseMirror(initialDoc),
    editorProps: {
      nodeViews: {
        placeholder: makePlaceholderNodeView((name) => valoresRef.current?.[name] ?? ""),
      },
      // Clicar num campo → popover de preenchimento (a menos que esteja no modo mira).
      handleClickOn(view, _pos, node, nodePos) {
        if (armedRef.current) return false
        if (node.type.name !== "placeholder") return false
        try {
          const c = view.coordsAtPos(nodePos)
          onFieldClickRef.current?.({
            name: String(node.attrs.name || ""),
            label: String(node.attrs.label || node.attrs.name || "campo"),
            dataType: (node.attrs.dataType as PlaceholderType) ?? "texto",
            from: nodePos,
            to: nodePos + node.nodeSize,
            rect: { left: c.left, top: c.top, bottom: c.bottom },
          })
        } catch {
          return false
        }
        return true
      },
      // Modo mira: o clique escolhe a posição e abre o popover "novo campo".
      handleClick(view, pos) {
        if (!armedRef.current) return false
        try {
          const c = view.coordsAtPos(pos)
          onArmClickRef.current?.({ pos, rect: { left: c.left, top: c.top, bottom: c.bottom } })
        } catch {
          /* ignore */
        }
        setArmed(false)
        return true
      },
    },
    onUpdate: ({ editor }) => {
      onChange(proseMirrorToLex(editor.getJSON() as unknown as PMNode))
      // Uma alteração de MARCA (negrito via barra do topo / Ctrl+B) NÃO muda o
      // intervalo da seleção, então onSelectionUpdate não dispara — reemitimos o
      // estado das marcas aqui p/ a barra flutuante não ficar dessincronizada.
      const { from, to } = editor.state.selection
      if (from !== to) {
        onMarksRef.current?.({ bold: editor.isActive("bold"), italic: editor.isActive("italic"), underline: editor.isActive("underline") })
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      if (from === to) {
        onSelRef.current?.(null)
        return
      }
      const texto = editor.state.doc.textBetween(from, to, "\n", selLeaf)
      onSelRef.current?.(texto.trim() ? { texto, from, to } : null)
    },
  })

  // API imperativa p/ a edição por seleção (estilo Copilot). Aplicar pelo editor
  // VIVO (não remontar) preserva posições e o undo nativo do ProseMirror.
  useImperativeHandle(
    ref,
    (): DocEditorHandle => {
      const clamp = (p: number) => (editor ? Math.max(0, Math.min(p, editor.state.doc.content.size)) : 0)
      const coordsAt = (pos: number) => {
        if (!editor) return null
        try {
          const c = editor.view.coordsAtPos(clamp(pos))
          return { left: c.left, top: c.top, bottom: c.bottom }
        } catch {
          return null
        }
      }
      const flash = (from: number, to: number) => {
        if (!editor || to <= from) return
        editor.view.dispatch(editor.state.tr.setMeta(aiFlashKey, { type: "flash", from, to }))
        window.setTimeout(() => {
          if (!editor || editor.isDestroyed) return
          editor.view.dispatch(editor.state.tr.setMeta(aiFlashKey, { type: "clear" }))
        }, 1700)
      }
      return {
        getSelection: () => {
          if (!editor) return null
          const { from, to } = editor.state.selection
          if (from === to) return null
          const texto = editor.state.doc.textBetween(from, to, "\n", selLeaf)
          return texto.trim() ? { texto, from, to } : null
        },
        coordsOf: coordsAt,
        rectOfRange: (from, to) => {
          const a = coordsAt(from)
          const b = coordsAt(to)
          if (!a || !b) return null
          return { left: Math.min(a.left, b.left), right: Math.max(a.left, b.left), top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) }
        },
        markState: () =>
          editor
            ? { bold: editor.isActive("bold"), italic: editor.isActive("italic"), underline: editor.isActive("underline") }
            : { bold: false, italic: false, underline: false },
        toggleMark: (mark) => {
          if (!editor) return
          const chain = editor.chain().focus()
          if (mark === "bold") chain.toggleBold()
          else if (mark === "italic") chain.toggleItalic()
          else if (mark === "underline") chain.toggleUnderline()
          else chain.toggleStrike()
          chain.run()
        },
        insertFieldAt: (pos, field) => {
          if (!editor) return
          editor
            .chain()
            .focus()
            .insertContentAt(clamp(pos), { type: "placeholder", attrs: { name: slug(field.label), label: field.label, dataType: field.dataType, defaultValue: "" } })
            .run()
        },
        flashRange: flash,
        locateField: (name) => {
          if (!editor) return
          let at = -1
          let size = 0
          editor.state.doc.descendants((node, pos) => {
            if (at >= 0) return false
            if (node.type.name === "placeholder" && node.attrs.name === name) {
              at = pos
              size = node.nodeSize
            }
            return true
          })
          if (at < 0) return
          editor.chain().focus().setTextSelection(at).scrollIntoView().run()
          flash(at, at + size)
        },
        applyPosOp: (op) => {
          if (!editor) return false
          const size = editor.state.doc.content.size
          const from = op.from ?? -1
          const to = op.to ?? -1
          if (from < 0 || to < from || to > size) return false
          // Verificação anti-stale: o intervalo ainda contém o texto original (`de`)?
          if (op.de != null && editor.state.doc.textBetween(from, to, "\n", selLeaf) !== op.de) return false
          if (op.tipo === "substituir_selecao") {
            const para = op.para ?? ""
            const chain = editor.chain().focus()
            // Insere como NÓ de texto (não string → sem parse de HTML que estragaria
            // "<"/"&" em texto jurídico). Vazio = deleta o trecho.
            if (para) chain.insertContentAt({ from, to }, { type: "text", text: para })
            else chain.deleteRange({ from, to })
            chain.run()
            if (para) flash(from, from + para.length)
            return true
          }
          if (op.tipo === "inserir_apos_selecao") {
            const t = (op.texto ?? "").trim()
            if (!t) return false
            editor.chain().focus().insertContentAt(to, { type: "text", text: ` ${t}` }).run()
            flash(to, to + t.length + 1)
            return true
          }
          if (op.tipo === "formatar_selecao") {
            // Aplica/remove uma MARCA real (negrito/itálico/…) no intervalo selecionado.
            const name = op.marca ?? "bold"
            const chain = editor.chain().focus().setTextSelection({ from, to })
            if (op.remover) chain.unsetMark(name)
            else chain.setMark(name)
            chain.run()
            flash(from, to)
            return true
          }
          return false
        },
        getDoc: () => (editor ? proseMirrorToLex(editor.getJSON() as unknown as PMNode) : initialDoc),
      }
    },
    [editor, initialDoc],
  )

  const m = marginsMm ?? DEFAULT_MARGINS_MM

  // Re-run pagination when the safe-area margins change (the paper padding shifts
  // the usable page height, so the break positions move). Dispatching any tx makes
  // the plugin's view.update fire after the new padding is committed to the DOM.
  useEffect(() => {
    if (!editor) return
    editor.view.dispatch(editor.state.tr.setMeta(paginationKey, "recompute"))
  }, [editor, m.top, m.right, m.bottom, m.left, zoom])

  // When the values map changes, repaint the placeholder node views (the value is
  // shown on the paper when filled) and re-flow pagination (the block heights may
  // shift as `{{label}}` becomes the actual value). Neither is a doc edit, so PM
  // wouldn't otherwise react — one meta-only tx carries both refresh signals.
  useEffect(() => {
    if (!editor) return
    editor.view.dispatch(editor.state.tr.setMeta(placeholderRefreshKey, true).setMeta(paginationKey, "recompute"))
  }, [editor, valores])

  // Encaixa a folha à largura disponível ao montar e sempre que a coluna muda de
  // tamanho (abrir/fechar um painel) — a menos que o usuário tenha dado zoom manual.
  useEffect(() => {
    if (!editor) return
    fitZoom()
    const el = scrollRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => {
      if (!manualZoomRef.current) fitZoom()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [editor, fitZoom])

  if (!editor) return <div className={s.editorWrap} />

  const backgroundImage = letterheadDataUrl ? `${PAGE_GUIDE}, url("${letterheadDataUrl}")` : PAGE_GUIDE
  const campoAtCursor = () => {
    const pos = editor.state.selection.from
    try {
      const c = editor.view.coordsAtPos(pos)
      onArmClickRef.current?.({ pos, rect: { left: c.left, top: c.top, bottom: c.bottom } })
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={s.editorWrap} style={{ position: "relative" }}>
      <Toolbar editor={editor} armed={armed} onToggleArm={() => setArmed((a) => !a)} onCampoAtCursor={campoAtCursor} />
      <div ref={scrollRef} className={s.editorScroll}>
        <div
          data-doc-paper
          className={clsx(s.paper, armed && s.paperArmed)}
          style={{
            paddingTop: `${m.top}mm`,
            paddingRight: `${m.right}mm`,
            paddingBottom: `${m.bottom}mm`,
            paddingLeft: `${m.left}mm`,
            backgroundImage,
            zoom,
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Controle de zoom flutuante (canto inferior direito do editor) */}
      <div
        className={lexGlassStrong}
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: 3,
          borderRadius: 11,
          ...glassElevation("0 6px 20px rgba(2,13,37,0.22)"),
        }}
      >
        <button type="button" className={s.tbtn} title="Diminuir zoom" onClick={zoomOut} disabled={zoom <= 0.4}>
          <ZoomOut size={15} />
        </button>
        <button
          type="button"
          className={s.tbtn}
          title="Ajustar à largura"
          onClick={zoomFit}
          style={{ minWidth: 48, fontVariantNumeric: "tabular-nums", fontWeight: 500 }}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" className={s.tbtn} title="Aumentar zoom" onClick={zoomIn} disabled={zoom >= 2}>
          <ZoomIn size={15} />
        </button>
      </div>
    </div>
  )
})
