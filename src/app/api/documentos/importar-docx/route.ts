// POST /api/documentos/importar-docx (multipart) — import a .docx into a draft.
import { NextResponse } from "next/server"
import { sessionEmail } from "@/lib/auth/session"
import { runMutation } from "@/lib/finance/api"
import { importarDocxComoDocumento } from "@/lib/documents/importar"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Envio inválido" }, { status: 400 })
  }

  const file = form.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })
  if (file.size > 15_000_000) return NextResponse.json({ error: "Arquivo muito grande (máx. 15 MB)" }, { status: 400 })

  const nome = (typeof form.get("nome") === "string" ? (form.get("nome") as string) : "") || file.name.replace(/\.[^.]+$/, "")
  const buffer = Buffer.from(await file.arrayBuffer())
  const criadoPor = await sessionEmail()

  return runMutation(() => importarDocxComoDocumento(buffer, nome, criadoPor), {
    action: "documento.importar_docx",
    entity: "Documento",
    payload: { nome, tamanho: file.size },
  })
}
