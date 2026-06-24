"use client"

// LexIA · Comercial — modals: nova/editar campanha, registrar gasto, novo/editar
// lead, converter, perdido, importar. Each collects form state and calls an async
// onSubmit (which performs the API call in ComercialApp).
import { useMemo, useState } from "react"
import { apiSend, newRequestId } from "@/lib/client/api"
import { formatBRL } from "@/lib/finance/money"
import { Icon } from "./cm-icons"
import { CmField, CmInput, CmModal, CmMoneyInput, CmSegmented, CmSelect } from "./cm-kit"
import {
  CAMP_STATUSES,
  CM_STAGES,
  MOTIVOS,
  OBJETIVOS,
  ORIGENS,
  ORIGEM_LABEL,
  PLATAFORMAS,
  PLATAFORMA_LABEL,
  TIPOS_HONORARIO,
  cmParseCents,
  cmToday,
} from "./cm-meta"
import type { CampanhaStatus, CmContaOption, CmDatasetCampaign, CmDatasetLead, LeadEtapa, LeadOrigem, Plataforma } from "@/lib/comercial/types"
import { toAreaOptions, useAreasStore } from "@/lib/areas/store"

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
  return <div style={{ fontSize: 12, color: "var(--cm-neg,#C0492F)", padding: "8px 12px", background: "rgba(192,73,47,0.10)", border: "1px solid rgba(192,73,47,0.16)", borderRadius: "var(--r-sm)" }}>{err}</div>
}

// ── Nova / Editar campanha ───────────────────────────────────────────────────
export interface CampanhaPayload { id?: number; plataforma: Plataforma; nome: string; objetivo: string; status: CampanhaStatus; inicio: string; fim: string; extId: string; area: string | null }
export function CmCampanhaModal({ onClose, onSubmit, edit }: { onClose: () => void; onSubmit: (p: CampanhaPayload) => Promise<void>; edit?: CmDatasetCampaign | null }) {
  const isEdit = !!edit
  const storedAreas = useAreasStore((s) => s.areas)
  const areaOpts = useMemo(() => toAreaOptions(storedAreas), [storedAreas])
  const [plataforma, setPlataforma] = useState<Plataforma>(edit?.plataforma ?? "google_ads")
  const [nome, setNome] = useState(edit?.nome ?? "")
  const [objetivo, setObjetivo] = useState(edit?.objetivo ?? OBJETIVOS[0])
  const [status, setStatus] = useState<CampanhaStatus>(edit?.status ?? "ativa")
  const [inicio, setInicio] = useState(edit?.inicio ?? cmToday())
  const [fim, setFim] = useState(edit?.fim ?? "")
  const [extId, setExtId] = useState(edit?.extId ?? "")
  const [area, setArea] = useState<string>(edit?.area ?? "")
  const { busy, err, run } = useSubmit(onClose)
  const valid = !!nome.trim()
  const half = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } as const

  return (
    <CmModal width={560} title={isEdit ? "Editar campanha" : "Nova campanha"} sub={isEdit ? "Atualize os dados da campanha." : "Cadastre uma campanha de Google Ads ou Meta Ads."} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid || busy} onClick={() => run(() => onSubmit({ id: edit?.id, plataforma, nome: nome.trim(), objetivo, status, inicio, fim, extId: extId.trim(), area: area || null }))} style={{ height: 36, opacity: valid && !busy ? 1 : 0.5 }}><Icon name="check" size={14} />{isEdit ? "Salvar" : "Criar campanha"}</button>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <ErrLine err={err} />
        <CmField label="Plataforma">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {PLATAFORMAS.map((p) => {
              const on = plataforma === p
              const c = p === "google_ads" ? "#3B7DDD" : "#8B5CF6"
              return (
                <button key={p} onClick={() => setPlataforma(p)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 44, borderRadius: "var(--r-sm)", cursor: "pointer", border: `1.5px solid ${on ? c : "var(--border-strong)"}`, background: on ? `${c}14` : "var(--surface)" }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, background: on ? c : "var(--bg-sunken)", color: on ? "#fff" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, flexShrink: 0 }}>{p === "google_ads" ? "G" : "M"}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: on ? "var(--text)" : "var(--text-muted)" }}>{PLATAFORMA_LABEL[p]}</span>
                </button>
              )
            })}
          </div>
        </CmField>
        <CmField label="Nome da campanha"><CmInput value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Trabalhista — Search SP" /></CmField>
        <CmField label="Objetivo"><CmSelect options={OBJETIVOS} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} /></CmField>
        <CmField label="Status"><CmSegmented value={status} onChange={(v) => setStatus(v as CampanhaStatus)} options={CAMP_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} /></CmField>
        <div style={half}>
          <CmField label="Início"><CmInput type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></CmField>
          <CmField label="Término" hint="opcional"><CmInput type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></CmField>
        </div>
        <CmField label="ID externo" hint="opcional"><CmInput value={extId} onChange={(e) => setExtId(e.target.value)} placeholder="Ex.: gads-8841 / meta-2207" style={{ fontFamily: "var(--font-mono)" }} /></CmField>
        {areaOpts.length > 0 && (
          <CmField label="Área" hint="opcional">
            <CmSelect value={area} onChange={(e) => setArea(e.target.value)} options={[{ value: "", label: "— Nenhuma —" }, ...areaOpts.map((a) => ({ value: a.id, label: a.label }))]} />
          </CmField>
        )}
      </div>
    </CmModal>
  )
}

