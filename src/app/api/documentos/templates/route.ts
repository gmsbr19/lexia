import { NextResponse } from "next/server"
import { guardRequest, sessionEmail } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { createTemplate, getTemplates } from "@/lib/documentos/templates"
import { templateCreateSchema } from "@/lib/documentos/schemas"
import { ROLES_DOC_GESTAO } from "@/lib/documentos/types"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/documentos/templates?todos=1 */
export async function GET(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied
  const incluirInativos = new URL(req.url).searchParams.get("todos") === "1"
  return NextResponse.json({ templates: await getTemplates({ incluirInativos }) })
}

export async function POST(req: Request) {
  const body = await readJson(req)
  const criadoPor = await sessionEmail()
  return runMutation(() => createTemplate(parseBody(templateCreateSchema, body), criadoPor), {
    action: "documento_template.criar",
    entity: "DocumentoTemplate",
    payload: { ...body, conteudo: undefined }, // LexDoc body stays out of the audit snapshot
    roles: ROLES_DOC_GESTAO,
  })
}
