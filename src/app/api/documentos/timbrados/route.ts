import { NextResponse } from "next/server"
import { guardRequest, sessionEmail } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { createTimbrado, getTimbrados, getTimbradosComImagem } from "@/lib/documentos/timbrados"
import { timbradoCreateSchema } from "@/lib/documentos/schemas"
import { ROLES_DOC_GESTAO } from "@/lib/documentos/types"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/documentos/timbrados[?comImagem=1] — list; images only when asked. */
export async function GET(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied
  const comImagem = new URL(req.url).searchParams.get("comImagem") === "1"
  return NextResponse.json({ timbrados: comImagem ? await getTimbradosComImagem() : await getTimbrados() })
}

export async function POST(req: Request) {
  const body = await readJson(req)
  const criadoPor = await sessionEmail()
  return runMutation(() => createTimbrado(parseBody(timbradoCreateSchema, body), criadoPor), {
    action: "timbrado.criar",
    entity: "Timbrado",
    payload: { ...body, imagem: undefined }, // base64 art stays out of the audit snapshot
    roles: ROLES_DOC_GESTAO,
  })
}
