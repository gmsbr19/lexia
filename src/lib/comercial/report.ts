// Comercial / Marketing report helpers — PURE + client-safe (no prisma). Turn an
// ExportBundle into (a) a paste-ready PT-BR prompt the user hands to Claude to
// get an executive report, and (b) CSV/JSON payloads for download. Used by the
// export route and the Exportar tab.
import { formatBRL } from "@/lib/finance/money"
import type { ExportBundle } from "./types"

const reais = (cents: number) => (cents / 100).toFixed(2)
const pct = (n: number | null) => (n == null ? "—" : `${n.toFixed(1).replace(".", ",")}%`)
const roas = (n: number | null) => (n == null ? "—" : `${n.toFixed(2).replace(".", ",")}x`)
const money = (cents: number) => formatBRL(cents)

// ── AI prompt ────────────────────────────────────────────────────────────────
export function buildRelatorioPrompt(bundle: ExportBundle): string {
  const { scope, kpis, funil, campanhas, origens } = bundle
  const linhasFunil = funil
    .map((f) => `  - ${f.label}: ${f.count} leads (${pct(f.pctDoTopo)} do topo, ${money(f.valorCents)})`)
    .join("\n")
  const linhasCanais = origens
    .map(
      (o) =>
        `  - ${o.label}: ${o.leads} leads, ${o.conversoes} conversões, invest. ${money(o.investimentoCents)}, ` +
        `contratado ${money(o.valorContratadoCents)}, ROAS ${roas(o.roas)}, CPL ${o.cplCents == null ? "—" : money(o.cplCents)}`,
    )
    .join("\n")
  const linhasCamp = campanhas
    .slice()
    .sort((a, b) => (b.roas ?? -1) - (a.roas ?? -1))
    .map(
      (c) =>
        `  - ${c.nome} (${c.plataforma}): invest. ${money(c.investimentoCents)}, ${c.leads} leads, ` +
        `${c.conversoes} conversões, contratado ${money(c.valorContratadoCents)}, ROAS ${roas(c.roas)}, ` +
        `CAC ${c.cacCents == null ? "—" : money(c.cacCents)}, ROI ${pct(c.roiPct)}`,
    )
    .join("\n")

  return `Você é analista de marketing de um escritório de advocacia. Gere um RELATÓRIO EXECUTIVO em português (PT-BR), claro e orientado a decisão, a partir dos dados de aquisição abaixo. Período: ${scope.title} · ${scope.sub}.

INDICADORES (KPIs) DO PERÍODO
- Leads: ${kpis.leads}${kpis.leadsDeltaPct == null ? "" : ` (${kpis.leadsDeltaPct >= 0 ? "+" : ""}${pct(kpis.leadsDeltaPct)} vs. período anterior)`}
- Conversões: ${kpis.conversoes} (taxa de conversão ${pct(kpis.taxaConversaoPct)})
- Investimento em anúncios: ${money(kpis.investimentoCents)}
- Valor contratado: ${money(kpis.valorContratadoCents)}
- Receita recebida (caixa): ${money(kpis.receitaRecebidaCents)}
- ROAS: ${roas(kpis.roas)} · ROI: ${pct(kpis.roiPct)}
- CAC: ${kpis.cacCents == null ? "—" : money(kpis.cacCents)} · CPL: ${kpis.cplCents == null ? "—" : money(kpis.cplCents)} · Ticket médio: ${kpis.ticketMedioCents == null ? "—" : money(kpis.ticketMedioCents)}

FUNIL DE VENDAS
${linhasFunil || "  (sem leads no período)"}

DESEMPENHO POR CANAL
${linhasCanais || "  (sem dados)"}

DESEMPENHO POR CAMPANHA (ordenado por ROAS)
${linhasCamp || "  (sem campanhas)"}

Em anexo, segue o CSV com o detalhamento lead a lead (use-o para aprofundar a análise).

Estruture o relatório com:
1. Resumo executivo (3–5 frases): estamos ganhando dinheiro com anúncios?
2. Leitura do funil e principais gargalos (onde os leads travam).
3. Análise de ROI/ROAS/CAC/CPL por canal e por campanha, com interpretação.
4. Recomendações práticas de realocação de verba (o que escalar, pausar ou testar).
5. Próximos passos priorizados para o próximo período.
Seja objetivo, use números e evite jargão.`
}

