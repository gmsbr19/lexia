import { NextResponse } from "next/server"
import { guardRequest, sessionEmail } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { getDocumentos } from "@/lib/documentos/queries"
import { createDocumento } from "@/lib/documentos/mutations"
import { documentoCreateSchema } from "@/lib/documentos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/documentos?clienteId=&casoId= */
export async function GET(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied

  const url = new URL(req.url)
  const clienteId = Number(url.searchParams.get("clienteId")) || undefined
  const casoId = Number(url.searchParams.get("casoId")) || undefined
  return NextResponse.json(await getDocumentos({ clienteId, casoId }))
}

export async function POST(req: Request) {
  const body = await readJson(req)
  const criadoPor = await sessionEmail()
  return runMutation(() => createDocumento({ ...parseBody(documentoCreateSchema, body), criadoPor }), {
    action: "documento.criar",
    entity: "Documento",
    payload: { ...body, payload: undefined, conteudo: undefined }, // form/rich-text bodies stay out of the audit snapshot
  })
}
