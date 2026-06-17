// Agenda — write layer. SERVER ONLY.
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { notificarEventoAtribuido } from "@/lib/notificacoes/triggers"
import { EVENTO_STATUS, EVENTO_TIPOS, type EventoStatus, type EventoTipo } from "./types"

// ── input coercion (mirrors the tarefas/_input.ts conventions) ───────────────
/** Accepts "YYYY-MM-DD" (→ local midday) or a full datetime string (local). */
function toDateTime(input: unknown): Date | null {
  if (input === null || input === undefined || input === "") return null
  if (input instanceof Date) return input
  if (typeof input !== "string") return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)
  const d = new Date(input)
  return Number.isNaN(d.getTime()) ? null : d
}
function reqStr(v: unknown, name: string): string {
  if (typeof v !== "string" || !v.trim()) throw new UserError(`${name} obrigatório`)
  return v.trim()
}
function optStr(v: unknown): string | null {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t ? t : null
}
function optId(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}
function validTipo(v: unknown): EventoTipo {
  return (typeof v === "string" && (EVENTO_TIPOS as readonly string[]).includes(v) ? v : "reuniao") as EventoTipo
}
function validStatus(v: unknown): EventoStatus {
  return (typeof v === "string" && (EVENTO_STATUS as readonly string[]).includes(v)
    ? v
    : "confirmado") as EventoStatus
}
function assertOrdem(inicio: Date, fim: Date | null): void {
  if (fim && fim.getTime() < inicio.getTime()) throw new UserError("Término deve ser depois do início")
}

// ── mutations ─────────────────────────────────────────────────────────────────
export interface EventoCreate {
  titulo: string
  tipo?: string
  dataInicio: string // "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM"
  dataFim?: string | null
  diaInteiro?: boolean
  local?: string | null
  descricao?: string | null
  status?: string
  responsavelId?: number | null
  clienteId?: number | null
  casoId?: number | null
}

export async function createEvento(input: EventoCreate, actorEmail?: string | null) {
  const inicio = toDateTime(input.dataInicio)
  if (!inicio) throw new UserError("Data de início obrigatória")
  const fim = toDateTime(input.dataFim)
  assertOrdem(inicio, fim)
  const evento = await prisma.evento.create({
    data: {
      titulo: reqStr(input.titulo, "título"),
      tipo: validTipo(input.tipo),
      dataInicio: inicio,
      dataFim: fim,
      diaInteiro: !!input.diaInteiro,
      local: optStr(input.local),
      descricao: optStr(input.descricao),
      status: validStatus(input.status),
      responsavelId: optId(input.responsavelId),
      clienteId: optId(input.clienteId),
      casoId: optId(input.casoId),
      origem: "manual",
      geradoPorApp: true,
    },
  })
  if (evento.responsavelId) {
    void notificarEventoAtribuido({ eventoId: evento.id, titulo: evento.titulo, responsavelId: evento.responsavelId, actorEmail })
  }
  return evento
}

export type EventoPatch = Partial<EventoCreate>

export async function updateEvento(id: number, patch: EventoPatch, actorEmail?: string | null) {
  const existing = await prisma.evento.findUnique({
    where: { id },
    select: { dataInicio: true, dataFim: true, responsavelId: true },
  })
  if (!existing) throw new UserError("Evento não encontrado")

  const data: Prisma.EventoUncheckedUpdateInput = {}
  if (patch.titulo !== undefined) data.titulo = reqStr(patch.titulo, "título")
  if (patch.tipo !== undefined) data.tipo = validTipo(patch.tipo)
  if (patch.diaInteiro !== undefined) data.diaInteiro = !!patch.diaInteiro
  if (patch.local !== undefined) data.local = optStr(patch.local)
  if (patch.descricao !== undefined) data.descricao = optStr(patch.descricao)
  if (patch.status !== undefined) data.status = validStatus(patch.status)
  if (patch.responsavelId !== undefined) data.responsavelId = optId(patch.responsavelId)
  if (patch.clienteId !== undefined) data.clienteId = optId(patch.clienteId)
  if (patch.casoId !== undefined) data.casoId = optId(patch.casoId)

  // Datas: validate the resulting pair (patched value or current one).
  let inicio = existing.dataInicio
  if (patch.dataInicio !== undefined) {
    const d = toDateTime(patch.dataInicio)
    if (!d) throw new UserError("Data de início inválida")
    data.dataInicio = d
    inicio = d
  }
  let fim = existing.dataFim
  if (patch.dataFim !== undefined) {
    fim = toDateTime(patch.dataFim)
    data.dataFim = fim
  }
  assertOrdem(inicio, fim)

  const evento = await prisma.evento.update({ where: { id }, data })
  if (
    patch.responsavelId !== undefined &&
    evento.responsavelId &&
    evento.responsavelId !== (existing.responsavelId ?? null)
  ) {
    void notificarEventoAtribuido({ eventoId: evento.id, titulo: evento.titulo, responsavelId: evento.responsavelId, actorEmail })
  }
  return evento
}

export async function deleteEvento(id: number) {
  await prisma.evento.delete({ where: { id } })
  return { id }
}
