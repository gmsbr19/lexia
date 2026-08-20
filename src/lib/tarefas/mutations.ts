// Tarefas — write layer. SERVER ONLY. App-created rows carry
// astreaId "app-tarefa-<uuid>", origem "manual", geradoPorApp true.
import { randomUUID } from "node:crypto"
import { Prisma, type Tarefa } from "@prisma/client"
import { prisma } from "@/lib/db"
import { userIdPorEmail } from "@/lib/notificacoes/recipients"
import { notificarTarefaAtribuida, notificarTarefaConcluida } from "@/lib/notificacoes/triggers"
import { proximaOcorrencia } from "@/lib/datas/recorrencia"
import {
  clampPrio,
  fromDate,
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
  projetoId?: number | null
  secaoId?: number | null
  ordem?: number
}

/** Devolve `secaoId` se a seção existe E pertence ao `projetoId`; senão null. */
async function resolverSecao(secaoId: number | null, projetoId: number | null): Promise<number | null> {
  if (secaoId == null) return null
  if (projetoId == null) return null
  const s = await prisma.projetoSecao.findFirst({ where: { id: secaoId, projetoId }, select: { id: true } })
  return s ? secaoId : null
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
      projetoId: optId(input.projetoId),
      secaoId: await resolverSecao(optId(input.secaoId), optId(input.projetoId)),
      concluidoEm: status === "done" ? new Date() : null,
      ordem: Number.isInteger(input.ordem) ? (input.ordem as number) : 0,
      origem: "manual",
      geradoPorApp: true,
    },
  })
  // Delegação: o executor designado é notificado (menos quando atribui a si mesmo).
  if (tarefa.responsavelId) {
    void notificarTarefaAtribuida({
      tarefaId: tarefa.id,
      titulo: tarefa.titulo,
      responsavelId: tarefa.responsavelId,
      actorEmail,
      prazo: tarefa.prazo,
    })
  }
  return tarefa
}

/**
 * Cria VÁRIAS tarefas de uma vez, numa única transação (createMany). Colapsa N
 * chamadas criar_tarefa (N round-trips ao modelo, cada uma reenviando todo o
 * histórico) numa só — o principal dreno de tokens na criação em massa.
 *
 * Convenção de bulk (igual ao instanciarTemplateProjeto): NÃO dispara a
 * notificação de delegação por-tarefa — evita spamar um responsável com N avisos
 * por uma única ação. A seção de cada tarefa é validada contra o projeto informado
 * (pré-resolvida numa única consulta, sem 1 query por tarefa).
 */
export async function createTarefas(inputs: TarefaCreate[], actorEmail?: string | null) {
  if (!inputs.length) return { criadas: 0 }
  const criadoPorId = await userIdPorEmail(actorEmail)
  const secaoIds = [...new Set(inputs.map((i) => optId(i.secaoId)).filter((n): n is number => n != null))]
  const secoes = secaoIds.length
    ? await prisma.projetoSecao.findMany({ where: { id: { in: secaoIds } }, select: { id: true, projetoId: true } })
    : []
  const secaoProjeto = new Map(secoes.map((s) => [s.id, s.projetoId]))
  const data = inputs.map((input) => {
    const status = input.status !== undefined ? validStatus(input.status) : input.done ? "done" : "todo"
    const { casoId, clienteId } = resolveVinculo(input.casoId ?? null, input.clienteId ?? null)
    const projetoId = optId(input.projetoId)
    const secaoReq = optId(input.secaoId)
    // Só mantém a seção quando ela pertence ao projeto informado (mesma regra do resolverSecao).
    const secaoId = secaoReq != null && projetoId != null && secaoProjeto.get(secaoReq) === projetoId ? secaoReq : null
    return {
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
      projetoId,
      secaoId,
      concluidoEm: status === "done" ? new Date() : null,
      ordem: Number.isInteger(input.ordem) ? (input.ordem as number) : 0,
      origem: "manual",
      geradoPorApp: true,
    }
  })
  const r = await prisma.tarefa.createMany({ data })
  return { criadas: r.count }
}

/** Zera os checkboxes de um array JSON [{...,done}] (subtasks/dor/dod) for a
 * freshly generated recurring instance — a new cycle starts unchecked. */
function zerarChecklist(raw: string): string {
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return raw
    return JSON.stringify(arr.map((it) => ({ ...it, done: false })))
  } catch {
    return raw
  }
}

/**
 * Motor de recorrência: na transição todo→done, se `recur` é uma regra
 * parseável e ainda não existe um clone ABERTO desta tarefa (guarda de
 * idempotência via `recorrenteDeId` — concluir/reabrir/concluir de novo não
 * duplica), cria a próxima instância. Âncora = data ?? prazo; se a âncora foi
 * `data` e havia `prazo` também, o prazo é deslocado pelo mesmo delta. Sem
 * notificação para a instância gerada (é do sistema — mesma convenção das
 * tools de lote).
 */
