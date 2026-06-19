import { readJson, runMutation } from "@/lib/finance/api"
import { bulkUpdateTarefas } from "@/lib/projetos/mutations"
import { tarefasLoteSchema } from "@/lib/projetos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Bulk edit of tasks (F4): apply one field across many, or delete the selection.
// Same openness as the per-task routes (no role gate); per-task notifications are
// intentionally NOT fanned out (avoids spamming a recipient with N notices).
export async function PATCH(req: Request) {
  const body = await readJson(req)
  return runMutation(() => bulkUpdateTarefas(parseBody(tarefasLoteSchema, body)), {
    action: "tarefa.lote",
    entity: "Tarefa",
    payload: body,
  })
}
