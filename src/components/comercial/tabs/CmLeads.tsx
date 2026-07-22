"use client"

// LexIA · Comercial v2 — Tela · Leads (ported faithfully from the design
// handoff src/com2/cx-leads*.jsx). Container: table/kanban views, filter
// builder (E/OU), group-by, column chooser, bulk edit, CSV export of the
// current view, skeleton and view persistence (localStorage, like the
// design). Not filtered by period. Mutations still flow through
// useOptimisticRows → the real REST API.
import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import { apiSend } from "@/lib/client/api"
import { toast } from "@/lib/client/toast"
import { useOptimisticRows } from "@/lib/client/useOptimisticRows"
import { Icon } from "../cm-icons"
import {
  CxCheckbox,
  CxEmpty,
  CxMenu,
  CxMenuItem,
  CxNum,
  CxOriginChip,
  CxOwner,
  CxPhone,
  CxQualBadge,
  CxSegmented,
  CxStagePill,
  CxTempDot,
  CxTh,
  CX_TEMPERATURAS,
  CX_TEMP_MAP,
  CxAvatar,
} from "../cx-kit"
import {
  CX_COLS,
  CX_COL_MAP,
  CX_GROUPABLE,
  CX_OPS,
  cxApplyRules,
  cxColValue,
  cxEnumValues,
  cxGroupKey,
  cxLeadsViewCSV,
  cxNewId,
  type CxCol,
  type CxLeadCtx,
  type CxRule,
} from "../cx-leads-model"
import { ORIGEM_COLOR, ORIGEM_LABEL, cmCompact, cmDate, cmDownload, type CmLeadScore } from "../cm-meta"
import type { CmDataset, CmDatasetLead } from "@/lib/comercial/types"
import { resolveAreaLabel, toAreaOptions, useAreasStore } from "@/lib/areas/store"
import { resolveEtapaLabel, toStageOptions, usePipelineStore } from "@/lib/comercial/pipeline/store"
import { CmKanban } from "../CmKanban"

const CX_LEADSVIEW_LS = "lexia-cx-leadsview-v1"
const PAGE = 100

export interface LeadInject { etapa?: string; origem?: string; campId?: number | null; nonce: number }
export interface LastImport { fonte: string; data: string; novos: number; atualizados: number; campanhas?: number }

interface LeadsViewCfg {
  mode: "tabela" | "quadro"
  vis: Record<string, boolean>
  sort: { col: string; dir: "asc" | "desc" }
  group: string
  rules: CxRule[]
  combinator: "E" | "OU"
}
const defaultCfg = (): LeadsViewCfg => ({
  mode: "tabela",
  vis: Object.fromEntries(CX_COLS.filter((c) => c.def).map((c) => [c.key, true])),
  sort: { col: "dataEntrada", dir: "desc" },
  group: "",
  rules: [],
  combinator: "E",
})

interface StageOpt { key: string; nome: string; cor: string | null }

