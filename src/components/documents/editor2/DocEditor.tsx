"use client"

import { useEffect } from "react"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import clsx from "clsx"
import { editorExtensions } from "@/lib/documents/editor-schema"
import { DEFAULT_MARGINS_MM, type MarginsMm } from "@/lib/documents/model/types"
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

export function DocEditor({
  initialDoc,
  onChange,
  letterheadDataUrl,
  marginsMm,
}: {
  initialDoc: LexDoc
  onChange: (doc: LexDoc) => void
  letterheadDataUrl?: string | null
  marginsMm?: MarginsMm
}) {
  const editor = useEditor({
    immediatelyRender: false, // SSR-safe in the App Router
    extensions: [...editorExtensions, Pagination],
    content: lexToProseMirror(initialDoc),
    onUpdate: ({ editor }) => onChange(proseMirrorToLex(editor.getJSON() as unknown as PMNode)),
  })

  const m = marginsMm ?? DEFAULT_MARGINS_MM

  // Re-run pagination when the safe-area margins change (the paper padding shifts
  // the usable page height, so the break positions move). Dispatching any tx makes
  // the plugin's view.update fire after the new padding is committed to the DOM.
  useEffect(() => {
    if (!editor) return
    editor.view.dispatch(editor.state.tr.setMeta(paginationKey, "recompute"))
  }, [editor, m.top, m.right, m.bottom, m.left])

  if (!editor) return <div className={s.editorWrap} />

  const backgroundImage = letterheadDataUrl ? `${PAGE_GUIDE}, url("${letterheadDataUrl}")` : PAGE_GUIDE

  return (
    <div className={s.editorWrap}>
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
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
