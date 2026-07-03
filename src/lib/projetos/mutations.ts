// Projetos — write layer. SERVER ONLY. CRUD for Projeto + ProjetoTemplate, the
// template→projeto instantiation (relative deadlines via the CPC prazo engine),
// and the tasks bulk-edit (F4). Soft-delete (`excluidoEm`) on Projeto/Template;
// task rows are NEVER hidden — a deleted project's tasks read as "sem projeto".
//
// Notifications: single-task assignment notifies (tarefas/mutations). Template
// instantiation and bulk edits deliberately DON'T fan out per-task notifications
// (avoids spamming a recipient with N notices for one action).
import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { userIdPorEmail } from "@/lib/notificacoes/recipients"
import { anosParaPrazo, carregarContextoPrazo } from "@/lib/processos/contexto"
import {
  clampPrio3,
  optId,
  optOffset,
  optStr,
  reqStr,
  strArray,
  toDate,
  validBase,
  validProjetoStatus,
} from "./_input"
import { instanciarTemplate, type TemplateItemInput } from "./template"
import type { TemplateBase } from "./types"

const ISO = /^\d{4}-\d{2}-\d{2}$/
function parseJsonStrArr(s: string | null | undefined): string[] {
  if (!s) return []
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

// ── Projeto CRUD ───────────────────────────────────────────────────────────────
export interface ProjetoCreate {
  nome: string
  descricao?: string | null
  status?: string
  cor?: string | null
  icone?: string | null
  area?: string | null
  prazo?: string | null
  responsavelId?: number | null
  casoId?: number | null
  clienteId?: number | null
  ordem?: number
}

export async function createProjeto(input: ProjetoCreate) {
  return prisma.projeto.create({
    data: {
      nome: reqStr(input.nome, "nome"),
      descricao: optStr(input.descricao),
      status: validProjetoStatus(input.status),
      cor: optStr(input.cor),
      icone: optStr(input.icone),
      area: optStr(input.area),
      prazo: toDate(input.prazo),
      responsavelId: optId(input.responsavelId),
      casoId: optId(input.casoId),
      clienteId: optId(input.clienteId),
      ordem: Number.isInteger(input.ordem) ? (input.ordem as number) : 0,
    },
  })
}

export type ProjetoPatch = Partial<ProjetoCreate>

export async function updateProjeto(id: number, patch: ProjetoPatch) {
  const existing = await prisma.projeto.findFirst({ where: { id, excluidoEm: null }, select: { id: true } })
  if (!existing) throw new UserError("Projeto não encontrado")
  const data: Prisma.ProjetoUncheckedUpdateInput = {}
  if (patch.nome !== undefined) data.nome = reqStr(patch.nome, "nome")
  if (patch.descricao !== undefined) data.descricao = optStr(patch.descricao)
  if (patch.status !== undefined) data.status = validProjetoStatus(patch.status)
  if (patch.cor !== undefined) data.cor = optStr(patch.cor)
  if (patch.icone !== undefined) data.icone = optStr(patch.icone)
  if (patch.area !== undefined) data.area = optStr(patch.area)
  if (patch.prazo !== undefined) data.prazo = toDate(patch.prazo)
  if (patch.responsavelId !== undefined) data.responsavelId = optId(patch.responsavelId)
  if (patch.casoId !== undefined) data.casoId = optId(patch.casoId)
  if (patch.clienteId !== undefined) data.clienteId = optId(patch.clienteId)
  if (patch.ordem !== undefined && Number.isInteger(patch.ordem)) data.ordem = patch.ordem
  return prisma.projeto.update({ where: { id }, data })
}

/** Soft-delete: the project's tasks survive (read as "sem projeto"). Reversible. */
export async function deleteProjeto(id: number) {
  const existing = await prisma.projeto.findFirst({ where: { id, excluidoEm: null }, select: { id: true } })
  if (!existing) throw new UserError("Projeto não encontrado")
  await prisma.projeto.update({ where: { id }, data: { excluidoEm: new Date() } })
  return { id }
}

// ── Bulk task edit (F4) ─────────────────────────────────────────────────────────
export interface TarefasLote {
  ids: number[]
  status?: "todo" | "doing" | "review" | "done"
  responsavelId?: number | null
  data?: string | null
  prazo?: string | null
  projetoId?: number | null
  prio?: number
  excluir?: boolean
}

export async function bulkUpdateTarefas(input: TarefasLote) {
  const ids = (input.ids ?? []).filter((n) => Number.isInteger(n) && n > 0)
  if (!ids.length) throw new UserError("Selecione ao menos uma tarefa")
  if (input.excluir) {
    const r = await prisma.tarefa.deleteMany({ where: { id: { in: ids } } })
    return { excluidas: r.count }
  }
  const data: Prisma.TarefaUncheckedUpdateManyInput = {}
  if (input.status !== undefined) {
    data.status = input.status
    data.done = input.status === "done"
    data.concluidoEm = input.status === "done" ? new Date() : null
  }
  if (input.responsavelId !== undefined) data.responsavelId = optId(input.responsavelId)
  if (input.data !== undefined) data.data = toDate(input.data)
  if (input.prazo !== undefined) data.prazo = toDate(input.prazo)
  if (input.projetoId !== undefined) data.projetoId = optId(input.projetoId)
  if (input.prio !== undefined) data.prio = Math.min(4, Math.max(1, Math.round(input.prio)))
  if (Object.keys(data).length === 0) throw new UserError("Nenhuma alteração informada")
  const r = await prisma.tarefa.updateMany({ where: { id: { in: ids } }, data })
  return { atualizadas: r.count }
}

// ── Templates ─────────────────────────────────────────────────────────────────
export interface TemplateItemCreate {
  titulo: string
  descricao?: string | null
  prio?: number
  responsavelPlaceholder?: string | null
  offsetDias?: number
  base?: string
  dor?: string[]
  dod?: string[]
}
export interface TemplateCreate {
  nome: string
  descricao?: string | null
  area?: string | null
  cor?: string | null
  icone?: string | null
  ativo?: boolean
  itens?: TemplateItemCreate[]
}

function itemData(it: TemplateItemCreate, ordem: number) {
  return {
    titulo: reqStr(it.titulo, "título"),
    descricao: optStr(it.descricao),
    prio: clampPrio3(it.prio),
    responsavelPlaceholder: optStr(it.responsavelPlaceholder),
    offsetDias: optOffset(it.offsetDias),
    base: validBase(it.base),
    dor: JSON.stringify(strArray(it.dor)),
    dod: JSON.stringify(strArray(it.dod)),
    ordem,
  }
}

export async function createTemplate(input: TemplateCreate) {
  const itens = (input.itens ?? []).map((it, i) => itemData(it, i))
  return prisma.projetoTemplate.create({
    data: {
      nome: reqStr(input.nome, "nome"),
      descricao: optStr(input.descricao),
      area: optStr(input.area),
      cor: optStr(input.cor),
      icone: optStr(input.icone),
      ativo: input.ativo ?? true,
      itens: { create: itens },
    },
  })
}

export async function updateTemplate(id: number, patch: Partial<TemplateCreate>) {
  const existing = await prisma.projetoTemplate.findFirst({ where: { id, excluidoEm: null }, select: { id: true } })
  if (!existing) throw new UserError("Template não encontrado")
  const data: Prisma.ProjetoTemplateUncheckedUpdateInput = {}
  if (patch.nome !== undefined) data.nome = reqStr(patch.nome, "nome")
  if (patch.descricao !== undefined) data.descricao = optStr(patch.descricao)
  if (patch.area !== undefined) data.area = optStr(patch.area)
  if (patch.cor !== undefined) data.cor = optStr(patch.cor)
  if (patch.icone !== undefined) data.icone = optStr(patch.icone)
  if (patch.ativo !== undefined) data.ativo = !!patch.ativo
  // The editor sends the FULL item list → replace-all (keeps ordem authoritative).
  if (patch.itens !== undefined) {
    const itens = patch.itens.map((it, i) => itemData(it, i))
    return prisma.$transaction(async (tx) => {
      await tx.projetoTemplateTarefa.deleteMany({ where: { templateId: id } })
      return tx.projetoTemplate.update({ where: { id }, data: { ...data, itens: { create: itens } } })
    })
  }
  return prisma.projetoTemplate.update({ where: { id }, data })
}

export async function deleteTemplate(id: number) {
  const existing = await prisma.projetoTemplate.findFirst({ where: { id, excluidoEm: null }, select: { id: true } })
  if (!existing) throw new UserError("Template não encontrado")
  await prisma.projetoTemplate.update({ where: { id }, data: { excluidoEm: new Date(), ativo: false } })
  return { id }
}

// ── Instantiation: template → 1 Projeto + N Tarefa with relative deadlines ───────
export interface InstanciarInput {
  templateId: number
  dataInicio: string // "YYYY-MM-DD"
  nome?: string
  responsavelId?: number | null // project lead + fallback assignee
  casoId?: number | null
  clienteId?: number | null
  responsaveis?: { ordem: number; responsavelId: number }[] // item ordem → User id
}

export async function instanciarTemplateProjeto(input: InstanciarInput, actorEmail?: string | null) {
  const template = await prisma.projetoTemplate.findFirst({
    where: { id: input.templateId, excluidoEm: null },
    include: { itens: { orderBy: { ordem: "asc" } } },
  })
  if (!template) throw new UserError("Template não encontrado")

  const inicioISO = typeof input.dataInicio === "string" && ISO.test(input.dataInicio) ? input.dataInicio : null
  if (!inicioISO) throw new UserError("Data de início inválida (use AAAA-MM-DD)")

  const itensInput: TemplateItemInput[] = template.itens.map((it) => ({
    titulo: it.titulo,
    descricao: it.descricao,
    prio: it.prio,
    responsavelPlaceholder: it.responsavelPlaceholder,
    offsetDias: it.offsetDias,
    base: it.base as TemplateBase,
    dor: parseJsonStrArr(it.dor),
    dod: parseJsonStrArr(it.dod),
    ordem: it.ordem,
  }))

  // Load just enough holiday context for the longest chain (generous range).
  const totalDias = itensInput.reduce((s, i) => s + i.offsetDias, 0) + itensInput.length + 30
  const ctx = await carregarContextoPrazo(anosParaPrazo(Number(inicioISO.slice(0, 4)), totalDias))
  const instanciados = instanciarTemplate(itensInput, { dataInicio: inicioISO, ctx })

  const respMap = new Map<number, number>()
  for (const r of input.responsaveis ?? []) respMap.set(r.ordem, r.responsavelId)
  const fallbackResp = optId(input.responsavelId)
  const criadoPorId = await userIdPorEmail(actorEmail)
  const projetoArea = optStr(template.area) ?? "inbox"

  const projeto = await prisma.$transaction(async (tx) => {
    const p = await tx.projeto.create({
      data: {
        nome: reqStr(input.nome ?? template.nome, "nome"),
        descricao: template.descricao,
        status: "ativo",
        cor: template.cor,
        icone: template.icone,
        area: template.area,
        responsavelId: fallbackResp,
        casoId: optId(input.casoId),
        clienteId: optId(input.clienteId),
        templateOrigemId: template.id,
      },
    })
    if (instanciados.length) {
      await tx.tarefa.createMany({
        data: instanciados.map((it, i) => ({
          astreaId: `app-tarefa-${randomUUID()}`,
          titulo: it.titulo,
          status: "todo",
          done: false,
          prio: clampPrio3(it.prio),
          projeto: projetoArea, // legacy string-column mirror (Fase 4 retira)
          prazo: toDate(it.prazoISO),
          notes: it.descricao ?? null,
          dor: JSON.stringify((it.dor ?? []).map((text) => ({ text, done: false }))),
          dod: JSON.stringify((it.dod ?? []).map((text) => ({ text, done: false }))),
          responsavelId: respMap.get(it.ordem ?? i) ?? fallbackResp ?? null,
          criadoPorId,
          projetoId: p.id,
          origem: "template",
          geradoPorApp: true,
          ai: false,
        })),
      })
    }
    return p
  })
  return { id: projeto.id, nome: projeto.nome, tarefas: instanciados.length }
}
