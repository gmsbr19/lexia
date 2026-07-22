"use client"

// LexIA · Comercial v2 — Tela · Follow-up (ported faithfully from the design
// handoff src/com2/cx-followup.jsx). A daily work queue for the sales team:
// only OPEN opportunities, auto-sorted by the priority score (fit +
// engajamento + temporal urgency, from score.ts via cmLeadScores). Quick
// actions surface contextually from the lead's state; "Registrar toque" is the
// primary action; auto-lost leads collapse into their own section. Not
// filtered by period.
import React, { useMemo, useState } from "react"
import { Icon } from "../cm-icons"
import {
  CX_QUAL,
  CxCanalIcons,
  CxEmpty,
  CxMeter,
  CxOwner,
  CxPhone,
  CxQualBadge,
  CxSelect,
  CxStagePill,
  CxTempDot,
  cxDaysTo,
  cxRelDay,
} from "../cx-kit"
import { cmDate, type CmLeadScore, type Estado } from "../cm-meta"
import { resolveEtapaColor, usePipelineStore } from "@/lib/comercial/pipeline/store"
import { resolveAreaLabel, useAreasStore } from "@/lib/areas/store"
import type { CmDataset, CmDatasetLead } from "@/lib/comercial/types"

export type CxQuickKind = "compareceu" | "noshow" | "proposta"
const FOLLOW_CAP = 30

// Contextual quick actions — surface only what the lead's current state allows.
// A meeting on the agenda enables Compareceu/No-show; a proposal-stage lead (or
// a sent contract) enables "Respondeu proposta".
function cxLeadQuickActions(lead: CmDatasetLead, score: CmLeadScore | undefined) {
  const out: { kind: CxQuickKind; label: string; icon: "checkCircle" | "minusCircle" | "thumbsUp" }[] = []
  if (score?.reuniaoMarcada) {
    out.push({ kind: "compareceu", label: "Compareceu", icon: "checkCircle" })
    out.push({ kind: "noshow", label: "No-show", icon: "minusCircle" })
  }
  if (lead.etapa === "proposta" || l0(lead)) out.push({ kind: "proposta", label: "Respondeu proposta", icon: "thumbsUp" })
  return out
}
const l0 = (l: CmDatasetLead) => !!l.contratoEnviadoEm

