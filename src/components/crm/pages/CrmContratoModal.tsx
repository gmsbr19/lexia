"use client"

// LexIA · CRM — Contrato detail modal. A Contrato é o DOCUMENTO ASSINADO entre o
// escritório e o cliente; pode reunir vários casos (ex.: um condomínio com
// assessoria mensal + uma ação de obrigação de fazer) e um caso pode não ter
// contrato. O financeiro do contrato é sempre a SOMA dos honorários dos casos
// vinculados. Honorários individuais abrem um modal aninhado (CrmHonorarioModal).
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CrmBadge,
  CrmEmpty,
  CrmLink,
  CrmRow,
  FxInput,
  FxKpi,
  FxLabel,
  FxModal,
  FxSelect,
  useCrmToast,
} from "../crm-kit"
import { Icon } from "../crm-icons"
import { crmDate, crmMoney, crmTodayISO } from "../crm-fmt"
import { Combobox } from "@/components/ui/Combobox"
import { DateField } from "@/components/ui/DatePicker"
import { createCaso, createCliente, createContrato, deleteContrato, fetchContratoDetail, patchContrato } from "../crm-api"
import { resolveAreaColor, resolveAreaLabel, toAreaOptions, useAreasStore } from "@/lib/areas/store"
import { formatBRL, parseBRLToCents } from "@/lib/finance/money"
import { CrmHonorarioModal } from "./CrmHonorarioModal"
import type { ContratoDetail, CrmDataset } from "../crm-types"

const errMsg = (err: unknown) => (err instanceof Error ? err.message : "Erro")
// Caso creation is gated to socio/advogado (see /api/casos POST) — the quick
// "criar caso" option only shows for roles that can actually create one.
const CAN_CRIAR_CASO = ["admin", "socio", "advogado"]
// Área picker options ([{value,label}]) from the app-configured areas, with a
// leading "none" entry. `areas` comes from the shared store (loaded in the shell).
function useAreaOptions() {
  const areas = useAreasStore((s) => s.areas)
  const opts = toAreaOptions(areas).map((a) => ({ value: a.id, label: a.label }))
  return { areas, areaSelectOptions: [{ value: "", label: "— Nenhuma —" }, ...opts] }
}

interface Props {
  contratoId: number
  dataset: CrmDataset
  onClose: () => void
  onRefresh: () => void
  nav: { openCliente: (id: number) => void; openCaso: (id: number) => void }
}

