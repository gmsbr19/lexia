"use client"

// LexIA · Comercial v2 — modals, ported faithfully from the design handoff
// (src/com2/cx-lead-editor.jsx, cx-leads-flows.jsx, cx-campanhas-modals.jsx,
// cx-followup.jsx CxToqueModal). Each collects form state and calls an async
// onSubmit (which performs the real API call in ComercialApp) — unlike the
// prototype, saves await the network and surface errors inline.
import { useEffect, useMemo, useState } from "react"
import { apiSend, newRequestId } from "@/lib/client/api"
import { Icon } from "./cm-icons"
import {
  CX_ATIV_MAP,
  CX_ATIV_TIPOS,
  CX_CANAIS,
  CX_RESULTADOS,
  CX_RESULTADO_MAP,
  CX_TEMPERATURAS,
  CxField,
  CxInput,
  CxLabel,
  CxModal,
  CxMoneyInput,
  CxPlatformMark,
  CxRadioList,
  CxSelect,
  CxTextarea,
} from "./cx-kit"
import { MOTIVOS, ORIGENS, ORIGEM_LABEL, TIPOS_HONORARIO, cmCompact, cmDate, cmParseCents, cmToday, type CmLeadScore } from "./cm-meta"
import { fitScore } from "@/lib/comercial/score"
import type { CampanhaStatus, CmClienteOption, CmContaOption, CmDatasetCampaign, CmDatasetLead, CmUsuarioOption, LeadEtapa, LeadOrigem, Plataforma } from "@/lib/comercial/types"
import { toAreaOptions, useAreasStore } from "@/lib/areas/store"
import { toStageOptions, usePipelineStore } from "@/lib/comercial/pipeline/store"
import { useScoringStore } from "@/lib/comercial/scoring/store"
import type { MotivoPerda } from "@/lib/settings"

const centsInput = (c: number | null | undefined) => (c ? (c / 100).toFixed(2).replace(".", ",") : "")
function useSubmit(onClose: () => void) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setErr(null)
    try {
      await fn()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar")
      setBusy(false)
    }
  }
  return { busy, err, run }
}
function ErrLine({ err }: { err: string | null }) {
  if (!err) return null
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--crit-soft)", border: "1px solid rgba(192,73,47,0.28)", borderRadius: "var(--r-sm)", fontSize: 12, color: "var(--crit)" }}>
      <Icon name="alertTriangle" size={14} />{err}
    </div>
  )
}

// ── Registrar toque (Follow-up) ──────────────────────────────────────────────
export interface ToquePayload {
  leadId: number
  tipo: string
  resultado: "sem_resposta" | "fria" | "positiva"
  toqueNumero: number
  sinais: string[]
  nota: string
  ocorreuEm: string
}
export function CmToqueModal({ lead, score, onClose, onSubmit }: { lead: CmDatasetLead; score: CmLeadScore | null; onClose: () => void; onSubmit: (p: ToquePayload) => Promise<void> }) {
  const scoringCfg = useScoringStore((s) => s.scoring)
  const sugerNum = score?.proximoToque?.numero ?? (score ? score.toquesFeitos + 1 : 1)
  const sugerCanal = score?.proximoToque?.canais[0] ?? "ligacao"
  const [canal, setCanal] = useState(sugerCanal)
  const [toqueNum, setToqueNum] = useState(String(sugerNum))
  const [resultado, setResultado] = useState<"" | "sem_resposta" | "fria" | "positiva">("")
  const [sinais, setSinais] = useState<string[]>([])
  const [nota, setNota] = useState("")
  const [showErr, setShowErr] = useState(false)
  const { busy, err, run } = useSubmit(onClose)

  const sinalOpts = scoringCfg.sinais.filter((s) => !["sem_resposta", "fria", "positiva"].includes(s.key))
  const toggleSinal = (k: string) => setSinais((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))
  const save = () => {
    if (!resultado) {
      setShowErr(true)
      return
    }
    void run(() => onSubmit({ leadId: lead.id, tipo: canal, resultado, sinais, nota: nota.trim(), toqueNumero: Number(toqueNum) || sugerNum, ocorreuEm: new Date().toISOString() }))
  }

  return (
    <CxModal width={560} icon="mousePointerClick" title="Registrar toque" sub={`${lead.nome} · toque ${sugerNum} da cadência`} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={busy} style={{ height: 36 }}><Icon name="check" size={14} />Registrar toque</button>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <ErrLine err={err} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 128px", gap: 14 }}>
          <CxField label="Canal do contato">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CX_CANAIS.map((c) => {
                const on = canal === c.key
                return <button key={c.key} onClick={() => setCanal(c.key)} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 11px", borderRadius: 8, cursor: "pointer", border: `1px solid ${on ? "var(--border-gold)" : "var(--border)"}`, background: on ? "var(--accent-soft)" : "var(--surface)", color: on ? "var(--accent)" : "var(--text-muted)", fontSize: 12.5, fontWeight: 500 }}><Icon name={c.icon} size={13} />{c.label}</button>
              })}
            </div>
          </CxField>
          <CxField label="Nº na cadência" hint="sugerido"><CxInput type="number" min="1" value={toqueNum} onChange={(e) => setToqueNum(e.target.value)} style={{ fontFamily: "var(--font-mono)" }} /></CxField>
        </div>

        <CxField label={<span>Resultado do contato <span style={{ color: "var(--crit)" }}>*</span></span>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {CX_RESULTADOS.map((r) => {
              const on = resultado === r.key
              return (
                <button key={r.key} onClick={() => { setResultado(r.key as "sem_resposta" | "fria" | "positiva"); setShowErr(false) }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "13px 8px", borderRadius: 10, cursor: "pointer", border: `1.5px solid ${on ? r.color : showErr ? "var(--crit)" : "var(--border)"}`, background: on ? (r.color.startsWith("var") ? "var(--bg-sunken)" : r.color + "14") : "var(--surface)" }}>
                  <Icon name={r.icon} size={19} style={{ color: on ? r.color : "var(--text-muted)" }} />
                  <span style={{ fontSize: 12.5, fontWeight: on ? 600 : 500, color: on ? "var(--text)" : "var(--text-muted)" }}>{r.label}</span>
                </button>
              )
            })}
          </div>
          {showErr && <div style={{ fontSize: 12, color: "var(--crit)", marginTop: 7, display: "flex", alignItems: "center", gap: 5 }}><Icon name="alertCircle" size={13} />Selecione um resultado para salvar.</div>}
        </CxField>

        {sinalOpts.length > 0 && (
          <CxField label="Sinais adicionais" hint="opcional">
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {sinalOpts.map((s) => {
                const on = sinais.includes(s.key)
                return <button key={s.key} onClick={() => toggleSinal(s.key)} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderRadius: 999, cursor: "pointer", border: `1px solid ${on ? "var(--border-gold)" : "var(--border)"}`, background: on ? "var(--accent-soft)" : "var(--surface)", color: on ? "var(--accent)" : "var(--text-muted)", fontSize: 12, fontWeight: 500 }}>{on && <Icon name="check" size={12} />}{s.label}</button>
              })}
            </div>
          </CxField>
        )}

        <CxField label="Nota" hint="opcional"><CxTextarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Contexto do contato, próximos passos…" style={{ minHeight: 64 }} /></CxField>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 13px", background: "var(--accent-soft)", border: "1px solid rgba(192,161,71,0.28)", borderRadius: "var(--r-sm)" }}>
          <Icon name="sparkles" size={15} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>Ao salvar, o próximo toque sugerido (data + canal) e os scores de <strong style={{ color: "var(--text)", fontWeight: 500 }}>Fit</strong> e <strong style={{ color: "var(--text)", fontWeight: 500 }}>Engajamento</strong> são recalculados automaticamente.</div>
        </div>
      </div>
    </CxModal>
  )
}

