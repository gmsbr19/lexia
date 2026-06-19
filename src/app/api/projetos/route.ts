import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { createProjeto } from "@/lib/projetos/mutations"
import { getProjetosDataset } from "@/lib/projetos/queries"
import { projetoCreateSchema } from "@/lib/projetos/schemas"
import { ROLES_PROJETO_ESCRITA } from "@/lib/projetos/types"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  return NextResponse.json(await getProjetosDataset())
}

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => createProjeto(parseBody(projetoCreateSchema, body)), {
    action: "projeto.criar",
    entity: "Projeto",
    payload: body,
    roles: ROLES_PROJETO_ESCRITA,
  })
}
