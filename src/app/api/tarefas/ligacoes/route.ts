// POST   /api/tarefas/ligacoes { anteriorId, seguinteId } — "a seguinte só começa
//        depois que a anterior terminar". Recusa (400, uma linha): ciclo, projetos
//        diferentes/sem projeto, ligação duplicada.
// DELETE /api/tarefas/ligacoes { anteriorId, seguinteId }
import { readJson } from "@/lib/finance/api"
import { desligar, ligar } from "@/lib/tarefas/mutations"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { ligacaoSchema } from "@/lib/tarefas/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  return mutacaoTarefa(req, { action: "tarefa.ligar", payload: body }, (ator) => {
    const b = parseBody(ligacaoSchema, body)
    return ligar(b.anteriorId, b.seguinteId, ator)
  })
}

export async function DELETE(req: Request) {
  const body = await readJson(req)
  return mutacaoTarefa(req, { action: "tarefa.desligar", payload: body }, (ator) => {
    const b = parseBody(ligacaoSchema, body)
    return desligar(b.anteriorId, b.seguinteId, ator)
  })
}