async function gerarProximaRecorrencia(tarefa: Tarefa): Promise<void> {
  if (!tarefa.recur) return
  const jaAberta = await prisma.tarefa.findFirst({
    where: { recorrenteDeId: tarefa.id, done: false },
    select: { id: true },
  })
  if (jaAberta) return

  const dataISO = fromDate(tarefa.data)
  const prazoISO = fromDate(tarefa.prazo)
  const anchorISO = dataISO ?? prazoISO
  if (!anchorISO) return // sem data nem prazo — nada pra ancorar a recorrência

  const hojeISO = fromDate(new Date())!
  const proximaISO = proximaOcorrencia(tarefa.recur, anchorISO, hojeISO)
  if (!proximaISO) return

  let novaData: Date | null = null
  let novoPrazo: Date | null = null
  if (dataISO) {
    novaData = toDate(proximaISO)
    if (prazoISO) {
      const deltaDias = Math.round((toDate(proximaISO)!.getTime() - toDate(dataISO)!.getTime()) / 86400000)
      const d = toDate(prazoISO)!
      d.setDate(d.getDate() + deltaDias)
      novoPrazo = d
    }
  } else {
    novoPrazo = toDate(proximaISO)
  }

  await prisma.tarefa.create({
    data: {
      astreaId: `app-tarefa-${randomUUID()}`,
      titulo: tarefa.titulo,
      status: "todo",
      done: false,
      prio: tarefa.prio,
      projeto: tarefa.projeto,
      data: novaData,
      hora: tarefa.hora,
      prazo: novoPrazo,
      notes: tarefa.notes,
      reminder: tarefa.reminder,
      recur: tarefa.recur,
      ai: false,
      subtasks: zerarChecklist(tarefa.subtasks),
      dor: zerarChecklist(tarefa.dor),
      dod: zerarChecklist(tarefa.dod),
      responsavelId: tarefa.responsavelId,
      criadoPorId: tarefa.criadoPorId,
      casoId: tarefa.casoId,
      processoId: tarefa.processoId,
      clienteId: tarefa.clienteId,
      leadId: tarefa.leadId,
      projetoId: tarefa.projetoId,
      secaoId: tarefa.secaoId,
      recorrenteDeId: tarefa.id,
      concluidoEm: null,
      ordem: tarefa.ordem,
      origem: "recorrencia",
      geradoPorApp: true,
    },
  })
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
  projetoId?: number | null
  secaoId?: number | null
  ordem?: number
}

export async function updateTarefa(id: number, patch: TarefaPatch, actorEmail?: string | null) {
  // Estado anterior p/ detectar (re)atribuição, a transição para "concluída" e o
  // projeto atual (usado ao validar a seção).
  const antes = await prisma.tarefa.findUnique({
    where: { id },
    select: { responsavelId: true, done: true, projetoId: true },
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
  if (patch.projetoId !== undefined) data.projetoId = optId(patch.projetoId)
  // Seção: trocar de projeto zera a seção (ela pertence ao projeto antigo). Ao
  // definir a seção, valida que ela pertence ao projeto efetivo da tarefa.
  const projetoEfetivo = patch.projetoId !== undefined ? optId(patch.projetoId) : antes?.projetoId ?? null
  if (patch.secaoId !== undefined) data.secaoId = await resolverSecao(optId(patch.secaoId), projetoEfetivo)
  else if (patch.projetoId !== undefined) data.secaoId = null
  if (patch.ordem !== undefined && Number.isInteger(patch.ordem)) data.ordem = patch.ordem
  // concluidoEm acompanha a transição de done (alimenta cycle time / taxa no prazo).
  if (data.done !== undefined) {
    if (data.done === true && !antes?.done) data.concluidoEm = new Date()
    else if (data.done === false && antes?.done) data.concluidoEm = null
  }
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
    void notificarTarefaAtribuida({
      tarefaId: tarefa.id,
      titulo: tarefa.titulo,
      responsavelId: tarefa.responsavelId,
      actorEmail,
      prazo: tarefa.prazo,
    })
  }
  // Conclusão (transição para done) → o criador/delegante é notificado +
  // motor de recorrência gera a próxima instância (sem notificação própria).
  if (tarefa.done && antes && !antes.done) {
    void notificarTarefaConcluida({
      tarefaId: tarefa.id,
      titulo: tarefa.titulo,
      criadoPorId: tarefa.criadoPorId,
      actorEmail,
      concluidoEm: tarefa.concluidoEm,
    })
    void gerarProximaRecorrencia(tarefa).catch((e) =>
      console.error("[tarefas] falha ao gerar próxima ocorrência recorrente", e),
    )
  }
  return tarefa
}

export async function deleteTarefa(id: number) {
  await prisma.tarefa.delete({ where: { id } })
  return { id }
}