// ---------- filter builder popover ----------
function CxFilterBuilder({ rules, combinator, onChange, onCombinator, ctx }: {
  rules: CxRule[]
  combinator: "E" | "OU"
  onChange: (rules: CxRule[]) => void
  onCombinator: (c: "E" | "OU") => void
  ctx: CxLeadCtx
}) {
  const addRule = () => onChange([...rules, { id: cxNewId("r"), col: "nome", op: "contains", value: "", value2: "", values: [] }])
  const upd = (id: string, patch: Partial<CxRule>) => onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const del = (id: string) => onChange(rules.filter((r) => r.id !== id))
  const active = rules.filter((r) => r.col && r.op)

  return (
    <CxMenu align="left" minWidth={470} trigger={
      <button className={active.length ? "btn btn-primary" : "btn btn-secondary"} style={{ height: 34, fontSize: 12.5 }}><Icon name="filter" size={13} />Filtros{active.length ? ` · ${active.length}` : ""}</button>
    }>
      <div style={{ padding: 4, width: 462 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 10px" }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>Filtros combinados</span>
          {rules.length > 1 && (
            <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunken)", borderRadius: 7, padding: 2 }}>
              {(["E", "OU"] as const).map((c) => <button key={c} onClick={() => onCombinator(c)} style={{ height: 24, padding: "0 11px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, background: combinator === c ? "var(--surface)" : "transparent", color: combinator === c ? "var(--accent)" : "var(--text-muted)", boxShadow: combinator === c ? "var(--shadow-sm)" : "none" }}>{c}</button>)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 320, overflowY: "auto", padding: "0 2px" }}>
          {rules.length === 0 && <div style={{ fontSize: 12, color: "var(--text-subtle)", padding: "14px 6px", textAlign: "center" }}>Nenhuma regra. Adicione uma condição para filtrar a carteira.</div>}
          {rules.map((r, i) => {
            const col = CX_COL_MAP[r.col]
            const ops = CX_OPS[col ? col.type : "text"] ?? CX_OPS.text
            const isEnum = !!col && (col.type === "enum" || col.type === "stage" || col.type === "person")
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-subtle)", width: 22, flexShrink: 0, paddingTop: 10, textAlign: "right" }}>{i === 0 ? "Onde" : combinator}</span>
                <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <select className="input" value={r.col} onChange={(e) => { const nc = CX_COL_MAP[e.target.value]; const nops = CX_OPS[nc.type] ?? CX_OPS.text; upd(r.id, { col: e.target.value, op: nops[0].v, value: "", value2: "", values: [] }) }} style={{ height: 32, fontSize: 12, width: 120, appearance: "none", paddingRight: 20 }}>
                    {CX_COLS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                  <select className="input" value={r.op} onChange={(e) => upd(r.id, { op: e.target.value })} style={{ height: 32, fontSize: 12, width: 104, appearance: "none", paddingRight: 20 }}>
                    {ops.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                  {r.op !== "empty" && r.op !== "nempty" && (
                    isEnum ? (
                      <select className="input" value={r.values[0] ?? ""} onChange={(e) => upd(r.id, { values: e.target.value ? [e.target.value] : [] })} style={{ height: 32, fontSize: 12, minWidth: 120, flex: 1, appearance: "none", paddingRight: 20 }}>
                        <option value="">selecione…</option>
                        {cxEnumValues(r.col, ctx).map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    ) : (
                      <>
                        <input className="input" type={col && col.type === "date" ? "date" : col && (col.type === "num" || col.type === "money") ? "number" : "text"} value={r.value} onChange={(e) => upd(r.id, { value: e.target.value })} placeholder="valor" style={{ height: 32, fontSize: 12, minWidth: 90, flex: 1 }} />
                        {r.op === "between" && <input className="input" type={col && col.type === "date" ? "date" : "number"} value={r.value2} onChange={(e) => upd(r.id, { value2: e.target.value })} placeholder="e" style={{ height: 32, fontSize: 12, minWidth: 90, flex: 1 }} />}
                      </>
                    )
                  )}
                </div>
                <button className="btn btn-ghost" onClick={() => del(r.id)} style={{ width: 28, height: 32, padding: 0, flexShrink: 0 }}><Icon name="x" size={14} /></button>
              </div>
            )
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 9, paddingTop: 9, borderTop: "1px solid var(--border)" }}>
          <button className="btn btn-ghost" onClick={addRule} style={{ height: 30, fontSize: 12 }}><Icon name="plus" size={13} />Adicionar regra</button>
          {rules.length > 0 && <button className="btn btn-ghost" onClick={() => onChange([])} style={{ height: 30, fontSize: 12, color: "var(--text-muted)" }}>Limpar tudo</button>}
        </div>
      </div>
    </CxMenu>
  )
}

// ---------- column chooser ----------
function CxColumnChooser({ vis, onToggle }: { vis: Record<string, boolean>; onToggle: (k: string) => void }) {
  return (
    <CxMenu align="right" minWidth={210} trigger={<button className="btn btn-secondary" style={{ height: 34, fontSize: 12.5 }} title="Colunas visíveis"><Icon name="sliders" size={13} />Colunas</button>}>
      <div style={{ padding: 3 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "5px 9px 6px" }}>Colunas visíveis</div>
        <div style={{ maxHeight: 340, overflowY: "auto" }}>
          {CX_COLS.map((c) => (
            <label key={c.key} className={c.always ? "" : "cx-menu-row"} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 9px", borderRadius: 7, cursor: c.always ? "not-allowed" : "pointer", fontSize: 12.5, color: c.always ? "var(--text-subtle)" : "var(--text)" }}>
              <CxCheckbox checked={!!c.always || !!vis[c.key]} onChange={() => !c.always && onToggle(c.key)} />{c.label}{c.always && <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-subtle)" }}>fixa</span>}
            </label>
          ))}
        </div>
      </div>
    </CxMenu>
  )
}

// ---------- bulk edit bar ----------
function CxBulkBar({ count, stages, usuarios, areas, onMoveStage, onOwner, onTemp, onArea, onClear, onExport }: {
  count: number
  stages: StageOpt[]
  usuarios: CmDataset["usuarios"]
  areas: { id: string; label: string }[]
  onMoveStage: (k: string) => void
  onOwner: (id: number | null) => void
  onTemp: (t: string) => void
  onArea: (a: string) => void
  onClear: () => void
  onExport: () => void
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 15px", margin: "0 32px 8px", background: "var(--accent-soft)", border: "1px solid var(--border-gold)", borderRadius: "var(--r-sm)", flexShrink: 0, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent)" }}>{count} selecionado{count > 1 ? "s" : ""}</span>
      <div style={{ width: 1, height: 18, background: "var(--border-strong)" }} />
      <CxMenu align="left" minWidth={170} trigger={<button className="btn btn-secondary" style={{ height: 30, fontSize: 12 }}><Icon name="circleDot" size={13} />Etapa<Icon name="chevronDown" size={12} /></button>}>
        {(close) => <>
          <div style={{ fontSize: 10, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, padding: "5px 9px 3px" }}>Mover para</div>
          {stages.map((s) => <CxMenuItem key={s.key} onClick={() => { close(); onMoveStage(s.key) }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: s.cor ?? "#7C8AA5" }} />{s.nome}</CxMenuItem>)}
          <div style={{ fontSize: 10.5, color: "var(--text-subtle)", padding: "6px 9px 2px", lineHeight: 1.4 }}>Ganho/Perdido exigem o fluxo dedicado.</div>
        </>}
      </CxMenu>
      <CxMenu align="left" minWidth={180} trigger={<button className="btn btn-secondary" style={{ height: 30, fontSize: 12 }}><Icon name="user" size={13} />Responsável<Icon name="chevronDown" size={12} /></button>}>
        {(close) => <>
          {usuarios.map((p) => <CxMenuItem key={p.id} onClick={() => { close(); onOwner(p.id) }}><CxAvatar id={p.id} nome={p.nome} size={18} />{p.nome}</CxMenuItem>)}
          <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
          <CxMenuItem icon="minusCircle" tone="var(--text-muted)" onClick={() => { close(); onOwner(null) }}>Remover responsável</CxMenuItem>
        </>}
      </CxMenu>
      <CxMenu align="left" minWidth={150} trigger={<button className="btn btn-secondary" style={{ height: 30, fontSize: 12 }}><Icon name="flame" size={13} />Temperatura<Icon name="chevronDown" size={12} /></button>}>
        {(close) => CX_TEMPERATURAS.map((t) => <CxMenuItem key={t.key} onClick={() => { close(); onTemp(t.key) }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: t.color }} />{t.label}</CxMenuItem>)}
      </CxMenu>
      {areas.length > 0 && (
        <CxMenu align="left" minWidth={190} trigger={<button className="btn btn-secondary" style={{ height: 30, fontSize: 12 }}><Icon name="scale" size={13} />Área<Icon name="chevronDown" size={12} /></button>}>
          {(close) => <div style={{ maxHeight: 260, overflowY: "auto" }}>{areas.map((a) => <CxMenuItem key={a.id} onClick={() => { close(); onArea(a.id) }}>{a.label}</CxMenuItem>)}</div>}
        </CxMenu>
      )}
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <button className="btn btn-secondary" onClick={onExport} style={{ height: 30, fontSize: 12 }}><Icon name="download" size={12} />Exportar</button>
        <button className="btn btn-ghost" onClick={onClear} style={{ height: 30, fontSize: 12 }}>Cancelar</button>
      </div>
    </div>
  )
}

// ---------- stage move control (its own control, not free edit) ----------
export function CxStageControl({ lead, stages, onMove, onConvert, onLose }: {
  lead: CmDatasetLead
  stages: StageOpt[]
  onMove: (id: number, k: string) => void
  onConvert: (l: CmDatasetLead) => void
  onLose: (l: CmDatasetLead) => void
}) {
  return (
    <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-block" }}>
      <CxMenu align="left" minWidth={186} trigger={
        <button className="cx-stagebtn" style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }} title="Mover etapa"><CxStagePill etapa={lead.etapa} /><Icon name="chevronDown" size={12} style={{ color: "var(--text-subtle)" }} /></button>
      }>
        {(close) => <>
          <div style={{ fontSize: 10, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, padding: "5px 9px 3px" }}>Mover para</div>
          {stages.map((s) => <CxMenuItem key={s.key} onClick={() => { close(); onMove(lead.id, s.key) }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: s.cor ?? "#7C8AA5" }} />{s.nome}{lead.etapa === s.key && <Icon name="check" size={13} style={{ marginLeft: "auto", color: "var(--accent)" }} />}</CxMenuItem>)}
          <div style={{ height: 1, background: "var(--border)", margin: "5px 0" }} />
          {lead.etapa !== "ganho" && <CxMenuItem icon="handshake" tone="#2E9E5B" onClick={() => { close(); onConvert(lead) }}>Converter (ganho)</CxMenuItem>}
          {lead.etapa !== "perdido" && <CxMenuItem icon="x" danger onClick={() => { close(); onLose(lead) }}>Marcar como perdido</CxMenuItem>}
        </>}
      </CxMenu>
    </span>
  )
}

// ---------- one cell ----------
function CxCell({ l, col, ctx, usuarios, stages, onMove, onConvert, onLose }: {
  l: CmDatasetLead
  col: CxCol
  ctx: CxLeadCtx
  usuarios: CmDataset["usuarios"]
  stages: StageOpt[]
  onMove: (id: number, k: string) => void
  onConvert: (l: CmDatasetLead) => void
  onLose: (l: CmDatasetLead) => void
}) {
  const k = col.key
  const pad: React.CSSProperties = { padding: "11px 13px", textAlign: col.align ?? "left", whiteSpace: "nowrap" }
  const s = ctx.scores.get(l.id)
  switch (k) {
    case "nome": return <td style={pad}><span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{l.nome}</span></td>
    case "contato": return <td style={pad}><CxPhone value={l.contato} /></td>
    case "origem": return <td style={pad}><CxOriginChip label={ctx.origemLabel(l.origem)} color={ORIGEM_COLOR[l.origem] ?? "#7C8AA5"} /></td>
    case "campanha": return <td style={pad}><span style={{ fontSize: 12, color: l.campanhaId != null ? "var(--text-muted)" : "var(--text-subtle)" }}>{l.campanhaId != null ? ctx.campMap.get(l.campanhaId) ?? "—" : "—"}</span></td>
    case "etapa": return <td style={pad}><CxStageControl lead={l} stages={stages} onMove={onMove} onConvert={onConvert} onLose={onLose} /></td>
    case "area": return <td style={pad}><span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{ctx.areaLabel(l.area) || "—"}</span></td>
    case "responsavel": return <td style={pad}><CxOwner id={l.responsavelUserId} usuarios={usuarios} muted /></td>
    case "temperatura": return <td style={pad}><CxTempDot temp={l.temperatura} showLabel /></td>
    case "qualState": return <td style={pad}>{s ? <CxQualBadge state={s.estado} size="sm" /> : "—"}</td>
    case "fit": return <td style={pad}><CxNum size={12.5} color="var(--accent-strong)">{s?.fit ?? 0}</CxNum></td>
    case "engajamento": return <td style={pad}><CxNum size={12.5} color="#4A78C0">{s?.eng ?? 0}</CxNum></td>
    case "valorEstimado": return <td style={pad}><CxNum size={12.5} weight={500}>{cmCompact(l.valorEstimadoCents || 0)}</CxNum></td>
    case "valorContratado": return <td style={pad}><CxNum size={12.5} weight={500} color={l.valorContratadoCents ? "#2E9E5B" : "var(--text-subtle)"}>{l.valorContratadoCents ? cmCompact(l.valorContratadoCents) : "—"}</CxNum></td>
    case "dataEntrada": return <td style={pad}><CxNum size={12} weight={500} color="var(--text-muted)">{cmDate(l.dataEntrada)}</CxNum></td>
    case "proximaAcao": return <td style={pad}><CxNum size={12} weight={500} color="var(--text-muted)">{cmDate(l.proximaAcaoEm)}</CxNum></td>
    case "dataConv": return <td style={pad}><CxNum size={12} weight={500} color="var(--text-muted)">{cmDate(l.dataConv)}</CxNum></td>
    default: return <td style={pad}>—</td>
  }
}

// ---------- row ----------
// Memoized: useOptimisticRows.applyLocal only replaces the object identity of
// the ONE patched row, and the container passes stable (useCallback'd) cols/
// ctx/callbacks — so an unrelated row's props stay reference-equal across
// renders and React skips reconciling it entirely.
const CxLeadRow = React.memo(function CxLeadRow({ l, cols, ctx, usuarios, stages, selected, anySel, onSelect, onEdit, onMove, onConvert, onLose, onReopen, onMerge }: {
  l: CmDatasetLead
  cols: CxCol[]
  ctx: CxLeadCtx
  usuarios: CmDataset["usuarios"]
  stages: StageOpt[]
  selected: boolean
  anySel: boolean
  onSelect: (id: number) => void
  onEdit: (l: CmDatasetLead) => void
  onMove: (id: number, k: string) => void
  onConvert: (l: CmDatasetLead) => void
  onLose: (l: CmDatasetLead) => void
  onReopen: (id: number) => void
  onMerge: (l: CmDatasetLead) => void
}) {
  return (
    <tr className="cx-row" onClick={() => onEdit(l)} style={{ borderTop: "1px solid var(--border)", background: selected ? "var(--accent-soft)" : undefined, cursor: "pointer" }}>
      <td style={{ padding: "11px 8px 11px 16px", width: 30 }} onClick={(e) => e.stopPropagation()}>
        <span className={`cx-check${selected || anySel ? " on" : ""}`}><CxCheckbox checked={selected} onChange={() => onSelect(l.id)} /></span>
      </td>
      {cols.map((c) => <CxCell key={c.key} l={l} col={c} ctx={ctx} usuarios={usuarios} stages={stages} onMove={onMove} onConvert={onConvert} onLose={onLose} />)}
      <td style={{ padding: "11px 14px 11px 8px", textAlign: "right", width: 44 }} onClick={(e) => e.stopPropagation()}>
        <CxMenu align="right" minWidth={186} trigger={<button className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}><Icon name="moreHorizontal" size={15} /></button>}>
          {(close) => <>
            <CxMenuItem icon="edit" onClick={() => { close(); onEdit(l) }}>Editar lead</CxMenuItem>
            {l.etapa !== "ganho" && <CxMenuItem icon="handshake" tone="#2E9E5B" onClick={() => { close(); onConvert(l) }}>Converter</CxMenuItem>}
            <CxMenuItem icon="link2" onClick={() => { close(); onMerge(l) }}>Mesclar com cliente</CxMenuItem>
            {l.etapa !== "perdido" && <CxMenuItem icon="x" danger onClick={() => { close(); onLose(l) }}>Marcar como perdido</CxMenuItem>}
            {(l.etapa === "ganho" || l.etapa === "perdido") && <CxMenuItem icon="refreshCw" onClick={() => { close(); onReopen(l.id) }}>Reabrir lead</CxMenuItem>}
          </>}
        </CxMenu>
      </td>
    </tr>
  )
})

// ---------- table ----------
function CxLeadsTable({ rows, ctx, cfg, usuarios, stages, sel, setSel, shown, onShowMore, onToggleSort, onEdit, onMove, onConvert, onLose, onReopen, onMerge }: {
  rows: CmDatasetLead[]
  ctx: CxLeadCtx
  cfg: LeadsViewCfg
  usuarios: CmDataset["usuarios"]
  stages: StageOpt[]
  sel: Set<number>
  setSel: React.Dispatch<React.SetStateAction<Set<number>>>
  shown: number
  onShowMore: () => void
  onToggleSort: (col: string) => void
  onEdit: (l: CmDatasetLead) => void
  onMove: (id: number, k: string) => void
  onConvert: (l: CmDatasetLead) => void
  onLose: (l: CmDatasetLead) => void
  onReopen: (id: number) => void
  onMerge: (l: CmDatasetLead) => void
}) {
  const cols = useMemo(() => CX_COLS.filter((c) => c.always || cfg.vis[c.key]), [cfg.vis])
  const colSpan = cols.length + 2

  const toggle = useCallback((id: number) => setSel((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n }), [setSel])
  const allOn = rows.length > 0 && rows.every((r) => sel.has(r.id))
  const someOn = sel.size > 0 && !allOn
  const toggleAll = () => setSel((p) => { const n = new Set(p); if (allOn) rows.forEach((r) => n.delete(r.id)); else rows.forEach((r) => n.add(r.id)); return n })

  const groups = useMemo(() => {
    if (!cfg.group) return null
    const m = new Map<string, CmDatasetLead[]>()
    rows.forEach((l) => { const k = cxGroupKey(l, cfg.group, ctx); if (!m.has(k)) m.set(k, []); m.get(k)!.push(l) })
    return [...m.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  }, [rows, cfg.group, ctx])

  const renderRows = (list: CmDatasetLead[]) => list.map((l) => <CxLeadRow key={l.id} l={l} cols={cols} ctx={ctx} usuarios={usuarios} stages={stages} selected={sel.has(l.id)} anySel={sel.size > 0} onSelect={toggle} onEdit={onEdit} onMove={onMove} onConvert={onConvert} onLose={onLose} onReopen={onReopen} onMerge={onMerge} />)

  // Incremental render: `rows` (sorted/filtered) stays the FULL set — only
  // what's painted is capped by `shown`. Grouped mode spends a running budget
  // across groups in order so every group header still shows its true count/
  // sum, but rows stop once the budget runs out; "restantes" is always
  // derived from rows.length − renderedCount (never from `shown` itself, to
  // avoid off-by-one against groups that got cut mid-list).
  let body: React.ReactNode
  let renderedCount = 0
  if (groups) {
    let budget = shown
    body = groups.map(([gk, list]) => {
      const renderList = list.slice(0, Math.max(0, budget))
      budget -= renderList.length
      renderedCount += renderList.length
      const sum = list.reduce((a, l) => a + (l.valorEstimadoCents || 0), 0)
      return (
        <React.Fragment key={gk}>
          <tr style={{ background: "var(--bg-sunken)", borderTop: "1px solid var(--border)" }}>
            <td colSpan={colSpan} style={{ padding: "8px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{gk}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-subtle)", background: "var(--surface)", padding: "1px 7px", borderRadius: 999 }}>{list.length}</span>
                <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{cmCompact(sum)} estimado</span>
              </div>
            </td>
          </tr>
          {renderRows(renderList)}
        </React.Fragment>
      )
    })
  } else {
    const renderList = rows.slice(0, shown)
    renderedCount = renderList.length
    body = renderRows(renderList)
  }
  const remaining = rows.length - renderedCount

  return (
    <div className="card" style={{ padding: 0, overflow: "auto", width: "100%", maxWidth: 1360, margin: "0 auto", flex: 1, minHeight: 0 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: Math.max(760, cols.reduce((a, c) => a + (c.minW ?? 100), 90)) }}>
        <thead>
          <tr style={{ background: "var(--bg-soft)", position: "sticky", top: 0, zIndex: 2 }}>
            <th style={{ padding: "10px 8px 10px 16px", width: 30 }}>
              <span className={`cx-check${sel.size > 0 ? " on" : ""}`}><CxCheckbox checked={allOn} indeterminate={someOn} onChange={toggleAll} /></span>
            </th>
            {cols.map((c) => <CxTh key={c.key} align={c.align} onClick={c.sort ? () => onToggleSort(c.key) : undefined} sort={cfg.sort.col === c.key ? cfg.sort.dir : undefined}>{c.label}</CxTh>)}
            <CxTh align="right" w={44}></CxTh>
          </tr>
        </thead>
        <tbody>
          {body}
          {rows.length === 0 && <tr><td colSpan={colSpan} style={{ padding: "40px 16px" }}><CxEmpty icon="search" title="Nenhum lead encontrado" desc="Ajuste os filtros, a busca ou cadastre um novo lead." /></td></tr>}
        </tbody>
      </table>
      {remaining > 0 && (
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 16px", borderTop: "1px solid var(--border)" }}>
          <button className="btn btn-secondary" onClick={onShowMore} style={{ height: 34, fontSize: 12.5 }}>Mostrar mais ({remaining} restante{remaining > 1 ? "s" : ""})</button>
        </div>
      )}
    </div>
  )
}

// ---------- container ----------
export function CmLeads({ dataset, scores, hoje, injectFilter, lastImport, onNew, onConvert, onLose, onEdit, onMerge, onImport, onImportMap }: {
  dataset: CmDataset
  scores: Map<number, CmLeadScore>
  hoje: string
  injectFilter: LeadInject | null
  lastImport: LastImport | null
  onNew: () => void
  onConvert: (l: CmDatasetLead) => void
  onLose: (l: CmDatasetLead) => void
  onEdit: (l: CmDatasetLead) => void
  onMerge: (l: CmDatasetLead) => void
  onImport: () => void
  onImportMap: () => void
}) {
  const [cfg, setCfg] = useState<LeadsViewCfg>(() => {
    if (typeof window !== "undefined") {
      try {
        const s = localStorage.getItem(CX_LEADSVIEW_LS)
        if (s) return { ...defaultCfg(), ...(JSON.parse(s) as Partial<LeadsViewCfg>) }
      } catch { /* fall back to defaults */ }
    }
    return defaultCfg()
  })
  const [q, setQ] = useState("")
  const deferredQ = useDeferredValue(q)
  const [sel, setSel] = useState<Set<number>>(() => new Set())
  const [shown, setShown] = useState(PAGE)

  useEffect(() => { try { localStorage.setItem(CX_LEADSVIEW_LS, JSON.stringify(cfg)) } catch { /* quota/priv mode */ } }, [cfg])
  const patch = (p: Partial<LeadsViewCfg>) => setCfg((c) => ({ ...c, ...p }))
  const onShowMore = useCallback(() => setShown((n) => n + PAGE), [])

  // reset the incremental-render cap whenever the search/filter/sort/group
  // changes — derived DURING render (same sanctioned pattern as the
  // injectFilter/lastNonce handling below), not an effect, so the reset
  // commits in the same pass instead of a flash-of-stale-cap render.
  const resetSig: [string, CxRule[], "E" | "OU", LeadsViewCfg["sort"], string] = [deferredQ, cfg.rules, cfg.combinator, cfg.sort, cfg.group]
  const [lastResetSig, setLastResetSig] = useState(resetSig)
  if (resetSig.some((v, i) => v !== lastResetSig[i])) {
    setLastResetSig(resetSig)
    setShown(PAGE)
  }

  const storedAreas = useAreasStore((s) => s.areas)
  const areaOpts = useMemo(() => toAreaOptions(storedAreas), [storedAreas])
  const storedStages = usePipelineStore((s) => s.stages)
  const stages: StageOpt[] = useMemo(() => {
    const base = storedStages.length
      ? toStageOptions(storedStages)
      : [{ key: "novo", nome: "Novo", cor: "#7C8AA5", ordem: 0 }, { key: "contato", nome: "Contato", cor: "#4A78C0", ordem: 1 }, { key: "qualificado", nome: "Qualificado", cor: "#C0A147", ordem: 2 }, { key: "proposta", nome: "Proposta", cor: "#9A6FB0", ordem: 3 }]
    return base.map((s) => ({ key: s.key, nome: s.nome, cor: s.cor ?? null }))
  }, [storedStages])

  const getLeadId = useCallback((l: CmDatasetLead) => l.id, [])
  const optimistic = useOptimisticRows<CmDatasetLead>({
    initialRows: dataset.leads,
    getId: getLeadId,
    patchUrl: (id) => `/api/comercial/leads/${id}`,
    bulkUrl: "/api/comercial/leads/lote",
  })
  const { applyLocal } = optimistic

  const moveEtapa = useCallback((id: number, etapa: string) => {
    applyLocal(id, { etapa } as Partial<CmDatasetLead>)
    void apiSend(`/api/comercial/leads/${id}/etapa`, "POST", { etapa }).catch(() => toast("Erro ao mover etapa", { kind: "error" }))
  }, [applyLocal])
  const reopen = useCallback((id: number) => moveEtapa(id, "contato"), [moveEtapa])

  const ctx: CxLeadCtx = useMemo(() => ({
    campMap: new Map(dataset.campaigns.map((c) => [c.id, c.nome])),
    userMap: new Map(dataset.usuarios.map((u) => [u.id, u.nome])),
    stageLabel: (etapa) => resolveEtapaLabel(storedStages, etapa),
    areaLabel: (area) => (area ? resolveAreaLabel(storedAreas, area) : ""),
    origemLabel: (o) => ORIGEM_LABEL[o as keyof typeof ORIGEM_LABEL] ?? o,
    tempLabel: (t) => (t && CX_TEMP_MAP[t] ? CX_TEMP_MAP[t].label : ""),
    scores,
    enums: {
      origem: Object.values(ORIGEM_LABEL),
      area: areaOpts.map((a) => a.label),
      temperatura: CX_TEMPERATURAS.map((t) => t.label),
      etapa: [...stages.map((s) => s.nome), "Ganho", "Perdido"],
      responsavel: dataset.usuarios.map((u) => u.nome),
    },
  }), [dataset.campaigns, dataset.usuarios, storedStages, storedAreas, areaOpts, stages, scores])

  // navigation injection from other tabs → force table + apply filter.
  // Adjusted DURING render (sanctioned "derive state from props" pattern) so
  // the injected view paints in the same pass, no effect round-trip.
  const [lastNonce, setLastNonce] = useState(0)
  if (injectFilter && injectFilter.nonce !== lastNonce) {
    setLastNonce(injectFilter.nonce)
    const rules: CxRule[] = []
    if (injectFilter.campId != null) rules.push({ id: cxNewId("r"), col: "campanha", op: "in", value: "", value2: "", values: [ctx.campMap.get(injectFilter.campId) ?? ""] })
    if (injectFilter.etapa && injectFilter.etapa !== "todas") rules.push({ id: cxNewId("r"), col: "etapa", op: "in", value: "", value2: "", values: [ctx.stageLabel(injectFilter.etapa)] })
    if (injectFilter.origem) rules.push({ id: cxNewId("r"), col: "origem", op: "in", value: "", value2: "", values: [ctx.origemLabel(injectFilter.origem)] })
    setCfg((c) => ({ ...c, mode: "tabela", rules, combinator: "E" }))
    setQ("")
  }

  const filtered = useMemo(() => {
    let r = optimistic.rows
    if (deferredQ) { const s = deferredQ.toLowerCase(); r = r.filter((l) => `${l.nome} ${l.contato ?? ""} ${l.cliente ?? ""}`.toLowerCase().includes(s)) }
    r = cxApplyRules(r, cfg.rules, cfg.combinator, ctx)
    return r
  }, [optimistic.rows, deferredQ, cfg.rules, cfg.combinator, ctx])

  const sorted = useMemo(() => {
    const { col, dir } = cfg.sort
    const s = [...filtered]
    s.sort((a, b) => {
      let av = cxColValue(a, col, ctx)
      let bv = cxColValue(b, col, ctx)
      const cc = CX_COL_MAP[col]
      if (cc && (cc.type === "num" || cc.type === "money")) {
        const an = Number(av) || 0
        const bn = Number(bv) || 0
        return dir === "asc" ? an - bn : bn - an
      }
      av = String(av ?? "")
      bv = String(bv ?? "")
      return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return s
  }, [filtered, cfg.sort, ctx])

  // keep selection within current rows — derived (never pruned via effect);
  // stale ids from filtered-out rows simply stop counting.
  const rowIds = useMemo(() => new Set(filtered.map((r) => r.id)), [filtered])
  const selVisible = useMemo(() => new Set([...sel].filter((id) => rowIds.has(id))), [sel, rowIds])
  const clearSel = () => setSel(new Set())

  const visKeys = CX_COLS.filter((c) => cfg.vis[c.key]).map((c) => c.key)
  const exportCSV = (rows: CmDatasetLead[]) => cmDownload(`lexia-leads-${hoje}.csv`, cxLeadsViewCSV(rows, visKeys, ctx), "text/csv")
  const doExport = () => exportCSV(selVisible.size ? sorted.filter((r) => selVisible.has(r.id)) : sorted)
  const bulk = (field: string, value: unknown) => { void optimistic.bulkApply([...selVisible], field, value); clearSel() }

  const toggleSort = (col: string) => patch({ sort: { col, dir: cfg.sort.col === col && cfg.sort.dir === "asc" ? "desc" : "asc" } })
  const activeFilters = cfg.rules.filter((r) => r.col && r.op).length + (q ? 1 : 0)

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 32px 12px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", flexShrink: 0 }}>
        <CxSegmented size="sm" value={cfg.mode} onChange={(m) => patch({ mode: m as "tabela" | "quadro" })} options={[{ value: "tabela", label: "Tabela", icon: "list" }, { value: "quadro", label: "Quadro", icon: "kanban" }]} />
        <div style={{ position: "relative", width: 216 }}>
          <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)" }}><Icon name="search" size={14} /></div>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, contato, cliente…" style={{ paddingLeft: 34, height: 34, fontSize: 13 }} />
        </div>
        <CxFilterBuilder rules={cfg.rules} combinator={cfg.combinator} onChange={(rules) => patch({ rules })} onCombinator={(combinator) => patch({ combinator })} ctx={ctx} />
        <CxMenu align="left" minWidth={190} trigger={<button className={cfg.group ? "btn btn-primary" : "btn btn-secondary"} style={{ height: 34, fontSize: 12.5 }} disabled={cfg.mode === "quadro"}><Icon name="layoutGrid" size={13} />{cfg.group ? `Agrupado: ${CX_COL_MAP[cfg.group]?.label ?? cfg.group}` : "Agrupar"}</button>}>
          {(close) => <>
            <CxMenuItem icon="minus" onClick={() => { close(); patch({ group: "" }) }} tone={cfg.group ? "var(--text)" : "var(--accent)"}>Sem agrupamento</CxMenuItem>
            <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
            {CX_GROUPABLE.map((c) => <CxMenuItem key={c.key} onClick={() => { close(); patch({ group: c.key }) }} tone={cfg.group === c.key ? "var(--accent)" : "var(--text)"}>{c.label}</CxMenuItem>)}
          </>}
        </CxMenu>
        {cfg.mode === "tabela" && <CxColumnChooser vis={cfg.vis} onToggle={(k) => patch({ vis: { ...cfg.vis, [k]: !cfg.vis[k] } })} />}
        <span style={{ fontSize: 12, color: "var(--text-subtle)", whiteSpace: "nowrap" }}>{filtered.length} de {optimistic.rows.length}{activeFilters ? ` · ${activeFilters} filtro${activeFilters > 1 ? "s" : ""}` : ""}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 9, flexWrap: "wrap" }}>
          <CxMenu align="right" minWidth={280} trigger={<button className="btn btn-secondary" style={{ height: 34, fontSize: 12.5 }}><Icon name="upload" size={13} />Importar<Icon name="chevronDown" size={12} /></button>}>
            {(close) => <>
              <button className="cx-menu-item" onClick={() => { close(); onImport() }} style={{ alignItems: "flex-start", flexDirection: "column", gap: 2, padding: "9px 10px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}><Icon name="repeat" size={13} />Fonte de captação (Genions)</span>
                <span style={{ fontSize: 11, color: "var(--text-subtle)", paddingLeft: 21 }}>CSV padrão · resumo automático</span>
              </button>
              <button className="cx-menu-item" onClick={() => { close(); onImportMap() }} style={{ alignItems: "flex-start", flexDirection: "column", gap: 2, padding: "9px 10px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}><Icon name="braces" size={13} />Planilha com mapeamento</span>
                <span style={{ fontSize: 11, color: "var(--text-subtle)", paddingLeft: 21 }}>Qualquer CSV · mapeie as colunas</span>
              </button>
            </>}
          </CxMenu>
          <button className="btn btn-secondary" onClick={doExport} style={{ height: 34, fontSize: 12.5 }}><Icon name="download" size={13} />Exportar CSV</button>
          <button className="btn btn-primary" onClick={onNew} style={{ height: 34, fontSize: 12.5 }}><Icon name="userPlus" size={14} />Novo lead</button>
        </div>
      </div>

      {/* last import hint */}
      {lastImport && (
        <div style={{ padding: "9px 32px 0", display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>
          <Icon name="history" size={13} style={{ color: "var(--text-subtle)" }} />
          Última importação · {lastImport.fonte} · {cmDate(lastImport.data)} · <strong style={{ color: "var(--text)", fontWeight: 500 }}>{lastImport.novos}</strong> novos, <strong style={{ color: "var(--text)", fontWeight: 500 }}>{lastImport.atualizados}</strong> atualizados{lastImport.campanhas ? <>, <strong style={{ color: "var(--text)", fontWeight: 500 }}>{lastImport.campanhas}</strong> campanhas criadas</> : null}
        </div>
      )}

      {selVisible.size > 0 && cfg.mode === "tabela" && (
        <div style={{ marginTop: 10 }}>
          <CxBulkBar
            count={selVisible.size}
            stages={stages}
            usuarios={dataset.usuarios}
            areas={areaOpts.map((a) => ({ id: a.id, label: a.label }))}
            onMoveStage={(k) => bulk("etapa", k)}
            onOwner={(id) => bulk("responsavelUserId", id)}
            onTemp={(t) => bulk("temperatura", t)}
            onArea={(a) => bulk("area", a)}
            onClear={clearSel}
            onExport={doExport}
          />
        </div>
      )}

      {/* body */}
      <div style={{ flex: 1, minHeight: 0, overflow: cfg.mode === "quadro" ? "auto" : "hidden", padding: cfg.mode === "quadro" ? "16px 0 0 32px" : "14px 32px", display: cfg.mode === "tabela" ? "flex" : "block", flexDirection: "column" }}>
        {cfg.mode === "tabela"
          ? <CxLeadsTable rows={sorted} ctx={ctx} cfg={cfg} usuarios={dataset.usuarios} stages={stages} sel={selVisible} setSel={setSel} shown={shown} onShowMore={onShowMore} onToggleSort={toggleSort} onEdit={onEdit} onMove={moveEtapa} onConvert={onConvert} onLose={onLose} onReopen={reopen} onMerge={onMerge} />
          : <CmKanban leads={filtered} stages={stages} usuarios={dataset.usuarios} campMap={ctx.campMap} scores={scores} onMove={moveEtapa} onConvert={onConvert} onLose={onLose} onEdit={onEdit} />}
      </div>
    </div>
  )
}
