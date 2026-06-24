// GET /api/documentos/:id/exportar?formato=pdf|docx — render a FLEXIBLE document
// (its LexDoc `conteudo` + letterhead + field values) to a downloadable binary.
// PDF goes through the same canonical HTML as the on-screen preview (Chromium);
// DOCX is the node-by-node mapping. Structured contracts keep their own generator.
import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { parseId, type RouteCtx } from "@/lib/finance/api"
import { getDocumento } from "@/lib/documentos/queries"
import { getTimbrado } from "@/lib/documentos/timbrados"
import { documentToHtml } from "@/lib/documents/render/html"
import { htmlToPdfWithLetterhead } from "@/lib/documents/render/pdf"
import { documentToDocx } from "@/lib/documents/render/docx"
import { DEFAULT_MARGINS_MM, type LexDoc, type MarginsMm } from "@/lib/documents/model/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function dataUrlToImage(src: string): { data: Buffer; type: "png" | "jpg" } | undefined {
  const m = src.match(/^data:image\/(png|jpe?g);base64,(.+)$/i)
  if (!m) return undefined
  return { data: Buffer.from(m[2], "base64"), type: m[1].toLowerCase().startsWith("jp") ? "jpg" : "png" }
}

function safeName(nome: string): string {
  return nome.replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim().slice(0, 120) || "documento"
}

export async function GET(req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied

  const { id } = await ctx.params
  const formato = new URL(req.url).searchParams.get("formato") === "docx" ? "docx" : "pdf"
  const doc = await getDocumento(parseId(id))
  if (!doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
  if (!doc.conteudo) {
    return NextResponse.json({ error: "Documento sem conteúdo editável" }, { status: 400 })
  }

  const lex = doc.conteudo as LexDoc
  const valores = doc.valores ?? undefined

  let marginsMm: MarginsMm = DEFAULT_MARGINS_MM
  let letterheadDataUrl: string | null = null
  if (doc.timbradoId) {
    const t = await getTimbrado(doc.timbradoId)
    if (t) {
      marginsMm = { top: t.margemTop, right: t.margemRight, bottom: t.margemBottom, left: t.margemLeft }
      letterheadDataUrl = t.imagem
    }
  }

  const base = safeName(doc.nome)

  if (formato === "docx") {
    const letterhead = letterheadDataUrl ? dataUrlToImage(letterheadDataUrl) : undefined
    const buf = await documentToDocx(lex, { letterhead, marginsMm, valores })
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${base}.docx"`,
      },
    })
  }

  // Letterhead is composited behind every page by the PDF layer (not via CSS),
  // so the HTML carries only the content + the @page safe-area margins.
  const html = documentToHtml(lex, { marginsMm, valores })
  const letterhead = letterheadDataUrl ? dataUrlToImage(letterheadDataUrl) : null
  const buf = await htmlToPdfWithLetterhead(html, letterhead ?? null)
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${base}.pdf"`,
    },
  })
}
