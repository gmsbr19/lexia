"use client"

// LexIA · Comercial — Tab 4 · Leads (full carteira; period does not restrict).
import { useEffect, useMemo, useRef, useState } from "react"
import { Icon } from "../cm-icons"
import { CmEmpty, CmNum, CmOriginChip, CmSelect, CmStagePill } from "../cm-kit"
import { CM_STAGES, ORIGEM_LABEL, ORIGENS, cmCompact, cmDate, cmDownload, cmLeadsCSV, cmToday } from "../cm-meta"
import type { CmDataset, CmDatasetLead, LeadEtapa } from "@/lib/comercial/types"
import { toAreaOptions, useAreasStore } from "@/lib/areas/store"
import { lexGlassStrong } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"

const PER_PAGE = 12

export interface LeadInject { etapa?: string; origem?: string; campId?: number | null; nonce: number }
export interface LastImport { data: string; novos: number; atualizados: number }

function Check({ checked, indeterminate, onChange }: { checked: boolean; indeterminate?: boolean; onChange: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate }, [indeterminate])
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: "pointer" }} />
}

function StageMenu({ lead, onMove, onConvert, onLose }: { lead: CmDatasetLead; onMove: (id: number, k: LeadEtapa) => void; onConvert: (l: CmDatasetLead) => void; onLose: (l: CmDatasetLead) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }} title="Mover etapa">
        <CmStagePill etapa={lead.etapa} /><Icon name="chevronDown" size={12} style={{ color: "var(--text-subtle)" }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div className={`card ${lexGlassStrong}`} style={{ position: "absolute", left: 0, top: 28, zIndex: 41, minWidth: 178, padding: 6, ...glassElevation("0 12px 28px rgba(2,13,37,0.16)") }}>
            <div style={{ fontSize: 11, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500, padding: "5px 9px 3px" }}>Mover para</div>
            {CM_STAGES.slice(0, 4).map((s) => (
              <button key={s.key} className="cm-menu-item" onClick={() => { setOpen(false); onMove(lead.id, s.key) }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />{s.label}{lead.etapa === s.key && <Icon name="check" size={13} style={{ marginLeft: "auto", color: "var(--accent)" }} />}
              </button>
            ))}
            <div style={{ height: 1, background: "var(--border)", margin: "5px 0" }} />
            <button className="cm-menu-item" onClick={() => { setOpen(false); onConvert(lead) }} style={{ color: "#2E9E5B" }}><Icon name="handshake" size={13} />Converter (ganho)</button>
            <button className="cm-menu-item" onClick={() => { setOpen(false); onLose(lead) }} style={{ color: "var(--cm-neg,#C0492F)" }}><Icon name="x" size={13} />Marcar como perdido</button>
          </div>
        </>
      )}
    </div>
  )
}

