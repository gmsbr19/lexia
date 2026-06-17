"use client"

// LexIA · Comercial — Tab 1 · Visão geral (executive cockpit).
import { useMemo } from "react"
import { Icon } from "../cm-icons"
import { CmCardTitle, CmEmpty, CmFrame, CmKpi, CmNum, CmTh } from "../cm-kit"
import {
  cmCampaignStats,
  cmChannels,
  cmCompact,
  cmDeltaPct,
  cmInt,
  cmKpis,
  cmPct,
  cmRoas,
  cmShiftRef,
  cmTrend,
  type CampaignStat,
  type ChannelRow,
  type CmRef,
  type CmScope,
  type Periodo,
  type TrendBucket,
} from "../cm-meta"
import type { CmDataset } from "@/lib/comercial/types"

function TrendChart({ data }: { data: TrendBucket[] }) {
  const W = 720, H = 210, padL = 10, padR = 10, padT = 16, padB = 30
  const iw = W - padL - padR, ih = H - padT - padB
  const max = Math.max(4, ...data.map((d) => d.leads))
  const x = (i: number) => padL + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw)
  const y = (v: number) => padT + ih - (v / max) * ih
  const line = (key: "leads" | "conv") => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(" ")
  const area = `${line("leads")} L${x(data.length - 1).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`
  const grid = [0, 0.5, 1].map((f) => max * f)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id="cmTrendArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {grid.map((g, i) => <line key={i} x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="var(--border)" strokeWidth="1" />)}
      <path d={area} fill="url(#cmTrendArea)" />
      <path d={line("leads")} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <path d={line("conv")} fill="none" stroke="var(--cm-pos,#2E9E5B)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.leads)} r="3.4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="1.6" />
          <circle cx={x(i)} cy={y(d.conv)} r="3.4" fill="var(--cm-pos,#2E9E5B)" stroke="var(--surface)" strokeWidth="1.6" />
          <text x={x(i)} y={H - 9} textAnchor="middle" fontSize="11" fill="var(--text-subtle)" style={{ fontFamily: "var(--font-sans)" }}>{d.label}</text>
        </g>
      ))}
    </svg>
  )
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      {items.map((it) => (
        <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
          <span style={{ width: 12, height: 3, borderRadius: 2, background: it.color }} />{it.label}
        </span>
      ))}
    </div>
  )
}

