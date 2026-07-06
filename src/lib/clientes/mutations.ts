// Clientes — write layer. SERVER ONLY. App-created rows carry a synthetic
// astreaId ("app-cliente-<uuid>") so the Astrea importer never clobbers them.
// `emails`/`telefones` arrive as arrays and are stored ';'-joined (the Astrea
// convention used across the schema).
import { randomUUID } from "node:crypto"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { ORIGEM_LABEL } from "@/lib/comercial/types"

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
