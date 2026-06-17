// Meta Ads → Lexia campaign importer. Reads Meta's "Campanhas" report CSV (one
// row per campaign, monthly) and:
//   1. upserts each campaign (plataforma 'meta_ads'), idempotent by (plataforma, nome)
//   2. records "Valor usado (BRL)" as an ad-spend Lancamento (categoria Marketing,
//      campanhaId) so it feeds the Comercial investimento/ROAS KPIs and the
//      Financeiro ledger — idempotent by a deterministic astreaId per (campaign,
//      report period), so re-importing the same month UPDATES instead of doubling.
// SERVER ONLY (db).
//
// Expected Meta export columns (pt-BR): "Início dos relatórios",
// "Encerramento dos relatórios", "Nome da campanha", "Veiculação da campanha",
// Resultados, "Indicador de resultados", "Custo por resultados",
// "Orçamento do conjunto de anúncios", "Tipo de orçamento do conjunto de anúncios",
// "Valor usado (BRL)", Impressões, Alcance, … (extra metric columns are parsed-
// tolerant and ignored — there is no surface for impressions/reach yet).
import type { PrismaClient } from "@prisma/client"
import { cleanNull, parseCsvText, readCsv } from "@/lib/finance/import/parse-csv"
import { toCents } from "@/lib/finance/money"
import { ensureMarketingCategoriaId } from "../mutations"
import { PLATAFORMA_LABEL, type CampanhaStatus } from "../types"

export interface MetaImportSummary {
  total: number // campaign rows processed
  campanhasCriadas: number
  campanhasAtualizadas: number
  gastosRegistrados: number // spend Lancamentos created/updated
  totalGastoCents: number // sum of spend imported (magnitude)
  periodo: string | null // "YYYY-MM-DD a YYYY-MM-DD" from the first row
}

const lc = (v: string | null | undefined) => (v ?? "").toLowerCase()

/** First non-null value among candidate header names (case/space tolerant). */
function pick(row: Record<string, string>, candidates: string[]): string | null {
  const wanted = candidates.map((c) => c.toLowerCase())
  for (const key of Object.keys(row)) {
    if (wanted.includes(key.trim().toLowerCase())) {
      const v = cleanNull(row[key])
      if (v) return v
    }
  }
  return null
}

/** "YYYY-MM-DD" → local midday (avoids UTC off-by-one); else null. */
function isoNoon(s: string | null): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim())
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)
}

/** Map Meta's "Veiculação da campanha" (delivery) onto our campaign status.
 *  NB: "inactive" contains "active" — test inactive/paused first. */
function detectStatus(veiculacao: string | null): CampanhaStatus {
  const v = lc(veiculacao)
  if (!v) return "pausada"
  if (v.includes("inativ") || v.includes("inactive") || v.includes("paus") || v.includes("off")) return "pausada"
  if (v.includes("complet") || v.includes("encerr") || v.includes("ended") || v.includes("finaliz")) return "encerrada"
  if (v.includes("ativ") || v.includes("active") || v.includes("veicul") || v.includes("delivering") || v.includes("recent")) return "ativa"
  return "pausada"
}

/** Leading "[BRACKET]" of the campaign name → objetivo (e.g. "MENSAGEM", "Leads"). */
function detectObjetivo(nome: string): string | null {
  const m = /^\s*\[([^\]]+)\]/.exec(nome)
  return m ? m[1].trim() : null
}

/** Import from a CSV file path (CLI seed). */
export async function importMetaCampaignsFromCsv(prisma: PrismaClient, csvPath: string): Promise<MetaImportSummary> {
  return importMetaRows(prisma, readCsv(csvPath))
}

/** Import from raw CSV text (in-app upload route). */
export async function importMetaCampaignsFromText(prisma: PrismaClient, csvText: string): Promise<MetaImportSummary> {
  return importMetaRows(prisma, parseCsvText(csvText))
}

async function importMetaRows(prisma: PrismaClient, rows: Record<string, string>[]): Promise<MetaImportSummary> {
  const summary: MetaImportSummary = {
    total: 0,
    campanhasCriadas: 0,
    campanhasAtualizadas: 0,
    gastosRegistrados: 0,
    totalGastoCents: 0,
    periodo: null,
  }
  let categoriaId: number | null = null

  for (const row of rows) {
    const nome = pick(row, ["Nome da campanha", "Campaign name", "Campanha", "Nome"])
    if (!nome) continue // skip totals/blank rows

    const veiculacao = pick(row, ["Veiculação da campanha", "Veiculacao da campanha", "Campaign delivery", "Delivery", "Veiculação"])
    const periodStart = pick(row, ["Início dos relatórios", "Inicio dos relatorios", "Reporting starts", "Início", "Inicio"])
    const periodEnd = pick(row, ["Encerramento dos relatórios", "Encerramento dos relatorios", "Reporting ends", "Encerramento"])
    const valorCents = toCents(pick(row, ["Valor usado (BRL)", "Valor usado (R$)", "Amount spent (BRL)", "Valor gasto", "Valor usado", "Valor"]))

    if (!summary.periodo && (periodStart || periodEnd)) summary.periodo = `${periodStart ?? "?"} a ${periodEnd ?? "?"}`

    const status = detectStatus(veiculacao)
    const objetivo = detectObjetivo(nome)

    // 1) Upsert the campaign (idempotent by plataforma+nome).
    const existing = await prisma.campanha.findUnique({
      where: { plataforma_nome: { plataforma: "meta_ads", nome } },
      select: { id: true },
    })
    const camp = await prisma.campanha.upsert({
      where: { plataforma_nome: { plataforma: "meta_ads", nome } },
      create: {
        plataforma: "meta_ads",
        nome,
        status,
        objetivo,
        dataInicio: isoNoon(periodStart),
        dataFim: null,
        ativo: status !== "encerrada",
      },
      update: {
        status,
        ...(objetivo ? { objetivo } : {}),
      },
    })
    summary.total += 1
    if (existing) summary.campanhasAtualizadas += 1
    else summary.campanhasCriadas += 1

    // 2) Record ad spend as a Marketing saída Lancamento (idempotent per period).
    if (valorCents > 0) {
      if (categoriaId == null) categoriaId = await ensureMarketingCategoriaId()
      const periodKey = periodStart ?? periodEnd ?? "nodate"
      const astreaId = `meta-spend-${camp.id}-${periodKey}`
      const signed = -Math.abs(valorCents) // saída → negative, mirrors createLancamento
      const when = isoNoon(periodEnd) ?? isoNoon(periodStart) ?? new Date()
      const descricao = `Anúncios Meta — ${nome}${periodStart ? ` · ${periodStart.slice(0, 7)}` : ""}`
      await prisma.lancamento.upsert({
        where: { astreaId },
        create: {
          astreaId,
          tipo: "saida",
          status: "feito",
          subTipo: "avulsa",
          descricao,
          valorCents: signed,
          valorOriginalCents: signed,
          pagoPara: PLATAFORMA_LABEL.meta_ads,
          dataLancamento: when,
          dataPagamento: when,
          dataVencimento: null,
          isAnomalia: false,
          geradoPorApp: true,
          origem: "manual",
          categoriaId,
          campanhaId: camp.id,
        },
        update: {
          descricao,
          valorCents: signed,
          valorOriginalCents: signed,
          dataLancamento: when,
          dataPagamento: when,
          categoriaId,
        },
      })
      summary.gastosRegistrados += 1
      summary.totalGastoCents += Math.abs(valorCents)
    }
  }

  return summary
}