// ── Registrar gasto ──────────────────────────────────────────────────────────
export interface GastoPayload { campanhaId: number; valorCents: number; data: string; contaId: number | null; descricao: string; requestId: string }
export function CmGastoModal({ onClose, onSubmit, campaigns, contas, campanha }: { onClose: () => void; onSubmit: (p: GastoPayload) => Promise<void>; campaigns: CmDatasetCampaign[]; contas: CmContaOption[]; campanha?: CmDatasetCampaign | null }) {
  const [campId, setCampId] = useState(String(campanha?.id ?? campaigns[0]?.id ?? ""))
  const [valor, setValor] = useState("")
  const [data, setData] = useState(cmToday())
  const [contaId, setContaId] = useState(String(contas[0]?.id ?? ""))
  const [descricao, setDescricao] = useState("")
  // Idempotency key, stable for this modal instance — double-clicks/retries
  // map to the same Lancamento row server-side.
  const [requestId] = useState(newRequestId)
  const { busy, err, run } = useSubmit(onClose)
  const valorCents = cmParseCents(valor)
  const valid = !!campId && valorCents > 0 && !!data

  return (
    <CmModal width={540} title="Registrar gasto" sub="Lança o investimento da campanha como despesa." onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid || busy} onClick={() => run(() => onSubmit({ campanhaId: Number(campId), valorCents, data, contaId: contaId ? Number(contaId) : null, descricao: descricao.trim(), requestId }))} style={{ height: 36, opacity: valid && !busy ? 1 : 0.5 }}><Icon name="check" size={14} />Registrar gasto</button>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <ErrLine err={err} />
        <CmField label="Campanha"><CmSelect value={campId} onChange={(e) => setCampId(e.target.value)} options={campaigns.map((c) => ({ value: String(c.id), label: `${c.plataforma === "google_ads" ? "🟦" : "🟪"}  ${c.nome}` }))} /></CmField>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <CmField label="Valor"><CmMoneyInput value={valor} onChange={(e) => setValor(e.target.value)} /></CmField>
          <CmField label="Data"><CmInput type="date" value={data} onChange={(e) => setData(e.target.value)} /></CmField>
        </div>
        <CmField label="Conta de origem"><CmSelect value={contaId} onChange={(e) => setContaId(e.target.value)} options={[{ value: "", label: "— sem conta —" }, ...contas.map((c) => ({ value: String(c.id), label: c.nome }))]} /></CmField>
        <CmField label="Descrição" hint="opcional"><CmInput value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Investimento Meta Ads · junho" /></CmField>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "12px 14px", background: "var(--accent-soft)", border: "1px solid rgba(192,161,71,0.3)", borderRadius: "var(--r-sm)" }}>
          <Icon name="wallet" size={16} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>Este lançamento cria uma <strong style={{ color: "var(--text)", fontWeight: 500 }}>despesa em Financeiro</strong> (categoria Marketing) na conta selecionada — sem dupla digitação.</div>
        </div>
      </div>
    </CmModal>
  )
}

