"use client"

// LexIA · Comercial — Tab 5 · Exportar (CSV/JSON downloads + Relatório com IA).
import { useMemo, useRef, useState } from "react"
import { Icon, type CmIconName } from "../cm-icons"
import { CmCardTitle, CmFrame } from "../cm-kit"
import { cmBuildPrompt, cmExportCSV, cmExportJSON, cmDownload, cmPeriodPayload, type CmRef, type CmScope, type Periodo } from "../cm-meta"
import type { CmDataset } from "@/lib/comercial/types"

function ExportItem({ icon, label, desc }: { icon: CmIconName; label: string; desc: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0" }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-sunken)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={icon} size={15} /></div>
      <div><div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{label}</div><div style={{ fontSize: 11, color: "var(--text-subtle)" }}>{desc}</div></div>
    </div>
  )
}

export function CmExportar({ dataset, ref0, period, scope }: { dataset: CmDataset; ref0: CmRef; period: Periodo; scope: CmScope }) {
  const payload = useMemo(() => cmPeriodPayload(dataset, ref0, period), [dataset, ref0, period])
  const prompt = useMemo(() => cmBuildPrompt(payload), [payload])
  const [copied, setCopied] = useState(false)
  // LGPD: ON by default — the CSV gets attached to external LLMs.
  const [redact, setRedact] = useState(true)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const slug = scope.title.toLowerCase().replace(/[^a-z0-9]/g, "-")
  const copy = () => {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(prompt).catch(() => {})
    else if (taRef.current) { taRef.current.select(); document.execCommand("copy") }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  const dlCSV = () => cmDownload(`lexia-comercial-${slug}.csv`, cmExportCSV(dataset, ref0, period, redact), "text/csv")
  const dlJSON = () => cmDownload(`lexia-comercial-${slug}.json`, cmExportJSON(dataset, ref0, period, redact), "application/json")

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
      <CmFrame>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 500, letterSpacing: "-0.025em", color: "var(--text)" }}>Exportar · {scope.title}</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Baixe os dados do período ou gere um relatório executivo com IA.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: 20, alignItems: "start" }}>
          <div className="card" style={{ padding: "20px 22px" }}>
            <CmCardTitle title="Baixar dados do período" sub={`Tudo que está em ${scope.title} · ${scope.sub}`} />
            <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "4px 0", margin: "4px 0 18px" }}>
              <ExportItem icon="barChart" label="KPIs" desc="Leads, ROAS, ROI, CAC, CPL, ticket médio…" />
              <ExportItem icon="funnel" label="Funil" desc={`${payload.funil.stages.length} etapas · conversão por estágio`} />
              <ExportItem icon="megaphone" label="Campanhas" desc={`${payload.campanhas.length} campanhas com métricas`} />
              <ExportItem icon="pieChart" label="Canais" desc="Google Ads · Meta Ads · Orgânico/Indicação" />
              <ExportItem icon="users" label="Lista de leads" desc={`${payload.leads.length} leads do período`} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>
              <input type="checkbox" checked={redact} onChange={(e) => setRedact(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
              Remover dados pessoais dos leads (LGPD) — nomes viram iniciais; telefone/e-mail saem do arquivo
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-primary" onClick={dlCSV} style={{ flex: 1, height: 40 }}><Icon name="fileSpreadsheet" size={15} />Baixar CSV</button>
              <button className="btn btn-secondary" onClick={dlJSON} style={{ flex: 1, height: 40 }}><Icon name="braces" size={15} />Baixar JSON</button>
            </div>
          </div>

          <div className="card" style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="sparkles" size={16} strokeWidth={1.9} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>Relatório com IA</div>
                <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>Copie o prompt e cole no Claude com o CSV anexado</div>
              </div>
              <button className="btn btn-gold" onClick={copy} style={{ height: 32, fontSize: 12 }}>
                <Icon name={copied ? "check" : "copy"} size={13} />{copied ? "Copiado!" : "Copiar prompt"}
              </button>
            </div>
            <textarea ref={taRef} readOnly value={prompt} className="textarea" style={{ width: "100%", height: 290, resize: "none", fontSize: 12, lineHeight: 1.55, fontFamily: "var(--font-mono)", color: "var(--text-muted)", background: "var(--bg-soft)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
              <Icon name="paperclip" size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
              Dica: anexe o <strong style={{ color: "var(--text)", fontWeight: 500 }}>CSV baixado ao lado</strong> antes de enviar — o relatório fica muito mais preciso.
            </div>
          </div>
        </div>
      </CmFrame>
    </div>
  )
}
