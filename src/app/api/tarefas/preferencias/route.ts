// PATCH /api/tarefas/preferencias { ordenar, direcao, agrupar } — como QUEM ESTÁ
// VENDO prefere o quadro (salvo por pessoa; volta igual na próxima visita).
import { readJson } from "@/lib/finance/api"
import { setPrefsQuadro } from "@/lib/tarefas/preferencias"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { prefsQuadroSchema } from "@/lib/tarefas/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: Request) {
  const body = await readJson(req)
  return mutacaoTarefa(req, { action: "tarefa.preferencias", payload: body }, (ator) =>
    setPrefsQuadro(ator.id, parseBody(prefsQuadroSchema, body)),
  )
}