// ── Nova / Editar campanha ───────────────────────────────────────────────────
export interface CampanhaPayload { id?: number; plataforma: Plataforma; nome: string; objetivo: string; status: CampanhaStatus; inicio: string; fim: string; extId: string; area: string | null }
const OBJETIVOS = ["Geração de leads", "Conversão", "Reconhecimento", "Tráfego"]
const PLATAFORMA_NOME: Record<string, string> = { google_ads: "Google Ads", meta_ads: "Meta Ads" }
export function CmCampanhaModal({ onClose, onSubmit, edit }: { onClose: () => void; onSubmit: (p: CampanhaPayload) => Promise<void>; edit?: CmDatasetCampaign | null }) {
  const isEdit = !!edit
  const storedAreas = useAreasStore((s) => s.areas)
  const areaOpts = useMemo(() => toAreaOptions(storedAreas), [storedAreas])
  const [plataforma, setPlataforma] = useState<Plataforma>(edit?.plataforma ?? "google_ads")
  const [nome, setNome] = useState(edit?.nome ?? "")
  const [objetivo, setObjetivo] = useState(edit?.objetivo ?? OBJETIVOS[0])
  const [status, setStatus] = useState<CampanhaStatus>(edit?.status ?? "ativa")
  const [area, setArea] = useState<string>(edit?.area ?? "")
  const [inicio, setInicio] = useState(edit?.inicio ?? cmToday())
  const [fim, setFim] = useState(edit?.fim ?? "")
  const [extId, setExtId] = useState(edit?.extId ?? "")
  const { busy, err, run } = useSubmit(onClose)
  const valid = !!nome.trim()
  const half = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } as const

  return (
    <CxModal width={560} icon="megaphone" title={isEdit ? "Editar campanha" : "Nova campanha"} sub={isEdit ? edit?.nome : "Cadastre uma campanha de mídia paga."} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid || busy} onClick={() => run(() => onSubmit({ id: edit?.id, plataforma, nome: nome.trim(), objetivo, status, inicio, fim, extId: extId.trim(), area: area || null }))} style={{ height: 36, opacity: valid && !busy ? 1 : 0.5, cursor: valid ? "pointer" : "not-allowed" }}><Icon name="check" size={14} />{isEdit ? "Salvar" : "Criar campanha"}</button>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <ErrLine err={err} />
        <CxField label="Plataforma">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {(["google_ads", "meta_ads"] as Plataforma[]).map((p) => {
              const on = plataforma === p
              const c = p === "google_ads" ? "#3B7DDD" : "#8B5CF6"
              return (
                <button key={p} onClick={() => setPlataforma(p)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 46, borderRadius: "var(--r-sm)", cursor: "pointer", border: `1.5px solid ${on ? c : "var(--border)"}`, background: on ? c + "14" : "var(--surface)" }}>
                  <CxPlatformMark plataforma={p} size={26} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: on ? "var(--text)" : "var(--text-muted)" }}>{PLATAFORMA_NOME[p]}</span>
                  {on && <Icon name="check" size={15} style={{ marginLeft: "auto", color: c }} />}
                </button>
              )
            })}
          </div>
        </CxField>
        <CxField label="Nome da campanha"><CxInput value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Trabalhista — Search SP" /></CxField>
        <div style={half}>
          <CxField label="Objetivo"><CxSelect options={OBJETIVOS} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} /></CxField>
          <CxField label="Área de atuação" hint="opcional"><CxSelect value={area} onChange={(e) => setArea(e.target.value)} options={[{ value: "", label: "—" }, ...areaOpts.map((a) => ({ value: a.id, label: a.label }))]} /></CxField>
        </div>
        <CxField label="Status">
          <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunken)", borderRadius: 9, padding: 3 }}>
            {(["ativa", "pausada", "encerrada"] as CampanhaStatus[]).map((s) => {
              const on = status === s
              return <button key={s} onClick={() => setStatus(s)} style={{ height: 34, padding: "0 13px", borderRadius: 7, border: "none", cursor: "pointer", background: on ? "var(--surface)" : "transparent", color: on ? "var(--text)" : "var(--text-muted)", fontSize: 12.5, fontWeight: on ? 600 : 500, boxShadow: on ? "var(--shadow-sm)" : "none" }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
            })}
          </div>
        </CxField>
        <div style={half}>
          <CxField label="Início"><CxInput type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></CxField>
          <CxField label="Término" hint="opcional"><CxInput type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></CxField>
        </div>
        <CxField label="ID externo / rastreamento" hint="opcional"><CxInput value={extId} onChange={(e) => setExtId(e.target.value)} placeholder="Ex.: gads-8841 / meta-2207" style={{ fontFamily: "var(--font-mono)" }} /></CxField>
      </div>
    </CxModal>
  )
}

