"use client"

import { useEffect, useState } from "react"
import { LogOut } from "lucide-react"
import { signOut } from "next-auth/react"
import { btn } from "@/styles/components.css"
import { tokens } from "@/styles/tokens.css"

type SessionUser = { name?: string | null; email?: string | null }

/**
 * Topbar user chip + "Sair". Reads the session from Auth.js' own endpoint so
 * the (client) AppShell needs no SessionProvider or server wiring.
 */
export function UserChip() {
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    let alive = true
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { user?: SessionUser } | null) => {
        if (alive) setUser(s?.user ?? null)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  if (!user?.name && !user?.email) return null
  const nome = user.name ?? user.email ?? ""
  const inicial = nome.trim().charAt(0).toUpperCase()

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }} title={user.email ?? undefined}>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: tokens.color.accentSoft,
          color: tokens.color.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        {inicial}
      </span>
      <span
        style={{
          fontSize: 12,
          color: tokens.color.textMuted,
          maxWidth: 140,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {nome}
      </span>
      <button
        className={btn({ variant: "ghost" })}
        style={{ height: 32, padding: "0 10px", fontSize: 12 }}
        onClick={() => signOut({ redirectTo: "/login" })}
        title="Sair"
      >
        <LogOut size={14} />
        Sair
      </button>
    </div>
  )
}
