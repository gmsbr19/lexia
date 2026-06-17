"use client"

// LexIA · CRM — Caso detail modal. Fetches CasoDetail via fetchCasoDetail(id):
// editable dados do processo (PATCH via patchCaso), financeiro do caso (totals +
// lançamentos), and the rateio entre sócios slider (snap 0/50/100, 2 sócios,
// live R$ reflection over recebido+aberto, Salvar → setResponsaveis). Rateio
// section + footer hidden for role==='staff'. Money is integer centavos.
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  CrmBadge,
  CrmCasoTipoPill,
  CrmContratoStatus,
  CrmEmpty,
  CrmLink,
  FxDirChip,
  FxInput,
  FxKpi,
  FxLabel,
  FxModal,
  FxMoney,
  FxSelect,
  useCrmToast,
} from "../crm-kit"
import { Icon } from "../crm-icons"
import { fetchCasoDetail, patchCaso, setResponsaveis } from "../crm-api"
import { crmDate, crmMoney } from "../crm-fmt"
import type { CasoDetail, CrmDataset, CrmNav, Role } from "../crm-types"

interface Props {
  casoId: number
  role: Role
  dataset: CrmDataset
  onClose: () => void
  onRefresh: () => void
  nav: CrmNav
}

const STATUS_OPTS = [
  { value: "ativo", label: "Em andamento" },
  { value: "arquivado", label: "Arquivado" },
]

// Editable subset of "dados do processo".
interface ProcessoForm {
  numeroProcesso: string
  tribunal: string
  vara: string
  instancia: string
  tipoAcao: string
  valorCausaReais: string // user enters reais; converted to centavos on save
  dataDistribuicao: string
  ultimaMovimentacao: string
  status: string
}

const reaisToCents = (s: string): number | null => {
  const t = s.trim().replace(/\./g, "").replace(",", ".")
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}
const centsToReais = (cents: number | null): string =>
  cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",")

function formFrom(d: CasoDetail): ProcessoForm {
  return {
    numeroProcesso: d.numeroProcesso ?? "",
    tribunal: d.tribunal ?? "",
    vara: d.vara ?? "",
    instancia: d.instancia ?? "",
    tipoAcao: d.tipoAcao ?? "",
    valorCausaReais: centsToReais(d.valorCausaCents),
    dataDistribuicao: d.dataDistribuicao?.slice(0, 10) ?? "",
    ultimaMovimentacao: d.ultimaMovimentacao?.slice(0, 10) ?? "",
    status: d.status ?? "ativo",
  }
}

