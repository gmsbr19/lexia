// GET  /api/documentos/[id]/versoes — version history for a documento
// POST /api/documentos/[id]/versoes — snapshot a new version (file bytes go
// through the AnexoStore abstraction; default storage = db base64).
import { NextResponse } from "next/server"
import { guardRequest, sessionEmail } from "@/lib/auth/session"
import { parseId, readJson, runMutation, type RouteCtx } from "@/lib/finance/api"
import { criarVersaoDocumento } from "@/lib/processos/mutations"
import { listVersoesDocumento } from "@/lib/processos/queries"
import { documentoVersaoCreateSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied
  const { id } = await ctx.params
  return NextResponse.json(await listVersoesDocumento(parseId(id)))
}

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  const criadoPor = (await sessionEmail()) ?? null
  return runMutation(() => criarVersaoDocumento(parseId(id), { ...parseBody(documentoVersaoCreateSchema, body), criadoPor }), {
    action: "documento.versao.criar",
    entity: "DocumentoVersao",
    entityId: id,
    roles: ["socio", "advogado"],
  })
}
