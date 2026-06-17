"use client"

// LexIA · CRM — Cliente detail page: header + 6 tabs, wired to the real backend.
// Fetches /api/clientes/[id] on mount; edit mode PATCHes via patchCliente.
import { useCallback, useEffect, useState, type ReactNode } from "react"
import {
  CrmAvatar,
  CrmBadge,
  CrmCasoTipoPill,
  CrmClasseBadge,
  CrmContratoStatus,
  CrmEmpty,
  CrmLink,
  CrmPrioTag,
  CrmRow,
  CrmTipoBadge,
  CRM_EVT,
  CRM_TASK_STATUS,
  FxCardTitle,
  FxDirChip,
  FxFrame,
  FxInput,
  FxKpi,
  FxLabel,
  FxMoney,
  FxTabs,
  type EvtTipo,
  type FxTabDef,
  useCrmToast,
} from "../crm-kit"
import { Icon } from "../crm-icons"
import { ProcSemaforo, urgenciaCalc } from "@/components/processos/proc-kit"
import {
  addAnotacaoCliente,
  deleteAnotacaoCliente,
  fetchClienteDetail,
  pagarLancamento,
  patchCliente,
  reabrirLancamento,
  setCobranca,
} from "../crm-api"
import { crmDate, crmDateLong } from "../crm-fmt"
import { CrmDocumentoModal, CrmEventoModal, CrmLancamentoModal, CrmTarefaModal } from "./CrmClienteModals"
import type {
  ClienteDetail,
  ClienteTab,
  ClienteTarefaRow,
  CrmDataset,
  CrmNav,
  EventoRow,
  LancamentoRow,
  ProcessoMini,
  Role,
} from "../crm-types"

interface Props {
  clienteId: number
  tab: ClienteTab
  onTab: (t: ClienteTab) => void
  role: Role
  dataset: CrmDataset
  nav: CrmNav
  onAnonimizar: (id: number) => void
  onRefresh: () => void
}

type ClienteModal =
  | { type: "tarefa"; tarefa?: ClienteTarefaRow | null }
  | { type: "lancamento" }
  | { type: "evento"; evento?: EventoRow | null }
  | { type: "documento" }
  | null

// ───────────────────────── small atoms (from the design) ─────────────────────────
function CrmStat({ label, value, tone }: { label: string; value: ReactNode; tone?: "pos" | "neg" | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 500 }}>{label}</span>
      <span
        style={{
          fontSize: 16, fontWeight: 500, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
          color: tone === "neg" ? "var(--fin-neg,#C0492F)" : tone === "pos" ? "var(--fin-pos,#2E9E5B)" : "var(--text)",
        }}
      >
        {value}
      </span>
    </div>
  )
}

function CrmMoneyStat({ label, cents, tone }: { label: string; cents: number; tone?: "pos" | "neg" | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
        <FxMoney cents={cents} size={16} plain={tone == null} dir={tone === "neg" ? "out" : "in"} />
      </span>
    </div>
  )
}

function CrmInfoLine({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
      <Icon name={icon} size={14} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  )
}

// ───────────────────────── processo sub-row (casos & processos tab) ─────────────────────────
function CrmProcessoSubRow({ p, hoje, onClick }: { p: ProcessoMini; hoje: string; onClick: () => void }) {
  const foro = [p.tribunal, p.vara].filter(Boolean).join(" · ")
  return (
    <CrmRow
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 16px 10px 40px",
        borderTop: "1px solid var(--border)", background: "var(--bg-soft)",
      }}
    >
      <Icon name="cornerDownRight" size={14} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {p.numeroCnj || "Sem CNJ"}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {[p.classe, foro].filter(Boolean).join(" · ") || "—"}
        </div>
      </div>
      <CrmBadge tone="neutral">{p.status}</CrmBadge>
      {p.proximaDataFatal != null ? (
        <ProcSemaforo urgencia={urgenciaCalc(p.proximaDataFatal, null, hoje)} />
      ) : (
        <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>sem prazo</span>
      )}
      <Icon name="chevronRight" size={15} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
    </CrmRow>
  )
}

