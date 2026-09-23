// GET  /api/projetos/modelos — modelos de projeto (papéis + passos).
// POST /api/projetos/modelos — novo modelo (só sócio; admin passa). Reversível pelo "Desfazer".
import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { readJson } from "@/lib/finance/api"
import { criarModelo } from "@/lib/projetos/mutations"
import { modeloSchema } from "@/lib/projetos/schemas"
import { ROLES_MODELO } from "@/lib/projetos/types"
import { getModelos } from "@/lib/tarefas/queries"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  return NextResponse.json(await getModelos())
}

export async function POST(req: Request) {
  const body = await readJson(req)
  return mutacaoTarefa(
    req,
    { action: "modelo.criar", entity: "ProjetoModelo", payload: body, roles: ROLES_MODELO },
    (ator) => criarModelo(parseBody(modeloSchema, body), ator),
  )
}
