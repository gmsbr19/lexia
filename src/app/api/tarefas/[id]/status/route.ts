// POST /api/tarefas/[id]/status { status, aguardandoTexto?, confirmarInicio? }
// Regras (regras.ts): Aguardando → Em andamento com anterior pendente/terceiro
// devolve { precisaConfirmacao, texto } sem aplicar (a tela pergunta "Começar
// mesmo assim?"); Aguardando sem anterior pendente e sem texto devolve
// { precisaTexto } ("Aguardando o quê?"). status "done" = concluir.
import { parseId, readJson, type RouteCtx } from "@/lib/finance/api"
import { moverStatus } from "@/lib/tarefas/mutations"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { statusSchema } from "@/lib/tarefas/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await readJson(req)
  return mutacaoTarefa(req, { action: "tarefa.status", entityId: id, payload: body }, (ator) => {
    const b = parseBody(statusSchema, body)
    return moverStatus(
      parseId(id),
      b.status,
      { aguardandoTexto: b.aguardandoTexto, confirmarInicio: b.confirmarInicio },
      ator,
    )
  })
}
