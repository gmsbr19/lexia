"use client"

// LexIA · Comercial v2 — Tela · Campanhas (ported faithfully from the design
// handoff src/com2/cx-campanhas.jsx). Period-scoped: the period bar lives
// INSIDE this screen's header. Financial columns & totals disappear entirely
// for roles without financial visibility (verFin=false), with an explanatory
// note below the table.
import { useMemo, useState } from "react"
import { Icon } from "../cm-icons"
import { CxEmpty, CxMenu, CxMenuItem, CxNum, CxPeriodBar, CxPlatformMark, CxSegmented, CxSelect, CxStatusChip, CxTh } from "../cx-kit"
import { CAMPANHA_STATUS_LABEL, cmCampaignStats, cmCompact, cmInt, cmRoas, type CampaignStat, type CmRef, type CmScope, type Periodo } from "../cm-meta"
import type { CampanhaStatus, CmDataset, CmDatasetCampaign, Plataforma } from "@/lib/comercial/types"
import { resolveAreaLabel, toAreaOptions, useAreasStore } from "@/lib/areas/store"

const PLATAFORMA_NOME: Record<string, string> = { google_ads: "Google Ads", meta_ads: "Meta Ads", outro: "Outro" }

function CxCampRow({ c, verFin, areaLabel, onGasto, onLeads, onEdit }: { c: CampaignStat; verFin: boolean; areaLabel: string | null; onGasto: (c: CmDatasetCampaign) => void; onLeads: (c: CmDatasetCampaign) => void; onEdit: (c: CmDatasetCampaign) => void }) {
  const roiColor = c.roi == null ? "var(--text-subtle)" : c.roi >= 0 ? "#2E9E5B" : "var(--crit)"
  const roasColor = c.roas == null ? "var(--text-subtle)" : c.roas >= 1 ? "#2E9E5B" : "var(--crit)"
  const cell: React.CSSProperties = { padding: "12px 13px", textAlign: "right" }
  return (
    <tr className="cx-row" style={{ borderTop: "1px solid var(--border)" }}>
      <td style={{ padding: "12px 13px 12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CxPlatformMark plataforma={c.plataforma} size={28} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap" }}>{c.nome}</div>
            <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 1 }}>{PLATAFORMA_NOME[c.plataforma]}{c.objetivo ? ` · ${c.objetivo}` : ""}{areaLabel ? ` · ${areaLabel}` : ""}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "12px 13px" }}><CxStatusChip status={c.status} label={CAMPANHA_STATUS_LABEL[c.status]} /></td>
      {verFin && <td style={cell}><CxNum size={12.5} weight={500} color="var(--text-muted)">{c.investimento ? cmCompact(c.investimento) : "—"}</CxNum></td>}
      <td style={cell}><CxNum size={12.5}>{cmInt(c.leads)}</CxNum></td>
      <td style={cell}><CxNum size={12.5}>{cmInt(c.conversoes)}</CxNum></td>
      {verFin && <td style={cell}><CxNum size={12.5} color={c.valorContratado ? "#2E9E5B" : "var(--text-subtle)"}>{c.valorContratado ? cmCompact(c.valorContratado) : "—"}</CxNum></td>}
      {verFin && <td style={cell}><CxNum size={12} weight={500} color="var(--text-muted)">{c.cpl == null ? "—" : cmCompact(c.cpl)}</CxNum></td>}
      {verFin && <td style={cell}><CxNum size={12} weight={500} color="var(--text-muted)">{c.cac == null ? "—" : cmCompact(c.cac)}</CxNum></td>}
      {verFin && <td style={cell}><CxNum size={13} color={roasColor}>{cmRoas(c.roas)}</CxNum></td>}
      {verFin && <td style={cell}><CxNum size={12.5} color={roiColor}>{c.roi == null ? "—" : `${c.roi >= 0 ? "+" : "−"}${Math.abs(c.roi).toFixed(0)}%`}</CxNum></td>}
      <td style={{ padding: "12px 16px 12px 8px", textAlign: "right", width: 44 }}>
        <CxMenu align="right" minWidth={198} trigger={<button className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}><Icon name="moreHorizontal" size={15} /></button>}>
          {(close) => <>
            <CxMenuItem icon="coins" onClick={() => { close(); onGasto(c) }}>Registrar gasto</CxMenuItem>
            <CxMenuItem icon="users" onClick={() => { close(); onLeads(c) }}>Ver leads da campanha</CxMenuItem>
            <CxMenuItem icon="edit" onClick={() => { close(); onEdit(c) }}>Editar campanha</CxMenuItem>
          </>}
        </CxMenu>
      </td>
    </tr>
  )
}

