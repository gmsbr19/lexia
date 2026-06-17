"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { btn } from "@/styles/components.css"

export function ReimportButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function run() {
    setRunning(true)
    setMsg(null)
    try {
      const res = await fetch("/api/financeiro/reimport", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMsg("Reimportado.")
        startTransition(() => router.refresh())
      } else {
        setMsg(data?.error ?? "Falha ao reimportar.")
      }
    } catch {
      setMsg("Falha ao reimportar.")
    } finally {
      setRunning(false)
    }
  }

  const busy = running || isPending
  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={btn({ variant: "secondary" })}
      style={{ height: 36 }}
    >
      <RefreshCw size={14} />
      {busy ? "Reimportando…" : "Reimportar backup"}
      {msg && <span style={{ marginLeft: 6, opacity: 0.7 }}>· {msg}</span>}
    </button>
  )
}
