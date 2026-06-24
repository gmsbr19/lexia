"use client"

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { apiSend } from "@/lib/client/api"
import { useReportBottomBar } from "@/lib/client/bottom-inset"
import { btn } from "@/styles/components.css"
import type { LancamentoRow, LancSituacao } from "@/lib/finance/types"
import { Icon, FxCheck, FxDirChip, FxMoney, FxStatusPill, FxCatChip, type IconName } from "./kit"
import { agingLabel, daysTo, fmtDateShort, fmtMoney, situacao, todayISO, SIT_LABEL } from "./fx"
import { NovoLancamentoModal, type LancOptions } from "./NovoLancamentoModal"
import * as c from "./interativo.css"

type DirF = "todos" | "in" | "out"
type StatF = "todos" | "avencer" | "vencido" | "pago"
const PAGE = 120

export interface InitialFilter {
  dir?: DirF
  stat?: StatF
  cat?: string
  q?: string
  aging?: string
}

const send = apiSend

const DOT_POS = "var(--fin-pos,#2E9E5B)"
const DOT_NEG = "var(--fin-neg,#C0492F)"
const DOT_NAVY = "rgba(2,13,37,0.32)"

interface FacetOption {
  value: string
  label: string
  dot?: string
}

// ── faceted filter chip — button doubles as the active-value indicator ────────
function FxFilter({
  label,
  icon,
  value,
  allValue,
  options,
  onChange,
  align = "left",
}: {
  label: string
  icon?: IconName
  value: string
  allValue: string
  options: FacetOption[]
  onChange: (v: string) => void
  align?: "left" | "right"
}) {
  const [open, setOpen] = useState(false)
  const active = value !== allValue && value != null
  const cur = options.find((o) => o.value === value)
  return (
    <div className={c.facetWrap}>
      <button type="button" className={c.facetBtn({ active })} onClick={() => setOpen((o) => !o)}>
        {active && cur ? (
          <>
            {cur.dot ? <span className={c.facetDot} style={{ background: cur.dot }} /> : icon ? <Icon name={icon} size={13} /> : null}
            <span className={c.facetValue}>{cur.label}</span>
            <span role="button" title="Remover filtro" className={c.facetRemove} onClick={(e) => { e.stopPropagation(); onChange(allValue); setOpen(false) }}>
              <Icon name="x" size={12} />
            </span>
          </>
        ) : (
          <>
            {icon && <Icon name={icon} size={14} />}
            <span>{label}</span>
            <Icon name="chevronDown" size={14} />
          </>
        )}
      </button>
      {open && (
        <>
          <div className={c.menuScrim} onClick={() => setOpen(false)} />
          <div className={c.facetMenu} style={{ [align]: 0 }}>
            <button type="button" className={c.facetMenuItem} onClick={() => { onChange(allValue); setOpen(false) }}>
              <span style={{ color: "var(--text-muted)" }}>Todos</span>
              {!active && <span className={c.facetCheck}><Icon name="check" size={13} /></span>}
            </button>
            <div className={c.facetMenuDiv} />
            {options.map((o) => (
              <button key={o.value} type="button" className={c.facetMenuItem} onClick={() => { onChange(o.value); setOpen(false) }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                  {o.dot && <span className={c.facetDot} style={{ background: o.dot }} />}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{o.label}</span>
                </span>
                {value === o.value && <span className={c.facetCheck}><Icon name="check" size={13} /></span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function exportCSV(rows: LancamentoRow[], today: string) {
  const head = ["Tipo", "Descrição", "Cliente/Fornecedor", "Caso", "Categoria", "Vencimento", "Pagamento", "Valor", "Status"]
  const esc = (s: unknown) => `"${String(s == null ? "" : s).replace(/"/g, '""')}"`
  const lines = [head.map(esc).join(";")]
  rows.forEach((r) => {
    lines.push(
      [
        r.dir === "in" ? "A receber" : "A pagar",
        r.desc,
        r.party ?? "",
        r.caso ?? "",
        r.cat ?? "",
        r.venc?.slice(0, 10) ?? "",
        r.pago ? r.pagoData?.slice(0, 10) ?? "" : "",
        (r.dir === "out" ? "-" : "") + (r.valorCents / 100).toFixed(2).replace(".", ","),
        SIT_LABEL[situacao(r, today)],
      ].map(esc).join(";"),
    )
  })
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `lexia-lancamentos-${today}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ── memoized row (only re-renders when its own props change) ─────────────────
interface RowProps {
  it: LancamentoRow
  selected: boolean
  menuOpen: boolean
  today: string
  onToggle: (id: number) => void
  onMarkPaid: (id: number) => void
  onReabrir: (id: number) => void
  onExcluir: (id: number) => void
  onEdit: (it: LancamentoRow) => void
  onMenu: (id: number | null) => void
}

const LancRow = memo(function LancRow({ it, selected, menuOpen, today, onToggle, onMarkPaid, onReabrir, onExcluir, onEdit, onMenu }: RowProps) {
  const s = situacao(it, today)
  return (
    <tr className={`${c.row} ${selected ? c.rowSelected : ""}`} style={{ cursor: "pointer" }} onClick={() => onEdit(it)} title="Clique para editar">
      <td className={c.cellTight} style={{ paddingLeft: 16, width: 32 }} onClick={(e) => e.stopPropagation()}><FxCheck checked={selected} onChange={() => onToggle(it.id)} /></td>
      <td className={c.cellTight} style={{ width: 30 }}><FxDirChip dir={it.dir} compact /></td>
      <td className={c.cell}>
        <div className={c.descMain}>{it.desc}</div>
        <div className={c.descMeta}>
          <span>{it.party ?? "—"}{it.caso ? ` · ${it.caso}` : ""}</span>
          {it.recorrente && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--accent)", fontWeight: 500 }}><Icon name="refreshCw" size={10} />{it.grupo}</span>}
        </div>
      </td>
      <td className={c.cell}>{it.cat ? <FxCatChip label={it.cat} /> : "—"}</td>
      <td className={c.cell}><span className={c.dateNum}>{fmtDateShort(it.venc)}</span></td>
      <td className={c.cell}>{it.pago ? <span className={c.dateNumSubtle}>{fmtDateShort(it.pagoData)}</span> : <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>—</span>}</td>
      <td className={c.cell} style={{ textAlign: "right" }}><FxMoney valorCents={it.valorCents} dir={it.dir} size={12} /></td>
      <td className={c.cell} onClick={(e) => e.stopPropagation()}>
        {it.pago ? <FxStatusPill status="pago" /> : (
          <button type="button" className={c.pillButton} onClick={() => onMarkPaid(it.id)} title="Clique para dar baixa (registra hoje)"><FxStatusPill status={s as LancSituacao} /></button>
        )}
      </td>
      <td className={c.cell} style={{ textAlign: "right", paddingRight: 16 }} onClick={(e) => e.stopPropagation()}>
        <div className={c.menuWrap}>
          <button type="button" className={c.iconBtn} onClick={() => onMenu(menuOpen ? null : it.id)}><Icon name="moreHorizontal" size={15} /></button>
          {menuOpen && (
            <>
              <div className={c.menuScrim} onClick={() => onMenu(null)} />
              <div className={c.menuCard}>
                <button type="button" className={c.menuItem} onClick={() => { onMenu(null); onEdit(it) }}><Icon name="edit" size={13} />Editar</button>
                {it.pago && <button type="button" className={c.menuItem} onClick={() => { onMenu(null); onReabrir(it.id) }}><Icon name="refreshCw" size={13} />Reabrir (desfazer baixa)</button>}
                <button type="button" className={c.menuItem} style={{ color: "var(--fin-neg,#C0492F)" }} onClick={() => { onMenu(null); onExcluir(it.id) }}><Icon name="minusCircle" size={13} />Excluir</button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  )
})

export function LancamentosTable({
  rows: serverRows,
  options,
  initial,
}: {
  rows: LancamentoRow[]
  options: LancOptions
  initial?: InitialFilter
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const today = todayISO()

  // Report the totals footer height so the shell floats the LexIA pill above it.
  const totalsRef = useRef<HTMLDivElement>(null)
  useReportBottomBar(totalsRef, "fin-totals")

  const [rows, setRows] = useState(serverRows)
  useEffect(() => setRows(serverRows), [serverRows])

  const [dir, setDir] = useState<DirF>(initial?.dir ?? "todos")
  const [stat, setStat] = useState<StatF>(initial?.stat ?? "todos")
  const [cat, setCat] = useState(initial?.cat ?? "")
  const [q, setQ] = useState(initial?.q ?? "")
  const deferredQ = useDeferredValue(q)
  const [aging, setAging] = useState(initial?.aging ?? "")
  const [sel, setSel] = useState<Set<number>>(() => new Set())
  const [menuId, setMenuId] = useState<number | null>(null)
  const [editRow, setEditRow] = useState<LancamentoRow | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shown, setShown] = useState(PAGE)

  const allCats = useMemo(() => [...new Set(rows.map((r) => r.cat).filter((x): x is string => !!x))].sort(), [rows])

  const visible = useMemo(
    () =>
      rows.filter((it) => {
        const s = situacao(it, today)
        if (dir !== "todos" && it.dir !== dir) return false
        if (stat !== "todos" && s !== stat) return false
        if (cat && it.cat !== cat) return false
        if (aging) {
          if (s !== "vencido") return false
          if (agingLabel(-daysTo(it.venc, today)) !== aging) return false
        }
        if (deferredQ) {
          const hay = (it.desc + " " + (it.party ?? "") + " " + (it.caso ?? "")).toLowerCase()
          if (!hay.includes(deferredQ.toLowerCase())) return false
        }
        return true
      }),
    [rows, dir, stat, cat, aging, deferredQ, today],
  )

  // reset the render cap when the filtered set changes
  useEffect(() => setShown(PAGE), [dir, stat, cat, aging, deferredQ])

  const rowIds = useMemo(() => new Set(visible.map((r) => r.id)), [visible])
  useEffect(() => {
    setSel((prev) => {
      const next = new Set([...prev].filter((id) => rowIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [rowIds])

  const allOn = visible.length > 0 && visible.every((r) => sel.has(r.id))
  const someOn = sel.size > 0 && !allOn
  const toggle = useCallback((id: number) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n }), [])
  const toggleAll = () => setSel(allOn ? new Set() : new Set(visible.map((r) => r.id)))
  const clearSel = () => setSel(new Set())
  const activeCount = (dir !== "todos" ? 1 : 0) + (stat !== "todos" ? 1 : 0) + (cat ? 1 : 0) + (aging ? 1 : 0) + (q ? 1 : 0)
  const clearFilters = () => { setDir("todos"); setStat("todos"); setCat(""); setQ(""); setAging("") }

  const act = useCallback(
    async (fn: () => Promise<unknown>) => {
      setError(null)
      try {
        await fn()
        startTransition(() => router.refresh())
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha")
      }
    },
    [router, startTransition],
  )
  const markPaid = useCallback((id: number) => act(() => send(`/api/financeiro/lancamentos/${id}/pagar`, "POST", {})), [act])
  const reabrir = useCallback((id: number) => act(() => send(`/api/financeiro/lancamentos/${id}/reabrir`, "POST", {})), [act])
  const excluir = useCallback((id: number) => {
    if (!window.confirm("Excluir este lançamento?")) return
    act(() => send(`/api/financeiro/lancamentos/${id}`, "DELETE"))
  }, [act])
  const onEdit = useCallback((it: LancamentoRow) => setEditRow(it), [])
  const onMenu = useCallback((id: number | null) => setMenuId(id), [])

  const bulk = (action: "pagar" | "reabrir" | "excluir") => {
    const ids = [...sel]
    if (action === "excluir" && !window.confirm(`Excluir ${ids.length} lançamento(s)?`)) return
    clearSel()
    act(() => send("/api/financeiro/lancamentos/bulk", "POST", { ids, action }))
  }

  const ent = visible.filter((r) => r.dir === "in").reduce((s, r) => s + r.valorCents, 0)
  const sai = visible.filter((r) => r.dir === "out").reduce((s, r) => s + r.valorCents, 0)
  const saldo = ent - sai
  const pageRows = visible.slice(0, shown)

  const dirOpts: FacetOption[] = [{ value: "in", label: "Entradas", dot: DOT_POS }, { value: "out", label: "Saídas", dot: DOT_NEG }]
  const statOpts: FacetOption[] = [{ value: "avencer", label: "A vencer", dot: DOT_NAVY }, { value: "vencido", label: "Vencido", dot: DOT_NEG }, { value: "pago", label: "Pago", dot: DOT_POS }]
  const catOpts: FacetOption[] = allCats.map((cc) => ({ value: cc, label: cc }))
  const agingOpts: FacetOption[] = [{ value: "1–30 dias", label: "1–30 dias" }, { value: "31–60 dias", label: "31–60 dias" }, { value: "+60 dias", label: "+60 dias" }]

  return (
    <div className={c.lancRoot}>
      {error && <div className={c.bulkBar} style={{ background: "rgba(192,73,47,0.1)", borderColor: "var(--fin-neg,#C0492F)", color: "var(--fin-neg,#C0492F)" }}>{error}</div>}

      <div className={c.filterBar}>
        <div className={c.filterLeft}>
          <div className={c.searchWrap}>
            <div className={c.searchIcon}><Icon name="search" size={15} /></div>
            <input className={c.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por descrição, cliente, caso…" style={{ paddingLeft: 38, height: 34, fontSize: 13 }} />
          </div>
          <div className={c.filterDivider} />
          <span className={c.filterFunnel}><Icon name="filter" size={15} /></span>
          <FxFilter label="Tipo" value={dir} allValue="todos" onChange={(v) => setDir(v as DirF)} options={dirOpts} />
          <FxFilter label="Status" value={stat} allValue="todos" onChange={(v) => setStat(v as StatF)} options={statOpts} />
          <FxFilter label="Categoria" value={cat} allValue="" onChange={setCat} options={catOpts} />
          <FxFilter label="Atraso" icon="clock" value={aging} allValue="" onChange={setAging} options={agingOpts} />
          {activeCount > 0 && (
            <button type="button" className={btn({ variant: "ghost" })} style={{ height: 34, fontSize: 12, gap: 4, padding: "0 8px", color: "var(--text-muted)" }} onClick={clearFilters} title="Limpar filtros">
              <Icon name="x" size={12} />Limpar
            </button>
          )}
        </div>
        <div className={c.filterRight}>
          <button type="button" className={btn({ variant: "secondary" })} style={{ height: 34, width: 38, padding: 0 }} onClick={() => exportCSV(visible, today)} title="Exportar CSV"><Icon name="download" size={15} /></button>
          <button type="button" className={btn({ variant: "primary" })} style={{ height: 34, fontSize: 12 }} onClick={() => setNewOpen(true)}><Icon name="plus" size={14} />Novo lançamento</button>
        </div>
      </div>

      {sel.size > 0 && (
        <div className={c.bulkBar}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--accent)" }}>{sel.size} selecionado{sel.size > 1 ? "s" : ""}</span>
          <div style={{ width: 1, height: 18, background: "var(--border-strong)" }} />
          <button type="button" className={btn({ variant: "secondary" })} style={{ height: 30, fontSize: 12, borderColor: "rgba(46,158,91,0.4)", color: "var(--fin-pos,#2E9E5B)" }} onClick={() => bulk("pagar")}><Icon name="check" size={13} strokeWidth={2.3} />Dar baixa</button>
          <button type="button" className={btn({ variant: "secondary" })} style={{ height: 30, fontSize: 12 }} onClick={() => bulk("reabrir")}><Icon name="refreshCw" size={12} />Reabrir</button>
          <button type="button" className={btn({ variant: "secondary" })} style={{ height: 30, fontSize: 12, color: "var(--fin-neg,#C0492F)" }} onClick={() => bulk("excluir")}><Icon name="minusCircle" size={13} />Excluir</button>
          <div style={{ marginLeft: "auto" }}><button type="button" className={btn({ variant: "ghost" })} style={{ height: 30, fontSize: 12 }} onClick={clearSel}>Cancelar</button></div>
        </div>
      )}

      <div className={c.tableScroll}>
        <div className={c.tableCard}>
          <table className={c.table}>
            <thead>
              <tr className={c.theadRow}>
                <th className={c.th({})} style={{ width: 32 }}><FxCheck checked={allOn} indeterminate={someOn} onChange={toggleAll} title="Selecionar todos" /></th>
                <th className={c.th({})} style={{ width: 30 }} />
                <th className={c.th({})}>Descrição</th>
                <th className={c.th({})}>Categoria</th>
                <th className={c.th({})}>Vencimento</th>
                <th className={c.th({})}>Pagamento</th>
                <th className={c.th({ align: "right" })}>Valor</th>
                <th className={c.th({})}>Status</th>
                <th className={c.th({ align: "right" })} />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((it) => (
                <LancRow
                  key={it.id}
                  it={it}
                  selected={sel.has(it.id)}
                  menuOpen={menuId === it.id}
                  today={today}
                  onToggle={toggle}
                  onMarkPaid={markPaid}
                  onReabrir={reabrir}
                  onExcluir={excluir}
                  onEdit={onEdit}
                  onMenu={onMenu}
                />
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={9} className={c.emptyRow}><Icon name="search" size={22} /><div style={{ marginTop: 8 }}>Nenhum lançamento neste período ou filtro.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        {visible.length > shown && (
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0", flexShrink: 0 }}>
            <button type="button" className={btn({ variant: "secondary" })} style={{ height: 32, fontSize: 12 }} onClick={() => setShown((n) => n + PAGE)}>
              Mostrar mais ({visible.length - shown} restantes)
            </button>
          </div>
        )}
      </div>

      <div className={c.totalsBar} ref={totalsRef}>
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{visible.length} {visible.length === 1 ? "lançamento" : "lançamentos"}</span>
        <div className={c.totalCell}>
          <div className={c.totalIcon} style={{ color: "var(--fin-pos,#2E9E5B)" }}><Icon name="arrowDownRight" size={15} /></div>
          <div><div className={c.totalLabel}>Entradas</div><div className={c.totalValue} style={{ color: "var(--fin-pos,#2E9E5B)" }}>{fmtMoney(ent)}</div></div>
        </div>
        <div className={c.totalCell}>
          <div className={c.totalIcon} style={{ color: "var(--fin-neg,#C0492F)" }}><Icon name="arrowUpRight" size={15} /></div>
          <div><div className={c.totalLabel}>Saídas</div><div className={c.totalValue} style={{ color: "var(--fin-neg,#C0492F)" }}>{fmtMoney(sai)}</div></div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: saldo >= 0 ? "rgba(46,158,91,0.12)" : "rgba(192,73,47,0.12)", color: saldo >= 0 ? "var(--fin-pos,#2E9E5B)" : "var(--fin-neg,#C0492F)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="sigma" size={15} /></div>
          <div>
            <div className={c.totalLabel}>Saldo do período</div>
            <div className={c.totalValue} style={{ fontSize: 16, fontWeight: 500, color: saldo >= 0 ? "var(--fin-pos,#2E9E5B)" : "var(--fin-neg,#C0492F)" }}>{fmtMoney(saldo)}</div>
          </div>
        </div>
      </div>

      {editRow && (
        <NovoLancamentoModal options={options} edit={editRow} onClose={() => setEditRow(null)} onSaved={() => { setEditRow(null); startTransition(() => router.refresh()) }} />
      )}

      {newOpen && (
        <NovoLancamentoModal options={options} onClose={() => setNewOpen(false)} onSaved={() => { setNewOpen(false); startTransition(() => router.refresh()) }} />
      )}
    </div>
  )
}