// ── Registrar gasto ──────────────────────────────────────────────────────────
export interface GastoPayload { campanhaId: number; valorCents: number; data: string; contaId: number | null; descricao: string; requestId: string }
export function CmGastoModal({ onClose, onSubmit, campaigns, contas, campanha, defaultData }: { onClose: () => void; onSubmit: (p: GastoPayload) => Promise<void>; campaigns: CmDatasetCampaign[]; contas: CmContaOption[]; campanha?: CmDatasetCampaign | null; defaultData?: string }) {
  const [campId, setCampId] = useState(String(campanha?.id ?? campaigns[0]?.id ?? ""))
  const [valor, setValor] = useState("")
  const [data, setData] = useState(defaultData ?? cmToday())
  const [contaId, setContaId] = useState(String(contas[0]?.id ?? ""))
  const [descricao, setDescricao] = useState("")
  const [requestId] = useState(newRequestId)
  const { busy, err, run } = useSubmit(onClose)
  const valorCents = cmParseCents(valor)
  const valid = !!campId && valorCents > 0 && !!data

  return (
    <CxModal width={540} icon="coins" title="Registrar gasto" sub="Lança o investimento da campanha como despesa." onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid || busy} onClick={() => run(() => onSubmit({ campanhaId: Number(campId), valorCents, data, contaId: contaId ? Number(contaId) : null, descricao: descricao.trim(), requestId }))} style={{ height: 36, opacity: valid && !busy ? 1 : 0.5, cursor: valid ? "pointer" : "not-allowed" }}><Icon name="check" size={14} />Registrar gasto</button>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <ErrLine err={err} />
        <CxField label="Campanha"><CxSelect value={campId} onChange={(e) => setCampId(e.target.value)} options={campaigns.map((c) => ({ value: String(c.id), label: `${c.plataforma === "google_ads" ? "Google" : "Meta"} · ${c.nome}` }))} /></CxField>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <CxField label="Valor"><CxMoneyInput value={valor} onChange={(e) => setValor(e.target.value)} /></CxField>
          <CxField label="Data"><CxInput type="date" value={data} onChange={(e) => setData(e.target.value)} /></CxField>
        </div>
        <CxField label="Conta pagadora"><CxSelect value={contaId} onChange={(e) => setContaId(e.target.value)} options={[{ value: "", label: "— sem conta —" }, ...contas.map((c) => ({ value: String(c.id), label: c.nome }))]} /></CxField>
        <CxField label="Descrição" hint="opcional"><CxInput value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Investimento Meta Ads · julho" /></CxField>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "12px 14px", background: "var(--accent-soft)", border: "1px solid rgba(192,161,71,0.3)", borderRadius: "var(--r-sm)" }}>
          <Icon name="wallet" size={16} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>Cria uma <strong style={{ color: "var(--text)", fontWeight: 500 }}>despesa em Financeiro</strong> (categoria Marketing) na conta selecionada — sem dupla digitação.</div>
        </div>
      </div>
    </CxModal>
  )
}

