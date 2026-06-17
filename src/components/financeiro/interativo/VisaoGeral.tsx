"use client"

import { useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { btn } from "@/styles/components.css"
import type { LancamentoRow, LancSituacao, PeriodScope } from "@/lib/finance/types"
import { Icon, FxDirChip, FxKpi, FxMoney } from "./kit"
import { daysTo, fmtCompact, fmtDateShort, fmtMoney, situacao, todayISO } from "./fx"
import * as c from "./interativo.css"

const POS = "var(--fin-pos,#2E9E5B)"
const NEG = "var(--fin-neg,#C0492F)"

function drillHref(mes: string, f: { dir?: string; stat?: string; aging?: string; q?: string }) {
  const p = new URLSearchParams({ tab: "lancamentos", mes, periodo: "ano" })
  if (f.dir) p.set("dir", f.dir)
  if (f.stat) p.set("stat", f.stat)
  if (f.aging) p.set("aging", f.aging)
  if (f.q) p.set("q", f.q)
  return `/financeiro?${p.toString()}`
}

export function VisaoGeral({ items, allItems, scope, mes }: { items: LancamentoRow[]; allItems: LancamentoRow[]; scope: PeriodScope; mes: string }) {
  const today = todayISO()
  const router = useRouter()
  const [, startTransition] = useTransition()

  const markPaid = async (id: number) => {
    try {
      await fetch(`/api/financeiro/lancamentos/${id}/pagar`, { method: "POST" })
      startTransition(() => router.refresh())
    } catch {
      /* ignore */
    }
  }

  const recebido = items.filter((i) => i.dir === "in" && i.pago).reduce((a, b) => a + b.valorCents, 0)
  const aReceber = items.filter((i) => i.dir === "in" && !i.pago).reduce((a, b) => a + b.valorCents, 0)
  const gastos = items.filter((i) => i.dir === "out" && i.pago).reduce((a, b) => a + b.valorCents, 0)
  const aPagar = items.filter((i) => i.dir === "out" && !i.pago).reduce((a, b) => a + b.valorCents, 0)
  const resultado = recebido - gastos
  const nRecebidas = items.filter((i) => i.dir === "in" && i.pago).length
  const nAbertas = items.filter((i) => i.dir === "in" && !i.pago).length
  const vencidos = items.filter((i) => situacao(i, today) === "vencido")
  const venc = items.filter((i) => !i.pago).sort((a, b) => (a.venc ?? "").localeCompare(b.venc ?? "")).slice(0, 7)

  return (
    <div className={c.scroll}>
      <div className={c.frame}>
        <div className={c.pageHead}>
          <div>
            <h1 className={c.pageTitle}>Visão geral · {scope.title}</h1>
            <p className={c.pageSub}>{items.length} lançamentos no período · {scope.sub}</p>
          </div>
        </div>

        <div className={c.kpiGrid}>
          <FxKpi label="Recebido" value={fmtCompact(recebido)} sub={nRecebidas === 1 ? "1 entrada baixada" : `${nRecebidas} entradas baixadas`} icon="banknote" accent="gold" tone={recebido > 0 ? "pos" : undefined} />
          <FxKpi label="A receber em aberto" value={fmtCompact(aReceber)} sub={nAbertas === 1 ? "1 honorário" : `${nAbertas} honorários`} icon="clock" />
          <FxKpi label="Gastos pagos" value={fmtCompact(gastos)} sub={`${fmtCompact(aPagar)} ainda a pagar`} icon="arrowUpRight" />
          <FxKpi label="Resultado do período" value={fmtCompact(resultado)} sub="Recebido − gastos pagos" icon="sigma" tone={resultado === 0 ? undefined : resultado > 0 ? "pos" : "neg"} />
        </div>

        {vencidos.length > 0 && (
          <div className={c.alert}>
            <div style={{ color: NEG, flexShrink: 0 }}><Icon name="alertTriangle" size={17} strokeWidth={1.9} /></div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{vencidos.length} {vencidos.length === 1 ? "lançamento vencido" : "lançamentos vencidos"} · <span className={c.num}>{fmtMoney(vencidos.reduce((a, b) => a + b.valorCents, 0))}</span></span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}> — requerem cobrança ou pagamento.</span>
            </div>
            <Link href={drillHref(mes, { stat: "vencido" })} className={btn({ variant: "secondary" })} style={{ height: 28, fontSize: 12, padding: "0 11px", flexShrink: 0, textDecoration: "none" }}>Ver vencidos<Icon name="arrowRight" size={13} /></Link>
          </div>
        )}

        <div className={c.visaoGrid}>
          <div className={c.colStack}>
            <Inadimplencia allItems={allItems} today={today} mes={mes} />
            <div className={`${c.card} ${c.cardPad}`}>
              <div className={c.cardTitleRow}><div><div className={c.cardTitle}>Por situação</div><div className={c.cardSub}>Distribuição dos lançamentos do período</div></div></div>
              <SituacaoBar items={items} today={today} />
            </div>
          </div>

          <div className={`${c.card} ${c.cardPad}`}>
            <div className={c.cardTitleRow}>
              <div><div className={c.cardTitle}>Próximos vencimentos</div><div className={c.cardSub}>Em aberto, ordenados por data</div></div>
              {venc.length > 0 && <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{venc.length} de {items.filter((i) => !i.pago).length}</span>}
            </div>
            {venc.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", fontSize: 12, color: "var(--text-subtle)" }}>Nada em aberto neste período. 🎉</div>
            ) : (
              <div style={{ marginTop: -4 }}>
                {venc.map((it) => {
                  const s = situacao(it, today)
                  const d = daysTo(it.venc, today)
                  const when = s === "vencido" ? `há ${Math.abs(d)}d` : d === 0 ? "hoje" : `em ${d}d`
                  return (
                    <div key={it.id} className={c.listRow}>
                      <FxDirChip dir={it.dir} compact />
                      <div className={c.listMain}>
                        <div className={c.listTitle}>{it.desc}</div>
                        <div className={c.listMeta}>{it.party ?? "—"} · {fmtDateShort(it.venc)} · <span style={{ color: s === "vencido" ? NEG : "var(--text-subtle)" }}>{when}</span></div>
                      </div>
                      <FxMoney valorCents={it.valorCents} dir={it.dir} size={12} />
                      <button type="button" className={c.baixaBtn} title="Dar baixa (registra hoje)" onClick={() => markPaid(it.id)}><Icon name="check" size={12} strokeWidth={2.4} />Baixa</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SituacaoBar({ items, today }: { items: LancamentoRow[]; today: string }) {
  const groups = (["avencer", "vencido", "pago"] as LancSituacao[]).map((s) => {
    const rows = items.filter((i) => situacao(i, today) === s)
    return { s, count: rows.length, value: rows.reduce((a, b) => a + b.valorCents, 0) }
  })
  const total = Math.max(1, groups.reduce((a, g) => a + g.value, 0))
  const meta: Record<string, { c: string; l: string }> = {
    avencer: { c: "var(--text-muted)", l: "A vencer" },
    vencido: { c: NEG, l: "Vencido" },
    pago: { c: POS, l: "Pago / recebido" },
  }
  return (
    <div>
      <div className={c.sitTrack}>
        {groups.map((g) => g.value > 0 && <div key={g.s} title={`${meta[g.s].l}: ${fmtMoney(g.value)}`} style={{ width: `${(g.value / total) * 100}%`, background: meta[g.s].c, opacity: g.s === "avencer" ? 0.5 : 0.9 }} />)}
      </div>
      <div className={c.sitLegend}>
        {groups.map((g) => (
          <div key={g.s} className={c.sitRow}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: meta[g.s].c, opacity: g.s === "avencer" ? 0.6 : 1, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--text)", flex: 1 }}>{meta[g.s].l}</span>
            <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>{g.count}</span>
            <span className={c.num} style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", width: 96, textAlign: "right" }}>{fmtCompact(g.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Inadimplencia({ allItems, today, mes }: { allItems: LancamentoRow[]; today: string; mes: string }) {
  const over = allItems.filter((i) => i.dir === "in" && !i.pago && situacao(i, today) === "vencido")
  const total = over.reduce((a, b) => a + b.valorCents, 0)
  const clientes = [...new Set(over.map((i) => i.party ?? "—"))]
  const buckets = [
    { label: "1–30 dias", test: (d: number) => d <= 30, c: "#D98A2B" },
    { label: "31–60 dias", test: (d: number) => d > 30 && d <= 60, c: "#C77E1F" },
    { label: "+60 dias", test: (d: number) => d > 60, c: NEG },
  ].map((b) => {
    const rows = over.filter((i) => b.test(-daysTo(i.venc, today)))
    return { ...b, value: rows.reduce((a, x) => a + x.valorCents, 0), count: rows.length }
  })
  const maxB = Math.max(1, ...buckets.map((b) => b.value))
  const top = Object.values(
    over.reduce<Record<string, { party: string; value: number; dias: number }>>((m, i) => {
      const k = i.party ?? "—"
      if (!m[k]) m[k] = { party: k, value: 0, dias: 0 }
      m[k].value += i.valorCents
      m[k].dias = Math.max(m[k].dias, -daysTo(i.venc, today))
      return m
    }, {}),
  ).sort((a, b) => b.value - a.value).slice(0, 3)

  return (
    <div className={`${c.card} ${c.cardPad}`}>
      <div className={c.cardTitleRow}>
        <div><div className={c.cardTitle}>Inadimplência</div><div className={c.cardSub}>Honorários vencidos e não recebidos (carteira toda)</div></div>
        {over.length > 0 && <Link className={btn({ variant: "ghost" })} style={{ height: 28, fontSize: 12, padding: "0 9px", color: "var(--accent)", textDecoration: "none" }} href={drillHref(mes, { dir: "in", stat: "vencido" })}>Ver títulos<Icon name="arrowRight" size={13} /></Link>}
      </div>
      {over.length === 0 ? (
        <div style={{ padding: "18px 0", textAlign: "center", fontSize: 12, color: "var(--text-subtle)" }}>Sem inadimplência. 🎉</div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
            <span className={c.num} style={{ fontSize: 25, fontWeight: 500, color: NEG, letterSpacing: "-0.025em" }}>{fmtCompact(total)}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{over.length} títulos · {clientes.length} cliente{clientes.length > 1 ? "s" : ""}</span>
          </div>
          <div className={c.inadBuckets}>
            {buckets.map((b) => (
              <Link key={b.label} href={b.count > 0 ? drillHref(mes, { dir: "in", stat: "vencido", aging: b.label }) : "#"} className={c.inadBucket} style={{ cursor: b.count > 0 ? "pointer" : "default" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", width: 64, flexShrink: 0 }}>{b.label}</span>
                <div className={c.inadTrack}><div style={{ width: `${(b.value / maxB) * 100}%`, height: "100%", background: b.c, borderRadius: 6, opacity: 0.9 }} /></div>
                <span style={{ fontSize: 11, color: "var(--text-subtle)", width: 16, textAlign: "right" }}>{b.count}</span>
                <span className={c.num} style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", width: 74, textAlign: "right" }}>{fmtCompact(b.value)}</span>
              </Link>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500, marginBottom: 4 }}>Maiores devedores · clique para cobrar</div>
            {top.map((t) => (
              <Link key={t.party} href={drillHref(mes, { dir: "in", stat: "vencido", q: t.party })} className={c.devedorRow}>
                <span className={c.devedorAvatar}>{t.party.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>
                <span style={{ fontSize: 12, color: "var(--text)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.party}</span>
                <span style={{ fontSize: 11, color: NEG, fontWeight: 500 }}>{t.dias}d</span>
                <span className={c.num} style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", width: 76, textAlign: "right" }}>{fmtCompact(t.value)}</span>
                <Icon name="chevronRight" size={14} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
