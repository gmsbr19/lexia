"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { btn } from "@/styles/components.css"

/** One-click: create a stub honorário linked to a fee-less caso (+ its cliente),
 *  then refresh — the caso leaves this list and the honorário is ready to edit
 *  in the Honorários tab. */
export function LancarHonorarioButton({
  casoId,
  clienteId,
  titulo,
}: {
  casoId: number
  clienteId: number | null
  titulo: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function run() {
    setBusy(true)
    setError(false)
    try {
      const res = await fetch("/api/financeiro/honorarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao: `Honorário — ${titulo}`, valorCents: 0, casoId, clienteId }),
      })
      if (res.ok) startTransition(() => router.refresh())
      else setError(true)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={btn({ variant: "secondary" })}
      style={{ height: 30 }}
      title={error ? "Falha — tente novamente" : "Criar honorário para este caso"}
    >
      <Plus size={13} />
      {busy ? "…" : error ? "Tentar de novo" : "Lançar honorário"}
    </button>
  )
}