// ── Lead editor: perfil criterion selector ───────────────────────────────────
function CxPerfilRow({ label, opcoes, value, onChange }: { label: string; opcoes: { key: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderTop: "1px solid var(--border)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{label}</div>
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {opcoes.map((o) => {
          const on = value === o.key
          return <button key={o.key} onClick={() => onChange(on ? "" : o.key)} style={{ height: 30, padding: "0 10px", borderRadius: 7, cursor: "pointer", fontSize: 11.5, fontWeight: on ? 600 : 500, border: `1px solid ${on ? "var(--border-gold)" : "var(--border)"}`, background: on ? "var(--accent-soft)" : "var(--surface)", color: on ? "var(--accent)" : "var(--text-muted)", whiteSpace: "nowrap" }}>{o.label}</button>
        })}
      </div>
    </div>
  )
}

// ── Lead editor: activity history (existing leads) ───────────────────────────
interface AtividadeRow {
  id: number
  tipo: string
  titulo: string | null
  descricao: string | null
  resultado: string | null
  toqueNumero: number | null
  sinais: string[]
  ocorreuEm: string
  autorId: number | null
  autor: string | null
  createdAt: string
}
function CxHistoryPanel({ leadId, onCount }: { leadId: number; onCount: (n: number) => void }) {
  const scoringCfg = useScoringStore((s) => s.scoring)
  const sinalLabel = useMemo(() => new Map(scoringCfg.sinais.map((s) => [s.key, s.label])), [scoringCfg])
  const [items, setItems] = useState<AtividadeRow[] | null>(null)
  const [tipo, setTipo] = useState("ligacao")
  const [resultado, setResultado] = useState("")
  const [texto, setTexto] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = () => {
    apiSend<AtividadeRow[]>(`/api/comercial/leads/${leadId}/atividades`, "GET")
      .then((rows) => { setItems(rows); onCount(rows.length) })
      .catch(() => setItems([]))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [leadId])

  const add = async () => {
    if (!texto.trim() && !resultado) return
    setBusy(true)
    setErr(null)
    try {
      await apiSend(`/api/comercial/leads/${leadId}/atividades`, "POST", { tipo, descricao: texto.trim() || null, resultado: resultado || null })
      setTexto("")
      setResultado("")
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao registrar")
    } finally {
      setBusy(false)
    }
  }
  const del = async (id: number) => {
    try {
      await apiSend(`/api/comercial/leads/${leadId}/atividades/${id}`, "DELETE")
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao excluir")
    }
  }

  const sorted = [...(items ?? [])].sort((a, b) => (b.ocorreuEm || "").localeCompare(a.ocorreuEm || "") || (b.toqueNumero ?? 0) - (a.toqueNumero ?? 0))

  return (
    <div>
      {/* quick add */}
      <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", padding: "10px 11px", background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", marginBottom: 12 }}>
        <div style={{ width: 118 }}><CxSelect value={tipo} onChange={(e) => setTipo(e.target.value)} options={CX_ATIV_TIPOS.map((t) => ({ value: t.key, label: t.label }))} /></div>
        <div style={{ width: 128 }}><CxSelect value={resultado} onChange={(e) => setResultado(e.target.value)} options={[{ value: "", label: "Sem resultado" }, ...CX_RESULTADOS.map((r) => ({ value: r.key, label: r.label }))]} /></div>
        <input className="input" value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void add() }} placeholder="Registrar interação…" style={{ flex: 1, minWidth: 120, height: 38, fontSize: 13 }} />
        <button className="btn btn-primary" onClick={() => void add()} disabled={busy} style={{ height: 38, fontSize: 12.5 }}><Icon name="plus" size={14} />Registrar</button>
      </div>
      {err && <div style={{ marginBottom: 10 }}><ErrLine err={err} /></div>}
      {/* timeline */}
      {!items ? (
        <div style={{ fontSize: 12.5, color: "var(--text-subtle)", textAlign: "center", padding: 18 }}>Carregando…</div>
      ) : sorted.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--text-subtle)", textAlign: "center", padding: 18 }}>Nenhuma interação registrada ainda.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {sorted.map((a) => {
            const tp = CX_ATIV_MAP[a.tipo] ?? CX_ATIV_MAP.nota
            const res = a.resultado ? CX_RESULTADO_MAP[a.resultado] : null
            return (
              <div key={a.id} className="cx-hist-item" style={{ display: "flex", gap: 11, padding: "10px 4px", borderTop: "1px solid var(--border)" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--bg-sunken)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={tp.icon} size={14} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {(a.descricao || a.titulo) && <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.45 }}>{a.descricao || a.titulo}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: a.descricao || a.titulo ? 4 : 0, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>{tp.label} · {a.autor ?? "—"} · {cmDate(a.ocorreuEm)}</span>
                    {a.toqueNumero != null && <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)", background: "var(--bg-sunken)", padding: "1px 6px", borderRadius: 5 }}>toque {a.toqueNumero}</span>}
                    {res && <span style={{ fontSize: 10.5, fontWeight: 600, color: res.color, background: res.color.startsWith("var") ? "var(--bg-sunken)" : res.color + "1c", padding: "1px 6px", borderRadius: 5 }}>{res.label}</span>}
                    {a.sinais.map((s) => sinalLabel.has(s) && <span key={s} style={{ fontSize: 10.5, color: "var(--accent)", background: "var(--accent-soft)", padding: "1px 6px", borderRadius: 5 }}>{sinalLabel.get(s)}</span>)}
                  </div>
                </div>
                <button className="btn btn-ghost" onClick={() => void del(a.id)} style={{ width: 26, height: 26, padding: 0, flexShrink: 0, color: "var(--text-subtle)" }} title="Excluir"><Icon name="trash2" size={13} /></button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Novo / Editar lead ───────────────────────────────────────────────────────
export interface LeadPayload {
  id?: number
  nome: string
  contato: string
  origem: LeadOrigem
  campanhaId: number | null
  etapa: LeadEtapa
  valorEstimadoCents: number
  dataEntrada: string
  area: string | null
  responsavelUserId: number | null
  proximaAcaoEm: string | null
  proximaAcaoNota: string | null
  temperatura: string | null
  potencialFinanceiro: string | null
  urgenciaNivel: string | null
  poderDecisao: string | null
  jurisdicao: string | null
  viabilidade: string | null
}
export function CmLeadModal({ onClose, onSubmit, campaigns, usuarios, edit }: { onClose: () => void; onSubmit: (p: LeadPayload) => Promise<void>; campaigns: CmDatasetCampaign[]; usuarios: CmUsuarioOption[]; edit?: CmDatasetLead | null }) {
  const isEdit = !!edit
  const storedAreas = useAreasStore((s) => s.areas)
  const areaOpts = useMemo(() => toAreaOptions(storedAreas), [storedAreas])
  const storedStages = usePipelineStore((s) => s.stages)
  const stageOpts = useMemo(() => {
    const abertas = storedStages.length
      ? toStageOptions(storedStages).map((s) => ({ value: s.key, label: s.nome }))
      : [{ value: "novo", label: "Novo" }, { value: "contato", label: "Contato" }, { value: "qualificado", label: "Qualificado" }, { value: "proposta", label: "Proposta" }]
    return [...abertas, { value: "ganho", label: "Ganho" }, { value: "perdido", label: "Perdido" }]
  }, [storedStages])
  const scoringCfg = useScoringStore((s) => s.scoring)

  const [nome, setNome] = useState(edit?.nome ?? "")
  const [contato, setContato] = useState(edit?.contato ?? "")
  const [origem, setOrigem] = useState<LeadOrigem>(edit?.origem ?? "google_ads")
  const [campId, setCampId] = useState(edit?.campanhaId != null ? String(edit.campanhaId) : "")
  const [area, setArea] = useState<string>(edit?.area ?? "")
  const [etapa, setEtapa] = useState<LeadEtapa>(edit?.etapa ?? "novo")
  const [valor, setValor] = useState(centsInput(edit?.valorEstimadoCents))
  const [dataEntrada, setDataEntrada] = useState(edit?.dataEntrada ?? cmToday())
  const [responsavel, setResponsavel] = useState(edit?.responsavelUserId != null ? String(edit.responsavelUserId) : "")
  const [temperatura, setTemperatura] = useState(edit?.temperatura ?? "morno")
  const [proximaAcao, setProximaAcao] = useState(edit?.proximaAcaoEm ?? "")
  const [notaProx, setNotaProx] = useState(edit?.proximaAcaoNota ?? "")
  const [potencialFinanceiro, setPotencialFinanceiro] = useState(edit?.potencialFinanceiro ?? "")
  const [urgenciaNivel, setUrgenciaNivel] = useState(edit?.urgenciaNivel ?? "")
  const [poderDecisao, setPoderDecisao] = useState(edit?.poderDecisao ?? "")
  const [jurisdicao, setJurisdicao] = useState(edit?.jurisdicao ?? "")
  const [viabilidade, setViabilidade] = useState(edit?.viabilidade ?? "")
  const [tab, setTab] = useState<"dados" | "hist">("dados")
  const [histCount, setHistCount] = useState<number | null>(null)
  const { busy, err, run } = useSubmit(onClose)

  const isPaid = origem === "google_ads" || origem === "meta_ads"
  const campOpts = campaigns.filter((c) => c.plataforma === origem)
  const valid = nome.trim().length > 0
  const half = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } as const
  const digits = contato.replace(/\D/g, "")

  const perfilValues: Record<string, string> = { potencialFinanceiro, urgenciaNivel, poderDecisao, jurisdicao, viabilidade }
  const perfilSetters: Record<string, (v: string) => void> = { potencialFinanceiro: setPotencialFinanceiro, urgenciaNivel: setUrgenciaNivel, poderDecisao: setPoderDecisao, jurisdicao: setJurisdicao, viabilidade: setViabilidade }
  const fitPreview = useMemo(
    () => fitScore({ area: area || null, origem, potencialFinanceiro: potencialFinanceiro || null, urgenciaNivel: urgenciaNivel || null, poderDecisao: poderDecisao || null, jurisdicao: jurisdicao || null, viabilidade: viabilidade || null }, scoringCfg),
    [area, origem, potencialFinanceiro, urgenciaNivel, poderDecisao, jurisdicao, viabilidade, scoringCfg],
  )

  const setOrig = (o: LeadOrigem) => { setOrigem(o); if (o !== "google_ads" && o !== "meta_ads") setCampId("") }
  const pickCampaign = (id: string) => {
    setCampId(id)
    const c = id ? campaigns.find((x) => String(x.id) === id) : null
    if (c?.area && !area) setArea(c.area)
  }

  const save = () => void run(() => onSubmit({
    id: edit?.id,
    nome: nome.trim(),
    contato: contato.trim(),
    origem,
    campanhaId: isPaid && campId ? Number(campId) : null,
    etapa,
    valorEstimadoCents: cmParseCents(valor),
    dataEntrada,
    area: area || null,
    responsavelUserId: responsavel ? Number(responsavel) : null,
    proximaAcaoEm: proximaAcao || null,
    proximaAcaoNota: notaProx.trim() || null,
    temperatura: temperatura || null,
    potencialFinanceiro: potencialFinanceiro || null,
    urgenciaNivel: urgenciaNivel || null,
    poderDecisao: poderDecisao || null,
    jurisdicao: jurisdicao || null,
    viabilidade: viabilidade || null,
  }))

  return (
    <CxModal width={720} icon={isEdit ? "edit" : "userPlus"} title={isEdit ? "Editar lead" : "Novo lead"} sub={isEdit ? edit?.nome : "Cadastre uma oportunidade no funil."} onClose={onClose}
      footer={<>
        <div style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}><Icon name="target" size={14} style={{ color: "var(--accent)" }} />Fit previsto <strong style={{ color: "var(--accent-strong)", fontFamily: "var(--font-mono)", fontSize: 14 }}>{fitPreview}</strong></div>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid || busy} onClick={save} style={{ height: 36, opacity: valid && !busy ? 1 : 0.5, cursor: valid ? "pointer" : "not-allowed" }}><Icon name="check" size={14} />{isEdit ? "Salvar" : "Criar lead"}</button>
      </>}>
      {isEdit && (
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--bg-sunken)", padding: 3, borderRadius: 9, width: "fit-content" }}>
          {([{ id: "dados", l: "Dados & Perfil" }, { id: "hist", l: `Histórico${histCount != null ? ` · ${histCount}` : ""}` }] as const).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ height: 30, padding: "0 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: tab === t.id ? 600 : 500, background: tab === t.id ? "var(--surface)" : "transparent", color: tab === t.id ? "var(--text)" : "var(--text-muted)", boxShadow: tab === t.id ? "var(--shadow-sm)" : "none" }}>{t.l}</button>
          ))}
        </div>
      )}

      {(!isEdit || tab === "dados") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <ErrLine err={err} />
          <div style={half}>
            <CxField label="Nome / empresa"><CxInput value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Mariana Costa" /></CxField>
            <CxField label="Contato">
              <div style={{ display: "flex", gap: 7 }}>
                <CxInput value={contato} onChange={(e) => setContato(e.target.value)} placeholder="(11) 90000-0000" style={{ fontFamily: "var(--font-mono)" }} />
                {digits.length >= 10 && <a href={`https://wa.me/55${digits}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ height: 38, width: 40, padding: 0, flexShrink: 0 }} title="Abrir WhatsApp"><Icon name="send" size={15} /></a>}
              </div>
            </CxField>
          </div>
          <div style={half}>
            <CxField label="Origem"><CxSelect value={origem} onChange={(e) => setOrig(e.target.value as LeadOrigem)} options={ORIGENS.map((o) => ({ value: o, label: ORIGEM_LABEL[o] }))} /></CxField>
            <CxField label="Campanha" hint={isPaid ? "mídia paga" : "n/a"}><CxSelect value={campId} onChange={(e) => pickCampaign(e.target.value)} options={[{ value: "", label: isPaid ? "Selecione" : "—" }, ...campOpts.map((c) => ({ value: String(c.id), label: c.nome }))]} disabled={!isPaid} /></CxField>
          </div>
          <div style={half}>
            <CxField label="Área de atuação"><CxSelect value={area} onChange={(e) => setArea(e.target.value)} options={[{ value: "", label: "Selecione" }, ...areaOpts.map((a) => ({ value: a.id, label: a.label }))]} /></CxField>
            <CxField label="Valor estimado"><CxMoneyInput value={valor} onChange={(e) => setValor(e.target.value)} /></CxField>
          </div>
          <div style={half}>
            <CxField label="Responsável"><CxSelect value={responsavel} onChange={(e) => setResponsavel(e.target.value)} options={[{ value: "", label: "Sem responsável" }, ...usuarios.map((u) => ({ value: String(u.id), label: u.nome }))]} /></CxField>
            <CxField label="Temperatura"><CxSelect value={temperatura} onChange={(e) => setTemperatura(e.target.value)} options={CX_TEMPERATURAS.map((t) => ({ value: t.key, label: t.label }))} /></CxField>
          </div>
          <div style={half}>
            <CxField label="Etapa"><CxSelect value={etapa} onChange={(e) => setEtapa(e.target.value as LeadEtapa)} options={stageOpts} /></CxField>
            <CxField label="Data de entrada"><CxInput type="date" value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} /></CxField>
          </div>
          {etapa === "ganho" && <div style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 12, color: "var(--text-muted)", padding: "10px 13px", background: "var(--warn-soft)", border: "1px solid rgba(224,178,87,0.3)", borderRadius: "var(--r-sm)" }}><Icon name="alertTriangle" size={15} style={{ color: "var(--warn)", flexShrink: 0, marginTop: 1 }} />Para marcar como <strong style={{ color: "var(--text)" }}>Ganho</strong> com cliente, caso e honorário, use o fluxo <strong style={{ color: "var(--text)" }}>Converter</strong> — ele cria o lançamento financeiro.</div>}
          <div style={half}>
            <CxField label="Próxima ação" hint="follow-up"><CxInput type="date" value={proximaAcao} onChange={(e) => setProximaAcao(e.target.value)} /></CxField>
            <CxField label="Nota da próxima ação" hint="opcional"><CxInput value={notaProx} onChange={(e) => setNotaProx(e.target.value)} placeholder="Ex.: retomar após feriado" /></CxField>
          </div>

          {/* Perfil */}
          <div style={{ marginTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Perfil de qualificação</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--text-muted)" }}>Fit <div style={{ width: 60, height: 6, borderRadius: 3, background: "var(--bg-sunken)", overflow: "hidden" }}><div style={{ width: `${fitPreview}%`, height: "100%", background: "var(--accent-strong)" }} /></div><strong style={{ color: "var(--accent-strong)", fontFamily: "var(--font-mono)" }}>{fitPreview}</strong></span>
            </div>
            {scoringCfg.criterios.map((crit) => (
              <CxPerfilRow key={crit.key} label={crit.label} opcoes={crit.opcoes} value={perfilValues[crit.key] ?? ""} onChange={(v) => perfilSetters[crit.key]?.(v)} />
            ))}
          </div>
        </div>
      )}

      {isEdit && tab === "hist" && edit && <CxHistoryPanel leadId={edit.id} onCount={setHistCount} />}
    </CxModal>
  )
}

// ── Converter lead ───────────────────────────────────────────────────────────
export interface ConverterPayload { id: number; clienteNome: string; casoTitulo: string; valorContratadoCents: number; tipoHonorario: string; dataConversao: string }
export function CmConverterModal({ lead, onClose, onSubmit }: { lead: CmDatasetLead; onClose: () => void; onSubmit: (p: ConverterPayload) => Promise<void> }) {
  const storedAreas = useAreasStore((s) => s.areas)
  const areaLabel = lead.area ? toAreaOptions(storedAreas).find((a) => a.id === lead.area)?.label ?? lead.area : null
  const [cliente, setCliente] = useState(lead.cliente || lead.nome)
  const [caso, setCaso] = useState(lead.caso || (areaLabel ? `${areaLabel} — ${lead.nome}` : lead.nome))
  const [valor, setValor] = useState(centsInput(lead.valorContratadoCents || lead.valorEstimadoCents))
  const [tipoHon, setTipoHon] = useState(TIPOS_HONORARIO[0])
  const [data, setData] = useState(lead.dataConv || cmToday())
  const { busy, err, run } = useSubmit(onClose)
  const valorCents = cmParseCents(valor)
  const valid = !!cliente.trim() && !!caso.trim() && valorCents > 0

  return (
    <CxModal width={560} icon="handshake" title="Converter lead" sub={`${lead.nome} · ${ORIGEM_LABEL[lead.origem]}`} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid || busy} onClick={() => run(() => onSubmit({ id: lead.id, clienteNome: cliente.trim(), casoTitulo: caso.trim(), valorContratadoCents: valorCents, tipoHonorario: tipoHon, dataConversao: data }))} style={{ height: 36, opacity: valid && !busy ? 1 : 0.5, cursor: valid ? "pointer" : "not-allowed" }}><Icon name="handshake" size={14} />Converter e vincular</button>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <ErrLine err={err} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "12px 14px", background: "rgba(46,158,91,0.09)", border: "1px solid rgba(46,158,91,0.26)", borderRadius: "var(--r-sm)" }}>
          <Icon name="sparkles" size={16} style={{ color: "#2E9E5B", flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>Marca o lead como <strong style={{ color: "var(--text)", fontWeight: 500 }}>Ganho</strong> e cria o <strong style={{ color: "var(--text)", fontWeight: 500 }}>lançamento financeiro</strong> do honorário contratado, vinculado ao cliente e ao caso.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <CxField label="Cliente"><CxInput value={cliente} onChange={(e) => setCliente(e.target.value)} /></CxField>
          <CxField label="Título do caso"><CxInput value={caso} onChange={(e) => setCaso(e.target.value)} /></CxField>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <CxField label="Honorário contratado"><CxMoneyInput value={valor} onChange={(e) => setValor(e.target.value)} /></CxField>
          <CxField label="Tipo de honorário"><CxSelect options={TIPOS_HONORARIO} value={tipoHon} onChange={(e) => setTipoHon(e.target.value)} /></CxField>
        </div>
        <CxField label="Data da conversão"><CxInput type="date" value={data} onChange={(e) => setData(e.target.value)} /></CxField>
      </div>
    </CxModal>
  )
}

// ── Mesclar com cliente já existente ─────────────────────────────────────────
export interface MesclarPayload { id: number; clienteId: number }
export function CmMergeModal({ lead, onClose, onSubmit }: { lead: CmDatasetLead; onClose: () => void; onSubmit: (p: MesclarPayload) => Promise<void> }) {
  const [q, setQ] = useState("")
  const [sel, setSel] = useState<CmClienteOption | null>(null)
  const { busy, err, run } = useSubmit(onClose)

  // Lazy on mount — the {id,nome} picker list used to ride in the shared
  // CmDataset (every client in the office, on every /comercial load) just to
  // serve this one modal; now it's fetched only when the modal actually opens.
  const [clientes, setClientes] = useState<CmClienteOption[] | null>(null)
  const [loadErr, setLoadErr] = useState(false)
  // No synchronous setState in the effect body itself (only inside the
  // .then/.catch, once the network call actually resolves) — the reset for
  // "Tentar novamente" lives in the click handler below instead, which isn't
  // effect-restricted.
  const fetchClientes = () => {
    apiSend<CmClienteOption[]>("/api/clientes?options=1", "GET")
      .then((d) => setClientes(d ?? []))
      .catch(() => setLoadErr(true))
  }
  useEffect(() => { fetchClientes() }, [])
  const retryClientes = () => { setLoadErr(false); setClientes(null); fetchClientes() }

  const results = useMemo(() => {
    if (!clientes) return []
    const nq = q.trim().toLowerCase()
    const list = nq ? clientes.filter((c) => c.nome.toLowerCase().includes(nq)) : clientes
    return list.slice(0, 30)
  }, [clientes, q])

  return (
    <CxModal width={540} icon="link2" title="Mesclar com cliente" sub={lead.nome} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-primary" disabled={!sel || busy} onClick={() => sel && run(() => onSubmit({ id: lead.id, clienteId: sel.id }))} style={{ height: 36, opacity: sel && !busy ? 1 : 0.5, cursor: sel ? "pointer" : "not-allowed" }}><Icon name="link2" size={14} />Vincular ao cliente</button>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <ErrLine err={err} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "12px 14px", background: "var(--accent-soft)", border: "1px solid rgba(192,161,71,0.3)", borderRadius: "var(--r-sm)" }}>
          <Icon name="users" size={16} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>Vincula este lead a um cliente já cadastrado — marca como <strong style={{ color: "var(--text)", fontWeight: 500 }}>Ganho sem criar novo lançamento financeiro</strong> e completa os dados de contato que estiverem faltando.</div>
        </div>
        {sel ? (
          <div>
            <CxLabel>Cliente selecionado</CxLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", border: "1px solid var(--border-gold)", background: "var(--accent-soft)", borderRadius: "var(--r-md)" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="user" size={18} /></div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{sel.nome}</div></div>
              <button className="btn btn-ghost" onClick={() => setSel(null)} style={{ height: 32, fontSize: 12 }}>Trocar</button>
            </div>
          </div>
        ) : loadErr ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 12px" }}>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Falha ao carregar os clientes.</div>
            <button className="btn btn-secondary" onClick={retryClientes} style={{ height: 32, fontSize: 12 }}><Icon name="refreshCw" size={13} />Tentar novamente</button>
          </div>
        ) : !clientes ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 12px", fontSize: 12.5, color: "var(--text-subtle)" }}>Carregando clientes…</div>
        ) : (
          <div>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)", zIndex: 1 }}><Icon name="search" size={14} /></div>
              <CxInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente por nome…" style={{ paddingLeft: 35 }} autoFocus />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
              {results.map((c) => (
                <button key={c.id} onClick={() => setSel(c)} className="cx-menu-row" style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", background: "var(--surface)", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-sunken)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="user" size={15} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{c.nome}</div></div>
                  <Icon name="chevronRight" size={15} style={{ color: "var(--text-subtle)" }} />
                </button>
              ))}
              {results.length === 0 && <div style={{ fontSize: 12.5, color: "var(--text-subtle)", textAlign: "center", padding: 18 }}>Nenhum cliente encontrado.</div>}
            </div>
          </div>
        )}
      </div>
    </CxModal>
  )
}

// ── Marcar como perdido ──────────────────────────────────────────────────────
export interface PerdidoPayload { id: number; motivo: string; motivoCategoria: string | null }
export function CmPerdidoModal({ lead, onClose, onSubmit }: { lead: CmDatasetLead; onClose: () => void; onSubmit: (p: PerdidoPayload) => Promise<void> }) {
  const storedMotivos = usePipelineStore((s) => s.motivos)
  const opts: MotivoPerda[] = storedMotivos.length ? storedMotivos : MOTIVOS.map((nome) => ({ key: nome, nome }))
  const [key, setKey] = useState(opts.find((m) => m.nome === lead.motivoPerda)?.key ?? opts[0]?.key ?? "")
  const { busy, err, run } = useSubmit(onClose)
  const selected = opts.find((m) => m.key === key) ?? null

  return (
    <CxModal width={500} icon="x" title="Marcar como perdido" sub={lead.nome} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-danger" disabled={busy || !selected} onClick={() => run(() => onSubmit({ id: lead.id, motivo: selected?.nome ?? "", motivoCategoria: selected?.key ?? null }))} style={{ height: 36 }}><Icon name="x" size={14} />Marcar perdido</button>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <ErrLine err={err} />
        <CxField label="Motivo da perda"><CxRadioList options={opts.map((m) => ({ value: m.key, label: m.nome }))} value={key} onChange={setKey} accent="var(--crit)" /></CxField>
      </div>
    </CxModal>
  )
}

// ── shared import summary tiles ──────────────────────────────────────────────
export function CxImportSummary({ rows }: { rows: [string, string | number, string][] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", background: "rgba(46,158,91,0.09)", border: "1px solid rgba(46,158,91,0.26)", borderRadius: "var(--r-sm)" }}>
        <Icon name="checkCircle" size={16} style={{ color: "#2E9E5B", flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, color: "var(--text)" }}>Importação concluída com sucesso.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        {rows.map(([l, v, c]) => (
          <div key={l} style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 15px" }}>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 500 }}>{l}</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: c, fontFamily: "var(--font-mono)" }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Importar · fonte fixa (Genions) ──────────────────────────────────────────
export interface ImportSummary { total: number; novos: number; atualizados: number; campanhasCriadas: number; porEtapa: Record<string, number> }
export function CmImportarModal({ onClose, onImported }: { onClose: () => void; onImported: (s: ImportSummary) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<ImportSummary | null>(null)

  const run = async () => {
    if (!file) return
    setBusy(true)
    setErr(null)
    try {
      const text = await file.text()
      const json = await apiSend<{ result?: ImportSummary }>("/api/comercial/leads/import", "POST", text, { contentType: "text/csv" })
      setResult(json.result as ImportSummary)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao importar")
    } finally {
      setBusy(false)
    }
  }

  return (
    <CxModal width={520} icon="repeat" title="Importar da fonte de captação" sub="Sincronização do Genions (CSV padrão)." onClose={onClose}
      footer={result
        ? <><button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Fechar</button><button className="btn btn-primary" onClick={() => { onImported(result); onClose() }} style={{ height: 36 }}><Icon name="check" size={14} />Concluir importação</button></>
        : <><button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button><button className="btn btn-primary" onClick={() => void run()} disabled={!file || busy} style={{ height: 36, opacity: file && !busy ? 1 : 0.5 }}>{busy ? <><Icon name="refreshCw" size={14} className="pulse" />Processando…</> : <><Icon name="upload" size={14} />Processar</>}</button></>}>
      {result ? (
        <CxImportSummary rows={[["Registros processados", result.total, "var(--text)"], ["Novos leads", result.novos, "var(--accent)"], ["Atualizados", result.atualizados, "var(--text)"], ["Campanhas criadas", result.campanhasCriadas, "var(--text)"]]} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {err && <ErrLine err={err} />}
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "26px 20px", border: "1.5px dashed var(--border-strong)", borderRadius: "var(--r-md)", background: "var(--bg-soft)", cursor: "pointer" }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="fileSpreadsheet" size={22} /></div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{file ? file.name : "Selecionar arquivo CSV"}</div>
            <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>Formato fixo do Genions · clique para escolher</div>
            <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
          </label>
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55, display: "flex", gap: 9, alignItems: "flex-start" }}><Icon name="repeat" size={14} style={{ color: "var(--text-subtle)", flexShrink: 0, marginTop: 1 }} />Importação <strong style={{ color: "var(--text)" }}>idempotente</strong>: leads já existentes (mesmo protocolo) são atualizados, não duplicados. Campanhas novas presentes no arquivo são criadas automaticamente.</div>
        </div>
      )}
    </CxModal>
  )
}

// ── Importar campanhas da Meta ────────────────────────────────────────────────
export interface MetaImportSummary {
  total: number
  campanhasCriadas: number
  campanhasAtualizadas: number
  gastosRegistrados: number
  totalGastoCents: number
  periodo: string | null
}
export function CmImportarMetaModal({ onClose, onImported }: { onClose: () => void; onImported: (s: MetaImportSummary) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<MetaImportSummary | null>(null)

  const run = async () => {
    if (!file) return
    setBusy(true)
    setErr(null)
    try {
      const text = await file.text()
      const json = await apiSend<{ result?: MetaImportSummary }>("/api/comercial/campanhas/import", "POST", text, { contentType: "text/csv" })
      setResult(json.result as MetaImportSummary)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao importar")
    } finally {
      setBusy(false)
    }
  }

  return (
    <CxModal width={520} icon="megaphone" title="Importar do Meta Ads" sub="Importação em massa de campanhas + investimento." onClose={onClose}
      footer={result
        ? <><button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Fechar</button><button className="btn btn-primary" onClick={() => { onImported(result); onClose() }} style={{ height: 36 }}><Icon name="check" size={14} />Concluir</button></>
        : <><button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button><button className="btn btn-primary" onClick={() => void run()} disabled={!file || busy} style={{ height: 36, opacity: file && !busy ? 1 : 0.5 }}>{busy ? <><Icon name="refreshCw" size={14} className="pulse" />Processando…</> : <><Icon name="upload" size={14} />Processar export</>}</button></>}>
      {result ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", background: "rgba(46,158,91,0.09)", border: "1px solid rgba(46,158,91,0.26)", borderRadius: "var(--r-sm)" }}>
            <Icon name="checkCircle" size={16} style={{ color: "#2E9E5B", flexShrink: 0 }} /><div style={{ fontSize: 12.5, color: "var(--text)" }}><strong style={{ fontWeight: 500 }}>{result.total} campanhas</strong> processadas{result.periodo ? ` · ${result.periodo}` : ""}.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {([["Criadas", String(result.campanhasCriadas), "var(--accent)"], ["Atualizadas", String(result.campanhasAtualizadas), "var(--text)"], ["Investimento", cmCompact(result.totalGastoCents), "#2E9E5B"]] as [string, string, string][]).map(([l, v, c]) => (
              <div key={l} style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{l}</div>
                <div style={{ fontSize: /^\d+$/.test(v) ? 24 : 16, fontWeight: 600, color: c, fontFamily: "var(--font-mono)", marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{result.gastosRegistrados} gasto(s) lançado(s) no Financeiro (categoria Marketing).</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {err && <ErrLine err={err} />}
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "26px 20px", border: "1.5px dashed var(--border-strong)", borderRadius: "var(--r-md)", background: "var(--bg-soft)", cursor: "pointer" }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: "#8B5CF614", color: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="fileSpreadsheet" size={22} /></div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{file ? file.name : "Selecionar arquivo CSV"}</div>
            <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>Export de campanhas do Meta Ads</div>
            <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
          </label>
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55, display: "flex", gap: 9, alignItems: "flex-start" }}><Icon name="repeat" size={14} style={{ color: "var(--text-subtle)", flexShrink: 0, marginTop: 1 }} />Campanhas já existentes (por nome) são <strong style={{ color: "var(--text)" }}>atualizadas, não duplicadas</strong>. Reimportar recalcula o gasto do período (idempotente).</div>
        </div>
      )}
    </CxModal>
  )
}
