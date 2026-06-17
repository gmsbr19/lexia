export const FINANCEIRO_TABS = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "lancamentos", label: "Lançamentos" },
  { id: "fluxo", label: "Fluxo de caixa" },
  { id: "contas", label: "Contas & Balanço" },
  { id: "custos", label: "Custos & DRE" },
  { id: "casos-sem-honorario", label: "Casos sem honorário" },
  { id: "importacao", label: "Importação" },
] as const

export type FinanceiroTab = (typeof FINANCEIRO_TABS)[number]["id"]

export function normalizeFinanceiroTab(value: string | string[] | undefined): FinanceiroTab {
  const v = Array.isArray(value) ? value[0] : value
  return FINANCEIRO_TABS.some((t) => t.id === v) ? (v as FinanceiroTab) : "visao-geral"
}

// Tabs that share the mês/trimestre/ano PeriodBar (the single, persistent
// period control for the module). Fluxo = full horizon; Contas/Casos/Importação
// aren't period-scoped, but the selection is still carried in the URL.
export const PERIOD_TABS: FinanceiroTab[] = ["visao-geral", "lancamentos", "custos"]

/** Normalize a ?mes= value to "YYYY-MM"; falls back to the current month. */
export function normalizeMes(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value
  if (v && /^\d{4}-\d{2}$/.test(v)) return v
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}
