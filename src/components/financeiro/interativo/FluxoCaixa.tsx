"use client"

// Fluxo de caixa — accumulated-balance projection (realized vs projected).
// Horizon selector (6m / 12m / 24m / completo) scopes the chart, the bars and
// the monthly table client-side; KPIs follow. Readability rules from the
// design: x-axis labels are thinned (never overlap), horizontal gridlines
// carry an R$ scale, a dashed "hoje" marker splits realized from projection
// and the monthly table keeps header/total pinned.
import { useMemo, useState } from "react"
import { currentMes, MES_FULL } from "@/lib/finance/periodo"
import type { FluxoPoint, FluxoResumo } from "@/lib/finance/types"
import { Icon, FxKpi } from "./kit"
import { fmtCompact, fmtMoney } from "./fx"
import * as c from "./interativo.css"

const ACCENT = "var(--accent)"
const POS = "var(--fin-pos,#2E9E5B)"
const NEG = "var(--fin-neg,#C0492F)"

// which indices get an x-axis label (thinning so labels never overlap)
function tickIdx(n: number, maxTicks = 14): Set<number> {
  const every = Math.max(1, Math.ceil(n / maxTicks))
  const set = new Set<number>()
  for (let i = 0; i < n; i += every) set.add(i)
  return set
}
const tickLabel = (d: FluxoPoint, i: number) => (i === 0 || d.label === "jan" ? `${d.label} ${d.ano.slice(2)}` : d.label)
const axisMoney = (cents: number) => (cents === 0 ? "R$ 0" : `${cents < 0 ? "−" : ""}${Math.round(Math.abs(cents) / 100_000)} mil`)

function addMonthsKey(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function CashChart({ data, aberturaCents }: { data: FluxoPoint[]; aberturaCents: number }) {
  if (data.length === 0) return null
  const W = 980, H = 250, padL = 14, padR = 14, padT = 16, padB = 30
  const iw = W - padL - padR, ih = H - padT - padB
  const accs = data.map((d) => d.accCents).concat([aberturaCents])
  const min = Math.min(0, ...accs), max = Math.max(...accs)
  const x = (i: number) => padL + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw)
  const y = (v: number) => padT + ih - ((v - min) / (max - min || 1)) * ih
  const pts = data.map((d, i) => [x(i), y(d.accCents)] as const)
  const firstProj = data.findIndex((d) => d.proj)
  const curIdx = firstProj === -1 ? data.length - 1 : firstProj - 1
  const solid = pts.slice(0, Math.max(1, curIdx + 1))
  const dashed = pts.slice(Math.max(0, curIdx))
  const line = (arr: readonly (readonly [number, number])[]) => arr.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")
  const areaPath = solid.length > 1 ? `${line(solid)} L${solid[solid.length - 1][0].toFixed(1)} ${y(min).toFixed(1)} L${padL} ${y(min).toFixed(1)} Z` : ""
  const ticks = tickIdx(data.length)
  // 4 gridlines at uniform values between min and max
  const grid = [0.25, 0.5, 0.75, 1].map((f) => min + (max - min) * f)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id="fxArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.20" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {grid.map((v, gi) => (
        <g key={gi}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
          <text x={padL + 2} y={y(v) - 4} fontSize="10" fill="var(--text-subtle)" style={{ fontFamily: "var(--font-sans)", fontFeatureSettings: '"tnum"' }}>{axisMoney(v)}</text>
        </g>
      ))}
      {min < 0 && <line x1={padL} y1={y(0)} x2={W - padR} y2={y(0)} stroke={NEG} strokeOpacity="0.4" strokeDasharray="3 3" />}
      {/* "hoje" marker */}
      {curIdx >= 0 && curIdx < data.length - 1 && (
        <g>
          <line x1={x(curIdx)} y1={padT - 2} x2={x(curIdx)} y2={H - padB} stroke="var(--text-subtle)" strokeOpacity="0.45" strokeDasharray="2 4" />
          <text x={x(curIdx)} y={padT - 5} textAnchor="middle" fontSize="9.5" fontWeight="500" fill="var(--text-subtle)" style={{ fontFamily: "var(--font-sans)", letterSpacing: "0.08em", textTransform: "uppercase" }}>hoje</text>
        </g>
      )}
      {areaPath && <path d={areaPath} fill="url(#fxArea)" />}
      <path d={line(solid)} fill="none" stroke={ACCENT} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <path d={line(dashed)} fill="none" stroke={ACCENT} strokeWidth="2.2" strokeDasharray="5 4" strokeOpacity="0.7" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={d.key}>
          <circle cx={x(i)} cy={y(d.accCents)} r={d.proj ? 2.8 : 3.4} fill={d.proj ? "var(--bg)" : ACCENT} stroke={ACCENT} strokeWidth="1.8">
            <title>{`${d.label}/${d.ano.slice(2)} · acumulado ${fmtMoney(d.accCents)}`}</title>
          </circle>
          {ticks.has(i) && (
            <text x={x(i)} y={H - 9} textAnchor="middle" fontSize="10.5" fill="var(--text-subtle)" style={{ fontFamily: "var(--font-sans)" }}>{tickLabel(d, i)}{d.proj ? "*" : ""}</text>
          )}
        </g>
      ))}
    </svg>
  )
}