// ───────────────────────── rateio slider ─────────────────────────
function CrmRateioSlider({
  value,
  onChange,
  total,
  nomeA,
  nomeB,
}: {
  value: number // sócio A (ordem 0) %
  onChange: (v: number) => void
  total: number // centavos
  nomeA: string
  nomeB: string
}) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [drag, setDrag] = useState(false)
  const snap = (v: number) => {
    for (const s of [0, 50, 100]) if (Math.abs(v - s) <= 6) return s
    return v
  }
  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      let pct = Math.round(((clientX - r.left) / r.width) * 100)
      pct = Math.max(0, Math.min(100, pct))
      onChange(snap(pct))
    },
    [onChange],
  )
  useEffect(() => {
    if (!drag) return
    const mv = (e: MouseEvent) => setFromClientX(e.clientX)
    const up = () => setDrag(false)
    window.addEventListener("mousemove", mv)
    window.addEventListener("mouseup", up)
    return () => {
      window.removeEventListener("mousemove", mv)
      window.removeEventListener("mouseup", up)
    }
  }, [drag, setFromClientX])
  const a = value
  const b = 100 - value
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") onChange(Math.max(0, value - 5))
    if (e.key === "ArrowRight") onChange(Math.min(100, value + 5))
  }
  const presets = [
    { l: `100% ${nomeA.split(/\s+/)[0]}`, v: 100 },
    { l: "50 / 50", v: 50 },
    { l: `100% ${nomeB.split(/\s+/)[0]}`, v: 0 },
  ]
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-subtle)", fontWeight: 500 }}>{nomeA}</div>
          <div
            style={{
              fontSize: 25, fontWeight: 500, letterSpacing: "-0.03em", color: "var(--text)", fontVariantNumeric: "tabular-nums",
            }}
          >
            {a}
            <span style={{ fontSize: 16, color: "var(--text-subtle)" }}>%</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
            {crmMoney(Math.round((total * a) / 100))}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "var(--text-subtle)", fontWeight: 500 }}>{nomeB}</div>
          <div
            style={{
              fontSize: 25, fontWeight: 500, letterSpacing: "-0.03em", color: "var(--text)", fontVariantNumeric: "tabular-nums",
            }}
          >
            {b}
            <span style={{ fontSize: 16, color: "var(--text-subtle)" }}>%</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
            {crmMoney(Math.round((total * b) / 100))}
          </div>
        </div>
      </div>
      <div
        ref={trackRef}
        onMouseDown={(e) => {
          setDrag(true)
          setFromClientX(e.clientX)
        }}
        style={{ position: "relative", height: 38, cursor: "pointer", userSelect: "none", padding: "14px 0" }}
      >
        <div style={{ position: "relative", height: 10, borderRadius: 999, overflow: "hidden", background: "var(--bg-sunken)" }}>
          <div style={{ position: "absolute", inset: 0, width: `${a}%`, background: "var(--brand-gold)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: `${b}%`, background: "var(--brand-navy)", opacity: 0.85 }} />
        </div>
        {[0, 50, 100].map((s) => (
          <div
            key={s}
            style={{
              position: "absolute", top: 9, left: `${s}%`, transform: "translateX(-50%)", width: 2, height: 20,
              background: "var(--border-strong)", borderRadius: 1, pointerEvents: "none",
            }}
          />
        ))}
        <div
          role="slider"
          aria-valuenow={a}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          onKeyDown={onKey}
          style={{
            position: "absolute", top: "50%", left: `${a}%`, transform: "translate(-50%,-50%)", width: 24, height: 24,
            borderRadius: "50%", background: "var(--surface)", border: "2px solid var(--accent)",
            boxShadow: "0 2px 8px rgba(2,13,37,0.2)", cursor: "grab", outline: "none",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        {presets.map((p) => (
          <button
            key={p.v}
            onClick={() => onChange(p.v)}
            style={{
              flex: 1, height: 30, borderRadius: 8, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
              border: `1px solid ${value === p.v ? "var(--accent)" : "var(--border-strong)"}`,
              background: value === p.v ? "var(--accent-soft)" : "var(--surface)",
              color: value === p.v ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {p.l}
          </button>
        ))}
      </div>
    </div>
  )
}

// ───────────────────────── read-only processo field ─────────────────────────
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 500, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{value ?? "—"}</div>
    </div>
  )
}

// ───────────────────────── modal ─────────────────────────
export function CrmCasoModal({ casoId, role, dataset, onClose, onRefresh, nav }: Props) {
  const { toast } = useCrmToast()
  const [detail, setDetail] = useState<CasoDetail | null>(null)
  const [loading, setLoading] = useState(true)

  // two sócios ordered by `ordem`; rateio slider drives sócio A's %.
  const socios = useMemo(() => [...dataset.socios].sort((x, y) => x.ordem - y.ordem).slice(0, 2), [dataset.socios])
  const socioA = socios[0]
  const socioB = socios[1]

  const initialRateio = (d: CasoDetail): number => {
    const a = socioA ? d.responsaveis.find((r) => r.contaId === socioA.id) : undefined
    return a ? a.percentual : 50
  }

  const [rateio, setRateio] = useState(50)
  const [savedRateio, setSavedRateio] = useState(50)
  const [savingRateio, setSavingRateio] = useState(false)

  // processo edit state
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ProcessoForm | null>(null)
  const [savingProcesso, setSavingProcesso] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetchCasoDetail(casoId)
      setDetail(d)
      const r = initialRateio(d)
      setRateio(r)
      setSavedRateio(r)
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", { tone: "neg", icon: "alertTriangle" })
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [casoId, socioA?.id])

  useEffect(() => {
    void load()
  }, [load])

  const fin = detail?.financeiro
  const totalCents = fin ? fin.recebidoCents + fin.abertoCents : 0
  const dirty = rateio !== savedRateio

  const beginEdit = () => {
    if (!detail) return
    setForm(formFrom(detail))
    setEditing(true)
  }
  const cancelEdit = () => {
    setEditing(false)
    setForm(null)
  }
  const upd = (patch: Partial<ProcessoForm>) => setForm((f) => (f ? { ...f, ...patch } : f))

  const saveProcesso = async () => {
    if (!form) return
    setSavingProcesso(true)
    try {
      await patchCaso(casoId, {
        numeroProcesso: form.numeroProcesso || null,
        tribunal: form.tribunal || null,
        vara: form.vara || null,
        instancia: form.instancia || null,
        tipoAcao: form.tipoAcao || null,
        valorCausaCents: reaisToCents(form.valorCausaReais),
        dataDistribuicao: form.dataDistribuicao || null,
        ultimaMovimentacao: form.ultimaMovimentacao || null,
        status: form.status || null,
      })
      toast("Dados do processo salvos")
      setEditing(false)
      setForm(null)
      onRefresh()
      await load()
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", { tone: "neg", icon: "alertTriangle" })
    } finally {
      setSavingProcesso(false)
    }
  }

  const saveRateio = async () => {
    if (!socioA || !socioB) return
    setSavingRateio(true)
    try {
      await setResponsaveis(casoId, [
        { contaId: socioA.id, percentual: rateio },
        { contaId: socioB.id, percentual: 100 - rateio },
      ])
      setSavedRateio(rateio)
      toast(`Rateio salvo: ${rateio}/${100 - rateio}`)
      onRefresh()
      await load()
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", { tone: "neg", icon: "alertTriangle" })
    } finally {
      setSavingRateio(false)
    }
  }

  const showRateio = role !== "staff" && !!socioA && !!socioB

  const footer = showRateio ? (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%" }}>
      <span style={{ fontSize: 12, color: dirty ? "var(--accent)" : "var(--text-subtle)" }}>
        {dirty ? "Alteração de rateio não salva" : "Rateio atualizado"}
      </span>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-ghost" onClick={() => setRateio(savedRateio)} disabled={!dirty || savingRateio}>
          Descartar
        </button>
        <button className="btn btn-primary" disabled={!dirty || savingRateio} onClick={saveRateio}>
          {savingRateio ? "Salvando…" : "Salvar rateio"}
        </button>
      </div>
    </div>
  ) : undefined

  return (
    <FxModal
      title={detail?.titulo ?? (loading ? "Carregando…" : "Caso")}
      sub={
        detail ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <CrmCasoTipoPill tipo={detail.tipo} />
            <CrmBadge tone={detail.status === "arquivado" ? "neutral" : "pos"} dot>
              {detail.status === "arquivado" ? "Arquivado" : "Ativo"}
            </CrmBadge>
            {detail.cliente && (
              <CrmLink onClick={() => detail.clienteId != null && nav.openCliente(detail.clienteId)} icon="user">
                {detail.cliente}
              </CrmLink>
            )}
          </span>
        ) : undefined
      }
      onClose={onClose}
      footer={footer}
      width={720}
    >
      {loading || !detail ? (
        <CrmEmpty icon="briefcase" title={loading ? "Carregando…" : "Caso não encontrado"} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* dados do processo */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Dados do processo</div>
              {!editing ? (
                <button className="btn btn-ghost" onClick={beginEdit} style={{ height: 28, fontSize: 12 }}>
                  <Icon name="edit" size={13} />
                  Editar
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost" onClick={cancelEdit} disabled={savingProcesso} style={{ height: 28, fontSize: 12 }}>
                    Cancelar
                  </button>
                  <button className="btn btn-primary" onClick={saveProcesso} disabled={savingProcesso} style={{ height: 28, fontSize: 12 }}>
                    <Icon name="check" size={13} />
                    {savingProcesso ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              )}
            </div>
            {!editing || !form ? (
              <div
                className="card"
                style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px 18px", background: "var(--bg-soft)" }}
              >
                <Field label="Nº do processo" value={detail.numeroProcesso} />
                <Field label="Tribunal" value={detail.tribunal} />
                <Field label="Vara" value={detail.vara} />
                <Field label="Instância" value={detail.instancia} />
                <Field label="Tipo de ação" value={detail.tipoAcao} />
                <Field label="Valor da causa" value={detail.valorCausaCents != null ? crmMoney(detail.valorCausaCents) : "—"} />
                <Field label="Distribuição" value={crmDate(detail.dataDistribuicao)} />
                <Field label="Última movimentação" value={crmDate(detail.ultimaMovimentacao)} />
                <Field label="Status" value={detail.status === "arquivado" ? "Arquivado" : "Em andamento"} />
              </div>
            ) : (
              <div
                className="card"
                style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px 16px", background: "var(--bg-soft)" }}
              >
                <div>
                  <FxLabel>Nº do processo</FxLabel>
                  <FxInput value={form.numeroProcesso} onChange={(e) => upd({ numeroProcesso: e.target.value })} />
                </div>
                <div>
                  <FxLabel>Tribunal</FxLabel>
                  <FxInput value={form.tribunal} onChange={(e) => upd({ tribunal: e.target.value })} />
                </div>
                <div>
                  <FxLabel>Vara</FxLabel>
                  <FxInput value={form.vara} onChange={(e) => upd({ vara: e.target.value })} />
                </div>
                <div>
                  <FxLabel>Instância</FxLabel>
                  <FxInput value={form.instancia} onChange={(e) => upd({ instancia: e.target.value })} />
                </div>
                <div>
                  <FxLabel>Tipo de ação</FxLabel>
                  <FxInput value={form.tipoAcao} onChange={(e) => upd({ tipoAcao: e.target.value })} />
                </div>
                <div>
                  <FxLabel hint="R$">Valor da causa</FxLabel>
                  <FxInput
                    value={form.valorCausaReais}
                    onChange={(e) => upd({ valorCausaReais: e.target.value })}
                    inputMode="decimal"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <FxLabel>Distribuição</FxLabel>
                  <FxInput type="date" value={form.dataDistribuicao} onChange={(e) => upd({ dataDistribuicao: e.target.value })} />
                </div>
                <div>
                  <FxLabel>Última movimentação</FxLabel>
                  <FxInput type="date" value={form.ultimaMovimentacao} onChange={(e) => upd({ ultimaMovimentacao: e.target.value })} />
                </div>
                <div>
                  <FxLabel>Status</FxLabel>
                  <FxSelect options={STATUS_OPTS} value={form.status} onChange={(e) => upd({ status: e.target.value })} />
                </div>
              </div>
            )}
          </div>

          {/* financeiro */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 12 }}>Financeiro do caso</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
              <FxKpi label="Total honorários" value={crmMoney(totalCents)} icon="receipt" accent="gold" />
              <FxKpi label="Recebido" value={crmMoney(fin?.recebidoCents ?? 0)} icon="checkCircle" tone="pos" />
              <FxKpi label="Em aberto" value={crmMoney(fin?.abertoCents ?? 0)} icon="clock" />
            </div>
            <div className="card" style={{ overflow: "hidden" }}>
              {!fin || fin.lancamentos.length === 0 ? (
                <CrmEmpty icon="wallet" title="Sem lançamentos" />
              ) : (
                fin.lancamentos.map((l, i) => (
                  <div
                    key={l.id}
                    className="crm-row"
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderTop: i ? "1px solid var(--border)" : "none" }}
                  >
                    <FxDirChip dir={l.dir} compact />
                    <span
                      style={{
                        flex: 1, fontSize: 12, color: "var(--text)", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}
                    >
                      {l.desc}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums" }}>{crmDate(l.venc)}</span>
                    <CrmContratoStatus status={l.pago ? "recebido" : "lancado"} venc={l.venc} />
                    <span style={{ width: 96, textAlign: "right" }}>
                      <FxMoney cents={l.valorCents} dir={l.dir} />
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* rateio — hidden for staff */}
          {showRateio && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>Rateio entre sócios</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
                Divisão dos honorários deste caso. Pontos de atração em 0, 50 e 100%.
              </div>
              <div className="card" style={{ padding: "18px 18px 16px" }}>
                <CrmRateioSlider
                  value={rateio}
                  onChange={setRateio}
                  total={totalCents}
                  nomeA={socioA!.nome}
                  nomeB={socioB!.nome}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </FxModal>
  )
}