export function CmCampanhas({ dataset, ref0, setRef, period, setPeriod, scope, verFin, onNew, onGasto, onEdit, onLeads, onImport }: {
  dataset: CmDataset
  ref0: CmRef
  setRef: (r: CmRef) => void
  period: Periodo
  setPeriod: (p: Periodo) => void
  scope: CmScope
  verFin: boolean
  onNew: () => void
  onGasto: (c: CmDatasetCampaign) => void
  onEdit: (c: CmDatasetCampaign) => void
  onLeads: (c: CmDatasetCampaign) => void
  onImport: () => void
}) {
  const storedAreas = useAreasStore((s) => s.areas)
  const areaOpts = useMemo(() => toAreaOptions(storedAreas), [storedAreas])
  const [fStatus, setFStatus] = useState("todas")
  const [fPlat, setFPlat] = useState("todas")
  const [fArea, setFArea] = useState("todas")

  const stats = useMemo(() => cmCampaignStats(dataset, ref0, period), [dataset, ref0, period])
  const areasPresentes = useMemo(() => [...new Set(dataset.campaigns.map((c) => c.area).filter((a): a is string => !!a))].sort(), [dataset.campaigns])
  const rows = stats.filter((c) => (fStatus === "todas" || c.status === (fStatus as CampanhaStatus)) && (fPlat === "todas" || c.plataforma === (fPlat as Plataforma)) && (fArea === "todas" || c.area === fArea))
  const tot = rows.reduce((a, c) => ({ inv: a.inv + c.investimento, leads: a.leads + c.leads, conv: a.conv + c.conversoes, val: a.val + c.valorContratado }), { inv: 0, leads: 0, conv: 0, val: 0 })
  const totRoas = tot.inv ? tot.val / tot.inv : null
  const totRoi = tot.inv ? ((tot.val - tot.inv) / tot.inv) * 100 : null
  const finColsCount = verFin ? 6 : 0

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {/* header */}
      <div style={{ padding: "15px 32px 13px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", rowGap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>Campanhas</h1>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>{rows.length} {rows.length === 1 ? "campanha" : "campanhas"} no período{verFin ? ` · ${cmCompact(tot.inv)} investidos · ROAS médio ${cmRoas(totRoas)}` : ""}</p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <button className="btn btn-secondary" onClick={onImport} style={{ height: 34, fontSize: 12.5 }}><CxPlatformMark plataforma="meta_ads" size={16} />Importar Meta</button>
            <button className="btn btn-primary" onClick={onNew} style={{ height: 34, fontSize: 12.5 }}><Icon name="plus" size={14} />Nova campanha</button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 13, flexWrap: "wrap", rowGap: 10 }}>
          <CxPeriodBar ref0={ref0} setRef={setRef} period={period} setPeriod={setPeriod} scopeLabel={scope} />
          <div style={{ width: 1, height: 22, background: "var(--border)" }} />
          <CxSegmented size="sm" value={fStatus} onChange={setFStatus} options={[{ value: "todas", label: "Todas" }, { value: "ativa", label: "Ativas" }, { value: "pausada", label: "Pausadas" }, { value: "encerrada", label: "Encerradas" }]} />
          <CxSegmented size="sm" value={fPlat} onChange={setFPlat} options={[{ value: "todas", label: "Plataformas" }, { value: "google_ads", label: "Google" }, { value: "meta_ads", label: "Meta" }]} />
          {areasPresentes.length > 0 && (
            <div style={{ width: 190 }}>
              <CxSelect value={fArea} onChange={(e) => setFArea(e.target.value)} options={[{ value: "todas", label: "Todas as áreas" }, ...areasPresentes.map((a) => ({ value: a, label: areaOpts.find((o) => o.id === a)?.label ?? a }))]} />
            </div>
          )}
        </div>
      </div>

      {/* table */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "16px 32px 32px" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <div className="card" style={{ padding: 0, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: verFin ? 1040 : 640 }}>
              <thead>
                <tr style={{ background: "var(--bg-soft)", position: "sticky", top: 0, zIndex: 2 }}>
                  <CxTh>Campanha</CxTh><CxTh>Status</CxTh>
                  {verFin && <CxTh align="right">Investido</CxTh>}
                  <CxTh align="right">Leads</CxTh><CxTh align="right">Conv.</CxTh>
                  {verFin && <CxTh align="right">Contratado</CxTh>}
                  {verFin && <CxTh align="right">CPL</CxTh>}
                  {verFin && <CxTh align="right">CAC</CxTh>}
                  {verFin && <CxTh align="right">ROAS</CxTh>}
                  {verFin && <CxTh align="right">ROI</CxTh>}
                  <CxTh align="right" w={44}></CxTh>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => <CxCampRow key={c.id} c={c} verFin={verFin} areaLabel={c.area ? resolveAreaLabel(storedAreas, c.area) : null} onGasto={onGasto} onLeads={onLeads} onEdit={onEdit} />)}
                {rows.length === 0 && <tr><td colSpan={4 + finColsCount + 1} style={{ padding: "44px 16px" }}><CxEmpty icon="megaphone" title="Nenhuma campanha" desc="Nenhuma campanha corresponde aos filtros e ao período selecionados." /></td></tr>}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--border-strong)", background: "var(--bg-soft)" }}>
                    <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Total · {rows.length}</td>
                    <td></td>
                    {verFin && <td style={{ padding: "12px 13px", textAlign: "right" }}><CxNum size={12.5} weight={500}>{cmCompact(tot.inv)}</CxNum></td>}
                    <td style={{ padding: "12px 13px", textAlign: "right" }}><CxNum size={12.5} weight={500}>{cmInt(tot.leads)}</CxNum></td>
                    <td style={{ padding: "12px 13px", textAlign: "right" }}><CxNum size={12.5} weight={500}>{cmInt(tot.conv)}</CxNum></td>
                    {verFin && <td style={{ padding: "12px 13px", textAlign: "right" }}><CxNum size={12.5} weight={500} color="#2E9E5B">{cmCompact(tot.val)}</CxNum></td>}
                    {verFin && <td></td>}
                    {verFin && <td></td>}
                    {verFin && <td style={{ padding: "12px 13px", textAlign: "right" }}><CxNum size={13} weight={500} color={(totRoas ?? 0) >= 1 ? "#2E9E5B" : "var(--crit)"}>{cmRoas(totRoas)}</CxNum></td>}
                    {verFin && <td style={{ padding: "12px 13px", textAlign: "right" }}><CxNum size={12.5} weight={500} color={totRoi == null ? "var(--text-subtle)" : totRoi >= 0 ? "#2E9E5B" : "var(--crit)"}>{totRoi == null ? "—" : `${totRoi >= 0 ? "+" : "−"}${Math.abs(totRoi).toFixed(0)}%`}</CxNum></td>}
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {!verFin && <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 12, color: "var(--text-subtle)" }}><Icon name="eye" size={13} />Valores financeiros (investimento, contratado, CPL, CAC, ROAS, ROI) ocultos para o seu perfil de acesso.</div>}
        </div>
      </div>
    </div>
  )
}
