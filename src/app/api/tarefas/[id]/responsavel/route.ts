// POST /api/tarefas/[id]/responsavel { responsavelId } — "Quem cuida do próximo
// passo?": atribui a tarefa liberada e avisa "Sua vez".
import { z } from "zod"
import { parseId, readJson, type RouteCtx } from "@/lib/finance/api"
import { atribuirProximoPasso } from "@/lib/tarefas/mutations"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { idReq, parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({ responsavelId: idReq })

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return mutacaoTarefa(req, { action: "tarefa.proximo-passo", entityId: id, payload: body }, (ator) =>
    atribuirProximoPasso(parseId(id), parseBody(schema, body).responsavelId, ator),
  )
}