function Bars({ data }: { data: FluxoPoint[] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.entCents, d.saiCents)))
  const ticks = tickIdx(data.length, 12)
  return (
    <div className={c.bars}>
      {data.map((d, i) => (
        <div key={d.key} className={c.barCol} style={{ opacity: d.proj ? 0.55 : 1 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 134, width: "100%", justifyContent: "center" }}>
            <div title={`${d.label}/${d.ano.slice(2)} · entradas ${fmtMoney(d.entCents)}`} style={{ width: "36%", maxWidth: 13, minWidth: 3, height: `${(d.entCents / max) * 100}%`, minHeight: 2, background: POS, borderRadius: "3px 3px 0 0" }} />
            <div title={`${d.label}/${d.ano.slice(2)} · saídas ${fmtMoney(d.saiCents)}`} style={{ width: "36%", maxWidth: 13, minWidth: 3, height: `${(d.saiCents / max) * 100}%`, minHeight: 2, background: NEG, borderRadius: "3px 3px 0 0" }} />
          </div>
          <span style={{ fontSize: 11, color: "var(--text-subtle)", whiteSpace: "nowrap", visibility: ticks.has(i) ? "visible" : "hidden" }}>{tickLabel(d, i)}{d.proj ? "*" : ""}</span>
        </div>
      ))}
    </div>
  )
}