// ───────────────────────── lançamento row (financeiro tab) ─────────────────────────
function CrmLancRow({
  l,
  onToggle,
  last,
}: {
  l: LancamentoRow
  onToggle: (l: LancamentoRow) => void
  last: boolean
}) {
  return (
    <div
      className="crm-row"
      style={{
        display: "grid", gridTemplateColumns: "24px 1fr 150px 110px 96px 140px", gap: 12, alignItems: "center",
        padding: "11px 16px", borderTop: last ? "none" : "1px solid var(--border)",
      }}
    >
      <FxDirChip dir={l.dir} compact />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.desc}</div>
        {l.cat && <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>{l.cat}</div>}
      </div>
      <div style={{ minWidth: 0, fontSize: 12, color: "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {l.caso || "—"}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{crmDate(l.venc)}</div>
      <div style={{ textAlign: "right" }}><FxMoney cents={l.valorCents} dir={l.dir} /></div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {l.pago ? (
          <button onClick={() => onToggle(l)} className="btn btn-ghost" style={{ height: 26, fontSize: 12, padding: "0 9px", color: "var(--fin-pos,#2E9E5B)" }}>
            <Icon name="checkCircle" size={13} />
            {l.dir === "in" ? "Recebido" : "Pago"}
          </button>
        ) : (
          <button onClick={() => onToggle(l)} className="fx-baixa">
            {l.dir === "in" ? "Marcar recebido" : "Marcar pago"}
          </button>
        )}
      </div>
    </div>
  )
}

export function CrmClienteDetail({ clienteId, tab, onTab, role, dataset, nav, onAnonimizar, onRefresh }: Props) {
  const { toast } = useCrmToast()
  const [detail, setDetail] = useState<ClienteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<ClienteModal>(null)
  // edit-form fields
  const [fNome, setFNome] = useState("")
  const [fApelido, setFApelido] = useState("")
  const [fDoc, setFDoc] = useState("")
  const [fEmail, setFEmail] = useState("")
  const [fTel, setFTel] = useState("")
  const [fCidade, setFCidade] = useState("")
  const [fUf, setFUf] = useState("")
  // cobrança & anotações tab
  const [noteText, setNoteText] = useState("")
  const [cobMotivo, setCobMotivo] = useState("")
  const [cobDias, setCobDias] = useState(30)
  const [cobBusy, setCobBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetchClienteDetail(clienteId)
      setDetail(d)
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", { tone: "neg", icon: "alertTriangle" })
    } finally {
      setLoading(false)
    }
  }, [clienteId, toast])

  useEffect(() => {
    setEdit(false)
    void load()
  }, [load])

  // seed the edit form whenever we enter edit mode with fresh detail
  useEffect(() => {
    if (edit && detail) {
      const h = detail.header
      setFNome(h.nome)
      setFApelido(h.apelido ?? "")
      setFDoc(h.cpfCnpj ?? "")
      setFEmail(h.emails[0] ?? "")
      setFTel(h.telefones[0] ?? "")
      setFCidade(h.cidade ?? "")
      setFUf(h.uf ?? "")
    }
  }, [edit, detail])

  const onToggleLanc = useCallback(
    async (l: LancamentoRow) => {
      try {
        if (l.pago) {
          await reabrirLancamento(l.id)
          toast(l.dir === "in" ? "Lançamento reaberto" : "Lançamento reaberto")
        } else {
          await pagarLancamento(l.id)
          toast(l.dir === "in" ? "Marcado como recebido" : "Marcado como pago")
        }
        await load()
        onRefresh()
      } catch (err) {
        toast(err instanceof Error ? err.message : "Erro", { tone: "neg", icon: "alertTriangle" })
      }
    },
    [load, onRefresh, toast],
  )

  const doCobranca = useCallback(
    async (body: Parameters<typeof setCobranca>[1]) => {
      setCobBusy(true)
      try {
        await setCobranca(clienteId, body)
        setCobMotivo("")
        await load()
        onRefresh()
        toast("Cobrança atualizada")
      } catch (err) {
        toast(err instanceof Error ? err.message : "Erro", { tone: "neg", icon: "alertTriangle" })
      } finally {
        setCobBusy(false)
      }
    },
    [clienteId, load, onRefresh, toast],
  )

  const addNote = useCallback(async () => {
    const t = noteText.trim()
    if (!t) return
    setCobBusy(true)
    try {
      await addAnotacaoCliente(clienteId, { conteudo: t })
      setNoteText("")
      await load()
      toast("Anotação adicionada")
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", { tone: "neg", icon: "alertTriangle" })
    } finally {
      setCobBusy(false)
    }
  }, [clienteId, noteText, load, toast])

  const removeNote = useCallback(
    async (anotacaoId: number) => {
      try {
        await deleteAnotacaoCliente(clienteId, anotacaoId)
        await load()
        toast("Anotação removida")
      } catch (err) {
        toast(err instanceof Error ? err.message : "Erro", { tone: "neg", icon: "alertTriangle" })
      }
    },
    [clienteId, load, toast],
  )

  const onSave = useCallback(async () => {
    setSaving(true)
    try {
      await patchCliente(clienteId, {
        nome: fNome.trim(),
        apelido: fApelido.trim() || null,
        cpfCnpj: fDoc.trim() || null,
        emails: fEmail.trim() ? [fEmail.trim()] : [],
        telefones: fTel.trim() ? [fTel.trim()] : [],
        cidade: fCidade.trim() || null,
        uf: fUf.trim() || null,
      })
      await load()
      onRefresh()
      setEdit(false)
      toast("Dados do cliente salvos")
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", { tone: "neg", icon: "alertTriangle" })
    } finally {
      setSaving(false)
    }
  }, [clienteId, fNome, fApelido, fDoc, fEmail, fTel, fCidade, fUf, load, onRefresh, toast])

  if (loading && !detail) {
    return <FxFrame><CrmEmpty icon="user" title="Carregando…" sub="Buscando os dados do cliente." /></FxFrame>
  }
  if (!detail) {
    return <FxFrame><CrmEmpty icon="user" title="Cliente não encontrado" /></FxFrame>
  }

  const c = detail.header
  const r = detail.resumo
  const addr = [
    c.logradouro,
    c.numero,
  ].filter(Boolean).join(", ")
  const addrCity = [c.cidade, c.uf].filter(Boolean).join("/")
  const fullAddr = [addr, addrCity].filter(Boolean).join(" · ")

  const cob = detail.cobranca
  const cobLabel = cob.status === "suspenso" ? "Não cobrar" : cob.status === "pausado" ? `Pausada até ${crmDate(cob.ate)}` : "Cobrança ativa"
  const cobTone: "pos" | "gold" | "neg" = cob.status === "ativo" ? "pos" : cob.status === "pausado" ? "gold" : "neg"

  const TABS: FxTabDef[] = [
    { id: "financeiro", label: "Financeiro", icon: "wallet", badge: detail.lancamentos.length || null },
    { id: "cobranca", label: "Cobrança & notas", icon: "handshake", badge: detail.anotacoes.length || null },
    { id: "tarefas", label: "Tarefas", icon: "listChecks", badge: detail.tarefas.length || null },
    { id: "casos", label: "Casos & Processos", icon: "briefcase", badge: detail.casos.length || null },
    { id: "contratos", label: "Contratos", icon: "receipt", badge: detail.honorarios.length || null },
    { id: "eventos", label: "Eventos", icon: "calendar", badge: detail.eventos.length || null },
    { id: "documentos", label: "Documentos", icon: "fileText", badge: detail.documentos.length || null },
  ]

  const sectionCard = (children: ReactNode) => <div className="card" style={{ overflow: "hidden" }}>{children}</div>

  const lancSorted = [...detail.lancamentos].sort((a, b) => (a.venc ?? "").localeCompare(b.venc ?? ""))
  const hoje = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* header */}
      <div style={{ padding: "24px 40px 0", maxWidth: 1240, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
          <CrmAvatar name={c.nome} tipo={c.tipo} size={58} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: 25, fontWeight: 500, letterSpacing: "-0.03em", color: "var(--text)" }}>{c.nome}</h1>
              <CrmTipoBadge tipo={c.tipo} />
              <CrmClasseBadge classe={c.classificacao} />
              {cob.status !== "ativo" && (
                <button
                  onClick={() => onTab("cobranca")}
                  title={cob.motivo ?? undefined}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  <CrmBadge tone={cobTone} dot>{cobLabel}</CrmBadge>
                </button>
              )}
            </div>
            {c.apelido && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>{c.apelido}</div>}
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 12 }}>
              {c.cpfCnpj && <CrmInfoLine icon={c.tipo === "pj" ? "building" : "user"}>{c.cpfCnpj}</CrmInfoLine>}
              {c.emails[0] && <CrmInfoLine icon="mail">{c.emails[0]}</CrmInfoLine>}
              {c.telefones[0] && <CrmInfoLine icon="phone">{c.telefones[0]}</CrmInfoLine>}
              {fullAddr && <CrmInfoLine icon="mapPin">{fullAddr}</CrmInfoLine>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button className="btn btn-secondary" onClick={() => setModal({ type: "tarefa" })}>
              <Icon name="listChecks" size={14} />Nova tarefa
            </button>
            <button className="btn btn-secondary" onClick={() => setModal({ type: "evento" })}>
              <Icon name="calendar" size={14} />Novo evento
            </button>
            <button className="btn btn-primary" onClick={() => setModal({ type: "documento" })}>
              <Icon name="fileText" size={14} />Gerar documento
            </button>
            <button className="btn btn-secondary" onClick={() => setEdit((e) => !e)} title="Editar dados">
              <Icon name="edit" size={14} />{edit ? "Concluir" : "Editar"}
            </button>
            {(role === "admin" || role === "socio") && (
              <button className="btn btn-ghost" onClick={() => onAnonimizar(clienteId)} title="Excluir cliente (LGPD — apaga os dados pessoais, mantém o financeiro)" style={{ color: "var(--fin-neg,#C0492F)" }}>
                <Icon name="trash2" size={14} />Excluir
              </button>
            )}
          </div>
        </div>

        {/* numeric summary */}
        <div style={{ display: "flex", gap: 36, flexWrap: "wrap", padding: "20px 0 22px", marginTop: 18, borderTop: "1px solid var(--border)" }}>
          <CrmStat label="Casos ativos" value={r.casosAtivos} />
          <CrmMoneyStat label="Recebido" cents={r.recebidoCents} tone="pos" />
          <CrmMoneyStat label="A receber" cents={r.aReceberCents} tone={null} />
          <CrmMoneyStat label="Vencido" cents={r.vencidoCents} tone={r.vencidoCents ? "neg" : null} />
        </div>

        {edit && (
          <div className="card" style={{ padding: 18, marginBottom: 18, background: "var(--bg-soft)" }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", marginBottom: 14 }}>Editar dados cadastrais</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div><FxLabel>Nome</FxLabel><FxInput value={fNome} onChange={(e) => setFNome(e.target.value)} /></div>
              <div><FxLabel>Apelido</FxLabel><FxInput value={fApelido} onChange={(e) => setFApelido(e.target.value)} /></div>
              <div><FxLabel>CPF/CNPJ</FxLabel><FxInput value={fDoc} onChange={(e) => setFDoc(e.target.value)} /></div>
              <div><FxLabel>E-mail</FxLabel><FxInput value={fEmail} onChange={(e) => setFEmail(e.target.value)} /></div>
              <div><FxLabel>Telefone</FxLabel><FxInput value={fTel} onChange={(e) => setFTel(e.target.value)} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 10 }}>
                <div><FxLabel>Cidade</FxLabel><FxInput value={fCidade} onChange={(e) => setFCidade(e.target.value)} /></div>
                <div><FxLabel>UF</FxLabel><FxInput value={fUf} onChange={(e) => setFUf(e.target.value)} maxLength={2} /></div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setEdit(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={onSave} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</button>
            </div>
          </div>
        )}
      </div>

      {/* tabs */}
      <div style={{ position: "sticky", top: 0, zIndex: 5, background: "var(--bg)" }}>
        <FxTabs tabs={TABS} active={tab} onChange={(id) => onTab(id as ClienteTab)} />
      </div>

      <div style={{ padding: "22px 40px 48px", maxWidth: 1240, margin: "0 auto", width: "100%" }}>
        {tab === "financeiro" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
              <FxKpi label="Recebido total" value={<FxMoney cents={r.recebidoCents} dir="in" size={24} />} icon="checkCircle" tone="pos" />
              <FxKpi label="A receber" value={<FxMoney cents={r.aReceberCents} plain size={24} />} icon="clock" accent="gold" />
              <FxKpi label="Vencido" value={<FxMoney cents={r.vencidoCents} plain size={24} />} icon="alertTriangle" tone={r.vencidoCents ? "neg" : undefined} />
            </div>
            <FxCardTitle
              title="Lançamentos do cliente"
              sub={`${detail.lancamentos.length} lançamentos vinculados`}
              right={
                <button className="btn btn-secondary" onClick={() => setModal({ type: "lancamento" })} style={{ height: 32 }}>
                  <Icon name="plus" size={14} />Novo lançamento
                </button>
              }
            />
            {lancSorted.length === 0
              ? sectionCard(<CrmEmpty icon="wallet" title="Sem lançamentos" sub="Crie um lançamento vinculado a este cliente." />)
              : sectionCard(lancSorted.map((l, i, arr) => (
                <CrmLancRow key={l.id} l={l} onToggle={onToggleLanc} last={i === arr.length - 1} />
              )))}
          </>
        )}

        {tab === "cobranca" && (
          <>
            {/* collection state + controls */}
            <div className="card" style={{ padding: 18, marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <CrmBadge tone={cobTone} dot>{cobLabel}</CrmBadge>
                {cob.motivo && <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{cob.motivo}</span>}
                {cob.desde && <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>· desde {crmDate(cob.desde)}</span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-subtle)", margin: "10px 0 14px" }}>
                Clientes pausados ou marcados como “não cobrar” saem do plano de ação e do próximo passo. Quem voltou a pagar recentemente também é poupado automaticamente.
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <FxLabel>Motivo</FxLabel>
                  <FxInput value={cobMotivo} placeholder="ex.: começou a regularizar / acordo / perda" onChange={(e) => setCobMotivo(e.target.value)} />
                </div>
                <div>
                  <FxLabel>Pausar por</FxLabel>
                  <select
                    className="fx-input"
                    value={cobDias}
                    onChange={(e) => setCobDias(Number(e.target.value))}
                    style={{ height: 38 }}
                  >
                    <option value={30}>30 dias</option>
                    <option value={60}>60 dias</option>
                    <option value={90}>90 dias</option>
                    <option value={180}>180 dias</option>
                  </select>
                </div>
                <button
                  className="btn btn-secondary"
                  disabled={cobBusy}
                  onClick={() => doCobranca({ acao: "pausar", motivo: cobMotivo.trim() || "Cobrança pausada", dias: cobDias })}
                >
                  <Icon name="clock" size={14} />Pausar cobrança
                </button>
                <button
                  className="btn btn-ghost"
                  disabled={cobBusy}
                  onClick={() => doCobranca({ acao: "suspender", motivo: cobMotivo.trim() || "Não cobrar" })}
                  style={{ color: "var(--fin-neg,#C0492F)" }}
                >
                  <Icon name="alertCircle" size={14} />Não cobrar mais
                </button>
                {cob.status !== "ativo" && (
                  <button className="btn btn-primary" disabled={cobBusy} onClick={() => doCobranca({ acao: "retomar" })}>
                    <Icon name="checkCircle" size={14} />Retomar cobrança
                  </button>
                )}
              </div>
            </div>

            {/* note composer */}
            <FxCardTitle title="Anotações" sub="Contexto que a LexIA lê sobre este cliente" />
            <div className="card" style={{ padding: 14, marginBottom: 14 }}>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Registre um combinado, negociação ou observação…"
                rows={2}
                style={{
                  width: "100%", resize: "vertical", borderRadius: 8, border: "1px solid var(--border)",
                  background: "var(--bg-soft)", color: "var(--text)", padding: "10px 12px", fontSize: 13, fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button className="btn btn-secondary" disabled={cobBusy || !noteText.trim()} onClick={addNote}>
                  <Icon name="plus" size={14} />Adicionar anotação
                </button>
              </div>
            </div>

            {/* timeline */}
            {detail.anotacoes.length === 0
              ? sectionCard(<CrmEmpty icon="handshake" title="Sem anotações" sub="Adicione contexto que a LexIA usará ao analisar o cliente." />)
              : sectionCard(detail.anotacoes.map((a, i) => {
                const dir = a.tipo === "cobranca"
                const tag = a.acao === "pausar" ? "Pausar cobrança" : a.acao === "suspender" ? "Não cobrar" : a.acao === "retomar" ? "Retomar cobrança" : null
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-sunken)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name={dir ? "handshake" : "fileText"} size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {tag && <CrmBadge tone={a.acao === "retomar" ? "pos" : a.acao === "suspender" ? "neg" : "gold"} dot>{tag}</CrmBadge>}
                        {a.fixado && <CrmBadge tone="neutral">Fixado</CrmBadge>}
                        {dir && a.ate && <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>até {crmDate(a.ate)}</span>}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text)", marginTop: tag ? 5 : 0, whiteSpace: "pre-wrap" }}>{a.conteudo}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 4 }}>{a.autor} · {crmDate(a.createdAt)}</div>
                    </div>
                    <button className="btn btn-ghost" onClick={() => removeNote(a.id)} title="Remover" style={{ width: 28, height: 28, padding: 0, flexShrink: 0 }}>
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                )
              }))}
          </>
        )}

        {tab === "tarefas" && (
          <>
            <FxCardTitle
              title="Tarefas"
              sub="Vinculadas a este cliente"
              right={
                <button className="btn btn-secondary" onClick={() => setModal({ type: "tarefa" })} style={{ height: 32 }}>
                  <Icon name="plus" size={14} />Nova tarefa
                </button>
              }
            />
            {detail.tarefas.length === 0
              ? sectionCard(<CrmEmpty icon="listChecks" title="Sem tarefas" sub="Crie uma tarefa para este cliente." />)
              : sectionCard(detail.tarefas.map((t, i) => {
                const sm = CRM_TASK_STATUS[t.status] ?? CRM_TASK_STATUS.todo
                const resp = dataset.socios.find((s) => s.id === t.responsavelId)?.nome
                return (
                  <CrmRow key={t.id} onClick={() => setModal({ type: "tarefa", tarefa: t })} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                    <CrmPrioTag p={t.prio} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{t.titulo}</div>
                      <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>Prazo {crmDate(t.prazo)}{resp ? ` · ${resp}` : ""}</div>
                    </div>
                    <CrmBadge tone={sm.tone}>{sm.label}</CrmBadge>
                    <Icon name="edit" size={14} style={{ color: "var(--text-subtle)" }} />
                  </CrmRow>
                )
              }))}
          </>
        )}

        {tab === "casos" && (
          <>
            <FxCardTitle title="Casos & Processos" sub={`${detail.casos.length} caso(s)`} />
            {detail.casos.length === 0
              ? sectionCard(<CrmEmpty icon="briefcase" title="Sem casos" />)
              : sectionCard(detail.casos.map((k, i) => (
                <div key={k.id}>
                  <CrmRow onClick={() => nav.openCaso(k.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.titulo}</div>
                      <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 2 }}>
                        {k.responsavel ? `resp. ${k.responsavel}` : "—"}{k.honorariosCount ? ` · ${k.honorariosCount} honorário(s)` : ""}
                      </div>
                    </div>
                    <CrmCasoTipoPill tipo={k.tipo} />
                    <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: "var(--text)", width: 110, textAlign: "right" }}>
                      <FxMoney cents={k.honorariosCents} plain />
                    </span>
                    <Icon name="chevronRight" size={16} style={{ color: "var(--text-subtle)" }} />
                  </CrmRow>
                  {k.processos.length > 0 && k.processos.map((p) => (
                    <CrmProcessoSubRow key={p.id} p={p} hoje={hoje} onClick={() => nav.openProcesso(p.id)} />
                  ))}
                </div>
              )))}
          </>
        )}

        {tab === "contratos" && (
          <>
            <FxCardTitle title="Contratos & honorários" sub={`${detail.honorarios.length} contrato(s)`} />
            {detail.honorarios.length === 0
              ? sectionCard(<CrmEmpty icon="receipt" title="Sem contratos" />)
              : sectionCard(detail.honorarios.map((h, i) => (
                <CrmRow key={h.id} onClick={() => nav.openContrato(h.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.descricao}</div>
                    <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 2 }}>
                      {h.caso || "Sem caso"}{h.vencimento ? ` · vence ${crmDate(h.vencimento)}` : ""}
                    </div>
                  </div>
                  <CrmContratoStatus status={h.status} venc={h.vencimento} />
                  <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: "var(--text)", width: 110, textAlign: "right" }}>
                    <FxMoney cents={h.valorCents} plain />
                  </span>
                  <Icon name="chevronRight" size={16} style={{ color: "var(--text-subtle)" }} />
                </CrmRow>
              )))}
          </>
        )}

        {tab === "eventos" && (
          <>
            <FxCardTitle
              title="Eventos"
              sub="Agenda vinculada a este cliente"
              right={
                <button className="btn btn-secondary" onClick={() => setModal({ type: "evento" })} style={{ height: 32 }}>
                  <Icon name="plus" size={14} />Novo evento
                </button>
              }
            />
            {detail.eventos.length === 0
              ? sectionCard(<CrmEmpty icon="calendar" title="Sem eventos" sub="Nenhum compromisso vinculado a este cliente." />)
              : sectionCard(detail.eventos.map((e, i) => {
                const m = CRM_EVT[e.tipo as EvtTipo] ?? CRM_EVT.outro
                const hora = e.inicio.length > 10 ? e.inicio.slice(11, 16) : null
                return (
                  <CrmRow key={e.id} onClick={() => setModal({ type: "evento", evento: e })} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: m.soft, color: m.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name={m.icon} size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{e.titulo}</div>
                      <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>
                        {crmDateLong(e.inicio)}{hora && !e.diaInteiro ? ` · ${hora}` : ""}{e.responsavel ? ` · ${e.responsavel}` : ""}
                      </div>
                    </div>
                    <CrmBadge tone="neutral">{m.label}</CrmBadge>
                  </CrmRow>
                )
              }))}
          </>
        )}

        {tab === "documentos" && (
          <>
            <FxCardTitle
              title="Documentos"
              sub="Gerados para este cliente"
              right={
                <button className="btn btn-secondary" onClick={() => setModal({ type: "documento" })} style={{ height: 32 }}>
                  <Icon name="plus" size={14} />Gerar novo
                </button>
              }
            />
            {detail.documentos.length === 0
              ? sectionCard(<CrmEmpty icon="fileText" title="Sem documentos" sub="Gere o primeiro documento deste cliente." />)
              : sectionCard(detail.documentos.map((d, i) => (
                <div key={d.id} className="crm-row" style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--bg-sunken)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="fileText" size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{d.nome}</div>
                    <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>
                      {d.template}{d.formato ? ` · ${d.formato}` : ""} · {crmDate(d.atualizadoEm)}
                    </div>
                  </div>
                  <CrmBadge tone={d.status === "finalizado" ? "pos" : "gold"} dot>{d.status === "finalizado" ? "Finalizado" : "Rascunho"}</CrmBadge>
                  <button className="btn btn-ghost" onClick={() => window.open(`/documents/editor/${d.template}`, "_blank")} style={{ width: 30, height: 30, padding: 0 }} title="Abrir no editor">
                    <Icon name="externalLink" size={15} />
                  </button>
                </div>
              )))}
          </>
        )}
      </div>

      {/* pre-linked create/edit modals — reload the detail on save */}
      {modal?.type === "tarefa" && (
        <CrmTarefaModal
          clienteId={clienteId}
          tarefa={modal.tarefa}
          socios={dataset.socios}
          onClose={() => setModal(null)}
          onSaved={() => { void load(); onRefresh() }}
        />
      )}
      {modal?.type === "lancamento" && (
        <CrmLancamentoModal clienteNome={c.nome} onClose={() => setModal(null)} onSaved={() => { void load(); onRefresh() }} />
      )}
      {modal?.type === "evento" && (
        <CrmEventoModal
          clienteId={clienteId}
          evento={modal.evento}
          socios={dataset.socios}
          casoOptions={dataset.casoOptions}
          onClose={() => setModal(null)}
          onSaved={() => { void load(); onRefresh() }}
        />
      )}
      {modal?.type === "documento" && (
        <CrmDocumentoModal clienteId={clienteId} onClose={() => setModal(null)} onSaved={() => { void load(); onRefresh() }} />
      )}
    </div>
  )
}
