"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Trash2 } from "lucide-react"
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
import { parseBRLToCents } from "@/lib/finance/money"
import { formatDateBR } from "@/lib/finance/format"
import type { ContaOption, TransferenciaRow } from "@/lib/finance/types"
import * as c from "./contas.css"

const send = apiSend

const todayInput = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function TransferenciasPanel({
  contas,
  transferencias,
}: {
  contas: ContaOption[]
  transferencias: TransferenciaRow[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [origem, setOrigem] = useState<string>(String(contas[0]?.id ?? ""))
  const [destino, setDestino] = useState<string>(String(contas[1]?.id ?? contas[0]?.id ?? ""))
  const [valor, setValor] = useState("")
  const [data, setData] = useState(todayInput())
  const [descricao, setDescricao] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const valorCents = parseBRLToCents(valor)
    if (!origem || !destino) return setError("Selecione as contas de origem e destino.")
    if (origem === destino) return setError("Origem e destino devem ser diferentes.")
    if (valorCents <= 0) return setError("Informe um valor maior que zero.")
    setBusy(true)
    setError(null)
    try {
      await send("/api/financeiro/transferencias", "POST", {
        contaOrigemId: Number(origem),
        contaDestinoId: Number(destino),
        valorCents,
        dataMovimento: data || null,
        descricao: descricao.trim() || null,
      })
      setValor("")
      setDescricao("")
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao registrar transferência")
    } finally {
      setBusy(false)
    }
  }

  async function del(id: number) {
    if (!window.confirm("Excluir esta transferência?")) return
    setError(null)
    try {
      await send(`/api/financeiro/transferencias/${id}`, "DELETE")
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao excluir")
    }
  }

  return (
    <div>
      {error && <div className={c.errorBar}>{error}</div>}

      <div className={c.transferForm}>
        <div className={c.field}>
          <label className={c.fieldLabel}>De</label>
          <select className={c.formSelect} value={origem} onChange={(e) => setOrigem(e.target.value)}>
            {contas.map((ct) => <option key={ct.id} value={ct.id}>{ct.nome}</option>)}
          </select>
        </div>
        <div className={c.field}>
          <label className={c.fieldLabel}>Para</label>
          <select className={c.formSelect} value={destino} onChange={(e) => setDestino(e.target.value)}>
            {contas.map((ct) => <option key={ct.id} value={ct.id}>{ct.nome}</option>)}
          </select>
        </div>
        <div className={c.field}>
          <label className={c.fieldLabel}>Valor</label>
          <input className={c.formInput} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="R$ 0,00" inputMode="decimal" />
        </div>
        <div className={c.field}>
          <label className={c.fieldLabel}>Data</label>
          <input className={c.formInput} type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <button type="button" className={btn({ variant: "primary" })} style={{ height: 38 }} disabled={busy} onClick={submit}>
          {busy ? "…" : "Transferir"}
        </button>
      </div>

      <div className={tableCard}>
        <table className={table}>
          <thead>
            <tr className={tableHeadRow}>
              <th className={tableHeadCell}>Data</th>
              <th className={tableHeadCell}>Origem → Destino</th>
              <th className={tableHeadCell}>Descrição</th>
              <th className={tableHeadCell} style={{ textAlign: "right" }}>Valor</th>
              <th className={tableHeadCell} />
            </tr>
          </thead>
          <tbody>
            {transferencias.length === 0 ? (
              <tr className={tableRow}>
                <td className={documentCell} colSpan={5}>Nenhuma transferência registrada.</td>
              </tr>
            ) : (
              transferencias.map((t) => (
                <tr key={t.id} className={tableRow}>
                  <td className={documentCell}>{formatDateBR(t.data)}</td>
                  <td className={documentCell} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {t.contaOrigem} <ArrowRight size={13} /> {t.contaDestino}
                  </td>
                  <td className={documentCell}>{t.descricao ?? "—"}</td>
                  <td className={`${documentCell} ${numericCell}`}>
                    <MoneyValue cents={t.valorCents} />
                  </td>
                  <td className={documentCell} style={{ width: 44, textAlign: "center" }}>
                    <button type="button" className={c.iconBtn} title="Excluir" onClick={() => del(t.id)}>
                      <Trash2 size={14} />
                    </button>
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