// ── Novo / Editar lead ───────────────────────────────────────────────────────
export interface LeadPayload { id?: number; nome: string; contato: string; origem: LeadOrigem; campanhaId: number | null; etapa: LeadEtapa; valorEstimadoCents: number; dataEntrada: string; area: string | null }
export function CmLeadModal({ onClose, onSubmit, campaigns, edit }: { onClose: () => void; onSubmit: (p: LeadPayload) => Promise<void>; campaigns: CmDatasetCampaign[]; edit?: CmDatasetLead | null }) {
  const isEdit = !!edit
  const storedAreas = useAreasStore((s) => s.areas)
  const areaOpts = useMemo(() => toAreaOptions(storedAreas), [storedAreas])
  const [nome, setNome] = useState(edit?.nome ?? "")
  const [contato, setContato] = useState(edit?.contato ?? "")
  const [origem, setOrigem] = useState<LeadOrigem>(edit?.origem ?? "google_ads")
  const [campId, setCampId] = useState(edit?.campanhaId != null ? String(edit.campanhaId) : "")
  const [etapa, setEtapa] = useState<LeadEtapa>(edit?.etapa ?? "novo")
  const [valor, setValor] = useState(centsInput(edit?.valorEstimadoCents))
  const [data, setData] = useState(edit?.dataEntrada ?? cmToday())
  const [area, setArea] = useState<string>(edit?.area ?? "")
  const { busy, err, run } = useSubmit(onClose)

  const isPaid = origem === "google_ads" || origem === "meta_ads"
  const campOpts = campaigns.filter((c) => c.plataforma === origem)
  const valid = !!nome.trim()
  const half = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } as const
  const setOrig = (o: LeadOrigem) => { setOrigem(o); if (o !== "google_ads" && o !== "meta_ads") setCampId("") }
  const setCamp = (id: string) => {
    setCampId(id)
    const camp = id ? campaigns.find((c) => String(c.id) === id) : null
    if (camp?.area && !edit?.area) setArea(camp.area)
  }

  return (
    <CmModal width={560} title={isEdit ? "Editar lead" : "Novo lead"} sub={isEdit ? "Atualize os dados do lead." : "Cadastre um lead manualmente no funil."} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid || busy} onClick={() => run(() => onSubmit({ id: edit?.id, nome: nome.trim(), contato: contato.trim(), origem, campanhaId: isPaid && campId ? Number(campId) : null, etapa, valorEstimadoCents: cmParseCents(valor), dataEntrada: data, area: area || null }))} style={{ height: 36, opacity: valid && !busy ? 1 : 0.5 }}><Icon name="check" size={14} />{isEdit ? "Salvar" : "Criar lead"}</button>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <ErrLine err={err} />
        <div style={half}>
          <CmField label="Nome / empresa"><CmInput value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Mariana Costa" /></CmField>
          <CmField label="Contato"><CmInput value={contato} onChange={(e) => setContato(e.target.value)} placeholder="(11) 90000-0000" style={{ fontFamily: "var(--font-mono)" }} /></CmField>
        </div>
        <div style={half}>
          <CmField label="Origem"><CmSelect value={origem} onChange={(e) => setOrig(e.target.value as LeadOrigem)} options={ORIGENS.map((o) => ({ value: o, label: ORIGEM_LABEL[o] }))} /></CmField>
          <CmField label="Campanha" hint={isPaid ? "" : "n/a"}><CmSelect value={campId} onChange={(e) => setCamp(e.target.value)} disabled={!isPaid} options={[{ value: "", label: isPaid ? "Selecione" : "—" }, ...campOpts.map((c) => ({ value: String(c.id), label: c.nome }))]} /></CmField>
        </div>
        <div style={half}>
          <CmField label="Valor estimado"><CmMoneyInput value={valor} onChange={(e) => setValor(e.target.value)} /></CmField>
          <CmField label="Data de entrada"><CmInput type="date" value={data} onChange={(e) => setData(e.target.value)} /></CmField>
        </div>
        <CmField label="Etapa"><CmSelect value={etapa} onChange={(e) => setEtapa(e.target.value as LeadEtapa)} options={[...CM_STAGES.map((s) => ({ value: s.key, label: s.label })), { value: "perdido", label: "Perdido" }]} /></CmField>
        {etapa === "ganho" && <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "10px 13px", background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>Para registrar cliente, caso e honorário contratado, use <strong style={{ color: "var(--text)" }}>Converter</strong> na lista.</div>}
        {areaOpts.length > 0 && (
          <CmField label="Área" hint="opcional">
            <CmSelect value={area} onChange={(e) => setArea(e.target.value)} options={[{ value: "", label: "— Nenhuma —" }, ...areaOpts.map((a) => ({ value: a.id, label: a.label }))]} />
          </CmField>
        )}
      </div>
    </CmModal>
  )
}

