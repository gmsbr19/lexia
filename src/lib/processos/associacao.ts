// Auto-associação AI-first de um processo a caso / cliente / honorário. SERVER ONLY.
//
// Apoio à decisão com POLÍTICA DE CONFIANÇA (decisão do escritório): só consideramos
// vínculo FORTE quando há identidade objetiva — número CNJ idêntico (por dígitos) ou
// CPF/CNPJ idêntico. Correspondência por NOME de parte é sempre apenas SUGESTÃO de
// 1 clique (consistência de dados acima de automação cega). Este módulo toca SOMENTE
// o prisma (sem next-auth / sem rbac-assert) para ser seguro no grafo das tools da
// LexIA (tests/lexia-agent.test.ts carrega o registry).
import { prisma } from "@/lib/db"
import { contemNormalizado, normalizar } from "@/lib/text"

export const digits = (s: string | null | undefined): string => (s ?? "").replace(/\D/g, "")

export interface CasoSugerido {
  id: number
  titulo: string
  cliente: string | null
  clienteId: number | null
  via: string // "CNJ" | "cliente: <nome>"
}
export interface ClienteSugerido {
  id: number
  nome: string
  cpfCnpj: string | null
  via: string // "CPF/CNPJ" | "caso (CNJ)" | "nome"
}
export interface HonorarioSugerido {
  id: number
  descricao: string
  valorCents: number
  via: string
}
export interface ProcessoExistente {
  id: number
  numeroCnj: string | null
  caso: string | null
}
export type Confianca = "forte" | "fraca" | "nenhuma"

// ── matchers (fontes) ──────────────────────────────────────────────────────────

/** Processo existente cujo CNJ (por dígitos) bate com o informado. Exige um CNJ
 *  COMPLETO (20 dígitos, Res. 65/2008) — um número curto/parcial não é match forte. */
export async function processoPorCnj(dig: string): Promise<ProcessoExistente | null> {
  if (dig.length !== 20) return null
  const rows = await prisma.processo.findMany({
    where: { excluidoEm: null, numeroCnj: { not: null } },
    select: { id: true, numeroCnj: true, caso: { select: { titulo: true } } },
  })
  const hit = rows.find((r) => digits(r.numeroCnj) === dig)
  return hit ? { id: hit.id, numeroCnj: hit.numeroCnj, caso: hit.caso?.titulo ?? null } : null
}

/** Casos cujo numeroProcesso (por dígitos) bate com o CNJ — vínculo FORTE.
 *  Exige CNJ completo (20 dígitos) p/ não casar números curtos/lixo por engano. */
export async function casosPorCnj(dig: string): Promise<CasoSugerido[]> {
  if (dig.length !== 20) return []
  const rows = await prisma.caso.findMany({
    where: { excluidoEm: null, numeroProcesso: { not: null } },
    select: { id: true, titulo: true, numeroProcesso: true, clientePrincipalId: true, clientePrincipal: { select: { nome: true } } },
  })
  return rows
    .filter((r) => digits(r.numeroProcesso) === dig)
    .map((r) => ({ id: r.id, titulo: r.titulo, cliente: r.clientePrincipal?.nome ?? null, clienteId: r.clientePrincipalId, via: "CNJ" }))
}

/** Casos cujo título/cliente contém algum dos nomes de parte — SUGESTÃO (fraca). */
export async function casosPorNomes(nomes: string[]): Promise<CasoSugerido[]> {
  const termos = [...new Set(nomes.map((n) => normalizar(n)).filter((n) => n.length >= 4))].slice(0, 4)
  if (!termos.length) return []
  // Accent-insensitive (mixed accented/unaccented data): match the normalized
  // terms against the normalized título/cliente in JS, not via SQLite LIKE.
  const rows = await prisma.caso.findMany({
    where: { excluidoEm: null },
    select: { id: true, titulo: true, clientePrincipalId: true, clientePrincipal: { select: { nome: true } } },
  })
  return rows
    .filter((r) => termos.some((t) => contemNormalizado(t, r.titulo, r.clientePrincipal?.nome)))
    .slice(0, 6)
    .map((r) => ({
    id: r.id,
    titulo: r.titulo,
    cliente: r.clientePrincipal?.nome ?? null,
    clienteId: r.clientePrincipalId,
    via: `cliente: ${r.clientePrincipal?.nome ?? r.titulo}`,
  }))
}

/** Clientes cujo CPF/CNPJ (por dígitos) bate — vínculo FORTE. */
export async function clientesPorDocumento(doc: string): Promise<ClienteSugerido[]> {
  const d = digits(doc)
  if (d.length < 11) return []
  const rows = await prisma.cliente.findMany({
    where: { cpfCnpj: { not: null } },
    select: { id: true, nome: true, cpfCnpj: true },
  })
  return rows.filter((r) => digits(r.cpfCnpj) === d).map((r) => ({ id: r.id, nome: r.nome, cpfCnpj: r.cpfCnpj, via: "CPF/CNPJ" }))
}