// ── CSV (semicolon-separated; multiple labelled sections) ────────────────────
function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v)
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(";")
}

export function bundleToCsv(bundle: ExportBundle): string {
  const { scope, kpis, funil, campanhas, origens, leads } = bundle
  const lines: string[] = []
  lines.push(csvRow(["Relatório comercial", `${scope.title} ${scope.sub}`]))
  lines.push("")

  lines.push(csvRow(["KPIs"]))
  lines.push(csvRow(["indicador", "valor"]))
  lines.push(csvRow(["Leads", kpis.leads]))
  lines.push(csvRow(["Conversões", kpis.conversoes]))
  lines.push(csvRow(["Taxa de conversão (%)", kpis.taxaConversaoPct ?? ""]))
  lines.push(csvRow(["Investimento (R$)", reais(kpis.investimentoCents)]))
  lines.push(csvRow(["Valor contratado (R$)", reais(kpis.valorContratadoCents)]))
  lines.push(csvRow(["Receita recebida (R$)", reais(kpis.receitaRecebidaCents)]))
  lines.push(csvRow(["ROAS", kpis.roas ?? ""]))
  lines.push(csvRow(["ROI (%)", kpis.roiPct ?? ""]))
  lines.push(csvRow(["CAC (R$)", kpis.cacCents == null ? "" : reais(kpis.cacCents)]))
  lines.push(csvRow(["CPL (R$)", kpis.cplCents == null ? "" : reais(kpis.cplCents)]))
  lines.push(csvRow(["Ticket médio (R$)", kpis.ticketMedioCents == null ? "" : reais(kpis.ticketMedioCents)]))
  lines.push("")

  lines.push(csvRow(["Funil"]))
  lines.push(csvRow(["etapa", "leads", "% do topo", "conversão da anterior (%)", "valor (R$)"]))
  for (const f of funil) lines.push(csvRow([f.label, f.count, f.pctDoTopo.toFixed(1), f.conversaoDaAnterior ?? "", reais(f.valorCents)]))
  lines.push("")

  lines.push(csvRow(["Canais"]))
  lines.push(csvRow(["canal", "leads", "conversões", "investimento (R$)", "contratado (R$)", "ROAS", "CPL (R$)", "CAC (R$)"]))
  for (const o of origens)
    lines.push(csvRow([o.label, o.leads, o.conversoes, reais(o.investimentoCents), reais(o.valorContratadoCents), o.roas ?? "", o.cplCents == null ? "" : reais(o.cplCents), o.cacCents == null ? "" : reais(o.cacCents)]))
  lines.push("")

  lines.push(csvRow(["Campanhas"]))
  lines.push(csvRow(["campanha", "plataforma", "status", "investimento (R$)", "leads", "conversões", "contratado (R$)", "CPL (R$)", "CAC (R$)", "ROAS", "ROI (%)"]))
  for (const c of campanhas)
    lines.push(csvRow([c.nome, c.plataforma, c.status, reais(c.investimentoCents), c.leads, c.conversoes, reais(c.valorContratadoCents), c.cplCents == null ? "" : reais(c.cplCents), c.cacCents == null ? "" : reais(c.cacCents), c.roas ?? "", c.roiPct ?? ""]))
  lines.push("")

  lines.push(csvRow(["Leads"]))
  lines.push(csvRow(["nome", "email", "telefone", "origem", "campanha", "etapa", "valor estimado (R$)", "valor contratado (R$)", "entrada", "conversão", "cliente", "motivo da perda"]))
  for (const l of leads)
    lines.push(csvRow([l.nome, l.email, l.telefone, l.origem, l.campanha, l.etapa, l.valorEstimadoCents == null ? "" : reais(l.valorEstimadoCents), l.valorContratadoCents == null ? "" : reais(l.valorContratadoCents), l.dataEntrada?.slice(0, 10) ?? "", l.dataConversao?.slice(0, 10) ?? "", l.cliente, l.motivoPerda]))

  return lines.join("\n")
}

export function bundleToJson(bundle: ExportBundle): string {
  return JSON.stringify(bundle, null, 2)
}
