// Generic mapped-CSV lead importer (Fase 3). Consumes rows already parsed by
// parse-csv + a user-provided header→field mapping (see mapeado-core.ts) and
// upserts each row as a Lead, reusing the SAME create-or-link-Cliente and
// campaign-resolution logic as the Genions importer. Idempotent under the
// `csv:` genionsId namespace (never collides with `genions-*`). SERVER ONLY.
import type { PrismaClient } from "@prisma/client"
import { parseCsvText } from "@/lib/finance/import/parse-csv"
import { resolverOuCriarCliente } from "../contato"
import type { LeadOrigem, Plataforma } from "../types"
import type { LeadImportSummary } from "./leads"
import { type ColumnMapping, invertMapping, rowToMappedLead } from "./mapeado-core"

const lc = (v: string) => v.toLowerCase()

function origemToPlataforma(o: LeadOrigem): Plataforma {
  return o === "google_ads" ? "google_ads" : o === "meta_ads" ? "meta_ads" : "outro"
}

/** Import from raw CSV text using a header→field mapping. */
export async function importLeadsMapeadoFromText(
  prisma: PrismaClient,
  csvText: string,
  mapping: ColumnMapping,
  stages: { key: string; nome: string }[],
): Promise<LeadImportSummary> {
  return importMappedRows(prisma, parseCsvText(csvText), mapping, stages)
}

export async function importMappedRows(
  prisma: PrismaClient,
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  stages: { key: string; nome: string }[],
): Promise<LeadImportSummary> {
  const summary: LeadImportSummary = { total: 0, novos: 0, atualizados: 0, campanhasCriadas: 0, clientesCriados: 0, porEtapa: {} }
  const fieldToHeader = invertMapping(mapping)
  const campanhaCache = new Map<string, number>()

  async function resolveCampanha(nome: string | null, plataforma: Plataforma): Promise<number | null> {
    if (!nome) return null
    const key = `${plataforma}::${nome}`
    const cached = campanhaCache.get(key)
    if (cached) return cached
    const existing = await prisma.campanha.findUnique({ where: { plataforma_nome: { plataforma, nome } }, select: { id: true } })
    if (existing) {
      campanhaCache.set(key, existing.id)
      return existing.id
    }
    const created = await prisma.campanha.create({ data: { plataforma, nome, status: "ativa", ativo: true } })
    campanhaCache.set(key, created.id)
    summary.campanhasCriadas += 1
    return created.id
  }

  for (const row of rows) {
    const input = rowToMappedLead(row, fieldToHeader, stages)
    if (!input) continue

    const dataEntrada = input.dataEntrada ?? new Date()
    const campanhaId = await resolveCampanha(input.campanhaNome, origemToPlataforma(input.origem))

    // Idempotency: a synthetic key over nome+telefone+day so re-importing the
    // same file updates rather than duplicates. `csv:` namespace keeps it clear
    // of the Genions `genions-*` keys.
    const genionsId = `csv:${lc(input.nome)}:${input.telefone ?? ""}:${dataEntrada.toISOString().slice(0, 10)}`

    const existing = await prisma.lead.findUnique({ where: { genionsId }, select: { id: true, clienteId: true } })
    let clienteId = existing?.clienteId ?? null
    if (!clienteId) {
      const resolved = await resolverOuCriarCliente(prisma, { nome: input.nome, email: input.email, telefone: input.telefone, origem: input.origem })
      clienteId = resolved.id
      if (resolved.criado) summary.clientesCriados += 1
    }

    const data = {
      nome: input.nome,
      email: input.email,
      telefone: input.telefone,
      origem: input.origem,
      campanhaId,
      etapa: input.etapa,
      valorEstimadoCents: input.valorEstimadoCents,
      dataEntrada,
      dataConversao: input.etapa === "ganho" ? dataEntrada : null,
      temperatura: input.temperatura,
      observacoes: input.observacoes,
      clienteId,
    }

    await prisma.lead.upsert({ where: { genionsId }, create: { genionsId, ...data }, update: data })

    summary.total += 1
    if (existing) summary.atualizados += 1
    else summary.novos += 1
    summary.porEtapa[input.etapa] = (summary.porEtapa[input.etapa] ?? 0) + 1
  }

  return summary
}
