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
import { createContrato, deleteContrato, fetchContratoDetail, patchContrato } from "../crm-api"
import { CrmHonorarioModal } from "./CrmHonorarioModal"
import type { ContratoDetail, CrmDataset } from "../crm-types"

const errMsg = (err: unknown) => (err instanceof Error ? err.message : "Erro")

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
  const [observacoes, setObservacoes] = useState("")
  const [pickCaso, setPickCaso] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  const canWrite = dataset.role === "admin" || dataset.role === "socio" || dataset.role === "financeiro"
  const canDelete = dataset.role === "admin" || dataset.role === "socio"

  const load = useCallback(async () => {
    try {
      const d = await fetchContratoDetail(contratoId)
      setDetail(d)
      setTitulo(d.titulo ?? "")
      setDataFechamento(d.dataFechamento?.slice(0, 10) ?? crmTodayISO())
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

  // Only casos with NO contrato at all — a caso already tied to this contrato
  // (or, importantly, to a DIFFERENT one) never shows up here, so picking an
  // option can never silently steal a caso away from another contract.
  const casoOpts = useMemo(
    () => dataset.casos.filter((c) => c.contratoId == null).map((c) => ({ id: c.id, nome: c.titulo })),
    [dataset.casos],
  )

  const salvar = async () => {
    setBusy(true)
    try {
      await patchContrato(contratoId, {
        titulo: titulo.trim() || null,
        dataFechamento,
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
      setPickCaso("")
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
                  <FxInput type="date" value={dataFechamento} onChange={(e) => setDataFechamento(e.target.value)} />
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <FxKpi label="Contratado" value={crmMoney(detail.valorContratadoCents)} icon="receipt" accent="gold" />
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
                {canWrite && casoOpts.length > 0 && (
                  <div style={{ width: 230 }}>
                    <FxSelect
                      value={pickCaso}
                      onChange={(e) => {
                        const v = e.target.value
                        setPickCaso(v)
                        if (v) void vincularCaso(Number(v))
                      }}
                      placeholder="+ Vincular caso…"
                      options={casoOpts.map((c) => ({ value: String(c.id), label: c.nome }))}
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
  const [saving, setSaving] = useState(false)

  const salvar = async () => {
    if (saving) return
    setSaving(true)
    try {
      const r = await createContrato({
        clienteId: clienteId ? Number(clienteId) : null,
        titulo: titulo.trim() || null,
        dataFechamento,
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
      sub="Depois de criado, vincule os casos deste contrato."
      onClose={onClose}
      width={480}
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
          <FxSelect
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            placeholder="— Nenhum —"
            options={dataset.clienteOptions.map((c) => ({ value: String(c.id), label: c.nome }))}
          />
        </div>
        <div>
          <FxLabel>Título (opcional)</FxLabel>
          <FxInput value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="ex.: Assessoria mensal" />
        </div>
        <div>
          <FxLabel>Data de fechamento</FxLabel>
          <FxInput type="date" value={dataFechamento} onChange={(e) => setDataFechamento(e.target.value)} />
        </div>
      </div>
    </FxModal>
  )
}