function ChannelMix({ channels }: { channels: ChannelRow[] }) {
  const totalLeads = channels.reduce((a, c) => a + c.leads, 0)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {channels.map((c) => (
        <div key={c.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", flex: 1 }}>{c.label}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>ROAS</span>
            <CmNum size={12} color={c.roas == null ? "var(--text-subtle)" : c.roas >= 1 ? "var(--cm-pos,#2E9E5B)" : "var(--cm-neg,#C0492F)"}>{cmRoas(c.roas)}</CmNum>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {([["Leads", cmInt(c.leads)], ["Conversões", cmInt(c.conversoes)], ["Investimento", c.investimento ? cmCompact(c.investimento) : "—"]] as const).map(([l, v]) => (
              <div key={l} style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 11, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>{l}</div>
                <CmNum size={14} weight={500}>{v}</CmNum>
              </div>
            ))}
          </div>
          <div style={{ height: 5, borderRadius: 4, background: "var(--bg-sunken)", overflow: "hidden" }}>
            <div style={{ width: `${totalLeads ? (c.leads / totalLeads) * 100 : 0}%`, height: "100%", background: c.color, opacity: 0.85, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function TopCampanhas({ stats, onView }: { stats: CampaignStat[]; onView: () => void }) {
  const rows = stats.filter((c) => c.investimento > 0).sort((a, b) => (b.roas || 0) - (a.roas || 0)).slice(0, 5)
  if (rows.length === 0) return <CmEmpty icon="megaphone" title="Sem investimento no período" desc="Registre um gasto em uma campanha para acompanhar o ROAS por aqui." />
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr><CmTh>Campanha</CmTh><CmTh align="right">Invest.</CmTh><CmTh align="right">Contratado</CmTh><CmTh align="right">ROAS</CmTh></tr></thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.id} className="cm-rowlink" onClick={onView} style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }}>
            <td style={{ padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: c.plataforma === "google_ads" ? "#3B7DDD" : "#8B5CF6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 500, flexShrink: 0 }}>{c.plataforma === "google_ads" ? "G" : "M"}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{c.nome}</span>
              </div>
            </td>
            <td style={{ padding: "10px 14px", textAlign: "right" }}><CmNum size={12} weight={500} color="var(--text-muted)">{cmCompact(c.investimento)}</CmNum></td>
            <td style={{ padding: "10px 14px", textAlign: "right" }}><CmNum size={12}>{cmCompact(c.valorContratado)}</CmNum></td>
            <td style={{ padding: "10px 14px", textAlign: "right" }}><CmNum size={13} color={(c.roas ?? 0) >= 1 ? "var(--cm-pos,#2E9E5B)" : "var(--cm-neg,#C0492F)"}>{cmRoas(c.roas)}</CmNum></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function CmVisao({ dataset, ref0, period, scope, onNew, onLead, onGoCampanhas }: { dataset: CmDataset; ref0: CmRef; period: Periodo; scope: CmScope; onNew: () => void; onLead: () => void; onGoCampanhas: () => void }) {
  const k = useMemo(() => cmKpis(dataset.leads, dataset.gastos, ref0, period), [dataset, ref0, period])
  const prev = useMemo(() => cmKpis(dataset.leads, dataset.gastos, cmShiftRef(ref0, period, -1), period), [dataset, ref0, period])
  const trend = useMemo(() => cmTrend(dataset.leads, ref0, period), [dataset.leads, ref0, period])
  const channels = useMemo(() => cmChannels(dataset, ref0, period), [dataset, ref0, period])
  const stats = useMemo(() => cmCampaignStats(dataset, ref0, period), [dataset, ref0, period])

  const noLeads = k.leads === 0
  const noSpend = k.investimento === 0
  const roasOk = k.roas != null && k.roas >= 1

  const KPI: React.ComponentProps<typeof CmKpi>[] = [
    { label: "Leads", value: cmInt(k.leads), delta: cmDeltaPct(k.leads, prev.leads), icon: "userPlus", accent: "gold" },
    { label: "Conversões", value: cmInt(k.conversoes), delta: cmDeltaPct(k.conversoes, prev.conversoes), icon: "handshake" },
    { label: "Taxa de conversão", value: cmPct(k.taxaConv), delta: cmDeltaPct(k.taxaConv, prev.taxaConv), suffix: "pp", icon: "percent" },
    { label: "Investimento em anúncios", value: cmCompact(k.investimento), delta: cmDeltaPct(k.investimento, prev.investimento), icon: "coins" },
    { label: "Valor contratado", value: cmCompact(k.valorContratado), delta: cmDeltaPct(k.valorContratado, prev.valorContratado), icon: "banknote", tone: "pos" },
    { label: "ROAS", value: cmRoas(k.roas), delta: cmDeltaPct(k.roas, prev.roas), icon: "target", accent: "gold", tone: k.roas != null ? (k.roas >= 1 ? "pos" : "neg") : undefined },
    { label: "ROI", value: k.roi == null ? "—" : cmPct(k.roi, 0), delta: cmDeltaPct(k.roi, prev.roi), suffix: "pp", icon: "trendingUp", tone: k.roi != null ? (k.roi >= 0 ? "pos" : "neg") : undefined },
    { label: "CAC", value: k.cac == null ? "—" : cmCompact(k.cac), delta: cmDeltaPct(k.cac, prev.cac), deltaInvert: true, icon: "user" },
    { label: "CPL", value: k.cpl == null ? "—" : cmCompact(k.cpl), delta: cmDeltaPct(k.cpl, prev.cpl), deltaInvert: true, icon: "mousePointerClick" },
    { label: "Ticket médio", value: k.ticket == null ? "—" : cmCompact(k.ticket), delta: cmDeltaPct(k.ticket, prev.ticket), icon: "receipt" },
  ]

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
      <CmFrame>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 25, fontWeight: 500, letterSpacing: "-0.025em", color: "var(--text)" }}>Visão geral · {scope.title}</h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>{cmInt(k.leads)} leads · {cmInt(k.conversoes)} conversões · {scope.sub}</p>
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            <button className="btn btn-secondary" onClick={onLead} style={{ height: 34, fontSize: 12 }}><Icon name="userPlus" size={14} />Lead</button>
            <button className="btn btn-primary" onClick={onNew} style={{ height: 34, fontSize: 12 }}><Icon name="plus" size={14} />Nova campanha</button>
          </div>
        </div>

        {noLeads ? (
          <div className="card" style={{ padding: 20 }}>
            <CmEmpty icon="megaphone" title="Nenhum lead neste período" desc="Ainda não há leads registrados para o período selecionado. Cadastre um lead, crie uma campanha ou importe do Genions para começar a medir resultados."
              action={<div style={{ display: "flex", gap: 9, marginTop: 4 }}><button className="btn btn-secondary" onClick={onLead} style={{ height: 34, fontSize: 12 }}><Icon name="userPlus" size={14} />Novo lead</button><button className="btn btn-primary" onClick={onNew} style={{ height: 34, fontSize: 12 }}><Icon name="plus" size={14} />Nova campanha</button></div>} />
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderRadius: "var(--r-md)", marginBottom: 20, background: noSpend ? "var(--bg-sunken)" : roasOk ? "rgba(46,158,91,0.10)" : "rgba(192,73,47,0.10)", border: `1px solid ${noSpend ? "var(--border)" : roasOk ? "rgba(46,158,91,0.16)" : "rgba(192,73,47,0.16)"}` }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: noSpend ? "var(--surface)" : roasOk ? "rgba(46,158,91,0.16)" : "rgba(192,73,47,0.16)", color: noSpend ? "var(--text-muted)" : roasOk ? "#2E9E5B" : "#C0492F" }}>
                <Icon name={noSpend ? "coins" : roasOk ? "trendingUp" : "alertTriangle"} size={19} strokeWidth={1.9} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>
                  {noSpend ? "Sem investimento em anúncios no período" : roasOk ? `Os anúncios estão dando retorno — ${cmRoas(k.roas)} de ROAS` : `Atenção: os anúncios estão no prejuízo — ${cmRoas(k.roas)} de ROAS`}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {noSpend ? "Os leads do período vieram de canais orgânicos e indicações." : `Cada R$ 1 investido retornou ${k.roas != null ? cmRoas(k.roas).replace("x", "") : "0"} em honorários contratados · ROI de ${k.roi == null ? "—" : cmPct(k.roi, 0)}.`}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, marginBottom: 22 }}>
              {KPI.map((p) => <CmKpi key={p.label} {...p} />)}
            </div>

            <div className="card" style={{ padding: "18px 22px", marginBottom: 20 }}>
              <CmCardTitle title="Leads vs. conversões" sub={`Evolução ao longo de ${scope.title.toLowerCase()}`} right={<Legend items={[{ label: "Leads", color: "var(--accent)" }, { label: "Conversões", color: "var(--cm-pos,#2E9E5B)" }]} />} />
              <TrendChart data={trend} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 20, alignItems: "start" }}>
              <div className="card" style={{ padding: "18px 22px" }}>
                <CmCardTitle title="Mix de canais" sub="Origem dos leads e retorno por canal" />
                <ChannelMix channels={channels} />
              </div>
              <div className="card" style={{ padding: "18px 22px 8px" }}>
                <CmCardTitle title="Melhores campanhas" sub="Maior ROAS no período" right={<button className="btn btn-ghost" onClick={onGoCampanhas} style={{ height: 28, fontSize: 12, padding: "0 9px", color: "var(--accent)" }}>Ver todas<Icon name="arrowRight" size={13} /></button>} />
                <div style={{ margin: "0 -10px" }}><TopCampanhas stats={stats} onView={onGoCampanhas} /></div>
              </div>
            </div>
          </>
        )}
      </CmFrame>
    </div>
  )
}
