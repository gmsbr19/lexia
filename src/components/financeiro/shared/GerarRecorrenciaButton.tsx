"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarPlus } from "lucide-react"
import { btn } from "@/styles/components.css"

export function GerarRecorrenciaButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function run() {
    setRunning(true)
    setMsg(null)
    try {
      const res = await fetch("/api/financeiro/recorrencia/gerar", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMsg(`${data.created ?? 0} parcela(s)`)
        startTransition(() => router.refresh())
      } else {
        setMsg(data?.error ?? "Falha.")
      }
    } catch {
      setMsg("Falha.")
    } finally {
      setRunning(false)
    }
  }

  const busy = running || isPending
  return (
    <button type="button" onClick={run} disabled={busy} className={btn({ variant: "secondary" })} style={{ height: 36 }}>
      <CalendarPlus size={14} />
      {busy ? "Gerando…" : "Gerar parcelas do mês"}
      {msg && <span style={{ marginLeft: 6, opacity: 0.7 }}>· {msg}</span>}
    </button>
  )
}
