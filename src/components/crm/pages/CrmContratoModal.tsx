"use client"

// LexIA · CRM — Contrato (honorário) detail modal. Ported from page-contratos.jsx,
// wired to the real backend: fetches HonorarioDetail (honorário + série + parcelas
// from the cash ledger) and runs pagar/desmarcar against the finance routes.
import { useCallback, useEffect, useState } from "react"
import {
  CrmBadge,
  CrmContratoStatus,
  CrmLink,
  FxKpi,
  FxModal,
  useCrmToast,
} from "../crm-kit"
import { Icon } from "../crm-icons"
import { crmDate, crmMoney, crmTodayISO } from "../crm-fmt"
import { desmarcarHonorario, fetchHonorarioDetail, pagarHonorario } from "../crm-api"
import type { CrmDataset, HonorarioDetail } from "../crm-types"

interface Props {
  contratoId: number
  dataset: CrmDataset
  onClose: () => void
  onRefresh: () => void
  nav: { openCliente: (id: number) => void; openCaso: (id: number) => void }
}

const TIPO_LABEL: Record<string, string> = {
  recorrente: "Recorrente",
  parcelado: "Parcelado",
  exito: "Êxito",
  avista: "À vista",
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 500, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{children}</div>
    </div>
  )
}

export function CrmContratoModal({ contratoId, dataset, onClose, onRefresh, nav }: Props) {
  const { toast } = useCrmToast()
  const [h, setH] = useState<HonorarioDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [contaId, setContaId] = useState<number | "">("")
  const [data, setData] = useState(crmTodayISO())

  const load = useCallback(async () => {
    try {
      const d = await fetchHonorarioDetail(contratoId)
      setH(d)
      if (d.contaId) setContaId(d.contaId)
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", { tone: "neg", icon: "alertTriangle" })
    } finally {
      setLoading(false)
    }
  }, [contratoId, toast])

  useEffect(() => {
    void load()
  }, [load])

  const marcarRecebido = useCallback(async () => {
    if (!h) return
    if (!contaId) {
      toast("Selecione a conta de recebimento", { tone: "neg", icon: "alertTriangle" })
      return
    }
    setBusy(true)
    try {
      await pagarHonorario(h.id, Number(contaId), data || null)
      await load()
      onRefresh()
      toast("Honorário marcado como recebido")
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", { tone: "neg", icon: "alertTriangle" })
    } finally {
      setBusy(false)
    }
  }, [h, contaId, data, load, onRefresh, toast])

  const desfazer = useCallback(async () => {
    if (!h) return
    setBusy(true)
    try {
      await desmarcarHonorario(h.id)
      await load()
      onRefresh()
      toast("Recebimento desfeito")
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", { tone: "neg", icon: "alertTriangle" })
    } finally {
      setBusy(false)
    }
  }, [h, load, onRefresh, toast])

  const recebido = h?.status === "recebido"
  const tipoLabel = h?.tipo ? TIPO_LABEL[h.tipo] ?? h.tipo : "—"

  // Prefer the cash-ledger parcelas; fall back to the honorário série.
  const hasParcelas = !!h && h.parcelas.length > 0
  const hasSerie = !!h && h.serie.length > 1

  const footer = h ? (
    recebido ? (
      <button className="btn btn-secondary" onClick={desfazer} disabled={busy}>
        <Icon name="refreshCw" size={14} />
        Desfazer recebimento
      </button>
    ) : (
      <button className="btn btn-primary" onClick={marcarRecebido} disabled={busy}>
        <Icon name="check" size={14} />
        Marcar como recebido
      </button>
    )
  ) : null

  return (
    <FxModal
      title={loading ? "Carregando…" : h ? h.descricao : "Contrato"}
      sub={h ? `${tipoLabel} · ${crmMoney(h.valorCents)}` : undefined}
      onClose={onClose}
      footer={footer}
      width={640}
    >
      {loading || !h ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          {loading ? "Carregando contrato…" : "Contrato não encontrado."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* status + links */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <CrmBadge tone="neutral">{tipoLabel}</CrmBadge>
            <CrmContratoStatus status={h.status} venc={h.vencimento} />
            {h.clienteId && h.cliente && (
              <CrmLink onClick={() => nav.openCliente(h.clienteId!)} icon="user">
                {h.cliente}
              </CrmLink>
            )}
            {h.casoId && h.caso && (
              <>
                <span style={{ color: "var(--text-subtle)" }}>·</span>
                <CrmLink onClick={() => nav.openCaso(h.casoId!)} icon="briefcase">
                  {h.caso.length > 32 ? h.caso.slice(0, 32) + "…" : h.caso}
                </CrmLink>
              </>
            )}
          </div>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FxKpi label="Valor bruto" value={crmMoney(h.valorCents)} icon="receipt" accent="gold" />
            <FxKpi
              label="Valor líquido (est.)"
              value={crmMoney(h.valorLiquidoCents)}
              sub={recebido ? "Recebido" : "A receber"}
              icon="checkCircle"
              tone={recebido ? "pos" : undefined}
            />
          </div>

          {/* detail grid */}
          <div
            className="card"
            style={{
              padding: 16,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "16px 18px",
              background: "var(--bg-soft)",
            }}
          >
            <Field label="Tipo">{tipoLabel}</Field>
            <Field label="Responsável">{h.responsavel || "—"}</Field>
            <Field label="Conta de recebimento">{h.conta || "—"}</Field>
            <Field label="Vencimento">{crmDate(h.vencimento)}</Field>
            <Field label="Recebido em">
              {h.dataPagamento ? crmDate(h.dataPagamento) : <span style={{ color: "var(--text-subtle)" }}>—</span>}
            </Field>
            <Field label="Processo">{h.processoTitulo || "—"}</Field>
          </div>

          {/* received action: pick conta + data (only when not yet received) */}
          {!recebido && (
            <div
              className="card"
              style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, background: "var(--surface)" }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Registrar recebimento</div>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginBottom: 6 }}>
                    Conta de recebimento
                  </div>
                  <div style={{ position: "relative" }}>
                    <select
                      className="input"
                      value={contaId === "" ? "" : String(contaId)}
                      onChange={(e) => setContaId(e.target.value ? Number(e.target.value) : "")}
                      style={{ height: 38, fontSize: 14, appearance: "none", WebkitAppearance: "none", paddingRight: 34, cursor: "pointer" }}
                    >
                      <option value="">Selecione…</option>
                      {dataset.contaOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                    <div
                      style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        color: "var(--text-subtle)",
                      }}
                    >
                      <Icon name="chevronDown" size={15} />
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginBottom: 6 }}>
                    Data
                  </div>
                  <input
                    className="input"
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    style={{ height: 38, fontSize: 14 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* parcelas / série */}
          {(hasParcelas || hasSerie) && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 10 }}>
                {hasParcelas ? "Parcelas (financeiro)" : "Série de honorários"}
              </div>
              <div className="card" style={{ overflow: "hidden" }}>
                {hasParcelas
                  ? h.parcelas.map((l, i) => (
                      <div
                        key={l.id}
                        className="crm-row"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "11px 14px",
                          borderTop: i ? "1px solid var(--border)" : "none",
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            fontSize: 12,
                            color: "var(--text-subtle)",
                            fontVariantNumeric: "tabular-nums",
                            flexShrink: 0,
                          }}
                        >
                          {h.parcelas.length > 1 ? `${i + 1}/${h.parcelas.length}` : ""}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>
                            Venc.{crmDate(l.venc)}
                          </div>
                          {l.pagoData && (
                            <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                              Recebido em {crmDate(l.pagoData)}
                            </div>
                          )}
                        </div>
                        <CrmContratoStatus status={l.pago ? "recebido" : "lancado"} venc={l.venc} />
                        <span
                          style={{
                            width: 100,
                            textAlign: "right",
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--text)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {crmMoney(l.valorCents)}
                        </span>
                      </div>
                    ))
                  : h.serie.map((s, i) => (
                      <div
                        key={s.id}
                        className="crm-row"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "11px 14px",
                          borderTop: i ? "1px solid var(--border)" : "none",
                          background: s.id === h.id ? "var(--bg-soft)" : undefined,
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            fontSize: 12,
                            color: "var(--text-subtle)",
                            fontVariantNumeric: "tabular-nums",
                            flexShrink: 0,
                          }}
                        >
                          {h.serie.length > 1 ? `${i + 1}/${h.serie.length}` : ""}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>
                            Venc.{crmDate(s.vencimento)}
                          </div>
                          {s.dataPagamento && (
                            <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                              Recebido em {crmDate(s.dataPagamento)}
                            </div>
                          )}
                        </div>
                        <CrmContratoStatus status={s.status} venc={s.vencimento} />
                        <span
                          style={{
                            width: 100,
                            textAlign: "right",
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--text)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {crmMoney(s.valorCents)}
                        </span>
                      </div>
                    ))}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "var(--text-subtle)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Icon name="link2" size={13} /> Lançamentos vinculados ao financeiro do escritório.
              </div>
            </div>
          )}
        </div>
      )}
    </FxModal>
  )
}
