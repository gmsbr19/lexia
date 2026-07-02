"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import clsx from "clsx"
import { editorExtensions } from "@/lib/documents/editor-schema"
import { DEFAULT_MARGINS_MM, type MarginsMm } from "@/lib/documents/model/types"
import type { DocOp } from "@/lib/documents/model/ops"
import { Pagination, paginationKey } from "./pagination"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
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
import type { LexDoc } from "@/lib/documents/model/types"
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
  editor,
  onClick,
  active,
  title,
  children,
}: {
  editor: Editor
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

function Toolbar({ editor }: { editor: Editor }) {
  const insertCampo = () => {
    const label = window.prompt("Nome do campo (ex.: Nome do outorgante)")?.trim()
    if (!label) return
    editor
      .chain()
      .focus()
      .insertContent({ type: "placeholder", attrs: { name: slug(label), label, dataType: "texto", defaultValue: "" } })
      .run()
  }

  const ICON = 15
  return (
    <div className={s.toolbar}>
      <Btn editor={editor} title="Negrito" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={ICON} />
      </Btn>
      <Btn editor={editor} title="Itálico" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={ICON} />
      </Btn>
      <Btn editor={editor} title="Sublinhado" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon size={ICON} />
      </Btn>
      <Btn editor={editor} title="Riscado" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough size={ICON} />
      </Btn>

      <span className={s.sep} />

      <Btn editor={editor} title="Título 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 size={ICON} />
      </Btn>
      <Btn editor={editor} title="Título 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={ICON} />
      </Btn>
      <Btn editor={editor} title="Lista" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={ICON} />
      </Btn>
      <Btn editor={editor} title="Lista numerada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={ICON} />
      </Btn>
      <Btn editor={editor} title="Citação" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote size={ICON} />
      </Btn>

      <span className={s.sep} />

      <Btn editor={editor} title="Alinhar à esquerda" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        <AlignLeft size={ICON} />
      </Btn>
      <Btn editor={editor} title="Centralizar" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        <AlignCenter size={ICON} />
      </Btn>
      <Btn editor={editor} title="Alinhar à direita" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        <AlignRight size={ICON} />
      </Btn>
      <Btn editor={editor} title="Justificar" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
        <AlignJustify size={ICON} />
      </Btn>

      <span className={s.sep} />

      <Btn editor={editor} title="Inserir campo (placeholder)" onClick={insertCampo}>
        <Braces size={ICON} />
        <span style={{ fontSize: 12 }}>Campo</span>
      </Btn>
      <Btn editor={editor} title="Quebra de página" onClick={() => editor.chain().focus().insertContent({ type: "pageBreak" }).run()}>
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

// Char usado como "leaf text" das folhas/atoms (placeholders) ao ler a seleção —
// mantém os offsets coerentes com o que vai no contexto da LexIA.
const LEAF = "￼"

export interface DocSelecao {
  texto: string
  from: number
  to: number
}

// Handle imperativo: a LexIA edita o trecho selecionado de forma CIRÚRGICA (por
// posição) através do editor vivo (mantém undo/redo, sem remontar). As ops por
// posição carregam `de` (texto original da seleção) p/ verificação anti-stale.
export interface DocEditorHandle {
  getSelection: () => DocSelecao | null
  coordsOf: (pos: number) => { left: number; top: number; bottom: number } | null
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
  onSelectionChange?: (sel: DocSelecao | null) => void
}>(function DocEditor({ initialDoc, onChange, letterheadDataUrl, marginsMm, onSelectionChange }, ref) {
  // Ref p/ o callback de seleção sempre fresco (o useEditor captura a closure só na criação).
  const onSelRef = useRef(onSelectionChange)
  onSelRef.current = onSelectionChange

  // Zoom da folha (0.5–2.0). Aplicado via CSS `zoom` (escala de LAYOUT) — a paginação
  // compara clientWidth × getBoundingClientRect, ambos no mesmo espaço escalado, então
  // os cálculos de quebra continuam consistentes em qualquer zoom.
  const [zoom, setZoom] = useState(1)
  const zoomIn = () => setZoom((z) => Math.min(2, Math.round((z + 0.1) * 100) / 100))
  const zoomOut = () => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 100) / 100))

  const editor = useEditor({
    immediatelyRender: false, // SSR-safe in the App Router
    extensions: [...editorExtensions, Pagination],
    content: lexToProseMirror(initialDoc),
    onUpdate: ({ editor }) => onChange(proseMirrorToLex(editor.getJSON() as unknown as PMNode)),
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      if (from === to) {
        onSelRef.current?.(null)
        return
      }
      const texto = editor.state.doc.textBetween(from, to, "\n", LEAF)
      onSelRef.current?.(texto.trim() ? { texto, from, to } : null)
    },
  })

  // API imperativa p/ a edição por seleção (estilo Copilot). Aplicar pelo editor
  // VIVO (não remontar) preserva posições e o undo nativo do ProseMirror.
  useImperativeHandle(
    ref,
    (): DocEditorHandle => ({
      getSelection: () => {
        if (!editor) return null
        const { from, to } = editor.state.selection
        if (from === to) return null
        const texto = editor.state.doc.textBetween(from, to, "\n", LEAF)
        return texto.trim() ? { texto, from, to } : null
      },
      coordsOf: (pos) => {
        if (!editor) return null
        try {
          const p = Math.max(0, Math.min(pos, editor.state.doc.content.size))
          const c = editor.view.coordsAtPos(p)
          return { left: c.left, top: c.top, bottom: c.bottom }
        } catch {
          return null
        }
      },
      applyPosOp: (op) => {
        if (!editor) return false
        const size = editor.state.doc.content.size
        const from = op.from ?? -1
        const to = op.to ?? -1
        if (from < 0 || to < from || to > size) return false
        // Verificação anti-stale: o intervalo ainda contém o texto original (`de`)?
        if (op.de != null && editor.state.doc.textBetween(from, to, "\n", LEAF) !== op.de) return false
        if (op.tipo === "substituir_selecao") {
          const para = op.para ?? ""
          const chain = editor.chain().focus()
          // Insere como NÓ de texto (não string → sem parse de HTML que estragaria
          // "<"/"&" em texto jurídico). Vazio = deleta o trecho.
          if (para) chain.insertContentAt({ from, to }, { type: "text", text: para })
          else chain.deleteRange({ from, to })
          chain.run()
          return true
        }
        if (op.tipo === "inserir_apos_selecao") {
          const t = (op.texto ?? "").trim()
          if (!t) return false
          editor.chain().focus().insertContentAt(to, { type: "text", text: ` ${t}` }).run()
          return true
        }
        if (op.tipo === "formatar_selecao") {
          // Aplica/remove uma MARCA real (negrito/itálico/…) no intervalo selecionado.
          const name = op.marca ?? "bold"
          const chain = editor.chain().focus().setTextSelection({ from, to })
          if (op.remover) chain.unsetMark(name)
          else chain.setMark(name)
          chain.run()
          return true
        }
        return false
      },
      getDoc: () => (editor ? proseMirrorToLex(editor.getJSON() as unknown as PMNode) : initialDoc),
    }),
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

  if (!editor) return <div className={s.editorWrap} />

  const backgroundImage = letterheadDataUrl ? `${PAGE_GUIDE}, url("${letterheadDataUrl}")` : PAGE_GUIDE

  return (
    <div className={s.editorWrap} style={{ position: "relative" }}>
      <Toolbar editor={editor} />
      <div className={s.editorScroll}>
        <div
          data-doc-paper
          className={s.paper}
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
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 6px 20px rgba(2,13,37,0.16)",
        }}
      >
        <button type="button" className={s.tbtn} title="Diminuir zoom" onClick={zoomOut} disabled={zoom <= 0.5}>
          <ZoomOut size={15} />
        </button>
        <button
          type="button"
          className={s.tbtn}
          title="Restaurar zoom (100%)"
          onClick={() => setZoom(1)}
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