export function CrmContratoModal({ contratoId, dataset, onClose, onRefresh, nav }: Props) {
  const { toast } = useCrmToast()
  const [detail, setDetail] = useState<ContratoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [honorarioId, setHonorarioId] = useState<number | null>(null)

  const [editing, setEditing] = useState(false)
  const [titulo, setTitulo] = useState("")
  const [dataFechamento, setDataFechamento] = useState(crmTodayISO())
  const [valorTotal, setValorTotal] = useState("")
  const [area, setArea] = useState("")
  const [observacoes, setObservacoes] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { areas, areaSelectOptions } = useAreaOptions()

  const canWrite = dataset.role === "admin" || dataset.role === "socio" || dataset.role === "financeiro"
  const canDelete = dataset.role === "admin" || dataset.role === "socio"
  const canCriarCaso = CAN_CRIAR_CASO.includes(dataset.role)

  const load = useCallback(async () => {
    try {
      const d = await fetchContratoDetail(contratoId)
      setDetail(d)
      setTitulo(d.titulo ?? "")
      setDataFechamento(d.dataFechamento?.slice(0, 10) ?? crmTodayISO())
      setValorTotal(d.valorTotalCents != null ? formatBRL(d.valorTotalCents) : "")
      setArea(d.area ?? "")
      setObservacoes(d.observacoes ?? "")
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setLoading(false)
    }
  }, [contratoId, toast])

  useEffect(() => {
    void load()
  }, [load])

  // Only free casos (no contrato at all — never one tied to another contract, so
  // picking never steals a caso away) AND belonging to THIS contract's client
  // (assertCasosDoCliente only allows same-client links). When the contrato has
  // no client, only casos with no client are eligible.
  const casoOpts = useMemo(() => {
    const cid = detail?.clienteId ?? null
    return dataset.casos
      .filter((c) => c.contratoId == null && (cid == null ? c.clienteId == null : c.clienteId === cid))
      .map((c) => ({ value: String(c.id), label: c.titulo }))
  }, [dataset.casos, detail?.clienteId])

  const salvar = async () => {
    setBusy(true)
    try {
      await patchContrato(contratoId, {
        titulo: titulo.trim() || null,
        dataFechamento,
        valorTotalCents: valorTotal.trim() ? parseBRLToCents(valorTotal) : null,
        area: area || null,
        observacoes: observacoes.trim() || null,
      })
      toast("Contrato salvo")
      setEditing(false)
      onRefresh()
      await load()
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setBusy(false)
    }
  }

  const vincularCaso = async (casoId: number) => {
    setBusy(true)
    try {
      await patchContrato(contratoId, { vincularCasoIds: [casoId] })
      onRefresh()
      await load()
      toast("Caso vinculado ao contrato")
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setBusy(false)
    }
  }

  // Quick-create a caso from the typed name, tied to this contract's client, then
  // link it. Área defaults to the contract's área when set.
  const criarEVincularCaso = async (nome: string) => {
    setBusy(true)
    try {
      const r = await createCaso({ titulo: nome, clientePrincipalId: detail?.clienteId ?? undefined, area: detail?.area ?? null })
      await patchContrato(contratoId, { vincularCasoIds: [r.id] })
      onRefresh()
      await load()
      toast("Caso criado e vinculado")
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setBusy(false)
    }
  }

  const desvincularCaso = async (casoId: number) => {
    setBusy(true)
    try {
      await patchContrato(contratoId, { desvincularCasoIds: [casoId] })
      onRefresh()
      await load()
      toast("Caso desvinculado")
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setBusy(false)
    }
  }

  const excluir = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setBusy(true)
    try {
      await deleteContrato(contratoId)
      toast("Contrato excluído — os casos e documentos vinculados continuam, só ficam sem contrato")
      onRefresh()
      onClose()
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
      setBusy(false)
    }
  }

  const abertoCents = detail ? detail.valorContratadoCents - detail.recebidoCents : 0

  const footer = detail ? (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      {canDelete ? (
        <button
          className="btn btn-ghost"
          onClick={excluir}
          disabled={busy}
          style={{ color: "var(--fin-neg,#C0492F)" }}
        >
          <Icon name="trash2" size={14} />
          {confirmDelete ? "Confirmar exclusão" : "Excluir contrato"}
        </button>
      ) : (
        <span />
      )}
      {editing ? (
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setEditing(false)} disabled={busy}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={salvar} disabled={busy}>
            {busy ? "Salvando…" : "Salvar"}
          </button>
        </div>
      ) : canWrite ? (
        <button className="btn btn-secondary" onClick={() => setEditing(true)}>
          <Icon name="edit" size={14} />
          Editar
        </button>
      ) : null}
    </div>
  ) : null

  return (
    <>
      <FxModal
        title={loading ? "Carregando…" : detail ? (detail.titulo ?? detail.cliente ?? `Contrato #${detail.id}`) : "Contrato"}
        sub={
          detail ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {detail.cliente && detail.clienteId && (
                <CrmLink onClick={() => nav.openCliente(detail.clienteId!)} icon="user">
                  {detail.cliente}
                </CrmLink>
              )}
              {detail.area && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: resolveAreaColor(areas, detail.area) || "var(--text-subtle)" }} />
                  {resolveAreaLabel(areas, detail.area)}
                </span>
              )}
              <span style={{ color: "var(--text-subtle)" }}>· fechado em {crmDate(detail.dataFechamento)}</span>
            </span>
          ) : undefined
        }
        onClose={onClose}
        footer={footer}
        width={720}
      >
        {loading || !detail ? (
          <CrmEmpty icon="receipt" title={loading ? "Carregando…" : "Contrato não encontrado"} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {editing && (
              <div
                className="card"
                style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, background: "var(--bg-soft)" }}
              >
                <div>
                  <FxLabel>Título</FxLabel>
                  <FxInput value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={detail.cliente ?? "Título do contrato"} />
                </div>
                <div>
                  <FxLabel>Data de fechamento</FxLabel>
                  <DateField value={dataFechamento} onChange={(iso) => setDataFechamento(iso ?? crmTodayISO())} />
                </div>
                <div>
                  <FxLabel hint="valor total do contrato (métrica comercial)">Valor total</FxLabel>
                  <FxInput value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} placeholder="R$ 0,00" inputMode="decimal" />
                </div>
                <div>
                  <FxLabel>Área do direito</FxLabel>
                  <FxSelect value={area} onChange={(e) => setArea(e.target.value)} options={areaSelectOptions} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <FxLabel>Observações</FxLabel>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={2}
                    style={{
                      width: "100%", resize: "vertical", borderRadius: 8, border: "1px solid var(--border)",
                      background: "var(--surface)", color: "var(--text)", padding: "10px 12px", fontSize: 13, fontFamily: "inherit",
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: `repeat(${detail.valorTotalCents != null ? 4 : 3}, 1fr)`, gap: 12 }}>
              {detail.valorTotalCents != null && (
                <FxKpi label="Valor total" value={crmMoney(detail.valorTotalCents)} icon="receipt" accent="gold" />
              )}
              <FxKpi label="Honorários" value={crmMoney(detail.valorContratadoCents)} icon="receipt" />
              <FxKpi label="Recebido" value={crmMoney(detail.recebidoCents)} icon="checkCircle" tone="pos" />
              <FxKpi label="Em aberto" value={crmMoney(abertoCents)} icon="clock" />
            </div>

            {observacoes && !editing && (
              <div style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>{observacoes}</div>
            )}

            {/* casos vinculados */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                  Casos vinculados <span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>({detail.casos.length})</span>
                </div>
                {canWrite && (casoOpts.length > 0 || canCriarCaso) && (
                  <div style={{ width: 230 }}>
                    <Combobox
                      options={casoOpts}
                      value={null}
                      onChange={(v) => {
                        if (v) void vincularCaso(Number(v))
                      }}
                      panelWidth="content"
                      placeholder="+ Vincular caso…"
                      emptyLabel="Nenhum caso livre deste cliente"
                      onCreate={canCriarCaso ? criarEVincularCaso : undefined}
                      createLabel={(q) => `Criar caso "${q}"`}
                    />
                  </div>
                )}
              </div>
              {detail.casos.length === 0 ? (
                <CrmEmpty icon="briefcase" title="Nenhum caso vinculado" sub="Vincule um caso na lista acima." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {detail.casos.map((k) => (
                    <div key={k.id} className="card" style={{ overflow: "hidden" }}>
                      <CrmRow
                        onClick={() => nav.openCaso(k.id)}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {k.titulo}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 2 }}>
                            {k.honorarios.length} {k.honorarios.length === 1 ? "honorário" : "honorários"}
                          </div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                          {crmMoney(k.valorContratadoCents)}
                        </span>
                        {canWrite && (
                          <button
                            className="btn btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              void desvincularCaso(k.id)
                            }}
                            title="Desvincular deste contrato"
                            style={{ width: 28, height: 28, padding: 0, flexShrink: 0 }}
                          >
                            <Icon name="x" size={14} />
                          </button>
                        )}
                      </CrmRow>
                      {k.honorarios.length > 0 && (
                        <div style={{ borderTop: "1px solid var(--border)" }}>
                          {k.honorarios.map((h, i) => (
                            <div
                              key={h.id}
                              className="crm-row"
                              onClick={() => setHonorarioId(h.id)}
                              style={{
                                display: "flex", alignItems: "center", gap: 10, padding: "9px 14px 9px 30px", cursor: "pointer",
                                borderTop: i ? "1px solid var(--border)" : "none",
                              }}
                            >
                              <span style={{ flex: 1, fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {h.descricao}
                              </span>
                              <CrmBadge tone={h.status === "recebido" ? "pos" : "neutral"} dot>
                                {h.status === "recebido" ? "Recebido" : "Lançado"}
                              </CrmBadge>
                              <span style={{ width: 90, textAlign: "right", fontSize: 12, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                                {crmMoney(h.valorCents)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* documentos vinculados */}
            {detail.documentos.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 10 }}>Documentos</div>
                <div className="card" style={{ overflow: "hidden" }}>
                  {detail.documentos.map((d, i) => (
                    <div
                      key={d.id}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: i ? "1px solid var(--border)" : "none" }}
                    >
                      <Icon name="fileText" size={14} style={{ color: "var(--text-subtle)" }} />
                      <span style={{ flex: 1, fontSize: 12.5, color: "var(--text)" }}>{d.nome}</span>
                      <CrmBadge tone="neutral">{d.status}</CrmBadge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </FxModal>
      {honorarioId != null && (
        <CrmHonorarioModal
          honorarioId={honorarioId}
          dataset={dataset}
          onClose={() => setHonorarioId(null)}
          onRefresh={() => {
            onRefresh()
            void load()
          }}
          nav={{ openCliente: nav.openCliente, openCaso: nav.openCaso }}
        />
      )}
    </>
  )
}

// ───────────────────────── Novo contrato ─────────────────────────
interface NovoContratoProps {
  dataset: CrmDataset
  onClose: () => void
  onCreated: (id: number) => void
}
export function CrmNovoContratoModal({ dataset, onClose, onCreated }: NovoContratoProps) {
  const { toast } = useCrmToast()
  const [clienteId, setClienteId] = useState("")
  const [titulo, setTitulo] = useState("")
  const [dataFechamento, setDataFechamento] = useState(crmTodayISO())
  const [valorTotal, setValorTotal] = useState("")
  const [area, setArea] = useState("")
  const [saving, setSaving] = useState(false)
  // Clients created inline (not yet in dataset.clienteOptions) so the combobox
  // can render the freshly-picked one.
  const [extraClientes, setExtraClientes] = useState<{ id: number; nome: string }[]>([])
  // Casos to link on create (existing free casos and/or inline-created ones).
  const [casos, setCasos] = useState<{ id: number; titulo: string }[]>([])

  const { areaSelectOptions } = useAreaOptions()
  const canCriarCaso = CAN_CRIAR_CASO.includes(dataset.role)
  const clienteIdNum = clienteId ? Number(clienteId) : null

  const clienteOptions = useMemo(() => {
    const known = new Set(dataset.clienteOptions.map((c) => c.id))
    const extra = extraClientes.filter((e) => !known.has(e.id)).map((e) => ({ value: String(e.id), label: e.nome }))
    return [...extra, ...dataset.clienteOptions.map((c) => ({ value: String(c.id), label: c.nome }))]
  }, [dataset.clienteOptions, extraClientes])

  // Free casos of the selected client, minus the ones already chosen.
  const casoOpts = useMemo(() => {
    if (clienteIdNum == null) return []
    const chosen = new Set(casos.map((c) => c.id))
    return dataset.casos
      .filter((c) => c.contratoId == null && c.clienteId === clienteIdNum && !chosen.has(c.id))
      .map((c) => ({ value: String(c.id), label: c.titulo }))
  }, [dataset.casos, clienteIdNum, casos])

  const criarCliente = async (nome: string) => {
    try {
      const r = (await createCliente({ nome })) as { id: number; nome?: string }
      setExtraClientes((prev) => [...prev, { id: r.id, nome: r.nome ?? nome }])
      setClienteId(String(r.id))
      setCasos([]) // client changed → reset the linked casos
      toast("Cliente criado")
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    }
  }

  const addCaso = (id: number) => {
    const row = dataset.casos.find((c) => c.id === id)
    setCasos((prev) => (prev.some((c) => c.id === id) ? prev : [...prev, { id, titulo: row?.titulo ?? `Caso #${id}` }]))
  }
  const criarCaso = async (nome: string) => {
    if (clienteIdNum == null) return
    try {
      const r = await createCaso({ titulo: nome, clientePrincipalId: clienteIdNum, area: area || null })
      setCasos((prev) => [...prev, { id: r.id, titulo: nome }])
      toast("Caso criado")
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    }
  }

  const salvar = async () => {
    if (saving) return
    setSaving(true)
    try {
      const r = await createContrato({
        clienteId: clienteIdNum,
        titulo: titulo.trim() || null,
        dataFechamento,
        valorTotalCents: valorTotal.trim() ? parseBRLToCents(valorTotal) : null,
        area: area || null,
        casoIds: casos.map((c) => c.id),
      })
      toast("Contrato criado")
      onCreated(r.id)
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <FxModal
      title="Novo contrato"
      sub="O documento assinado; pode reunir vários casos do cliente."
      onClose={onClose}
      width={520}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={saving} onClick={salvar}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FxLabel>Cliente</FxLabel>
          <Combobox
            options={clienteOptions}
            value={clienteId || null}
            onChange={(v) => {
              setClienteId(v ?? "")
              setCasos([]) // client changed → reset linked casos
            }}
            placeholder="Buscar cliente…"
            panelWidth="content"
            onCreate={criarCliente}
            createLabel={(q) => `Criar cliente "${q}"`}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <FxLabel hint="valor total do contrato (métrica comercial)">Valor total</FxLabel>
            <FxInput value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} placeholder="R$ 0,00" inputMode="decimal" />
          </div>
          <div>
            <FxLabel>Área do direito</FxLabel>
            <FxSelect value={area} onChange={(e) => setArea(e.target.value)} options={areaSelectOptions} />
          </div>
        </div>
        <div>
          <FxLabel>Título (opcional)</FxLabel>
          <FxInput value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="ex.: Assessoria mensal" />
        </div>
        <div>
          <FxLabel>Data de fechamento</FxLabel>
          <DateField value={dataFechamento} onChange={(iso) => setDataFechamento(iso ?? crmTodayISO())} />
        </div>

        {/* Vincular casos — só após escolher o cliente (só se vinculam casos do mesmo cliente) */}
        <div>
          <FxLabel>Casos vinculados</FxLabel>
          {clienteIdNum == null ? (
            <div style={{ fontSize: 12.5, color: "var(--text-subtle)", padding: "4px 0" }}>
              Escolha um cliente para vincular casos.
            </div>
          ) : (
            <>
              {casos.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  {casos.map((c) => (
                    <span
                      key={c.id}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text)",
                        background: "var(--bg-sunken)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 8px",
                      }}
                    >
                      {c.titulo}
                      <button
                        className="btn btn-ghost"
                        onClick={() => setCasos((prev) => prev.filter((x) => x.id !== c.id))}
                        title="Remover"
                        style={{ width: 20, height: 20, padding: 0 }}
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {(casoOpts.length > 0 || canCriarCaso) && (
                <Combobox
                  options={casoOpts}
                  value={null}
                  onChange={(v) => {
                    if (v) addCaso(Number(v))
                  }}
                  panelWidth="content"
                  placeholder="+ Vincular caso…"
                  emptyLabel="Nenhum caso livre deste cliente"
                  onCreate={canCriarCaso ? criarCaso : undefined}
                  createLabel={(q) => `Criar caso "${q}"`}
                />
              )}
            </>
          )}
        </div>
      </div>
    </FxModal>
  )
}
