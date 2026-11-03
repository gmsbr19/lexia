// PUT /api/tarefas/ordem { itens: [{ id, ordem }] } — ordem manual dos cartões de
// QUEM ESTÁ VENDO (cada pessoa tem a sua). As posições vêm prontas do cliente
// (filtros.reposicionar); aqui só grava. Não entra no histórico nem no Desfazer.
import { readJson } from "@/lib/finance/api"
import { salvarOrdem } from "@/lib/tarefas/preferencias"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { ordemSchema } from "@/lib/tarefas/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PUT(req: Request) {
  const body = await readJson(req)
  return mutacaoTarefa(req, { action: "tarefa.ordem" }, (ator) => salvarOrdem(ator.id, parseBody(ordemSchema, body).itens))
}