/** Clientes cujo nome contém algum dos nomes de parte — SUGESTÃO (fraca). */
export async function clientesPorNome(nomes: string[]): Promise<ClienteSugerido[]> {
  const termos = [...new Set(nomes.map((n) => normalizar(n)).filter((n) => n.length >= 4))].slice(0, 4)
  if (!termos.length) return []
  // Accent-insensitive match against the normalized nome (SQLite LIKE can't fold
  // diacritics, and the imported names mix accented/unaccented spellings).
  const rows = await prisma.cliente.findMany({ select: { id: true, nome: true, cpfCnpj: true } })
  return rows
    .filter((r) => termos.some((t) => contemNormalizado(t, r.nome)))
    .slice(0, 6)
    .map((r) => ({ id: r.id, nome: r.nome, cpfCnpj: r.cpfCnpj, via: "nome" }))
}

/** Honorários (fee-lançamentos) já lançados no caso, ainda sem processo estruturado
 *  (candidatos a conectar). O id devolvido é de LANÇAMENTO (Honorario é dormente). */
export async function honorariosDoCaso(casoId: number): Promise<HonorarioSugerido[]> {
  const rows = await prisma.lancamento.findMany({
    where: { casoId, processoId: null, tipo: "entrada", subTipo: "honorario", isAnomalia: false },
    select: { id: true, descricao: true, valorCents: true },
    orderBy: { dataVencimento: "desc" },
    take: 10,
  })
  return rows.map((r) => ({ id: r.id, descricao: r.descricao ?? "Honorário", valorCents: Math.abs(r.valorCents), via: "caso" }))
}

// ── orquestrador ────────────────────────────────────────────────────────────────

export interface AssociacaoInput {
  numeroCnj?: string | null
  /** CPF/CNPJ extraídos (raramente vêm de uma intimação; quando vierem, geram match forte). */
  documentos?: (string | null | undefined)[]
  partesNomes?: string[]
  clienteProvavel?: string | null
}
export interface AssociacaoResultado {
  numeroCnj: string | null
  processoExistente: ProcessoExistente | null
  casoForte: CasoSugerido | null
  casosSugeridos: CasoSugerido[]
  clienteForte: ClienteSugerido | null
  clientesSugeridos: ClienteSugerido[]
  honorariosSugeridos: HonorarioSugerido[]
  confianca: Confianca
}

/**
 * Varre o banco por um caso/cliente/honorário correspondente a um processo. Forte =
 * CNJ ou documento idêntico (pode ser auto-aplicado); o resto é sugestão de 1 clique.
 */
export async function associarProcesso(input: AssociacaoInput): Promise<AssociacaoResultado> {
  const dig = digits(input.numeroCnj)
  const nomes = [input.clienteProvavel ?? "", ...(input.partesNomes ?? [])].filter(Boolean)
  const docs = (input.documentos ?? []).map((d) => digits(d)).filter((d) => d.length >= 11)

  const [processoExistente, porCnj, porNome, porDoc, porNomeCli] = await Promise.all([
    processoPorCnj(dig),
    casosPorCnj(dig),
    casosPorNomes(nomes),
    docs.length ? clientesPorDocumento(docs[0]) : Promise.resolve<ClienteSugerido[]>([]),
    clientesPorNome(nomes),
  ])

  const casoForte = porCnj[0] ?? null
  const vistosCaso = new Set<number>()
  const casosSugeridos: CasoSugerido[] = []
  for (const c of [...porCnj, ...porNome]) {
    if (vistosCaso.has(c.id)) continue
    vistosCaso.add(c.id)
    casosSugeridos.push(c)
    if (casosSugeridos.length >= 5) break
  }

  // Cliente forte: documento idêntico OU o cliente principal do caso forte — mas só
  // quando o CNJ casa com EXATAMENTE um caso (se dois casos compartilham o nº, é
  // ambíguo → vira sugestão, nunca auto-aplica, p/ não contaminar com o cliente errado).
  let clienteForte: ClienteSugerido | null = porDoc[0] ?? null
  if (!clienteForte && casoForte?.clienteId && porCnj.length === 1) {
    clienteForte = { id: casoForte.clienteId, nome: casoForte.cliente ?? `cliente #${casoForte.clienteId}`, cpfCnpj: null, via: "caso (CNJ)" }
  }
  const vistosCli = new Set<number>(clienteForte ? [clienteForte.id] : [])
  const clientesSugeridos: ClienteSugerido[] = []
  for (const c of [...porDoc, ...porNomeCli]) {
    if (vistosCli.has(c.id)) continue
    vistosCli.add(c.id)
    clientesSugeridos.push(c)
    if (clientesSugeridos.length >= 5) break
  }

  const honorariosSugeridos = casoForte ? await honorariosDoCaso(casoForte.id) : []

  const confianca: Confianca =
    casoForte || porDoc.length ? "forte" : casosSugeridos.length || clientesSugeridos.length ? "fraca" : "nenhuma"

  return {
    numeroCnj: input.numeroCnj ?? null,
    processoExistente,
    casoForte,
    casosSugeridos,
    clienteForte,
    clientesSugeridos,
    honorariosSugeridos,
    confianca,
  }
}
