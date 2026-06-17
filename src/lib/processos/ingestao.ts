// Ingestion PORT for court andamentos/publicações. SERVER ONLY.
//
// Real capture (PJe / e-SAJ / Projudi / DJe scrapers) is OUT OF SCOPE — this
// defines the contract a scraper plugs into and ships the MANUAL adapter (the
// POST /api/processos/ingestao route feeds `ingerir` directly). A scraper would
// implement `IngestaoAdapter.coletar()` and hand its output to `ingerir`.
//
// Linking: andamentos are matched to a processo by CNJ (an andamento needs a
// processo, so unmatched ones are skipped + counted). Publicações may arrive
// unmatched (processoId null) and be linked later during triagem. Idempotency is
// by `externalId` (the feed's protocol id) — re-sending the same batch is a no-op.
import { prisma } from "@/lib/db"
import type { AndamentoExterno, IngestaoResultado, PublicacaoExterna } from "./types"

/** Contract a future tribunal scraper implements; its output feeds `ingerir`. */
export interface IngestaoAdapter {
  nome: string // 'pje' | 'esaj' | 'projudi' | 'dje' | …
  /** Collect new andamentos/publicações since the given cursor (scraper-defined). */
  coletar(opts?: { desdeISO?: string }): Promise<{ andamentos: AndamentoExterno[]; publicacoes: PublicacaoExterna[] }>
}

const digits = (s: string | null | undefined): string => (s ?? "").replace(/\D/g, "")

function toDate(input: string | null | undefined): Date | null {
  if (!input) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)
  const d = new Date(input)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Map the CNJ (by digits) → processoId for the processos referenced in a batch. */
async function buildProcessoMap(cnjDigits: Set<string>): Promise<Map<string, number>> {
  if (cnjDigits.size === 0) return new Map()
  const rows = await prisma.processo.findMany({
    where: { excluidoEm: null, numeroCnj: { not: null } },
    select: { id: true, numeroCnj: true },
  })
  const map = new Map<string, number>()
  for (const r of rows) {
    const d = digits(r.numeroCnj)
    if (d && cnjDigits.has(d)) map.set(d, r.id)
  }
  return map
}

/**
 * Ingest a batch of external andamentos/publicações. Idempotent by externalId.
 * This IS the manual adapter's implementation; a scraper would build the same
 * `{ andamentos, publicacoes }` payload and call this.
 */
export async function ingerir(payload: {
  andamentos?: AndamentoExterno[]
  publicacoes?: PublicacaoExterna[]
}): Promise<IngestaoResultado> {
  const andamentos = payload.andamentos ?? []
  const publicacoes = payload.publicacoes ?? []

  const cnjDigits = new Set<string>()
  for (const a of andamentos) if (a.numeroCnj) cnjDigits.add(digits(a.numeroCnj))
  for (const p of publicacoes) if (p.numeroCnj) cnjDigits.add(digits(p.numeroCnj))
  const procMap = await buildProcessoMap(cnjDigits)

  // Pre-load existing externalIds so re-imports are no-ops.
  const extIds = [...andamentos, ...publicacoes].map((x) => x.externalId).filter(Boolean) as string[]
  const [existingAnd, existingPub] = await Promise.all([
    extIds.length
      ? prisma.andamento.findMany({ where: { externalId: { in: extIds } }, select: { externalId: true } })
      : Promise.resolve([]),
    extIds.length
      ? prisma.publicacao.findMany({ where: { externalId: { in: extIds } }, select: { externalId: true } })
      : Promise.resolve([]),
  ])
  const seenAnd = new Set(existingAnd.map((x) => x.externalId))
  const seenPub = new Set(existingPub.map((x) => x.externalId))

  const result: IngestaoResultado = {
    andamentosCriados: 0,
    andamentosIgnorados: 0,
    publicacoesCriadas: 0,
    publicacoesIgnoradas: 0,
    semVinculo: 0,
  }

  for (const a of andamentos) {
    if (a.externalId && seenAnd.has(a.externalId)) {
      result.andamentosIgnorados++
      continue
    }
    const processoId = a.numeroCnj ? procMap.get(digits(a.numeroCnj)) : undefined
    if (!processoId) {
      result.semVinculo++ // an andamento needs a processo; can't create one unmatched
      continue
    }
    const data = toDate(a.data)
    if (!data) {
      result.andamentosIgnorados++
      continue
    }
    await prisma.andamento.create({
      data: {
        processoId,
        data,
        tipo: a.tipo ?? null,
        descricao: a.descricao,
        fonte: a.fonte ?? "manual",
        relevante: !!a.relevante,
        statusRevisao: "novo", // capturado → entra na fila de revisão (por processo)
        externalId: a.externalId ?? null,
      },
    })
    if (a.externalId) seenAnd.add(a.externalId)
    result.andamentosCriados++
  }

  for (const p of publicacoes) {
    if (p.externalId && seenPub.has(p.externalId)) {
      result.publicacoesIgnoradas++
      continue
    }
    const processoId = p.numeroCnj ? procMap.get(digits(p.numeroCnj)) : undefined
    if (!processoId) result.semVinculo++
    await prisma.publicacao.create({
      data: {
        processoId: processoId ?? null,
        dataDisponibilizacao: toDate(p.dataDisponibilizacao),
        dataPublicacao: toDate(p.dataPublicacao),
        diario: p.diario ?? null,
        conteudo: p.conteudo,
        numeroProcessoBruto: p.numeroCnj ?? null,
        oabBruto: p.oab ?? null,
        externalId: p.externalId ?? null,
      },
    })
    if (p.externalId) seenPub.add(p.externalId)
    result.publicacoesCriadas++
  }

  return result
}
