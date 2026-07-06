// Clientes — write layer. SERVER ONLY. App-created rows carry a synthetic
// astreaId ("app-cliente-<uuid>") so the Astrea importer never clobbers them.
// `emails`/`telefones` arrive as arrays and are stored ';'-joined (the Astrea
// convention used across the schema).
import { randomUUID } from "node:crypto"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { ORIGEM_LABEL } from "@/lib/comercial/types"
import { planejarMesclagemCliente, type MergeClienteFields } from "./merge"

function reqStr(v: unknown, name: string): string {
  if (typeof v !== "string" || !v.trim()) throw new UserError(`${name} obrigatório`)
  return v.trim()
}
function optStr(v: unknown): string | null {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t ? t : null
}
function joinList(v: unknown): string | null {
  if (!Array.isArray(v)) return null
  const items = v.map((x) => String(x).trim()).filter(Boolean)
  return items.length ? items.join(";") : null
}
function validTipo(v: unknown): "pf" | "pj" {
  return v === "pj" ? "pj" : "pf"
}
function validClassificacao(v: unknown): "cliente" | "lead" {
  return v === "lead" ? "lead" : "cliente"
}
/** Coerce to a known origem key (same set as Lead) or null. Empty/unknown → null. */
function validOrigem(v: unknown): string | null {
  return typeof v === "string" && v in ORIGEM_LABEL ? v : null
}

export interface ClienteCreate {
  nome: string
  apelido?: string | null
  tipo?: string
  classificacao?: string
  cpfCnpj?: string | null
  simplesNacional?: boolean
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
  cep?: string | null
  emails?: string[]
  telefones?: string[]
  origem?: string | null
}

export async function createCliente(input: ClienteCreate) {
  return prisma.cliente.create({
    data: {
      astreaId: `app-cliente-${randomUUID()}`,
      nome: reqStr(input.nome, "nome"),
      apelido: optStr(input.apelido),
      tipo: validTipo(input.tipo),
      classificacao: validClassificacao(input.classificacao),
      cpfCnpj: optStr(input.cpfCnpj),
      simplesNacional: !!input.simplesNacional,
      logradouro: optStr(input.logradouro),
      numero: optStr(input.numero),
      complemento: optStr(input.complemento),
      bairro: optStr(input.bairro),
      cidade: optStr(input.cidade),
      uf: optStr(input.uf),
      cep: optStr(input.cep),
      emails: joinList(input.emails),
      telefones: joinList(input.telefones),
      origem: validOrigem(input.origem),
    },
  })
}

export type ClientePatch = Partial<ClienteCreate>

export async function updateCliente(id: number, patch: ClientePatch) {
  const data: Prisma.ClienteUncheckedUpdateInput = {}
  if (patch.nome !== undefined) data.nome = reqStr(patch.nome, "nome")
  if (patch.apelido !== undefined) data.apelido = optStr(patch.apelido)
  if (patch.tipo !== undefined) data.tipo = validTipo(patch.tipo)
  if (patch.classificacao !== undefined) data.classificacao = validClassificacao(patch.classificacao)
  if (patch.cpfCnpj !== undefined) data.cpfCnpj = optStr(patch.cpfCnpj)
  if (patch.simplesNacional !== undefined) data.simplesNacional = !!patch.simplesNacional
  if (patch.logradouro !== undefined) data.logradouro = optStr(patch.logradouro)
  if (patch.numero !== undefined) data.numero = optStr(patch.numero)
  if (patch.complemento !== undefined) data.complemento = optStr(patch.complemento)
  if (patch.bairro !== undefined) data.bairro = optStr(patch.bairro)
  if (patch.cidade !== undefined) data.cidade = optStr(patch.cidade)
  if (patch.uf !== undefined) data.uf = optStr(patch.uf)
  if (patch.cep !== undefined) data.cep = optStr(patch.cep)
  if (patch.emails !== undefined) data.emails = joinList(patch.emails)
  if (patch.telefones !== undefined) data.telefones = joinList(patch.telefones)
  if (patch.origem !== undefined) data.origem = validOrigem(patch.origem)
  return prisma.cliente.update({ where: { id }, data })
}

const MERGE_SELECT = {
  apelido: true,
  cpfCnpj: true,
  emails: true,
  telefones: true,
  origem: true,
  logradouro: true,
  numero: true,
  complemento: true,
  bairro: true,
  cidade: true,
  uf: true,
  cep: true,
} as const

/** Merge a duplicate Cliente (`duplicadoId`) into the surviving one (`alvoId`):
 *  re-point EVERY reference (casos, honorários, lançamentos, tarefas, eventos,
 *  documentos, partes, projetos, leads, anotações) to the survivor, backfill the
 *  survivor's empty contact fields from the duplicate, then hard-delete the now
 *  fully-drained duplicate. Nothing is orphaned. The AuditLog entry (action
 *  "cliente.mesclar", written by runMutation) is the evidence trail. */
export async function mesclarClientes(alvoId: number, duplicadoId: number) {
  if (alvoId === duplicadoId) throw new UserError("Escolha um cliente diferente para mesclar")
  return prisma.$transaction(async (tx) => {
    const [alvo, duplicado] = await Promise.all([
      tx.cliente.findUnique({ where: { id: alvoId }, select: MERGE_SELECT }),
      tx.cliente.findUnique({ where: { id: duplicadoId }, select: MERGE_SELECT }),
    ])
    if (!alvo) throw new UserError("Cliente de destino não encontrado")
    if (!duplicado) throw new UserError("Cliente duplicado não encontrado")

    // Re-point every reference from the duplicate to the survivor.
    const where = { clienteId: duplicadoId }
    const data = { clienteId: alvoId }
    const [honorarios, lancamentos, leads, tarefas, eventos, documentos, partes, projetos, anotacoes, casos] =
      await Promise.all([
        tx.honorario.updateMany({ where, data }),
        tx.lancamento.updateMany({ where, data }),
        tx.lead.updateMany({ where, data }),
        tx.tarefa.updateMany({ where, data }),
        tx.evento.updateMany({ where, data }),
        tx.documento.updateMany({ where, data }),
        tx.parte.updateMany({ where, data }),
        tx.projeto.updateMany({ where, data }),
        tx.clienteAnotacao.updateMany({ where, data }),
        tx.caso.updateMany({ where: { clientePrincipalId: duplicadoId }, data: { clientePrincipalId: alvoId } }),
      ])

    // Backfill the survivor's empty fields from the duplicate, then remove it.
    const backfill = planejarMesclagemCliente(alvo as MergeClienteFields, duplicado as MergeClienteFields)
    if (Object.keys(backfill).length > 0) await tx.cliente.update({ where: { id: alvoId }, data: backfill })
    await tx.cliente.delete({ where: { id: duplicadoId } })

    return {
      alvoId,
      duplicadoId,
      movidos: {
        honorarios: honorarios.count,
        lancamentos: lancamentos.count,
        leads: leads.count,
        tarefas: tarefas.count,
        eventos: eventos.count,
        documentos: documentos.count,
        partes: partes.count,
        projetos: projetos.count,
        anotacoes: anotacoes.count,
        casos: casos.count,
      },
    }
  })
}
