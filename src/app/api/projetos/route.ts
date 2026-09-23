// GET  /api/projetos — projetos (ativos + arquivados) com progresso e nº de vencidas.
// POST /api/projetos — novo projeto em branco (sócio/advogado; admin passa).
import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { readJson } from "@/lib/finance/api"
import { criarProjeto } from "@/lib/projetos/mutations"
import { projetoCreateSchema } from "@/lib/projetos/schemas"
import { ROLES_PROJETO_ESCRITA } from "@/lib/projetos/types"
import { getProjetos, getTarefas } from "@/lib/tarefas/queries"
import { hojeSP, vencida } from "@/lib/tarefas/regras"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  const [projetos, tarefas] = await Promise.all([getProjetos(), getTarefas({ projetoId: { not: null } })])
  const hoje = hojeSP()
  return NextResponse.json(
    projetos.map((p) => {
      const doProjeto = tarefas.filter((t) => t.projetoId === p.id)
      return {
        ...p,
        total: doProjeto.length,
        concluidas: doProjeto.filter((t) => t.status === "done").length,
        vencidas: doProjeto.filter((t) => vencida(t, hoje)).length,
      }
    }),
  )
}

export async function POST(req: Request) {
  const body = await readJson(req)
  return mutacaoTarefa(
    req,
    { action: "projeto.criar", entity: "Projeto", payload: body, roles: ROLES_PROJETO_ESCRITA },
    (ator) => criarProjeto(parseBody(projetoCreateSchema, body), ator),
  )
}
