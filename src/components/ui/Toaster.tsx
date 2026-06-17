"use client"

import { useEffect } from "react"
import { AlertCircle, Info } from "lucide-react"
import { useToastStore } from "@/lib/client/toast"
import * as css from "./toast.css"

/** Renders the global toast (see src/lib/client/toast.ts). Mounted once in the root layout. */
export function Toaster() {
  const { msg, kind, retry, seq, clear } = useToastStore()

  useEffect(() => {
    if (!msg) return
    // Toasts with a retry action stay longer.
    const t = setTimeout(clear, retry ? 7000 : 3400)
    return () => clearTimeout(t)
  }, [msg, seq, retry, clear])

  if (!msg) return null
  const isError = kind === "error"
  return (
    <div className={`${css.toast} ${isError ? css.toastError : ""}`} role="status">
      <span className={`${css.toastIcon} ${isError ? css.toastIconError : ""}`} aria-hidden="true">
        {isError ? <AlertCircle size={16} /> : <Info size={16} />}
      </span>
      <span>{msg}</span>
      {retry && (
        <button
          className={css.retryBtn}
          onClick={() => {
            clear()
            retry()
          }}
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}
