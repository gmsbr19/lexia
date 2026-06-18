"use client"

// LexIA · Comercial — Tab 3 · Campanhas (table + row actions).
import { useMemo, useState } from "react"
import { Icon } from "../cm-icons"
import { CmCardTitle, CmEmpty, CmFrame, CmNum, CmSegmented, CmStatusChip, CmTh } from "../cm-kit"
import { cmCampaignStats, cmCompact, cmInt, cmRoas, type CampaignStat, type CmRef, type CmScope, type Periodo } from "../cm-meta"
import type { CampanhaStatus, CmDataset, CmDatasetCampaign, Plataforma } from "@/lib/comercial/types"

function CampRow({ c, verFin, onGasto, onLeads, onEdit }: { c: CampaignStat; verFin: boolean; onGasto: (c: CmDatasetCampaign) => void; onLeads: (c: CmDatasetCampaign) => void; onEdit: (c: CmDatasetCampaign) => void }) {
  const [menu, setMenu] = useState(false)
  const roiColor = c.roi == null ? "var(--text-subtle)" : c.roi >= 0 ? "var(--cm-pos,#2E9E5B)" : "var(--cm-neg,#C0492F)"
  const roasColor = c.roas == null ? "var(--text-subtle)" : c.roas >= 1 ? "var(--cm-pos,#2E9E5B)" : "var(--cm-neg,#C0492F)"
  return (
    <tr className="cm-row" style={{ borderTop: "1px solid var(--border)" }}>
      <td style={{ padding: "12px 14px 12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: c.plataforma === "google_ads" ? "#3B7DDD" : "#8B5CF6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, flexShrink: 0 }}>{c.plataforma === "google_ads" ? "G" : "M"}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap" }}>{c.nome}</div>
            <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 1 }}>{c.plataforma === "google_ads" ? "Google Ads" : "Meta Ads"}{c.objetivo ? ` · ${c.objetivo}` : ""}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "12px 14px" }}><CmStatusChip status={c.status} /></td>
      {verFin && <td style={{ padding: "12px 14px", textAlign: "right" }}><CmNum size={12} weight={500} color="var(--text-muted)">{c.investimento ? cmCompact(c.investimento) : "—"}</CmNum></td>}
      <td style={{ padding: "12px 14px", textAlign: "right" }}><CmNum size={12}>{cmInt(c.leads)}</CmNum></td>
      <td style={{ padding: "12px 14px", textAlign: "right" }}><CmNum size={12}>{cmInt(c.conversoes)}</CmNum></td>
      {verFin && (
        <>
          <td style={{ padding: "12px 14px", textAlign: "right" }}><CmNum size={12} color="var(--cm-pos,#2E9E5B)">{c.valorContratado ? cmCompact(c.valorContratado) : "—"}</CmNum></td>
          <td style={{ padding: "12px 14px", textAlign: "right" }}><CmNum size={12} weight={500} color="var(--text-muted)">{c.cpl == null ? "—" : cmCompact(c.cpl)}</CmNum></td>
          <td style={{ padding: "12px 14px", textAlign: "right" }}><CmNum size={12} weight={500} color="var(--text-muted)">{c.cac == null ? "—" : cmCompact(c.cac)}</CmNum></td>
          <td style={{ padding: "12px 14px", textAlign: "right" }}><CmNum size={13} color={roasColor}>{cmRoas(c.roas)}</CmNum></td>
          <td style={{ padding: "12px 14px", textAlign: "right" }}><CmNum size={12} color={roiColor}>{c.roi == null ? "—" : `${c.roi >= 0 ? "+" : "−"}${Math.abs(c.roi).toFixed(0)}%`}</CmNum></td>
        </>
      )}
      <td style={{ padding: "12px 16px 12px 8px", textAlign: "right" }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <button className="btn btn-ghost" onClick={() => setMenu((m) => !m)} style={{ width: 28, height: 28, padding: 0 }}><Icon name="moreHorizontal" size={15} /></button>
          {menu && (
            <>
              <div onClick={() => setMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div className="card" style={{ position: "absolute", right: 0, top: 32, zIndex: 41, minWidth: 184, padding: 6, background: "var(--lex-acrylic-strong)", backdropFilter: "var(--lex-blur)", WebkitBackdropFilter: "var(--lex-blur)", border: "1px solid var(--lex-acrylic-border)", boxShadow: "var(--lex-glass-shadow), 0 12px 28px rgba(2,13,37,0.16), inset 0 1px 0 rgba(255,255,255,0.16)" }}>
                <button className="cm-menu-item" onClick={() => { setMenu(false); onGasto(c) }}><Icon name="coins" size={13} />Registrar gasto</button>
                <button className="cm-menu-item" onClick={() => { setMenu(false); onLeads(c) }}><Icon name="users" size={13} />Ver leads da campanha</button>
                <button className="cm-menu-item" onClick={() => { setMenu(false); onEdit(c) }}><Icon name="edit" size={13} />Editar campanha</button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

export function CmCampanhas({ dataset, ref0, period, scope, verFin, onNew, onGasto, onEdit, onLeads, onImport }: { dataset: CmDataset; ref0: CmRef; period: Periodo; scope: CmScope; verFin: boolean; onNew: () => void; onGasto: (c: CmDatasetCampaign) => void; onEdit: (c: CmDatasetCampaign) => void; onLeads: (c: CmDatasetCampaign) => void; onImport: () => void }) {
  const [fStatus, setFStatus] = useState("todas")
  const [fPlat, setFPlat] = useState("todas")
  const stats = useMemo(() => cmCampaignStats(dataset, ref0, period), [dataset, ref0, period])
  const rows = stats.filter((c) => (fStatus === "todas" || c.status === (fStatus as CampanhaStatus)) && (fPlat === "todas" || c.plataforma === (fPlat as Plataforma)))
  const tot = rows.reduce((a, c) => ({ inv: a.inv + c.investimento, leads: a.leads + c.leads, conv: a.conv + c.conversoes, val: a.val + c.valorContratado }), { inv: 0, leads: 0, conv: 0, val: 0 })
  const totRoas = tot.inv ? tot.val / tot.inv : null

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <CmFrame pad="22px 40px 12px">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 25, fontWeight: 500, letterSpacing: "-0.025em", color: "var(--text)" }}>Campanhas · {scope.title}</h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>{rows.length} campanhas{verFin ? ` · ${cmCompact(tot.inv)} investidos · ROAS médio ${cmRoas(totRoas)}` : ""}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <button className="btn btn-secondary" onClick={onImport} style={{ height: 34, fontSize: 12 }}><Icon name="upload" size={13} />Importar Meta</button>
            <button className="btn btn-primary" onClick={onNew} style={{ height: 34, fontSize: 12 }}><Icon name="plus" size={14} />Nova campanha</button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <CmSegmented size="sm" value={fStatus} onChange={setFStatus} options={[{ value: "todas", label: "Todas" }, { value: "ativa", label: "Ativas" }, { value: "pausada", label: "Pausadas" }, { value: "encerrada", label: "Encerradas" }]} />
          <CmSegmented size="sm" value={fPlat} onChange={setFPlat} options={[{ value: "todas", label: "Plataformas" }, { value: "google_ads", label: "Google" }, { value: "meta_ads", label: "Meta" }]} />
        </div>
      </CmFrame>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "0 40px 40px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="card" style={{ padding: 0, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
              <thead>
                <tr style={{ background: "var(--bg-soft)", position: "sticky", top: 0, zIndex: 2 }}>
                  <CmTh>Campanha</CmTh><CmTh>Status</CmTh>
                  {verFin && <CmTh align="right">Investido</CmTh>}
                  <CmTh align="right">Leads</CmTh><CmTh align="right">Conv.</CmTh>
                  {verFin && (
                    <>
                      <CmTh align="right">Contratado</CmTh><CmTh align="right">CPL</CmTh><CmTh align="right">CAC</CmTh>
                      <CmTh align="right">ROAS</CmTh><CmTh align="right">ROI</CmTh>
                    </>
                  )}
                  <CmTh align="right" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => <CampRow key={c.id} c={c} verFin={verFin} onGasto={onGasto} onLeads={onLeads} onEdit={onEdit} />)}
                {rows.length === 0 && <tr><td colSpan={verFin ? 11 : 5} style={{ padding: "48px 16px" }}><CmEmpty icon="megaphone" title="Nenhuma campanha" desc="Nenhuma campanha corresponde aos filtros selecionados." /></td></tr>}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--border-strong)", background: "var(--bg-soft)" }}>
                    <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 500, color: "var(--text)" }}>Total · {rows.length}</td>
                    <td />
                    {verFin && <td style={{ padding: "12px 14px", textAlign: "right" }}><CmNum size={12} weight={500}>{cmCompact(tot.inv)}</CmNum></td>}
                    <td style={{ padding: "12px 14px", textAlign: "right" }}><CmNum size={12} weight={500}>{cmInt(tot.leads)}</CmNum></td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }}><CmNum size={12} weight={500}>{cmInt(tot.conv)}</CmNum></td>
                    {verFin && (
                      <>
                        <td style={{ padding: "12px 14px", textAlign: "right" }}><CmNum size={12} weight={500} color="var(--cm-pos,#2E9E5B)">{cmCompact(tot.val)}</CmNum></td>
                        <td /><td />
                        <td style={{ padding: "12px 14px", textAlign: "right" }}><CmNum size={13} weight={500} color={(totRoas ?? 0) >= 1 ? "var(--cm-pos,#2E9E5B)" : "var(--cm-neg,#C0492F)"}>{cmRoas(totRoas)}</CmNum></td>
                        <td />
                      </>
                    )}
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
