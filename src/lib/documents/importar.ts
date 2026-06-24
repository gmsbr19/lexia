// .docx import — SERVER ONLY. mammoth converts the uploaded document to semantic
// HTML, then @tiptap/html (zeed-dom, no browser needed) parses it into
// ProseMirror JSON over our editor schema, which the converter turns into a
// canonical LexDoc. Fidelity is content-faithful (headings/bold/italic/lists),
// NOT pixel-perfect — the user polishes in the editor.
import mammoth from "mammoth"
import { generateJSON } from "@tiptap/html"
import { editorExtensions } from "./editor-schema"
import { proseMirrorToLex, type PMNode } from "./model/tiptap"
import { emptyDoc, type LexDoc } from "./model/types"
import { createDocumento } from "@/lib/documentos/mutations"

export async function docxBufferToLexDoc(buffer: Buffer): Promise<LexDoc> {
  const { value: html } = await mammoth.convertToHtml({ buffer })
  if (!html?.trim()) return emptyDoc()
  const json = generateJSON(html, editorExtensions)
  return proseMirrorToLex(json as unknown as PMNode)
}

/** Import a .docx into a fresh draft Documento (rich-text body). */
export async function importarDocxComoDocumento(buffer: Buffer, nome: string, criadoPor?: string | null) {
  const conteudo = await docxBufferToLexDoc(buffer)
  const doc = await createDocumento({
    nome: nome.trim() || "Documento importado",
    template: "importado",
    status: "rascunho",
    conteudo,
    criadoPor,
  })
  return { id: doc.id }
}