// ---------- one lead card ----------
// Memoized: stageColor/areaLabel arrive pre-resolved from the container (one
// zustand subscription total instead of two per card) so a row whose lead
// object is unchanged skips reconciliation entirely.
const CxFollowCard = React.memo(function CxFollowCard({ lead, score, rank, hoje, usuarios, stageColor, areaLabel, onEdit, onToque, onQuick, onToggleContrato }: {
  lead: CmDatasetLead
  score: CmLeadScore
  rank: number
  hoje: string
  usuarios: CmDataset["usuarios"]
  stageColor: string
  areaLabel: string | null
  onEdit: (l: CmDatasetLead) => void
  onToque: (l: CmDatasetLead) => void
  onQuick: (l: CmDatasetLead, kind: CxQuickKind) => void
  onToggleContrato: (l: CmDatasetLead) => void
}) {
  const proximo = score.proximoToque
  const dias = proximo ? cxDaysTo(proximo.dataISO, hoje) : null
  const overdue = dias != null && dias <= 0
  const quick = cxLeadQuickActions(lead, score)
  const contratoEnviado = !!lead.contratoEnviadoEm
  const showContrato = lead.etapa === "proposta" || contratoEnviado

  return (
    <div className="cx-follow-card card" style={{ padding: 0, overflow: "hidden", display: "grid", gridTemplateColumns: "4px 1fr", borderColor: overdue ? "var(--border-gold)" : "var(--border)" }}>
      <div style={{ background: overdue ? "var(--crit)" : stageColor }} />
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* header row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, width: 26, flexShrink: 0, paddingTop: 1 }}>
            <span style={{ fontSize: 10, color: "var(--text-subtle)", fontWeight: 600 }}>#{rank}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, color: "var(--accent-strong)", fontFeatureSettings: '"tnum"', letterSpacing: "-0.02em" }}>{Math.round(score.prioridade)}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              <button onClick={() => onEdit(lead)} className="cx-linkname" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 15, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em", textAlign: "left" }}>{lead.nome}</button>
              <CxQualBadge state={score.estado} size="sm" />
              <CxStagePill etapa={lead.etapa} />
              {score.reuniaoMarcada && <span title="Reunião futura confirmada na agenda" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "#2E9E5B", background: "rgba(46,158,91,0.13)", padding: "2px 8px", borderRadius: 6 }}><Icon name="calendarClock" size={12} />Reunião marcada</span>}
              {contratoEnviado && <span title="Contrato enviado para assinatura" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "var(--accent)", background: "var(--accent-soft)", padding: "2px 8px", borderRadius: 6 }}><Icon name="fileCheck" size={12} />Contrato enviado</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
              <CxOwner id={lead.responsavelUserId} usuarios={usuarios} muted />
              <span style={{ color: "var(--border-strong)" }}>·</span>
              <CxTempDot temp={lead.temperatura} showLabel />
              {areaLabel && (
                <>
                  <span style={{ color: "var(--border-strong)" }}>·</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{areaLabel}</span>
                </>
              )}
              <span style={{ color: "var(--border-strong)" }}>·</span>
              <CxPhone value={lead.contato} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, minWidth: 118 }}>
            <CxMeter label="Fit" value={score.fit} tone="gold" />
            <CxMeter label="Eng" value={score.eng} tone="blue" />
          </div>
        </div>

        {/* touch row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "9px 12px", background: overdue ? "var(--crit-soft)" : "var(--bg-soft)", borderRadius: "var(--r-sm)", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <Icon name="calendarClock" size={15} style={{ color: overdue ? "var(--crit)" : "var(--text-muted)", flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Próximo toque</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: overdue ? "var(--crit)" : "var(--text)" }}>{proximo ? `${cxRelDay(proximo.dataISO, hoje)} · ${cmDate(proximo.dataISO)}` : "—"}</span>
            {overdue && <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--crit)", textTransform: "uppercase", letterSpacing: "0.05em", background: "var(--crit-soft)", padding: "1px 6px", borderRadius: 5 }}>Vencido</span>}
            {proximo && <CxCanalIcons canais={proximo.canais} />}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--text-subtle)" }}>
            <Icon name="history" size={13} />Último contato {score.ultimoContatoISO ? cmDate(score.ultimoContatoISO) : "—"}
          </div>
        </div>

        {/* actions row — quick actions surface contextually from the lead's state */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => onToque(lead)} style={{ height: 32, fontSize: 12.5, padding: "0 13px" }}><Icon name="mousePointerClick" size={14} />Registrar toque</button>
          {quick.length > 0 && <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 2px" }} />}
          {quick.map((a) => <button key={a.kind} className="btn btn-secondary" onClick={() => onQuick(lead, a.kind)} style={{ height: 32, fontSize: 12, padding: "0 11px" }}><Icon name={a.icon} size={13} />{a.label}</button>)}
          {showContrato && (
            <button onClick={() => onToggleContrato(lead)} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8, height: 32, padding: "0 11px 0 9px", borderRadius: 8, cursor: "pointer", border: `1px solid ${contratoEnviado ? "var(--border-gold)" : "var(--border)"}`, background: contratoEnviado ? "var(--accent-soft)" : "var(--surface)", color: contratoEnviado ? "var(--accent)" : "var(--text-muted)", fontSize: 12, fontWeight: 500 }}>
              <span style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${contratoEnviado ? "var(--accent-strong)" : "var(--border-strong)"}`, background: contratoEnviado ? "var(--accent-strong)" : "transparent", color: "var(--brand-navy)" }}>{contratoEnviado && <Icon name="check" size={11} strokeWidth={3} />}</span>
              Contrato enviado
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

// ---------- Follow-up screen ----------
export function CmFollowUp({ dataset, scores, hoje, onEdit, onToque, onQuick, onToggleContrato, onReabrir }: {
  dataset: CmDataset
  scores: Map<number, CmLeadScore>
  hoje: string
  onEdit: (l: CmDatasetLead) => void
  onToque: (l: CmDatasetLead) => void
  onQuick: (l: CmDatasetLead, kind: CxQuickKind) => void
  onToggleContrato: (l: CmDatasetLead) => void
  onReabrir: (l: CmDatasetLead) => void
}) {
  const stages = usePipelineStore((s) => s.stages)
  const areas = useAreasStore((s) => s.areas)
  const [resp, setResp] = useState("todos")
  const [qual, setQual] = useState("todos")
  const [venc, setVenc] = useState(false)
  const [showLost, setShowLost] = useState(false)
  const [shown, setShown] = useState(FOLLOW_CAP)

  const abertos = useMemo(() => dataset.leads.filter((l) => l.etapa !== "ganho" && l.etapa !== "perdido"), [dataset.leads])
  const perdidosAuto = useMemo(() => dataset.leads.filter((l) => l.etapa === "perdido" && l.perdidoAutomatico), [dataset.leads])

  const filtered = useMemo(() => {
    const r = abertos.filter((l) => {
      const s = scores.get(l.id)
      if (resp !== "todos") {
        const key = l.responsavelUserId != null ? String(l.responsavelUserId) : "none"
        if (key !== resp) return false
      }
      if (qual !== "todos" && s?.estado !== qual) return false
      if (venc) {
        const d = s?.proximoToque ? cxDaysTo(s.proximoToque.dataISO, hoje) ?? 99 : 99
        if (d > 0) return false
      }
      return true
    })
    return [...r].sort((a, b) => (scores.get(b.id)?.prioridade ?? 0) - (scores.get(a.id)?.prioridade ?? 0))
  }, [abertos, resp, qual, venc, scores, hoje])

  // reset the incremental-render cap on filter change — derived during
  // render (see CmLeads.tsx for the same pattern), not an effect.
  const followSig: [string, string, boolean] = [resp, qual, venc]
  const [lastFollowSig, setLastFollowSig] = useState(followSig)
  if (followSig.some((v, i) => v !== lastFollowSig[i])) {
    setLastFollowSig(followSig)
    setShown(FOLLOW_CAP)
  }
  const visible = filtered.slice(0, shown)
  const remaining = filtered.length - visible.length

  const vencCount = abertos.filter((l) => {
    const p = scores.get(l.id)?.proximoToque
    return !!p && (cxDaysTo(p.dataISO, hoje) ?? 99) <= 0
  }).length

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 32px 14px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", flexShrink: 0 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>Follow-up</h1>
          <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>{filtered.length} {filtered.length === 1 ? "lead" : "leads"} para trabalhar · ordenados por prioridade</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <div style={{ width: 172 }}>
            <CxSelect value={resp} onChange={(e) => setResp(e.target.value)} options={[{ value: "todos", label: "Todos os responsáveis" }, ...dataset.usuarios.map((u) => ({ value: String(u.id), label: u.nome })), { value: "none", label: "Sem responsável" }]} />
          </div>
          <div style={{ width: 158 }}>
            <CxSelect value={qual} onChange={(e) => setQual(e.target.value)} options={[{ value: "todos", label: "Toda qualificação" }, ...(Object.keys(CX_QUAL) as Estado[]).map((k) => ({ value: k, label: CX_QUAL[k].label }))]} />
          </div>
          <button onClick={() => setVenc((v) => !v)} className={venc ? "btn btn-primary" : "btn btn-secondary"} style={{ height: 38, fontSize: 12.5 }}><Icon name="alertTriangle" size={14} />Só vencidos{vencCount ? ` · ${vencCount}` : ""}</button>
        </div>
      </div>

      {/* list */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "18px 32px 40px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {visible.map((l, i) => {
            const s = scores.get(l.id)
            if (!s) return null
            const stageColor = resolveEtapaColor(stages, l.etapa) ?? "#7C8AA5"
            const areaLabel = l.area ? resolveAreaLabel(areas, l.area) : null
            return <CxFollowCard key={l.id} lead={l} score={s} rank={i + 1} hoje={hoje} usuarios={dataset.usuarios} stageColor={stageColor} areaLabel={areaLabel} onEdit={onEdit} onToque={onToque} onQuick={onQuick} onToggleContrato={onToggleContrato} />
          })}
          {filtered.length === 0 && <div className="card"><CxEmpty icon="checkCircle" title="Nada na fila agora" desc="Nenhum lead aberto corresponde aos filtros atuais. Ajuste os filtros ou aproveite a caixa limpa." /></div>}
          {remaining > 0 && (
            <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 8px" }}>
              <button className="btn btn-secondary" onClick={() => setShown((n) => n + FOLLOW_CAP)} style={{ height: 34, fontSize: 12.5 }}>Mostrar mais ({remaining} restante{remaining > 1 ? "s" : ""})</button>
            </div>
          )}

          {/* auto-lost section */}
          {perdidosAuto.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <button onClick={() => setShowLost((s) => !s)} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", background: "none", border: "none", cursor: "pointer", padding: "6px 2px", textAlign: "left" }}>
                <Icon name="chevronRight" size={15} style={{ color: "var(--text-subtle)", transform: showLost ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Perdidos automaticamente</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-subtle)", background: "var(--bg-sunken)", padding: "1px 7px", borderRadius: 999 }}>{perdidosAuto.length}</span>
                <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>· fora da fila principal pelas regras de cadência</span>
              </button>
              {showLost && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {perdidosAuto.map((l) => (
                    <div key={l.id} className="card" style={{ padding: "12px 15px", display: "flex", alignItems: "center", gap: 13, opacity: 0.9 }}>
                      <Icon name="minusCircle" size={17} style={{ color: "var(--crit)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <button onClick={() => onEdit(l)} className="cx-linkname" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{l.nome}</button>
                        <div style={{ fontSize: 12, color: "var(--crit)", marginTop: 1 }}>{l.motivoPerda}</div>
                      </div>
                      <CxOwner id={l.responsavelUserId} usuarios={dataset.usuarios} muted />
                      <button className="btn btn-secondary" onClick={() => onReabrir(l)} style={{ height: 30, fontSize: 12 }}><Icon name="refreshCw" size={13} />Reabrir</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
