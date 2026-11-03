// Matemática do relatório financeiro — PURA (sem prisma, sem React), extraída
// de relatorio.ts para ser testável linha a linha. Recebe linhas já achatadas e
// devolve as view-models do relatório. Todo dinheiro em centavos inteiros.
import { BUCKET_META, BUCKET_ORDER } from "./composicao"
import { diasNaFaixa, mesLabelCurto } from "./relatorio-periodo"
import type {
  AgingBucket,
  ComposicaoBucket,
  ContaKind,
  RelatorioContaLinha,
  RelatorioDevedor,
  RelatorioDreLinha,
  RelatorioEvolucaoPonto,
  RelatorioFatia,
  RelatorioKpis,
  RelatorioRateioLinha,
} from "./types"

// ── resumo executivo ─────────────────────────────────────────────────────────

/** Somas cruas do período, já separadas pela camada de query. */
export interface ResumoBruto {
  recebidoCents: number
  recebidoCount: number
  pagoCents: number
  pagoCount: number
  aReceberCents: number
  aReceberCount: number
  vencidoPeriodoCents: number
  vencidoPeriodoCount: number
  aPagarCents: number
  aPagarCount: number
}

/** Variação percentual de `atual` sobre `base`; null quando a base é 0 (∞). */
export function deltaPct(atual: number, base: number): number | null {
  if (base === 0) return null
  return ((atual - base) / Math.abs(base)) * 100
}

export function comporKpis(
  atual: ResumoBruto,
  anterior: { recebidoCents: number; pagoCents: number },
): RelatorioKpis {
  const resultadoCents = atual.recebidoCents - atual.pagoCents
  const resultadoAnteriorCents = anterior.recebidoCents - anterior.pagoCents
  return {
    ...atual,
    resultadoCents,
    margemPct: atual.recebidoCents > 0 ? (resultadoCents / atual.recebidoCents) * 100 : null,
    ticketMedioCents: atual.recebidoCount > 0 ? Math.round(atual.recebidoCents / atual.recebidoCount) : 0,
    recebidoAnteriorCents: anterior.recebidoCents,
    pagoAnteriorCents: anterior.pagoCents,
    resultadoAnteriorCents,
    recebidoDeltaPct: deltaPct(atual.recebidoCents, anterior.recebidoCents),
    pagoDeltaPct: deltaPct(atual.pagoCents, anterior.pagoCents),
    resultadoDeltaPct: deltaPct(resultadoCents, resultadoAnteriorCents),
  }
}

// ── DRE ──────────────────────────────────────────────────────────────────────

/**
 * DRE do período. O resultado DE CAIXA (receita recebida − custos pagos) é o
 * número duro: sai do ledger. O pró-labore cadastrado em CustoFixo é um valor
 * MENSAL que pode não estar lançado, então entra escalado pelos meses cobertos
 * pela faixa e rotulado como referência — nunca confundido com o caixa.
 */
export function comporDre(
  receitaCents: number,
  custosCents: number,
  proLaboreMensalCents: number,
  meses: number,
): RelatorioDreLinha[] {
  const caixaCents = receitaCents - custosCents
  const linhas: RelatorioDreLinha[] = [
    { label: "Receita recebida", valorCents: receitaCents, kind: "receita" },
    { label: "(−) Custos pagos", valorCents: -custosCents, kind: "custo" },
    { label: "Resultado de caixa", valorCents: caixaCents, kind: "subtotal", hint: "Realizado no ledger" },
  ]
  if (proLaboreMensalCents > 0) {
    const proLabore = Math.round(proLaboreMensalCents * meses)
    const mesesTxt = meses.toLocaleString("pt-BR", { maximumFractionDigits: 1 })
    linhas.push(
      {
        label: "(−) Pró-labore de referência",
        valorCents: -proLabore,
        kind: "custo",
        hint: `${mesesTxt} ${meses === 1 ? "mês" : "meses"} × custo fixo cadastrado`,
      },
      { label: "Resultado após pró-labore", valorCents: caixaCents - proLabore, kind: "resultado" },
    )
  }
  return linhas
}

// ── composições (fatias com %) ───────────────────────────────────────────────

export interface FatiaBruta {
  chave: string
  label: string
  cor: string
  valorCents: number
  count: number
}

/** Calcula o % de cada fatia sobre o total; ordena por valor desc por padrão. */
export function comporFatias(itens: FatiaBruta[], manterOrdem = false): RelatorioFatia[] {
  const total = itens.reduce((a, i) => a + i.valorCents, 0)
  const out = itens.map((i) => ({
    ...i,
    pct: total > 0 ? (i.valorCents / total) * 100 : 0,
  }))
  return manterOrdem ? out : out.sort((a, b) => b.valorCents - a.valorCents)
}

