// Tarefas — write layer. SERVER ONLY. App-created rows carry
// astreaId "app-tarefa-<uuid>", origem "manual", geradoPorApp true.
import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { userIdPorEmail } from "@/lib/notificacoes/recipients"
import { notificarTarefaAtribuida, notificarTarefaConcluida } from "@/lib/notificacoes/triggers"
import {
  clampPrio,
  optId,
  optStr,
  reqStr,
  resolveVinculo,
  serializeArr,
  toDate,
  validProjeto,
  validStatus,
} from "./_input"

export interface TarefaCreate {
  titulo: string
  status?: string
  done?: boolean
  prio?: number
  projeto?: string
  data?: string | null
  hora?: string | null
  prazo?: string | null
  notes?: string | null
  reminder?: string | null
  recur?: string | null
  ai?: boolean
  subtasks?: unknown
  dor?: unknown
  dod?: unknown
  responsavelId?: number | null
  casoId?: number | null
  clienteId?: number | null
  ordem?: number
}

export async function createTarefa(input: TarefaCreate, actorEmail?: string | null) {
  const status = input.status !== undefined ? validStatus(input.status) : input.done ? "done" : "todo"
  const { casoId, clienteId } = resolveVinculo(input.casoId, input.clienteId)
  // Quem criou/delegou (da sessão) — usado na regra "notificar o criador na conclusão".
  const criadoPorId = await userIdPorEmail(actorEmail)
  const tarefa = await prisma.tarefa.create({
    data: {
      astreaId: `app-tarefa-${randomUUID()}`,
      titulo: reqStr(input.titulo, "título"),
      status,
      done: status === "done",
      prio: clampPrio(input.prio ?? 4),
      projeto: validProjeto(input.projeto),
      data: toDate(input.data),
      hora: optStr(input.hora),
      prazo: toDate(input.prazo),
      notes: optStr(input.notes),
      reminder: optStr(input.reminder),
      recur: optStr(input.recur),
      ai: !!input.ai,
      subtasks: serializeArr(input.subtasks),
      dor: serializeArr(input.dor),
      dod: serializeArr(input.dod),
      responsavelId: optId(input.responsavelId),
      criadoPorId,
      casoId,
      clienteId,
      ordem: Number.isInteger(input.ordem) ? (input.ordem as number) : 0,
      origem: "manual",
      geradoPorApp: true,
    },
  })
  // Delegação: o executor designado é notificado (menos quando atribui a si mesmo).
  if (tarefa.responsavelId) {
    void notificarTarefaAtribuida({ tarefaId: tarefa.id, titulo: tarefa.titulo, responsavelId: tarefa.responsavelId, actorEmail })
  }
  return tarefa
}

export interface TarefaPatch {
  titulo?: string
  status?: string
  done?: boolean
  prio?: number
  projeto?: string
  data?: string | null
  hora?: string | null
  prazo?: string | null
  notes?: string | null
  reminder?: string | null
  recur?: string | null
  ai?: boolean
  subtasks?: unknown
  dor?: unknown
  dod?: unknown
  responsavelId?: number | null
  casoId?: number | null
  clienteId?: number | null
  ordem?: number
}

export async function updateTarefa(id: number, patch: TarefaPatch, actorEmail?: string | null) {
  // Estado anterior p/ detectar (re)atribuição e a transição para "concluída".
  const antes = await prisma.tarefa.findUnique({
    where: { id },
    select: { responsavelId: true, done: true },
  })
  const data: Prisma.TarefaUncheckedUpdateInput = {}

  if (patch.titulo !== undefined) data.titulo = reqStr(patch.titulo, "título")
  // status & done are kept in sync: status is the source of truth.
  if (patch.status !== undefined) {
    const s = validStatus(patch.status)
    data.status = s
    data.done = s === "done"
  } else if (patch.done !== undefined) {
    data.done = !!patch.done
    data.status = patch.done ? "done" : "todo"
  }
  if (patch.prio !== undefined) data.prio = clampPrio(patch.prio)
  if (patch.projeto !== undefined) data.projeto = validProjeto(patch.projeto)
  if (patch.data !== undefined) data.data = toDate(patch.data)
  if (patch.hora !== undefined) data.hora = optStr(patch.hora)
  if (patch.prazo !== undefined) data.prazo = toDate(patch.prazo)
  if (patch.notes !== undefined) data.notes = optStr(patch.notes)
  if (patch.reminder !== undefined) data.reminder = optStr(patch.reminder)
  if (patch.recur !== undefined) data.recur = optStr(patch.recur)
  if (patch.ai !== undefined) data.ai = !!patch.ai
  if (patch.subtasks !== undefined) data.subtasks = serializeArr(patch.subtasks)
  if (patch.dor !== undefined) data.dor = serializeArr(patch.dor)
  if (patch.dod !== undefined) data.dod = serializeArr(patch.dod)
  if (patch.responsavelId !== undefined) data.responsavelId = optId(patch.responsavelId)
  if (patch.ordem !== undefined && Number.isInteger(patch.ordem)) data.ordem = patch.ordem
  // Vínculo: when either side is present in the patch, resolve the pair together.
  if (patch.casoId !== undefined || patch.clienteId !== undefined) {
    const { casoId, clienteId } = resolveVinculo(patch.casoId ?? null, patch.clienteId ?? null)
    data.casoId = casoId
    data.clienteId = clienteId
  }

  const tarefa = await prisma.tarefa.update({ where: { id }, data })

  // (Re)atribuição → novo executor é notificado.
  if (
    patch.responsavelId !== undefined &&
    tarefa.responsavelId &&
    tarefa.responsavelId !== (antes?.responsavelId ?? null)
  ) {
    void notificarTarefaAtribuida({ tarefaId: tarefa.id, titulo: tarefa.titulo, responsavelId: tarefa.responsavelId, actorEmail })
  }
  // Conclusão (transição para done) → o criador/delegante é notificado.
  if (tarefa.done && antes && !antes.done) {
    void notificarTarefaConcluida({ tarefaId: tarefa.id, titulo: tarefa.titulo, criadoPorId: tarefa.criadoPorId, actorEmail })
  }
  return tarefa
}

export async function deleteTarefa(id: number) {
  await prisma.tarefa.delete({ where: { id } })
  return { id }
}
