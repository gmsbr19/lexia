import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { createTemplate } from "@/lib/projetos/mutations"
import { getTemplates } from "@/lib/projetos/queries"
import { templateCreateSchema } from "@/lib/projetos/schemas"
import { ROLES_TEMPLATE } from "@/lib/projetos/types"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  return NextResponse.json({ templates: await getTemplates() })
}

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => createTemplate(parseBody(templateCreateSchema, body)), {
    action: "projeto_template.criar",
    entity: "ProjetoTemplate",
    payload: body,
    roles: ROLES_TEMPLATE,
  })
}