function Legend({ items }: { items: { label: string; color: string; dash?: boolean }[] }) {
  return (
    <div className={c.legend}>
      {items.map((it) => (
        <span key={it.label} className={c.legendItem}>
          <span style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, ...(it.dash ? { border: `1.5px dashed ${it.color}` } : { background: it.color }) }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}

const HORIZONS = [
  { value: "h6", label: "6m", months: 6 },
  { value: "h12", label: "12m", months: 12 },
  { value: "h24", label: "24m", months: 24 },
  { value: "all", label: "Completo", months: null },
] as const
type Horizon = (typeof HORIZONS)[number]["value"]

export function FluxoCaixa({ resumo }: { resumo: FluxoResumo }) {
  const [horizon, setHorizon] = useState<Horizon>("h12")
  const nowKey = currentMes()

  const data = useMemo(() => {
    const h = HORIZONS.find((o) => o.value === horizon)
    if (!h || h.months === null) return resumo.pontos
    const end = addMonthsKey(nowKey, h.months)
    return resumo.pontos.filter((d) => d.key <= end)
  }, [resumo.pontos, horizon, nowKey])

  const totEnt = data.reduce((s, d) => s + d.entCents, 0)
  const totSai = data.reduce((s, d) => s + d.saiCents, 0)
  const finalAcc = data.length ? data[data.length - 1].accCents : resumo.aberturaCents
  const lowest = data.reduce((m, d) => Math.min(m, d.accCents), resumo.aberturaCents)
  const first = data[0], last = data[data.length - 1]
  const span = first && last ? `${first.label}/${first.ano.slice(2)} – ${last.label}/${last.ano.slice(2)}` : ""
  const curLabel = MES_FULL[Number(nowKey.slice(5, 7)) - 1].toLowerCase()

  return (
    <div className={c.scroll}>
      <div className={c.frame}>
        <div className={c.fluxoHead}>
          <div>
            <h1 className={c.pageTitle}>Fluxo de caixa</h1>
            <p className={c.pageSub}>{span} · meses com * são projeção, com recorrentes em aberto</p>
          </div>
          <div className={c.horizonWrap}>
            <span className={c.horizonLabel}>Horizonte</span>
            <div className={c.segGroup}>
              {HORIZONS.map((o) => (
                <button key={o.value} type="button" className={c.segButton({ active: horizon === o.value, size: "sm" })} onClick={() => setHorizon(o.value)}>{o.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className={c.kpiGrid}>
          <FxKpi label="Saldo inicial" value={fmtCompact(resumo.aberturaCents)} sub={first ? `Caixa de abertura · ${first.label}/${first.ano.slice(2)}` : "Caixa de abertura"} icon="wallet" />
          <FxKpi label={`Saldo em ${curLabel}`} value={fmtCompact(resumo.saldoHojeCents)} sub="Posição de caixa atual" icon="banknote" accent="gold" tone={resumo.saldoHojeCents >= 0 ? "pos" : "neg"} />
          <FxKpi label="Saldo ao final do horizonte" value={fmtCompact(finalAcc)} sub={last ? `Projetado para ${last.label}/${last.ano.slice(2)}` : ""} icon="trendingUp" tone={finalAcc >= 0 ? "pos" : "neg"} />
          <FxKpi label="Menor saldo do horizonte" value={fmtCompact(lowest)} sub="Ponto de maior aperto" icon="alertTriangle" tone={lowest < 0 ? "neg" : undefined} />
        </div>

        <div className={`${c.card} ${c.cardPad}`} style={{ marginBottom: 20 }}>
          <div className={c.cardTitleRow}>
            <div><div className={c.cardTitle}>Projeção de caixa · saldo acumulado</div><div className={c.cardSub}>Linha cheia: realizado. Linha tracejada: projetado a partir de hoje.</div></div>
            <Legend items={[{ label: "Realizado", color: ACCENT }, { label: "Projetado", color: ACCENT, dash: true }]} />
          </div>
          <CashChart data={data} aberturaCents={resumo.aberturaCents} />
        </div>

        <div className={c.fluxoGrid}>
          <div className={`${c.card} ${c.cardPad}`}>
            <div className={c.cardTitleRow}>
              <div><div className={c.cardTitle}>Entradas vs saídas</div><div className={c.cardSub}>Por mês de competência</div></div>
              <Legend items={[{ label: "Entradas", color: POS }, { label: "Saídas", color: NEG }]} />
            </div>
            <Bars data={data} />
          </div>

          <div className={c.card} style={{ padding: 0, overflow: "hidden" }}>
            <div className={c.fluxoTableScroll}>
              <table className={c.fluxoTable}>
                <thead>
                  <tr>
                    <th className={c.th({ sticky: true })}>Mês</th>
                    <th className={c.th({ align: "right", sticky: true })}>Entradas</th>
                    <th className={c.th({ align: "right", sticky: true })}>Saídas</th>
                    <th className={c.th({ align: "right", sticky: true })}>Saldo</th>
                    <th className={c.th({ align: "right", sticky: true })}>Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d) => (
                    <tr key={d.key} style={{ opacity: d.proj ? 0.66 : 1 }}>
                      <td className={c.fluxoTd} style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", textTransform: "capitalize" }}>{d.label}/{d.ano.slice(2)}{d.proj && <span style={{ marginLeft: 6, fontSize: 10, color: ACCENT }}>proj.</span>}</td>
                      <td className={c.fluxoTd} style={{ textAlign: "right" }}><span className={c.num} style={{ fontSize: 12, color: POS }}>{fmtCompact(d.entCents)}</span></td>
                      <td className={c.fluxoTd} style={{ textAlign: "right" }}><span className={c.num} style={{ fontSize: 12, color: NEG }}>{fmtCompact(d.saiCents)}</span></td>
                      <td className={c.fluxoTd} style={{ textAlign: "right" }}><span className={c.num} style={{ fontSize: 12, fontWeight: 500, color: d.saldoCents >= 0 ? "var(--text)" : NEG }}>{fmtCompact(d.saldoCents)}</span></td>
                      <td className={c.fluxoTd} style={{ textAlign: "right" }}><span className={c.num} style={{ fontSize: 12, fontWeight: 500, color: d.accCents >= 0 ? ACCENT : NEG }}>{fmtCompact(d.accCents)}</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className={c.fluxoFootTd} style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>Total</td>
                    <td className={c.fluxoFootTd} style={{ textAlign: "right" }}><span className={c.num} style={{ fontSize: 12, fontWeight: 500, color: POS }}>{fmtCompact(totEnt)}</span></td>
                    <td className={c.fluxoFootTd} style={{ textAlign: "right" }}><span className={c.num} style={{ fontSize: 12, fontWeight: 500, color: NEG }}>{fmtCompact(totSai)}</span></td>
                    <td className={c.fluxoFootTd} style={{ textAlign: "right" }}><span className={c.num} style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{fmtCompact(totEnt - totSai)}</span></td>
                    <td className={c.fluxoFootTd} style={{ textAlign: "right" }}><span className={c.num} style={{ fontSize: 12, fontWeight: 500, color: ACCENT }}>{fmtCompact(finalAcc)}</span></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
