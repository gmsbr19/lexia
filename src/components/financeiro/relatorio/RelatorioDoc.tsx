// O documento do relatório financeiro — UMA superfície usada tanto na aba
// Relatório (tela) quanto na rota de impressão (/financeiro/relatorio), então
// é puramente apresentacional e server-safe (sem "use client", sem fetch).
// Cada seção é um bloco numerado com cor própria; o color code está declarado
// na legenda do cabeçalho e é o mesmo do resto do módulo:
//   verde = entrou / positivo · vermelho = saiu / vencido · âmbar = atenção
//   dourado = total do escritório · neutro = estrutura/contábil
// Toda medida (raio, peso, tamanho, sombra) vem do design system do módulo —
// ver o cabeçalho de relatorio.css.ts; valores em sans com figuras tabulares.
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Banknote,
  Landmark,
  type LucideIcon,
  Receipt,
  Scale,
  Sigma,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { formatPct } from "@/lib/finance/format"
import { comporFatias, maxAbs, mediaDiaria } from "@/lib/finance/relatorio-core"
import { fmtDiaBR } from "@/lib/finance/relatorio-periodo"
import type {
  AgingBucket,
  RelatorioDreLinha,
  RelatorioFatia,
  RelatorioFinanceiro,
  RelatorioKpis,
} from "@/lib/finance/types"
import { fmtDateShort, fmtMoney, situacao } from "../interativo/fx"
import * as s from "./relatorio.css"

const C_POS = "var(--rel-pos)"
const C_NEG = "var(--rel-neg)"
const C_AMBER = "var(--rel-amber)"
const C_GOLD = "var(--rel-gold)"
const C_NEUTRO = "var(--rel-line-strong)"

const AGING_COR: Record<AgingBucket["key"], string> = {
  a_vencer: C_NEUTRO,
  d1_30: C_AMBER,
  d31_60: "color-mix(in srgb, var(--rel-neg) 70%, var(--rel-amber))",
  d60_plus: C_NEG,
}

