"use client"

import { useEffect, useMemo, useState } from "react"
import { btn } from "@/styles/components.css"
import { apiSend, newRequestId } from "@/lib/client/api"
import { useModalGuard } from "@/lib/client/modal-guard"
import { parseBRLToCents } from "@/lib/finance/money"
import type { LancamentoRow, LancDir } from "@/lib/finance/types"
import { Icon } from "./kit"
import { fmtMoney, todayISO } from "./fx"
import * as c from "./interativo.css"

export interface LancOptions {
  cats: string[]
  clientes: string[]
  fornecedores: string[]
  contas: { id: number; nome: string }[]
  casos: string[]
}

// Accent-insensitive searchable dropdown for the linked caso (follows the app's
// input/menu tokens). Keeps free-text: typing filters the list AND is submittable
// as-is, so a caso not yet in the list still links by name via resolveRefs.
function CasoCombo({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const [open, setOpen] = useState(false)
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
  const q = norm(value.trim())
  const filtered = (q ? options.filter((o) => norm(o).includes(q)) : options).slice(0, 50)
  return (
    <div className={c.selectWrap}>
      <input
        className={c.input}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar caso ou digitar"
        style={{ paddingRight: 34 }}
      />
      <div className={c.selectChevron}><Icon name="chevronDown" size={15} /></div>
      {open && (
        <>
          <div className={c.menuScrim} onClick={() => setOpen(false)} />
          <div className={c.facetMenu} style={{ left: 0, right: 0, minWidth: 0 }}>
            {value.trim() && (
              <button type="button" className={c.facetMenuItem} onClick={() => { onChange(""); setOpen(false) }}>
                <span style={{ color: "var(--text-muted)" }}>Sem caso vinculado</span>
              </button>
            )}
            {filtered.map((o) => (
              <button key={o} type="button" className={c.facetMenuItem} onClick={() => { onChange(o); setOpen(false) }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o}</span>
                {value === o && <span className={c.facetCheck}><Icon name="check" size={13} /></span>}
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: "8px 10px", fontSize: 12.5, color: "var(--text-subtle)" }}>Nenhum caso encontrado</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

type Modo = "unica" | "mensal" | "parcelado"

const send = apiSend

export function NovoLancamentoModal({
  onClose,
  onSaved,
  edit = null,
  initialDir = "in",
  options,
  lockCliente = null,
}: {
  onClose: () => void
  onSaved: () => void
  edit?: LancamentoRow | null
  initialDir?: LancDir
  options: LancOptions
  /** When set, every save is hard-linked to this cliente (used by the cliente-scoped ledger). */
  lockCliente?: { id: number; nome: string } | null
}) {
  const isEdit = !!edit
  const [dir, setDir] = useState<LancDir>(edit ? edit.dir : initialDir)
  const [desc, setDesc] = useState(edit ? edit.desc : "")
  const [cat, setCat] = useState(edit?.cat ?? options.cats[0] ?? "")
  const [party, setParty] = useState(edit?.party ?? (lockCliente?.nome ?? ""))
  const [caso, setCaso] = useState(edit?.caso ?? "")
  const [contaId, setContaId] = useState<number | null>(edit?.contaId ?? null)
  const [valor, setValor] = useState(edit ? (edit.valorCents / 100).toFixed(2).replace(".", ",") : "")
  const [venc, setVenc] = useState(edit?.venc?.slice(0, 10) ?? todayISO())
  const [modo, setModo] = useState<Modo>("unica")
  const [vezes, setVezes] = useState(6)
  const [pago, setPago] = useState(edit ? edit.pago : false)
  const [pagoData, setPagoData] = useState(edit?.pagoData?.slice(0, 10) ?? todayISO())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Idempotency key, stable for this modal instance: double-clicks and network
  // retries of the create map to the same server row.
  const [requestId] = useState(newRequestId)

  useModalGuard()
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])

  const valorCents = parseBRLToCents(valor)
  const preview = useMemo(() => {
    if (isEdit || modo === "unica") return { count: 1, each: valorCents, total: valorCents }
    if (modo === "mensal") return { count: vezes, each: valorCents, total: valorCents * vezes }
    const each = Math.round(valorCents / vezes)
    return { count: vezes, each, total: each * vezes }
  }, [isEdit, modo, vezes, valorCents])
  const valid = desc.trim() && valorCents > 0 && venc

  async function submit() {
    if (!valid) return
    setBusy(true)
    setError(null)
    const clienteLocked = lockCliente && dir === "in"
    const payload = {
      dir,
      desc: desc.trim(),
      valorCents,
      venc,
      cat: cat || null,
      party: clienteLocked ? lockCliente.nome : party.trim() || null,
      caso: dir === "in" ? caso.trim() || null : null,
      contaId,
      clienteId: lockCliente?.id ?? null,
      pago,
      pagoData: pago ? pagoData : null,
      modo,
      vezes,
      requestId,
    }
    try {
      if (isEdit && edit) await send(`/api/financeiro/lancamentos/${edit.id}`, "PATCH", payload)
      else await send("/api/financeiro/lancamentos", "POST", payload)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar")
    } finally {
      setBusy(false)
    }
  }

  const partyList = dir === "in" ? options.clientes : options.fornecedores

  return (
    <div className={c.overlay} onMouseDown={onClose}>
      <div
        className={c.modalCard}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={c.modalHead}>
          <div>
            <div className={c.modalTitle}>{isEdit ? "Editar lançamento" : "Novo lançamento"}</div>
            <div className={c.modalSub}>
              {isEdit ? "Atualize os dados deste lançamento." : "Honorário a receber ou gasto a pagar — único, recorrente ou parcelado."}
            </div>
          </div>
          <button type="button" className={c.iconBtn} onClick={onClose} aria-label="Fechar">
            <Icon name="x" size={17} />
          </button>
        </div>

        <div className={c.modalBody}>
          {error && (
            <div style={{ padding: "9px 12px", borderRadius: 8, background: "rgba(192,73,47,0.1)", color: "var(--fin-neg,#C0492F)", fontSize: 12 }}>{error}</div>
          )}

          {/* tipo */}
          <div className={c.field}>
            <div className={c.fieldLabel}><span className={c.fieldLabelText}>Tipo</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {([["in", "A receber", "arrowDownRight"], ["out", "A pagar", "arrowUpRight"]] as const).map(([d, label, ic]) => {
                const on = dir === d
                const tone = d === "in" ? "var(--fin-pos,#2E9E5B)" : "var(--fin-neg,#C0492F)"
                return (
                  <button key={d} type="button" className={c.dirToggle({ on: on ? d : "off" })} onClick={() => setDir(d)}>
                    <span style={{ width: 26, height: 26, borderRadius: 8, background: on ? tone : "var(--bg-sunken)", color: on ? "#fff" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name={ic} size={14} strokeWidth={2.2} />
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: on ? "var(--text)" : "var(--text-muted)" }}>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* descrição */}
          <div className={c.field}>
            <div className={c.fieldLabel}><span className={c.fieldLabelText}>Descrição</span></div>
            <input className={c.input} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={dir === "in" ? "Ex.: Honorários · assessoria mensal" : "Ex.: Aluguel do escritório"} />
          </div>

          <div className={c.grid2}>
            <div className={c.field}>
              <div className={c.fieldLabel}><span className={c.fieldLabelText}>Categoria</span></div>
              <div className={c.selectWrap}>
                <select className={c.input} value={cat} onChange={(e) => setCat(e.target.value)} style={{ appearance: "none", paddingRight: 34, cursor: "pointer" }}>
                  <option value="">—</option>
                  {options.cats.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <div className={c.selectChevron}><Icon name="chevronDown" size={15} /></div>
              </div>
            </div>
            <div className={c.field}>
              <div className={c.fieldLabel}><span className={c.fieldLabelText}>{dir === "in" ? "Contato" : "Fornecedor"}</span></div>
              {lockCliente && dir === "in" ? (
                <input className={c.input} value={lockCliente.nome} disabled title="Vinculado a este contato" style={{ opacity: 0.7, cursor: "not-allowed" }} />
              ) : (
                <>
                  <input className={c.input} list="fx-party-list" value={party} onChange={(e) => setParty(e.target.value)} placeholder="Selecione ou digite" />
                  <datalist id="fx-party-list">{partyList.map((p) => <option key={p} value={p} />)}</datalist>
                </>
              )}
            </div>
          </div>

          {dir === "in" && (
            <div className={c.field}>
              <div className={c.fieldLabel}><span className={c.fieldLabelText}>Caso vinculado</span><span className={c.fieldHint}>opcional</span></div>
              <CasoCombo value={caso} onChange={setCaso} options={options.casos} />
            </div>
          )}

          <div className={c.field}>
            <div className={c.fieldLabel}><span className={c.fieldLabelText}>{dir === "in" ? "Conta que recebeu" : "Conta que pagou"}</span><span className={c.fieldHint}>opcional</span></div>
            <div className={c.selectWrap}>
              <select
                className={c.input}
                value={contaId ?? ""}
                onChange={(e) => setContaId(e.target.value ? Number(e.target.value) : null)}
                style={{ appearance: "none", paddingRight: 34, cursor: "pointer" }}
              >
                <option value="">— Sem conta definida</option>
                {options.contas.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
              <div className={c.selectChevron}><Icon name="chevronDown" size={15} /></div>
            </div>
          </div>

          <div className={c.grid2}>
            <div className={c.field}>
              <div className={c.fieldLabel}><span className={c.fieldLabelText}>Valor</span>{modo === "parcelado" && !isEdit && <span className={c.fieldHint}>valor total</span>}</div>
              <div style={{ position: "relative" }}>
                <span className={c.num} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text-subtle)" }}>R$</span>
                <input className={`${c.input} ${c.num}`} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" style={{ paddingLeft: 36 }} />
              </div>
            </div>
            <div className={c.field}>
              <div className={c.fieldLabel}><span className={c.fieldLabelText}>Vencimento{!isEdit && modo !== "unica" ? " (1º)" : ""}</span></div>
              <input className={c.input} type="date" value={venc} onChange={(e) => setVenc(e.target.value)} />
            </div>
          </div>

          {!isEdit && (
            <div className={c.field}>
              <div className={c.fieldLabel}><span className={c.fieldLabelText}>Frequência</span></div>
              <div className={c.segGroup}>
                {([["unica", "Único", "circleDot"], ["mensal", "Recorrente", "refreshCw"], ["parcelado", "Parcelado", "sigma"]] as const).map(([v, l, ic]) => (
                  <button key={v} type="button" className={c.segButton({ active: modo === v })} onClick={() => setModo(v)}>
                    <Icon name={ic} size={13} />{l}
                  </button>
                ))}
              </div>
              {modo !== "unica" && (
                <div className={c.recurBox}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{modo === "mensal" ? "Repetir por" : "Dividir em"}</span>
                  <div className={c.stepper}>
                    <button type="button" className={c.iconBtn} style={{ borderRadius: 0 }} onClick={() => setVezes((v) => Math.max(2, v - 1))}><Icon name="minusCircle" size={15} /></button>
                    <span className={c.stepperVal}>{vezes}</span>
                    <button type="button" className={c.iconBtn} style={{ borderRadius: 0 }} onClick={() => setVezes((v) => Math.min(36, v + 1))}><Icon name="plus" size={15} /></button>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{modo === "mensal" ? "meses" : "parcelas"}</span>
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>{preview.count}× de {fmtMoney(preview.each)}</div>
                    <div className={c.num} style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>= {fmtMoney(preview.total)}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* pagamento */}
          <div className={c.pagoBox}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: !isEdit && modo !== "unica" ? "not-allowed" : "pointer", opacity: !isEdit && modo !== "unica" ? 0.5 : 1 }}>
              <input type="checkbox" checked={pago} disabled={!isEdit && modo !== "unica"} onChange={(e) => setPago(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Já {dir === "in" ? "recebido" : "pago"}</span>
            </label>
            {pago && (
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>em</span>
                <input className={c.input} type="date" value={pagoData} onChange={(e) => setPagoData(e.target.value)} style={{ height: 32, width: 158 }} />
              </div>
            )}
          </div>
        </div>

        <div className={c.modalFoot}>
          <button type="button" className={btn({ variant: "ghost" })} style={{ height: 36 }} onClick={onClose}>Cancelar</button>
          <button type="button" className={btn({ variant: "primary" })} style={{ height: 36, opacity: valid && !busy ? 1 : 0.5 }} disabled={!valid || busy} onClick={submit}>
            <Icon name="check" size={14} />
            {busy ? "Salvando…" : isEdit ? "Salvar alterações" : preview.count > 1 ? `Criar ${preview.count} lançamentos` : "Criar lançamento"}
          </button>
        </div>
      </div>
    </div>
  )
}