function LeadRow({ l, campMap, selected, onSelect, onMove, onConvert, onLose, onEdit, onReopen, onMerge }: {
  l: CmDatasetLead; campMap: Map<number, string>; selected: boolean; onSelect: (id: number) => void
  onMove: (id: number, k: LeadEtapa) => void; onConvert: (l: CmDatasetLead) => void; onLose: (l: CmDatasetLead) => void; onEdit: (l: CmDatasetLead) => void; onReopen: (id: number) => void; onMerge: (l: CmDatasetLead) => void
}) {
  const [menu, setMenu] = useState(false)
  return (
    <tr className="cm-row" style={{ borderTop: "1px solid var(--border)", background: selected ? "var(--accent-soft)" : undefined }}>
      <td style={{ padding: "11px 8px 11px 16px", width: 30 }}><Check checked={selected} onChange={() => onSelect(l.id)} /></td>
      <td style={{ padding: "11px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap" }}>{l.nome}</div>
        <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 1, fontFamily: "var(--font-mono)" }}>{l.contato || "—"}</div>
      </td>
      <td style={{ padding: "11px 14px" }}><CmOriginChip origem={l.origem} /></td>
      <td style={{ padding: "11px 14px" }}><span style={{ fontSize: 12, color: l.campanhaId ? "var(--text-muted)" : "var(--text-subtle)", whiteSpace: "nowrap" }}>{l.campanhaId ? campMap.get(l.campanhaId) || "—" : "—"}</span></td>
      <td style={{ padding: "11px 14px" }}><StageMenu lead={l} onMove={onMove} onConvert={onConvert} onLose={onLose} /></td>
      <td style={{ padding: "11px 14px", textAlign: "right" }}><CmNum size={12} weight={500}>{cmCompact(l.valorEstimadoCents)}</CmNum></td>
      <td style={{ padding: "11px 14px" }}><CmNum size={12} weight={500} color="var(--text-muted)">{cmDate(l.dataEntrada)}</CmNum></td>
      <td style={{ padding: "11px 14px" }}>
        {l.etapa === "ganho" ? (
          <div><div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap" }}>{l.cliente || l.nome}</div><div style={{ fontSize: 12, color: "var(--cm-pos,#2E9E5B)", fontWeight: 500, fontFamily: "var(--font-mono)" }}>{cmCompact(l.valorContratadoCents || 0)}</div></div>
        ) : l.etapa === "perdido" ? (
          <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{l.motivoPerda || "—"}</span>
        ) : (
          <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>—</span>
        )}
      </td>
      <td style={{ padding: "11px 16px 11px 8px", textAlign: "right" }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <button className="btn btn-ghost" onClick={() => setMenu((m) => !m)} style={{ width: 28, height: 28, padding: 0 }}><Icon name="moreHorizontal" size={15} /></button>
          {menu && (
            <>
              <div onClick={() => setMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div className={`card ${lexGlassStrong}`} style={{ position: "absolute", right: 0, top: 32, zIndex: 41, minWidth: 178, padding: 6, ...glassElevation("0 12px 28px rgba(2,13,37,0.16)") }}>
                <button className="cm-menu-item" onClick={() => { setMenu(false); onEdit(l) }}><Icon name="edit" size={13} />Editar lead</button>
                {l.etapa !== "ganho" && <button className="cm-menu-item" onClick={() => { setMenu(false); onConvert(l) }} style={{ color: "#2E9E5B" }}><Icon name="handshake" size={13} />Converter</button>}
                <button className="cm-menu-item" onClick={() => { setMenu(false); onMerge(l) }}><Icon name="gitMerge" size={13} />Mesclar com cliente</button>
                {l.etapa !== "perdido" && <button className="cm-menu-item" onClick={() => { setMenu(false); onLose(l) }} style={{ color: "var(--cm-neg,#C0492F)" }}><Icon name="x" size={13} />Marcar perdido</button>}
                {(l.etapa === "ganho" || l.etapa === "perdido") && <button className="cm-menu-item" onClick={() => { setMenu(false); onReopen(l.id) }}><Icon name="refreshCw" size={13} />Reabrir lead</button>}
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

export function CmLeads({ dataset, injectFilter, lastImport, onNew, onMove, onConvert, onLose, onEdit, onReopen, onBulkMove, onImport, onMerge }: {
  dataset: CmDataset; injectFilter: LeadInject | null; lastImport: LastImport | null
  onNew: () => void; onMove: (id: number, k: LeadEtapa) => void; onConvert: (l: CmDatasetLead) => void; onLose: (l: CmDatasetLead) => void; onEdit: (l: CmDatasetLead) => void; onReopen: (id: number) => void; onBulkMove: (ids: number[], k: LeadEtapa) => void; onImport: () => void; onMerge: (l: CmDatasetLead) => void
}) {
  const storedAreas = useAreasStore((s) => s.areas)
  const areaOpts = useMemo(() => toAreaOptions(storedAreas), [storedAreas])
  const [origem, setOrigem] = useState("")
  const [etapa, setEtapa] = useState("todas")
  const [campId, setCampId] = useState("")
  const [areaFilter, setAreaFilter] = useState("")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(0)
  const [sel, setSel] = useState<Set<number>>(() => new Set())

  const campMap = useMemo(() => new Map(dataset.campaigns.map((c) => [c.id, c.nome])), [dataset.campaigns])

  useEffect(() => {
    if (!injectFilter) return
    setEtapa(injectFilter.etapa || "todas")
    setOrigem(injectFilter.origem || "")
    setCampId(injectFilter.campId != null ? String(injectFilter.campId) : "")
    setQ("")
    setPage(0)
  }, [injectFilter?.nonce]) // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => dataset.leads.filter((l) => {
    if (origem && l.origem !== origem) return false
    if (etapa !== "todas" && l.etapa !== etapa) return false
    if (campId && l.campanhaId !== Number(campId)) return false
    if (areaFilter && l.area !== areaFilter) return false
    if (q) {
      const s = `${l.nome} ${l.contato ?? ""} ${l.cliente ?? ""}`.toLowerCase()
      if (!s.includes(q.toLowerCase())) return false
    }
    return true
  }), [dataset.leads, origem, etapa, campId, areaFilter, q])

  useEffect(() => { setPage(0) }, [origem, etapa, campId, q])
  const pageCount = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const pageRows = rows.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  const rowIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows])
  useEffect(() => { setSel((prev) => { const n = new Set([...prev].filter((id) => rowIds.has(id))); return n.size === prev.size ? prev : n }) }, [rowIds])
  const toggle = (id: number) => setSel((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const pageAllOn = pageRows.length > 0 && pageRows.every((r) => sel.has(r.id))
  const someOn = sel.size > 0 && !pageAllOn
  const togglePage = () => setSel((p) => { const n = new Set(p); if (pageAllOn) pageRows.forEach((r) => n.delete(r.id)); else pageRows.forEach((r) => n.add(r.id)); return n })
  const clearSel = () => setSel(new Set())

  const hasFilter = !!(origem || etapa !== "todas" || campId || areaFilter || q)
  const exportSel = () => { const list = sel.size ? rows.filter((r) => sel.has(r.id)) : rows; cmDownload(`lexia-leads-${cmToday()}.csv`, cmLeadsCSV(list, dataset.campaigns), "text/csv") }

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 40px 12px", flexWrap: "wrap", flexShrink: 0 }}>
        <div style={{ position: "relative", flex: "0 1 240px", minWidth: 160 }}>
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)" }}><Icon name="search" size={14} /></div>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar lead..." style={{ paddingLeft: 36, height: 34, fontSize: 13 }} />
        </div>
        <div style={{ width: 150 }}><CmSelect value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Origem" options={ORIGENS.map((o) => ({ value: o, label: ORIGEM_LABEL[o] }))} /></div>
        <div style={{ width: 168 }}><CmSelect value={etapa} onChange={(e) => setEtapa(e.target.value)} options={[{ value: "todas", label: "Todas as etapas" }, ...CM_STAGES.map((s) => ({ value: s.key, label: s.label })), { value: "perdido", label: "Perdido" }]} /></div>
        <div style={{ width: 188 }}><CmSelect value={campId} onChange={(e) => setCampId(e.target.value)} options={[{ value: "", label: "Todas as campanhas" }, ...dataset.campaigns.map((c) => ({ value: String(c.id), label: c.nome }))]} /></div>
        {areaOpts.length > 0 && <div style={{ width: 160 }}><CmSelect value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} options={[{ value: "", label: "Todas as áreas" }, ...areaOpts.map((a) => ({ value: a.id, label: a.label }))]} /></div>}
        {hasFilter && <button className="btn btn-ghost" onClick={() => { setOrigem(""); setEtapa("todas"); setCampId(""); setAreaFilter(""); setQ("") }} style={{ height: 34, fontSize: 12 }}>Limpar</button>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 9 }}>
          <button className="btn btn-secondary" onClick={onImport} style={{ height: 34, fontSize: 12 }}><Icon name="upload" size={13} />Importar</button>
          <button className="btn btn-secondary" onClick={exportSel} style={{ height: 34, fontSize: 12 }}><Icon name="download" size={13} />Exportar CSV</button>
          <button className="btn btn-primary" onClick={onNew} style={{ height: 34, fontSize: 12 }}><Icon name="userPlus" size={14} />Novo lead</button>
        </div>
      </div>

      {lastImport && (
        <div style={{ margin: "0 40px 8px", display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: "var(--text-muted)" }}>
          <Icon name="history" size={13} style={{ color: "var(--text-subtle)" }} />
          Última importação do Genions · {cmDate(lastImport.data)} · <strong style={{ color: "var(--text)", fontWeight: 500 }}>{lastImport.novos}</strong> novos, <strong style={{ color: "var(--text)", fontWeight: 500 }}>{lastImport.atualizados}</strong> atualizados
        </div>
      )}

      {sel.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", margin: "0 40px 6px", background: "var(--accent-soft)", border: "1px solid var(--accent)", borderRadius: "var(--r-sm)", flexShrink: 0, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--accent)" }}>{sel.size} selecionado{sel.size > 1 ? "s" : ""}</span>
          <div style={{ width: 1, height: 18, background: "var(--border-strong)" }} />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Mover para:</span>
          {CM_STAGES.slice(0, 4).map((s) => (
            <button key={s.key} className="btn btn-secondary" onClick={() => { onBulkMove([...sel], s.key); clearSel() }} style={{ height: 28, fontSize: 12, padding: "0 10px" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color }} />{s.label}</button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={exportSel} style={{ height: 28, fontSize: 12 }}><Icon name="download" size={12} />Exportar</button>
            <button className="btn btn-ghost" onClick={clearSel} style={{ height: 28, fontSize: 12 }}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "0 40px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="card" style={{ padding: 0, overflow: "visible" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-soft)", position: "sticky", top: 0, zIndex: 2 }}>
                  <th style={{ padding: "11px 8px 11px 16px", width: 30 }}><Check checked={pageAllOn} indeterminate={someOn} onChange={togglePage} /></th>
                  {["Lead", "Origem", "Campanha", "Etapa"].map((h) => <th key={h} style={{ textAlign: "left", padding: "11px 14px", fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>)}
                  <th style={{ textAlign: "right", padding: "11px 14px", fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Estimado</th>
                  {["Entrada", "Cliente / motivo"].map((h) => <th key={h} style={{ textAlign: "left", padding: "11px 14px", fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>)}
                  <th />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((l) => <LeadRow key={l.id} l={l} campMap={campMap} selected={sel.has(l.id)} onSelect={toggle} onMove={onMove} onConvert={onConvert} onLose={onLose} onEdit={onEdit} onReopen={onReopen} onMerge={onMerge} />)}
                {rows.length === 0 && <tr><td colSpan={9} style={{ padding: "48px 16px" }}><CmEmpty icon="search" title="Nenhum lead encontrado" desc="Ajuste os filtros ou cadastre um novo lead." /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ height: 16 }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 40px", borderTop: "1px solid var(--border-strong)", background: "var(--bg-soft)", flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{rows.length} {rows.length === 1 ? "lead" : "leads"}{hasFilter ? " no filtro" : ""}</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn btn-ghost" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} style={{ width: 30, height: 30, padding: 0, opacity: page === 0 ? 0.4 : 1 }}><Icon name="chevronLeft" size={16} /></button>
          <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 500, minWidth: 92, textAlign: "center", fontFeatureSettings: '"tnum"' }}>Página {page + 1} de {pageCount}</span>
          <button className="btn btn-ghost" disabled={page >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} style={{ width: 30, height: 30, padding: 0, opacity: page >= pageCount - 1 ? 0.4 : 1 }}><Icon name="chevronRight" size={16} /></button>
        </div>
      </div>
    </div>
  )
}