/** Entradas de honorário baixadas, agrupadas pelo bucket de composição. */
export function comporHonorarios(
  rows: { tipoHonorario: string | null; valorCents: number }[],
): RelatorioFatia[] {
  const acc = new Map<ComposicaoBucket, { valorCents: number; count: number }>()
  for (const r of rows) {
    const b = (BUCKET_ORDER as string[]).includes(r.tipoHonorario ?? "")
      ? (r.tipoHonorario as ComposicaoBucket)
      : "avista"
    const cur = acc.get(b) ?? { valorCents: 0, count: 0 }
    cur.valorCents += Math.abs(r.valorCents)
    cur.count += 1
    acc.set(b, cur)
  }
  const itens: FatiaBruta[] = BUCKET_ORDER.filter((b) => acc.has(b)).map((b) => ({
    chave: b,
    label: BUCKET_META[b].label,
    cor: BUCKET_META[b].color,
    valorCents: acc.get(b)!.valorCents,
    count: acc.get(b)!.count,
  }))
  return comporFatias(itens, true)
}

const CAT_FALLBACK = ["#1F3A6E", "#C0A147", "#2E9E5B", "#7C8AA8", "#B4541F", "#5C4B8A", "#2F7F8C", "#9A7B2F"]

/** Saídas pagas, agrupadas por categoria (cor do cadastro ou da paleta). */
export function comporCategorias(
  rows: { categoria: string | null; cor: string | null; valorCents: number }[],
): RelatorioFatia[] {
  const acc = new Map<string, { cor: string | null; valorCents: number; count: number }>()
  for (const r of rows) {
    const nome = r.categoria ?? "Sem categoria"
    const cur = acc.get(nome) ?? { cor: r.cor, valorCents: 0, count: 0 }
    if (!cur.cor && r.cor) cur.cor = r.cor
    cur.valorCents += Math.abs(r.valorCents)
    cur.count += 1
    acc.set(nome, cur)
  }
  const itens: FatiaBruta[] = [...acc.entries()]
    .sort((a, b) => b[1].valorCents - a[1].valorCents)
    .map(([nome, v], i) => ({
      chave: nome,
      label: nome,
      cor: v.cor ?? CAT_FALLBACK[i % CAT_FALLBACK.length],
      valorCents: v.valorCents,
      count: v.count,
    }))
  return comporFatias(itens, true)
}

// ── inadimplência ────────────────────────────────────────────────────────────

/** Dias de atraso → faixa de aging (mesmos cortes de getReceivablesAging). */
export function faixaAging(diasAtraso: number): AgingBucket["key"] {
  if (diasAtraso <= 0) return "a_vencer"
  if (diasAtraso <= 30) return "d1_30"
  if (diasAtraso <= 60) return "d31_60"
  return "d60_plus"
}

export interface AbertoRow {
  valorCents: number
  diasAtraso: number // negativo/0 = ainda a vencer
  clienteId: number | null
  cliente: string | null
}

export function comporAging(rows: AbertoRow[]): AgingBucket[] {
  const b: Record<AgingBucket["key"], AgingBucket> = {
    a_vencer: { key: "a_vencer", label: "A vencer", valorCents: 0, count: 0 },
    d1_30: { key: "d1_30", label: "1–30 dias", valorCents: 0, count: 0 },
    d31_60: { key: "d31_60", label: "31–60 dias", valorCents: 0, count: 0 },
    d60_plus: { key: "d60_plus", label: "60+ dias", valorCents: 0, count: 0 },
  }
  for (const r of rows) {
    const k = faixaAging(r.diasAtraso)
    b[k].valorCents += Math.abs(r.valorCents)
    b[k].count += 1
  }
  return [b.a_vencer, b.d1_30, b.d31_60, b.d60_plus]
}

/** Ranking de devedores (só o que JÁ venceu), maior saldo primeiro. */
export function comporDevedores(rows: AbertoRow[], limite = 12): RelatorioDevedor[] {
  const acc = new Map<string, RelatorioDevedor>()
  for (const r of rows) {
    if (r.diasAtraso <= 0) continue
    const nome = r.cliente ?? "Sem cliente"
    const key = r.clienteId != null ? `c${r.clienteId}` : `n:${nome}`
    const cur =
      acc.get(key) ?? { clienteId: r.clienteId, cliente: nome, totalCents: 0, count: 0, maiorAtrasoDias: 0 }
    cur.totalCents += Math.abs(r.valorCents)
    cur.count += 1
    if (r.diasAtraso > cur.maiorAtrasoDias) cur.maiorAtrasoDias = r.diasAtraso
    acc.set(key, cur)
  }
  return [...acc.values()].sort((a, b) => b.totalCents - a.totalCents).slice(0, limite)
}

// ── evolução mensal ──────────────────────────────────────────────────────────