export function RelatorioDoc({ rel }: { rel: RelatorioFinanceiro }) {
  const { kpis, evolucao } = rel
  const temEvolucao = evolucao.length > 1
  // Numeração contínua das seções (a evolução só existe em período multi-mês).
  let n = 0
  const num = () => String(++n).padStart(2, "0")

  return (
    <div className={s.doc}>
      <Capa rel={rel} />
      <Legenda />

      <Secao numero={num()} tom="gold" icone={Sigma} titulo="Resumo executivo" sub={`Caixa realizado no período, comparado com ${rel.anteriorTitulo.toLowerCase()}`}>
        <ResumoKpis kpis={kpis} />
        <Estatisticas rel={rel} />
      </Secao>

      <Secao numero={num()} tom="neutro" icone={Receipt} titulo="Resultado do período" sub="DRE simplificado — receita recebida contra custos pagos">
        <div className={s.duasColunas}>
          <Dre linhas={rel.dre} />
          <div className={s.card}>
            <div className={s.cardTitulo}>Composição do caixa</div>
            <Composicao
              fatias={comporFatias(
                [
                  { chave: "ent", label: "Entradas recebidas", cor: C_POS, valorCents: kpis.recebidoCents, count: kpis.recebidoCount },
                  { chave: "sai", label: "Saídas pagas", cor: C_NEG, valorCents: kpis.pagoCents, count: kpis.pagoCount },
                ],
                true,
              )}
              unidade="lançamentos"
            />
            <div className={s.nota}>
              O resultado de caixa sai do ledger: entradas com baixa menos saídas com baixa dentro do período. Valores
              em aberto (a receber / a pagar) não entram aqui — aparecem no resumo executivo e na inadimplência.
            </div>
          </div>
        </div>
      </Secao>

      {temEvolucao && (
        <Secao numero={num()} tom="neutro" icone={BarChart3} titulo="Evolução mensal" sub="Caixa realizado mês a mês dentro do período">
          <Evolucao pontos={evolucao} />
        </Secao>
      )}

      <Secao numero={num()} tom="pos" icone={Banknote} titulo="Entradas por tipo de honorário" sub="Honorários recebidos no período, por modalidade de contratação">
        {rel.honorarios.length === 0 ? (
          <div className={s.vazio}>Nenhum honorário recebido no período.</div>
        ) : (
          <div className={s.card}>
            <Composicao fatias={rel.honorarios} unidade="recebimentos" />
          </div>
        )}
      </Secao>

      <Secao numero={num()} tom="neg" icone={ArrowUpRight} titulo="Custos por categoria" sub="Saídas pagas no período, agrupadas pela categoria do lançamento">
        {rel.categorias.length === 0 ? (
          <div className={s.vazio}>Nenhuma saída paga no período.</div>
        ) : (
          <div className={s.card}>
            <Composicao fatias={rel.categorias} unidade="pagamentos" />
          </div>
        )}
      </Secao>

      <Secao
        numero={num()}
        tom="amber"
        icone={AlertTriangle}
        titulo="Inadimplência"
        sub={`Posição de ${fmtDiaBR(rel.hoje)} — todo o contas a receber em aberto, não só o do período`}
      >
        <Inadimplencia rel={rel} />
      </Secao>

      <Secao numero={num()} tom="neutro" icone={Landmark} titulo="Saldo por conta" sub="Saldo inicial, movimento do período e saldo final de cada conta">
        <Contas rel={rel} />
      </Secao>

      <Secao numero={num()} tom="gold" icone={Scale} titulo="Balanço entre os sócios" sub="Rateio dos honorários por caso, despesas divididas 50/50 e transferências de acerto">
        <Socios rel={rel} />
      </Secao>

      <Secao
        numero={num()}
        tom="neutro"
        icone={Wallet}
        titulo="Lançamentos do período"
        sub="Tudo que vence ou foi baixado entre as datas do relatório"
        novaPagina
      >
        <Lancamentos rel={rel} />
      </Secao>

      <div className={s.rodape}>
        <span>
          {rel.escritorio.razaoSocial ?? "Relatório financeiro"} · {rel.titulo}
        </span>
        <span>
          Gerado em {new Date(rel.geradoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · Lexia
        </span>
      </div>
    </div>
  )
}

// ── cabeçalho ────────────────────────────────────────────────────────────────

function Capa({ rel }: { rel: RelatorioFinanceiro }) {
  const e = rel.escritorio
  const meta = [e.cnpj ? `CNPJ ${e.cnpj}` : null, e.oab ? `OAB ${e.oab}` : null].filter(Boolean).join(" · ")
  return (
    <div className={s.capa}>
      <div className={s.capaTop}>
        <div>
          <div className={s.docKicker}>Relatório financeiro</div>
          <h1 className={s.docTitulo}>{rel.titulo}</h1>
          <p className={s.docPeriodo}>{rel.subtitulo}</p>
        </div>
        <div className={s.marca}>
          <span className={s.marcaNome}>{e.razaoSocial ?? "Lexia"}</span>
          {meta && <span className={s.marcaMeta}>{meta}</span>}
        </div>
      </div>
      <div className={s.docMeta}>
        <span>
          Período: <strong>{fmtDiaBR(rel.faixa.de)}</strong> a <strong>{fmtDiaBR(rel.faixa.ate)}</strong>
        </span>
        <span>
          Comparação: <strong>{rel.anteriorTitulo}</strong>
        </span>
        <span>
          Posições em aberto: <strong>{fmtDiaBR(rel.hoje)}</strong>
        </span>
        <span>
          Emitido em{" "}
          <strong>{new Date(rel.geradoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</strong>
        </span>
      </div>
    </div>
  )
}

function Legenda() {
  const itens: { cor: string; label: string }[] = [
    { cor: C_POS, label: "Entrou / positivo" },
    { cor: C_NEG, label: "Saiu / vencido" },
    { cor: C_AMBER, label: "Atenção" },
    { cor: C_GOLD, label: "Total do escritório" },
    { cor: C_NEUTRO, label: "Estrutura / neutro" },
  ]
  return (
    <div className={s.legenda}>
      <span className={s.legendaItem} style={{ fontWeight: 500, color: "var(--rel-ink)" }}>
        Legenda de cores
      </span>
      {itens.map((i) => (
        <span key={i.label} className={s.legendaItem}>
          <span className={s.legendaDot} style={{ background: i.cor }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

function Secao({
  numero,
  tom,
  icone: Icone,
  titulo,
  sub,
  novaPagina,
  children,
}: {
  numero: string
  tom: "gold" | "pos" | "neg" | "amber" | "neutro"
  icone: LucideIcon
  titulo: string
  sub: string
  novaPagina?: boolean
  children: React.ReactNode
}) {
  return (
    <section className={`${s.secao}${novaPagina ? ` ${s.secaoNovaPagina}` : ""}`}>
      <div className={s.secaoHead}>
        <div className={s.secaoNum({ tom })}>
          <Icone size={14} strokeWidth={1.9} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={s.secaoTitulo}>
            <span className={s.secaoOrdem}>{numero}</span>
            {titulo}
          </div>
          <div className={s.secaoSub}>{sub}</div>
        </div>
      </div>
      {children}
    </section>
  )
}

// ── 01 · resumo ──────────────────────────────────────────────────────────────

function Delta({ pct, invertido }: { pct: number | null; invertido?: boolean }) {
  if (pct === null) return <span className={s.delta({ dir: "flat" })}>sem base anterior</span>
  if (Math.abs(pct) < 0.05) return <span className={s.delta({ dir: "flat" })}>estável</span>
  const subiu = pct > 0
  // Em despesas, subir é ruim: a seta acompanha o movimento, a cor a leitura.
  const bom = invertido ? !subiu : subiu
  const Seta = subiu ? TrendingUp : TrendingDown
  return (
    <span className={s.delta({ dir: bom ? "up" : "down" })}>
      <Seta size={12} strokeWidth={2} />
      {formatPct(Math.abs(pct))}
    </span>
  )
}

function ResumoKpis({ kpis }: { kpis: RelatorioKpis }) {
  return (
    <div className={s.kpiGrid}>
      <div className={s.kpi({ tom: "pos" })}>
        <span className={s.kpiLabel}>Recebido</span>
        <span className={`${s.kpiValor} ${s.kpiValorTom.pos}`}>{fmtMoney(kpis.recebidoCents)}</span>
        <span className={s.kpiSub}>
          <Delta pct={kpis.recebidoDeltaPct} /> · {kpis.recebidoCount}{" "}
          {kpis.recebidoCount === 1 ? "entrada baixada" : "entradas baixadas"}
        </span>
      </div>
      <div className={s.kpi({ tom: "neg" })}>
        <span className={s.kpiLabel}>Pago</span>
        <span className={`${s.kpiValor} ${s.kpiValorTom.neg}`}>{fmtMoney(kpis.pagoCents)}</span>
        <span className={s.kpiSub}>
          <Delta pct={kpis.pagoDeltaPct} invertido /> · {kpis.pagoCount}{" "}
          {kpis.pagoCount === 1 ? "saída paga" : "saídas pagas"}
        </span>
      </div>
      <div className={s.kpi({ tom: kpis.resultadoCents >= 0 ? "pos" : "neg" })}>
        <span className={s.kpiLabel}>Resultado de caixa</span>
        <span
          className={`${s.kpiValor} ${kpis.resultadoCents >= 0 ? s.kpiValorTom.pos : s.kpiValorTom.neg}`}
        >
          {fmtMoney(kpis.resultadoCents)}
        </span>
        <span className={s.kpiSub}>
          <Delta pct={kpis.resultadoDeltaPct} /> · margem {formatPct(kpis.margemPct)}
        </span>
      </div>
      <div className={s.kpi({ tom: "gold" })}>
        <span className={s.kpiLabel}>A receber do período</span>
        <span className={s.kpiValor}>{fmtMoney(kpis.aReceberCents)}</span>
        <span className={s.kpiSub}>
          {kpis.aReceberCount} em aberto
          {kpis.vencidoPeriodoCents > 0 && (
            <>
              {" · "}
              <span style={{ color: C_NEG, fontWeight: 500 }}>{fmtMoney(kpis.vencidoPeriodoCents)} vencido</span>
            </>
          )}
        </span>
      </div>
    </div>
  )
}

function Estatisticas({ rel }: { rel: RelatorioFinanceiro }) {
  const k = rel.kpis
  const itens: { label: string; valor: string }[] = [
    { label: "Ticket médio recebido", valor: fmtMoney(k.ticketMedioCents) },
    { label: "Média diária de caixa", valor: fmtMoney(mediaDiaria(k.resultadoCents, rel.faixa)) },
    { label: `A pagar do período (${k.aPagarCount})`, valor: fmtMoney(k.aPagarCents) },
    { label: "Saldo em contas no fim do período", valor: fmtMoney(rel.contas.saldoFinalCents) },
  ]
  return (
    <div className={s.statRow}>
      {itens.map((i) => (
        <div key={i.label} className={s.stat}>
          <div className={s.statLabel}>{i.label}</div>
          <div className={s.statValor}>{i.valor}</div>
        </div>
      ))}
    </div>
  )
}

// ── 02 · DRE ─────────────────────────────────────────────────────────────────

function Dre({ linhas }: { linhas: RelatorioDreLinha[] }) {
  return (
    <div className={s.tabelaWrap}>
      <table className={s.tabela}>
        <thead>
          <tr>
            <th className={s.th}>Demonstrativo</th>
            <th className={s.thNum}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => {
            const destaque = l.kind === "subtotal" || l.kind === "resultado"
            const tom =
              l.kind === "receita"
                ? s.tomTexto.pos
                : l.kind === "custo"
                  ? s.tomTexto.neg
                  : l.valorCents >= 0
                    ? s.tomTexto.pos
                    : s.tomTexto.neg
            return (
              <tr key={l.label} className={destaque ? s.trTotal : undefined}>
                <td className={s.td}>
                  <span style={{ fontWeight: destaque ? 500 : 400 }}>{l.label}</span>
                  {l.hint && <div className={s.tdMeta}>{l.hint}</div>}
                </td>
                <td className={`${s.tdNum} ${tom}`} style={{ fontWeight: destaque ? 500 : 400 }}>
                  {fmtMoney(l.valorCents)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── composições (honorários / categorias / caixa) ────────────────────────────

function Composicao({ fatias, unidade }: { fatias: RelatorioFatia[]; unidade: string }) {
  const total = fatias.reduce((a, f) => a + f.valorCents, 0)
  return (
    <div>
      <div className={s.stack}>
        {fatias
          .filter((f) => f.valorCents > 0)
          .map((f) => (
            <div key={f.chave} className={s.stackSeg} style={{ width: `${f.pct}%`, background: f.cor }} />
          ))}
      </div>
      <div>
        {fatias.map((f) => (
          <div key={f.chave} className={s.barraLinha}>
            <span className={s.barraLabel}>
              <span className={s.dot} style={{ background: f.cor }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.label}</span>
            </span>
            <span className={s.barraTrack}>
              <span
                className={s.barraFill}
                style={{ width: f.valorCents > 0 ? `${Math.max(2, f.pct)}%` : 0, background: f.cor }}
              />
            </span>
            <span className={s.barraValor}>{fmtMoney(f.valorCents)}</span>
            <span className={s.barraPct}>{f.pct.toFixed(0)}%</span>
          </div>
        ))}
        <div className={s.barraLinha} style={{ fontWeight: 500 }}>
          <span className={s.barraLabel} style={{ color: "var(--rel-ink)" }}>
            Total
          </span>
          <span className={s.barraTrack} style={{ background: "transparent" }} />
          <span className={s.barraValor}>{fmtMoney(total)}</span>
          <span className={s.barraPct}>
            {fatias.reduce((a, f) => a + f.count, 0)} {unidade}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── evolução mensal ──────────────────────────────────────────────────────────

function Evolucao({ pontos }: { pontos: RelatorioFinanceiro["evolucao"] }) {
  // Barra EMPILHADA: a altura é o movimento total do mês (entradas + saídas),
  // então o teto é o maior total — assim as duas faixas de um mês nunca somam
  // mais de 100% da coluna e nada transborda.
  const teto = maxAbs(pontos.map((p) => p.entradasCents + p.saidasCents))
  return (
    <div className={s.card}>
      <div className={s.evoWrap}>
        {pontos.map((p) => (
          <div key={p.key} className={s.evoCol}>
            <span className={`${s.evoSaldo} ${p.saldoCents >= 0 ? s.tomTexto.pos : s.tomTexto.neg}`}>
              {p.entradasCents === 0 && p.saidasCents === 0 ? "—" : fmtMoney(p.saldoCents)}
            </span>
            <div className={s.evoBarra} style={{ gap: 2 }}>
              {p.entradasCents > 0 && (
                <div className={s.evoSeg({ tom: "pos" })} style={{ height: `${(p.entradasCents / teto) * 100}%` }} />
              )}
              {p.saidasCents > 0 && (
                <div className={s.evoSeg({ tom: "neg" })} style={{ height: `${(p.saidasCents / teto) * 100}%` }} />
              )}
            </div>
            <span className={s.evoLabel}>{p.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        <span className={s.legendaItem}>
          <span className={s.legendaDot} style={{ background: C_POS }} /> Entradas recebidas
        </span>
        <span className={s.legendaItem}>
          <span className={s.legendaDot} style={{ background: C_NEG }} /> Saídas pagas
        </span>
        <span className={s.legendaItem}>
          A coluna é o movimento do mês (entradas + saídas); o número acima é o saldo.
        </span>
      </div>
    </div>
  )
}

// ── inadimplência ────────────────────────────────────────────────────────────

function Inadimplencia({ rel }: { rel: RelatorioFinanceiro }) {
  const { aging, devedores, totalCents, count } = rel.inadimplencia
  const teto = maxAbs(aging.map((a) => a.valorCents))
  return (
    <div className={s.duasColunas}>
      <div className={s.card}>
        <div className={s.cardTitulo}>Aging do contas a receber</div>
        {aging.map((a) => (
          <div key={a.key} className={s.barraLinha}>
            <span className={s.barraLabel}>
              <span className={s.dot} style={{ background: AGING_COR[a.key] }} />
              {a.label}
            </span>
            <span className={s.barraTrack}>
              <span
                className={s.barraFill}
                style={{ width: `${(a.valorCents / teto) * 100}%`, background: AGING_COR[a.key] }}
              />
            </span>
            <span className={s.barraValor}>{fmtMoney(a.valorCents)}</span>
            <span className={s.barraPct}>{a.count}</span>
          </div>
        ))}
        <div className={s.barraLinha} style={{ fontWeight: 500 }}>
          <span className={s.barraLabel} style={{ color: C_NEG }}>
            Total vencido
          </span>
          <span className={s.barraTrack} style={{ background: "transparent" }} />
          <span className={`${s.barraValor} ${s.tomTexto.neg}`}>{fmtMoney(totalCents)}</span>
          <span className={s.barraPct}>{count}</span>
        </div>
        <div className={s.nota}>
          A foto é da data de emissão do relatório e cobre TODO o contas a receber em aberto — é a lista de cobrança,
          não um número do período. Do que vencia dentro do período, {fmtMoney(rel.kpis.vencidoPeriodoCents)} segue em
          aberto.
        </div>
      </div>

      <div>
        <div className={s.tabelaWrap}>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th className={s.th}>Maiores devedores</th>
                <th className={s.thNum}>Atraso</th>
                <th className={s.thNum}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {devedores.length === 0 ? (
                <tr>
                  <td className={s.td} colSpan={3} style={{ textAlign: "center", color: "var(--rel-ink-subtle)" }}>
                    Nenhum título vencido. 🎉
                  </td>
                </tr>
              ) : (
                devedores.map((d) => (
                  <tr key={`${d.clienteId ?? d.cliente}`} className={s.trZebra}>
                    <td className={s.td}>
                      {d.cliente}
                      <div className={s.tdMeta}>
                        {d.count} {d.count === 1 ? "título" : "títulos"}
                      </div>
                    </td>
                    <td className={s.tdNum}>
                      <span className={s.pill({ tom: d.maiorAtrasoDias > 60 ? "vencido" : "avencer" })}>
                        {d.maiorAtrasoDias}d
                      </span>
                    </td>
                    <td className={`${s.tdNum} ${s.tomTexto.neg}`}>{fmtMoney(d.totalCents)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── contas ───────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<string, string> = { socio: "Sócio", banco: "Banco", caixa: "Caixa" }

function Contas({ rel }: { rel: RelatorioFinanceiro }) {
  const { linhas, saldoInicialCents, entradasCents, saidasCents, saldoFinalCents } = rel.contas
  return (
    <div className={s.tabelaWrap}>
      <table className={s.tabela}>
        <thead>
          <tr>
            <th className={s.th}>Conta</th>
            <th className={s.thNum}>Saldo inicial</th>
            <th className={s.thNum}>Entradas</th>
            <th className={s.thNum}>Saídas</th>
            <th className={s.thNum}>Saldo final</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id} className={s.trZebra}>
              <td className={s.td}>
                {l.nome}
                <div className={s.tdMeta}>
                  {KIND_LABEL[l.kind] ?? l.kind}
                  {l.titular ? ` · ${l.titular}` : ""}
                </div>
              </td>
              <td className={`${s.tdNum} ${s.tomTexto.muted}`}>{fmtMoney(l.saldoInicialCents)}</td>
              <td className={`${s.tdNum} ${l.entradasCents > 0 ? s.tomTexto.pos : s.tomTexto.subtle}`}>
                {l.entradasCents > 0 ? fmtMoney(l.entradasCents) : "—"}
              </td>
              <td className={`${s.tdNum} ${l.saidasCents > 0 ? s.tomTexto.neg : s.tomTexto.subtle}`}>
                {l.saidasCents > 0 ? fmtMoney(l.saidasCents) : "—"}
              </td>
              <td className={`${s.tdNum} ${l.saldoFinalCents >= 0 ? s.tomTexto.ink : s.tomTexto.neg}`}>
                {fmtMoney(l.saldoFinalCents)}
              </td>
            </tr>
          ))}
          <tr className={s.trTotal}>
            <td className={s.td} style={{ fontWeight: 500 }}>
              Total do escritório
            </td>
            <td className={s.tdNum}>{fmtMoney(saldoInicialCents)}</td>
            <td className={`${s.tdNum} ${s.tomTexto.pos}`}>{fmtMoney(entradasCents)}</td>
            <td className={`${s.tdNum} ${s.tomTexto.neg}`}>{fmtMoney(saidasCents)}</td>
            <td className={`${s.tdNum} ${s.tomTexto.gold}`} style={{ fontWeight: 500 }}>
              {fmtMoney(saldoFinalCents)}
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ padding: "0 13px 12px" }}>
        <div className={s.nota}>
          O movimento inclui as transferências internas entre contas (elas mudam o saldo de cada conta, mas não o total
          do escritório). Saldo inicial = abertura da conta mais tudo que foi baixado antes de {fmtDiaBR(rel.faixa.de)}
          — baixas sem data de pagamento registrada entram na abertura, para o saldo final fechar com a aba Contas &amp;
          Balanço.
        </div>
      </div>
    </div>
  )
}

// ── sócios ───────────────────────────────────────────────────────────────────

function Socios({ rel }: { rel: RelatorioFinanceiro }) {
  const { periodo, acumulado, transferencias, rateios, disponivel } = rel.socios
  if (!disponivel) {
    return (
      <div className={s.vazio}>
        O balanço entre sócios exige exatamente duas contas do tipo &ldquo;sócio&rdquo; cadastradas em Contas &amp;
        Balanço.
      </div>
    )
  }
  // As colunas do rateio vêm das CONTAS DE SÓCIO, não do primeiro caso da
  // lista: um caso 100% de um sócio tem só uma parte e esconderia o outro.
  const colunas = periodo.socios.map((l) => ({ id: l.id, nome: l.nome }))
  return (
    <div>
      <div className={s.socioGrid}>
        {periodo.socios.map((l) => {
          const honoSaldo = l.recebidoCents - l.direitoCents
          const despSaldo = l.pagoSaidaCents - l.cotaSaidaCents
          return (
            <div key={l.id} className={s.socioCard}>
              <div className={s.socioNome}>
                <span className={s.dot} style={{ background: C_GOLD, borderRadius: "50%" }} />
                {l.nome}
              </div>
              <div className={s.socioGrupo}>Honorários (rateio dos casos)</div>
              <div className={s.socioLinha}>
                <span>Direito pelo rateio</span>
                <span className={s.socioValor}>{fmtMoney(l.direitoCents)}</span>
              </div>
              <div className={s.socioLinha}>
                <span>Recebeu na conta</span>
                <span className={s.socioValor}>{fmtMoney(l.recebidoCents)}</span>
              </div>
              <div className={s.socioLinha}>
                <span>Diferença</span>
                <span className={`${s.socioValor} ${honoSaldo === 0 ? s.tomTexto.subtle : honoSaldo > 0 ? s.tomTexto.pos : s.tomTexto.neg}`}>
                  {honoSaldo > 0 ? "+" : ""}
                  {fmtMoney(honoSaldo)}
                </span>
              </div>
              <div className={s.socioGrupo}>Despesas (divididas 50/50)</div>
              <div className={s.socioLinha}>
                <span>Cota de 50%</span>
                <span className={s.socioValor}>{fmtMoney(l.cotaSaidaCents)}</span>
              </div>
              <div className={s.socioLinha}>
                <span>Pagou da própria conta</span>
                <span className={s.socioValor}>{fmtMoney(l.pagoSaidaCents)}</span>
              </div>
              <div className={s.socioLinha}>
                <span>Diferença</span>
                <span className={`${s.socioValor} ${despSaldo === 0 ? s.tomTexto.subtle : despSaldo > 0 ? s.tomTexto.pos : s.tomTexto.neg}`}>
                  {despSaldo > 0 ? "+" : ""}
                  {fmtMoney(despSaldo)}
                </span>
              </div>
              <div className={s.socioSaldo}>
                <span>Posição no período</span>
                <span className={`${s.socioValor} ${honoSaldo + despSaldo >= 0 ? s.tomTexto.pos : s.tomTexto.neg}`}>
                  {fmtMoney(honoSaldo + despSaldo)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <Veredito titulo={`Acerto gerado no período (${rel.titulo})`} acerto={periodo} />
      <div style={{ height: 10 }} />
      <Veredito titulo={`Posição acumulada até ${fmtDiaBR(rel.hoje)}`} acerto={acumulado} />

      <div className={s.nota}>
        O acerto do período considera só os honorários recebidos, as despesas pagas e as transferências ocorridas entre
        as datas do relatório. A posição acumulada é o histórico inteiro — é ela que diz quanto um sócio deve ao outro
        hoje, e é a que a aba Contas &amp; Balanço mostra.
      </div>

      {transferencias.length > 0 && (
        <>
          <div className={s.cardTitulo} style={{ margin: "18px 0 10px" }}>
            Transferências de acerto no período
          </div>
          <div className={s.tabelaWrap}>
            <table className={s.tabela}>
              <thead>
                <tr>
                  <th className={s.th}>Data</th>
                  <th className={s.th}>De → Para</th>
                  <th className={s.th}>Descrição</th>
                  <th className={s.thNum}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {transferencias.map((t) => (
                  <tr key={t.id} className={s.trZebra}>
                    <td className={s.td}>{fmtDateShort(t.data)}</td>
                    <td className={s.td}>
                      {t.contaOrigem} → {t.contaDestino}
                    </td>
                    <td className={`${s.td} ${s.tomTexto.muted}`}>{t.descricao ?? "—"}</td>
                    <td className={`${s.tdNum} ${s.tomTexto.gold}`}>{fmtMoney(t.valorCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className={s.cardTitulo} style={{ margin: "18px 0 10px" }}>
        Rateio por caso — honorários recebidos no período
      </div>
      {rateios.length === 0 ? (
        <div className={s.vazio}>
          Nenhum honorário recebido no período em caso com rateio definido. O rateio é configurado no próprio caso
          (padrão 50/50).
        </div>
      ) : (
        <div className={s.tabelaWrap}>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th className={s.th}>Caso</th>
                <th className={s.thNum}>Recebido</th>
                {colunas.map((p) => (
                  <th key={p.id} className={s.thNum}>
                    {p.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rateios.map((r) => (
                <tr key={r.casoId} className={s.trZebra}>
                  <td className={s.td}>
                    {r.caso}
                    {r.cliente && <div className={s.tdMeta}>{r.cliente}</div>}
                  </td>
                  <td className={`${s.tdNum} ${s.tomTexto.pos}`}>{fmtMoney(r.recebidoCents)}</td>
                  {colunas.map((cab) => {
                    const p = r.partes.find((x) => x.contaId === cab.id)
                    return (
                      <td key={cab.id} className={s.tdNum}>
                        {p ? (
                          <>
                            {fmtMoney(p.valorCents)}
                            <div className={s.tdMeta}>{p.percentual}%</div>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr className={s.trTotal}>
                <td className={s.td} style={{ fontWeight: 500 }}>
                  Total rateado
                </td>
                <td className={`${s.tdNum} ${s.tomTexto.pos}`}>
                  {fmtMoney(rateios.reduce((a, r) => a + r.recebidoCents, 0))}
                </td>
                {colunas.map((cab) => (
                  <td key={cab.id} className={s.tdNum}>
                    {fmtMoney(
                      rateios.reduce((a, r) => a + (r.partes.find((x) => x.contaId === cab.id)?.valorCents ?? 0), 0),
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Veredito({ titulo, acerto }: { titulo: string; acerto: RelatorioFinanceiro["socios"]["periodo"] }) {
  return (
    <div className={s.veredito({ tom: acerto.quitado ? "quitado" : "devendo" })}>
      <div>
        <div className={s.vereditoTexto}>
          {acerto.quitado ? (
            <>Sem saldo entre os sócios ✓</>
          ) : (
            <>
              {acerto.devedorNome} deve <span className={s.vereditoValor}>{fmtMoney(acerto.valorCents)}</span> a{" "}
              {acerto.credorNome}
            </>
          )}
        </div>
        <div className={s.vereditoSub}>
          {titulo} · desbalanço bruto {fmtMoney(acerto.brutoCents)}
          {acerto.transferidoCents > 0 ? ` · já transferido ${fmtMoney(acerto.transferidoCents)}` : ""}
        </div>
      </div>
      <span className={s.pill({ tom: acerto.quitado ? "pago" : "gold" })}>
        {acerto.quitado ? "Quitado" : "Em aberto"}
      </span>
    </div>
  )
}

// ── lançamentos ──────────────────────────────────────────────────────────────

/** Período longo pode trazer milhares de linhas; a tabela mostra as primeiras e
 *  os TOTAIS continuam sobre o conjunto inteiro (o CSV traz tudo). */
const MAX_LINHAS = 500

function Lancamentos({ rel }: { rel: RelatorioFinanceiro }) {
  const todas = rel.lancamentos
  if (todas.length === 0) return <div className={s.vazio}>Nenhum lançamento com vencimento ou baixa no período.</div>
  const rows = todas.slice(0, MAX_LINHAS)
  const totalIn = todas.filter((r) => r.dir === "in").reduce((a, r) => a + r.valorCents, 0)
  const totalOut = todas.filter((r) => r.dir === "out").reduce((a, r) => a + r.valorCents, 0)
  return (
    <div className={s.tabelaWrap}>
      <table className={s.tabela}>
        <thead>
          <tr>
            <th className={s.th}>Vencimento</th>
            <th className={s.th}>Descrição</th>
            <th className={s.th}>Contato / fornecedor</th>
            <th className={s.th}>Categoria</th>
            <th className={s.th}>Conta</th>
            <th className={s.th}>Situação</th>
            <th className={s.thNum}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const sit = situacao(r, rel.hoje)
            return (
              <tr key={r.id} className={s.trZebra}>
                <td className={`${s.tdNum} ${s.tomTexto.muted}`} style={{ textAlign: "left" }}>
                  {fmtDateShort(r.venc)}
                </td>
                <td className={s.td}>
                  {r.desc}
                  {r.caso && <div className={s.tdMeta}>{r.caso}</div>}
                </td>
                <td className={`${s.td} ${s.tomTexto.muted}`}>{r.party ?? "—"}</td>
                <td className={`${s.td} ${s.tomTexto.muted}`}>{r.cat ?? "—"}</td>
                <td className={`${s.td} ${s.tomTexto.muted}`}>{r.conta ?? "—"}</td>
                <td className={s.td}>
                  <span className={s.pill({ tom: sit })}>
                    {sit === "pago" ? (r.dir === "in" ? "Recebido" : "Pago") : sit === "vencido" ? "Vencido" : "A vencer"}
                  </span>
                  {r.pagoData && <div className={s.tdMeta}>baixa {fmtDateShort(r.pagoData)}</div>}
                </td>
                <td className={`${s.tdNum} ${r.dir === "in" ? s.tomTexto.pos : s.tomTexto.neg}`}>
                  {r.dir === "in" ? "+" : "−"}
                  {fmtMoney(r.valorCents)}
                </td>
              </tr>
            )
          })}
          <tr className={s.trTotal}>
            <td className={s.td} colSpan={6} style={{ fontWeight: 500 }}>
              {todas.length} {todas.length === 1 ? "lançamento" : "lançamentos"} · entradas {fmtMoney(totalIn)} ·
              saídas {fmtMoney(totalOut)}
            </td>
            <td className={`${s.tdNum} ${totalIn - totalOut >= 0 ? s.tomTexto.pos : s.tomTexto.neg}`} style={{ fontWeight: 500 }}>
              {fmtMoney(totalIn - totalOut)}
            </td>
          </tr>
        </tbody>
      </table>
      {todas.length > rows.length && (
        <div style={{ padding: "0 13px 12px" }}>
          <div className={s.nota}>
            Mostrando as primeiras {MAX_LINHAS} de {todas.length} linhas — os totais acima são do período inteiro.
            Use <strong>Exportar CSV</strong> para a lista completa.
          </div>
        </div>
      )}
    </div>
  )
}

