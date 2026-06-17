"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import {
  tableCard,
  table,
  tableHeadRow,
  tableHeadCell,
  tableRow,
  documentCell,
} from "@/components/documents/page/tabs/LibraryTab/LibraryTab.css"
import { btn } from "@/styles/components.css"
import { apiSend } from "@/lib/client/api"
import { numericCell } from "@/components/financeiro/page/financeiro.css"
import { MoneyValue } from "@/components/financeiro/shared/MoneyValue"
import { StatusPill, type PillTone } from "@/components/financeiro/shared/StatusPill"
import { parseBRLToCents } from "@/lib/finance/money"
import type { ContaBalanceRow, ContaKind } from "@/lib/finance/types"
import * as c from "./contas.css"

const KIND_META: Record<ContaKind, { label: string; tone: PillTone }> = {
  socio: { label: "Sócio", tone: "gold" },
  banco: { label: "Banco", tone: "neutral" },
  caixa: { label: "Caixa", tone: "green" },
}

const send = apiSend

export function ContasPanel({ contas }: { contas: ContaBalanceRow[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [rows, setRows] = useState(contas)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => setRows(contas), [contas])

  async function renameConta(id: number, nome: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, nome } : r)))
    try {
      await send(`/api/financeiro/contas/${id}`, "PATCH", { nome })
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao renomear")
      startTransition(() => router.refresh())
    }
  }

  return (
    <div>
      {error && <div className={c.errorBar}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button type="button" className={btn({ variant: "secondary" })} style={{ height: 34 }} onClick={() => setShowCreate((s) => !s)}>
          <Plus size={14} /> Nova conta
        </button>
      </div>

      {showCreate && (
        <CreateConta
          onDone={() => { setShowCreate(false); startTransition(() => router.refresh()) }}
          onError={setError}
        />
      )}

      <div className={tableCard}>
        <table className={table}>
          <thead>
            <tr className={tableHeadRow}>
              <th className={tableHeadCell}>Conta</th>
              <th className={tableHeadCell}>Tipo</th>
              <th className={tableHeadCell} style={{ textAlign: "right" }}>Entradas</th>
              <th className={tableHeadCell} style={{ textAlign: "right" }}>Saídas</th>
              <th className={tableHeadCell} style={{ textAlign: "right" }}>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className={tableRow}>
                <td className={documentCell} colSpan={5}>Nenhuma conta cadastrada.</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className={tableRow}>
                  <td className={documentCell}>
                    <NameCell value={r.nome} onCommit={(v) => renameConta(r.id, v)} />
                  </td>
                  <td className={documentCell}>
                    <StatusPill label={KIND_META[r.kind].label} tone={KIND_META[r.kind].tone} />
                  </td>
                  <td className={`${documentCell} ${numericCell}`}>
                    <MoneyValue cents={r.entradasCents} />
                  </td>
                  <td className={`${documentCell} ${numericCell}`}>
                    <MoneyValue cents={-r.saidasCents} colorBySign />
                  </td>
                  <td className={`${documentCell} ${numericCell}`}>
                    <MoneyValue cents={r.saldoCents} colorBySign />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NameCell({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      className={c.nameInput}
      value={draft ?? value}
      onFocus={() => setDraft(value)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const v = draft
        setDraft(null)
        if (v != null && v.trim() && v.trim() !== value) onCommit(v.trim())
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
        if (e.key === "Escape") { setDraft(null); e.currentTarget.blur() }
      }}
    />
  )
}

function CreateConta({ onDone, onError }: { onDone: () => void; onError: (m: string) => void }) {
  const [nome, setNome] = useState("")
  const [kind, setKind] = useState<ContaKind>("banco")
  const [valor, setValor] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!nome.trim()) return onError("Informe o nome da conta.")
    setBusy(true)
    try {
      await send("/api/financeiro/contas", "POST", {
        nome: nome.trim(),
        kind,
        titular: kind === "socio" ? nome.trim() : null,
        valorInicialCents: parseBRLToCents(valor),
      })
      onDone()
    } catch (e) {
      onError(e instanceof Error ? e.message : "Falha ao criar conta")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={c.transferForm} style={{ gridTemplateColumns: "1.4fr 1fr 1fr auto" }}>
      <div className={c.field}>
        <label className={c.fieldLabel}>Nome</label>
        <input className={c.formInput} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Conta corrente…" />
      </div>
      <div className={c.field}>
        <label className={c.fieldLabel}>Tipo</label>
        <select className={c.formSelect} value={kind} onChange={(e) => setKind(e.target.value as ContaKind)}>
          <option value="socio">Sócio</option>
          <option value="banco">Banco</option>
          <option value="caixa">Caixa</option>
        </select>
      </div>
      <div className={c.field}>
        <label className={c.fieldLabel}>Saldo inicial</label>
        <input className={c.formInput} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="R$ 0,00" inputMode="decimal" />
      </div>
      <button type="button" className={btn({ variant: "primary" })} style={{ height: 38 }} disabled={busy} onClick={submit}>
        {busy ? "Salvando…" : "Criar"}
      </button>
    </div>
  )
}