/** Série mensal de caixa realizado dentro da faixa (meses sem movimento = 0). */
export function comporEvolucao(
  movs: { mes: string; tipo: string; valorCents: number }[],
  meses: string[],
): RelatorioEvolucaoPonto[] {
  const acc = new Map<string, { ent: number; sai: number }>()
  for (const m of movs) {
    const cur = acc.get(m.mes) ?? { ent: 0, sai: 0 }
    if (m.tipo === "saida") cur.sai += Math.abs(m.valorCents)
    else cur.ent += Math.abs(m.valorCents)
    acc.set(m.mes, cur)
  }
  return meses.map((key) => {
    const v = acc.get(key) ?? { ent: 0, sai: 0 }
    return {
      key,
      label: mesLabelCurto(key),
      entradasCents: v.ent,
      saidasCents: v.sai,
      saldoCents: v.ent - v.sai,
    }
  })
}

// ── extrato por conta ────────────────────────────────────────────────────────

export interface ContaBase {
  id: number
  nome: string
  titular: string | null
  kind: string
  valorInicialCents: number
}

export interface MovConta {
  contaId: number | null
  tipo: string
  valorCents: number
}

/**
 * Saldo inicial (abertura + tudo antes da faixa) → movimento do período →
 * saldo final, por conta. Fecha com a aba Contas quando a faixa termina hoje.
 */
export function comporExtratoContas(
  contas: ContaBase[],
  movsAntes: MovConta[],
  movsPeriodo: MovConta[],
): RelatorioContaLinha[] {
  const soma = (movs: MovConta[]) => {
    const m = new Map<number, { ent: number; sai: number }>()
    for (const r of movs) {
      if (r.contaId == null) continue
      const cur = m.get(r.contaId) ?? { ent: 0, sai: 0 }
      if (r.tipo === "saida") cur.sai += Math.abs(r.valorCents)
      else cur.ent += Math.abs(r.valorCents)
      m.set(r.contaId, cur)
    }
    return m
  }
  const antes = soma(movsAntes)
  const dentro = soma(movsPeriodo)
  return contas.map((c) => {
    const a = antes.get(c.id) ?? { ent: 0, sai: 0 }
    const d = dentro.get(c.id) ?? { ent: 0, sai: 0 }
    const saldoInicialCents = c.valorInicialCents + a.ent - a.sai
    return {
      id: c.id,
      nome: c.nome,
      titular: c.titular,
      kind: c.kind as ContaKind,
      saldoInicialCents,
      entradasCents: d.ent,
      saidasCents: d.sai,
      saldoFinalCents: saldoInicialCents + d.ent - d.sai,
    }
  })
}

// ── rateio por caso ──────────────────────────────────────────────────────────

export interface RateioBruto {
  casoId: number
  caso: string
  cliente: string | null
  valorCents: number
  responsaveis: { contaId: number; percentual: number }[]
}

/**
 * Agrupa os honorários recebidos por caso e aplica o rateio dos sócios. Os
 * percentuais são normalizados pelo total declarado (50/50 → 50%/50%; 1/1 →
 * idem) e a ÚLTIMA parte absorve o arredondamento, para a soma fechar exata.
 */
export function comporRateios(
  rows: RateioBruto[],
  nomePorConta: Map<number, string>,
  limite = 30,
): RelatorioRateioLinha[] {
  const acc = new Map<number, RelatorioRateioLinha>()
  for (const r of rows) {
    const totalPct = r.responsaveis.reduce((a, x) => a + x.percentual, 0)
    if (totalPct <= 0) continue
    const cur =
      acc.get(r.casoId) ?? { casoId: r.casoId, caso: r.caso, cliente: r.cliente, recebidoCents: 0, partes: [] }
    cur.recebidoCents += Math.abs(r.valorCents)
    acc.set(r.casoId, cur)
    // O split do caso é o mesmo em todas as linhas; registra uma vez.
    if (cur.partes.length === 0) {
      cur.partes = r.responsaveis.map((x) => ({
        contaId: x.contaId,
        nome: nomePorConta.get(x.contaId) ?? `Conta ${x.contaId}`,
        percentual: Math.round((x.percentual / totalPct) * 100),
        valorCents: 0,
      }))
    }
  }
  const linhas = [...acc.values()]
  for (const l of linhas) {
    let resto = l.recebidoCents
    l.partes.forEach((p, i) => {
      const v = i === l.partes.length - 1 ? resto : Math.round((l.recebidoCents * p.percentual) / 100)
      p.valorCents = v
      resto -= v
    })
  }
  return linhas.sort((a, b) => b.recebidoCents - a.recebidoCents).slice(0, limite)
}

// ── utilidades de layout ─────────────────────────────────────────────────────

/** Divisor seguro para larguras de barra (nunca 0). */
export function maxAbs(valores: number[]): number {
  return Math.max(1, ...valores.map((v) => Math.abs(v)))
}

/** Média diária de caixa no período — usada no rodapé do resumo. */
export function mediaDiaria(valorCents: number, faixa: { de: string; ate: string }): number {
  const dias = diasNaFaixa(faixa)
  return dias > 0 ? Math.round(valorCents / dias) : 0
}
