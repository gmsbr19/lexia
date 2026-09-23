// GET  /api/tarefas — carga única do módulo (tarefas + projetos + equipe + clientes
//      + modelos + "hoje" no fuso do escritório). `?derivados=1` acrescenta a cada
//      tarefa os campos calculados pelas regras únicas (vencida, faixa, em risco,
//      conflito, aguardando) — a mesma implementação que o quadro usa.
// POST /api/tarefas — cria (prazo padrão = sexta da semana; responsável padrão = quem cria).
import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { readJson } from "@/lib/finance/api"
import { criarTarefa } from "@/lib/tarefas/mutations"
import { getTarefasBoard } from "@/lib/tarefas/queries"
import {
  aguardandoRotulo,
  conflitosPrazo,
  faixa,
  indexar,
  motivosRisco,
  vencida,
} from "@/lib/tarefas/regras"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { tarefaCreateSchema } from "@/lib/tarefas/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied
  const board = await getTarefasBoard()
  if (new URL(req.url).searchParams.get("derivados") !== "1") return NextResponse.json(board)

  const map = indexar(board.tarefas)
  const nomes = new Map(board.pessoas.map((p) => [p.id, p.first]))
  const nome = (id: number | null) => (id == null ? "sem responsável" : (nomes.get(id) ?? "sem responsável"))
  const tarefas = board.tarefas.map((t) => ({
    ...t,
    vencida: vencida(t, board.hoje),
    faixa: t.status === "done" ? null : faixa(t, board.hoje),
    emRisco: motivosRisco(t, map, board.hoje).map((r) => ({
      tarefaId: r.id,
      titulo: r.titulo,
      grupo: r.grupo,
      responsavelId: r.responsavelId,
      prazo: r.prazo,
    })),
    conflitos: conflitosPrazo(t, map).map((c) => c.id),
    aguardandoRotulo: t.status === "wait" ? aguardandoRotulo(t, map, nome) : null,
  }))
  return NextResponse.json({ ...board, tarefas })
}

export async function POST(req: Request) {
  const body = await readJson(req)
  return mutacaoTarefa(req, { action: "tarefa.criar", payload: body }, (ator) => {
    const b = parseBody(tarefaCreateSchema, body)
    return criarTarefa(
      {
        titulo: b.titulo,
        projetoId: b.projetoId,
        grupo: b.grupo,
        // ausente no corpo → quem cria; null explícito → sem responsável
        responsavelId: "responsavelId" in body ? (b.responsavelId ?? null) : undefined,
        clienteId: b.clienteId,
        prazo: b.prazo,
        prazoFatal: b.prazoFatal,
        descricao: b.descricao,
        checklist: b.checklist,
        recur: b.recur,
        casoId: b.casoId,
        processoId: b.processoId,
        leadId: b.leadId,
      },
      ator,
    )
  })
}