// ── Converter lead ───────────────────────────────────────────────────────────
export interface ConverterPayload { id: number; clienteNome: string; casoTitulo: string; valorContratadoCents: number; tipoHonorario: string; dataConversao: string }
export function CmConverterModal({ lead, onClose, onSubmit }: { lead: CmDatasetLead; onClose: () => void; onSubmit: (p: ConverterPayload) => Promise<void> }) {
  const [cliente, setCliente] = useState(lead.cliente || lead.nome)
  const [caso, setCaso] = useState(lead.caso || "")
  const [valor, setValor] = useState(centsInput(lead.valorContratadoCents || lead.valorEstimadoCents))
  const [data, setData] = useState(lead.dataConv || cmToday())
  const [tipoHon, setTipoHon] = useState(TIPOS_HONORARIO[0])
  const { busy, err, run } = useSubmit(onClose)
  const valorCents = cmParseCents(valor)
  const valid = !!cliente.trim() && valorCents > 0

  return (
    <CmModal width={540} title="Converter lead" sub={`${lead.nome} · ${ORIGEM_LABEL[lead.origem]}`} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-gold" disabled={!valid || busy} onClick={() => run(() => onSubmit({ id: lead.id, clienteNome: cliente.trim(), casoTitulo: caso.trim(), valorContratadoCents: valorCents, tipoHonorario: tipoHon, dataConversao: data }))} style={{ height: 36, opacity: valid && !busy ? 1 : 0.5 }}><Icon name="handshake" size={14} />Converter e vincular</button>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <ErrLine err={err} />
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", background: "rgba(46,158,91,0.08)", border: "1px solid rgba(46,158,91,0.26)", borderRadius: "var(--r-sm)" }}>
          <Icon name="sparkles" size={16} style={{ color: "#2E9E5B", flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>Marca o lead como <strong style={{ color: "var(--text)", fontWeight: 500 }}>Ganho</strong> e cria um honorário contratado no Financeiro.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <CmField label="Cliente"><CmInput value={cliente} onChange={(e) => setCliente(e.target.value)} /></CmField>
          <CmField label="Caso vinculado"><CmInput value={caso} onChange={(e) => setCaso(e.target.value)} placeholder="Ex.: Usucapião" /></CmField>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <CmField label="Honorário contratado"><CmMoneyInput value={valor} onChange={(e) => setValor(e.target.value)} /></CmField>
          <CmField label="Tipo de honorário"><CmSelect options={TIPOS_HONORARIO} value={tipoHon} onChange={(e) => setTipoHon(e.target.value)} /></CmField>
        </div>
        <CmField label="Data da conversão"><CmInput type="date" value={data} onChange={(e) => setData(e.target.value)} /></CmField>
      </div>
    </CmModal>
  )
}

// ── Marcar como perdido ──────────────────────────────────────────────────────
export interface PerdidoPayload { id: number; motivo: string }
export function CmPerdidoModal({ lead, onClose, onSubmit }: { lead: CmDatasetLead; onClose: () => void; onSubmit: (p: PerdidoPayload) => Promise<void> }) {
  const [motivo, setMotivo] = useState(lead.motivoPerda || MOTIVOS[0])
  const { busy, err, run } = useSubmit(onClose)
  return (
    <CmModal width={500} title="Marcar como perdido" sub={lead.nome} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-primary" disabled={busy} onClick={() => run(() => onSubmit({ id: lead.id, motivo }))} style={{ height: 36, background: "var(--cm-neg,#C0492F)", color: "#fff", opacity: busy ? 0.6 : 1 }}><Icon name="x" size={14} />Marcar perdido</button>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <ErrLine err={err} />
        <CmField label="Motivo da perda">
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {MOTIVOS.map((m) => {
              const on = motivo === m
              return (
                <button key={m} onClick={() => setMotivo(m)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 13px", textAlign: "left", borderRadius: "var(--r-sm)", cursor: "pointer", border: `1px solid ${on ? "var(--cm-neg,#C0492F)" : "var(--border-strong)"}`, background: on ? "rgba(192,73,47,0.07)" : "var(--surface)" }}>
                  <span style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, border: `2px solid ${on ? "var(--cm-neg,#C0492F)" : "var(--border-strong)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{on && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--cm-neg,#C0492F)" }} />}</span>
                  <span style={{ fontSize: 13, color: "var(--text)", fontWeight: on ? 500 : 400 }}>{m}</span>
                </button>
              )
            })}
          </div>
        </CmField>
      </div>
    </CmModal>
  )
}

// ── Importar do Genions ──────────────────────────────────────────────────────
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
    <CmModal width={520} title="Importar do Genions" sub="Sincronize leads a partir do CSV “Relatório de atendimentos” do Genions." onClose={onClose}
      footer={result
        ? <button className="btn btn-primary" onClick={() => { onImported(result); onClose() }} style={{ height: 36 }}><Icon name="check" size={14} />Concluir</button>
        : <>
            <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
            <button className="btn btn-primary" onClick={run} disabled={!file || busy} style={{ height: 36, opacity: file && !busy ? 1 : 0.5 }}>{busy ? <><Icon name="refreshCw" size={14} className="pulse" />Importando...</> : <><Icon name="upload" size={14} />Importar CSV</>}</button>
          </>}>
      {result ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", background: "rgba(46,158,91,0.08)", border: "1px solid rgba(46,158,91,0.26)", borderRadius: "var(--r-sm)" }}>
            <Icon name="checkCircle" size={16} style={{ color: "#2E9E5B", flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: "var(--text)" }}><strong style={{ fontWeight: 500 }}>{result.total} registros</strong> importados com sucesso.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10, padding: "13px 15px" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>Novos leads</div>
              <div style={{ fontSize: 25, fontWeight: 500, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{result.novos}</div>
            </div>
            <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10, padding: "13px 15px" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>Atualizados</div>
              <div style={{ fontSize: 25, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-mono)" }}>{result.atualizados}</div>
            </div>
          </div>
          {result.campanhasCriadas > 0 && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{result.campanhasCriadas} campanha(s) criada(s) a partir das UTMs.</div>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {err && <ErrLine err={err} />}
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "28px 20px", border: "1.5px dashed var(--border-strong)", borderRadius: "var(--r-md)", background: "var(--bg-soft)", cursor: "pointer" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="fileSpreadsheet" size={22} /></div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{file ? file.name : "Selecionar arquivo CSV"}</div>
            <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>clique para escolher o export do Genions</div>
            <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
          </label>
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>O importador lê Protocolo, contato, origem (UTM/Tags) e situação. Leads já existentes (mesmo Protocolo) são <strong style={{ color: "var(--text)" }}>atualizados</strong>; novos são adicionados ao funil.</div>
        </div>
      )}
    </CmModal>
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
    <CmModal width={520} title="Importar campanhas (Meta)" sub="Sincronize campanhas e investimento a partir do CSV de Campanhas do Gerenciador de Anúncios da Meta." onClose={onClose}
      footer={result
        ? <button className="btn btn-primary" onClick={() => { onImported(result); onClose() }} style={{ height: 36 }}><Icon name="check" size={14} />Concluir</button>
        : <>
            <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
            <button className="btn btn-primary" onClick={run} disabled={!file || busy} style={{ height: 36, opacity: file && !busy ? 1 : 0.5 }}>{busy ? <><Icon name="refreshCw" size={14} className="pulse" />Importando...</> : <><Icon name="upload" size={14} />Importar CSV</>}</button>
          </>}>
      {result ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", background: "rgba(46,158,91,0.08)", border: "1px solid rgba(46,158,91,0.26)", borderRadius: "var(--r-sm)" }}>
            <Icon name="checkCircle" size={16} style={{ color: "#2E9E5B", flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: "var(--text)" }}><strong style={{ fontWeight: 500 }}>{result.total} campanha(s)</strong> importada(s){result.periodo ? ` · ${result.periodo}` : ""}.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10, padding: "13px 15px" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>Novas campanhas</div>
              <div style={{ fontSize: 25, fontWeight: 500, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{result.campanhasCriadas}</div>
            </div>
            <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10, padding: "13px 15px" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>Atualizadas</div>
              <div style={{ fontSize: 25, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-mono)" }}>{result.campanhasAtualizadas}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}><strong style={{ color: "var(--text)" }}>{formatBRL(result.totalGastoCents)}</strong> de investimento em {result.gastosRegistrados} campanha(s) lançado no Financeiro (categoria Marketing).</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {err && <ErrLine err={err} />}
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "28px 20px", border: "1.5px dashed var(--border-strong)", borderRadius: "var(--r-md)", background: "var(--bg-soft)", cursor: "pointer" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="fileSpreadsheet" size={22} /></div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{file ? file.name : "Selecionar arquivo CSV"}</div>
            <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>clique para escolher o export de Campanhas da Meta</div>
            <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
          </label>
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>Lê o nome da campanha, a veiculação (status) e o <strong style={{ color: "var(--text)" }}>Valor usado (BRL)</strong>. Campanhas com o mesmo nome são <strong style={{ color: "var(--text)" }}>atualizadas</strong> e o gasto do mês é recalculado (importação idempotente).</div>
        </div>
      )}
    </CmModal>
  )
}
