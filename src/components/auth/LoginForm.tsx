"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { btn, input, label } from "@/styles/components.css"
import * as css from "./login.css"

export function LoginForm() {
  const search = useSearchParams()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErro(null)
    try {
      const res = await signIn("credentials", { email, senha, redirect: false })
      if (res?.error) {
        setErro("E-mail ou senha incorretos.")
        return
      }
      const callbackUrl = search.get("callbackUrl")
      // Only same-origin paths — never an absolute URL from the query string.
      const dest = callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/"
      // Hard navigation (not router.push): guarantees the destination is fetched
      // fresh through proxy.ts with the just-set session cookie, instead of
      // depending on the client router cache picking up the new auth state.
      window.location.href = dest
    } catch {
      setErro("Não foi possível entrar — tente novamente.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={css.page}>
      <div className={css.card}>
        <div className={css.brand}>
          <span className={css.brandMark}>L</span>
          <div>
            <div className={css.brandTitle}>LexIA</div>
            <div className={css.brandSubtitle}>Gestão do escritório</div>
          </div>
        </div>

        <form className={css.form} onSubmit={onSubmit}>
          {erro && <div className={css.errorBox}>{erro}</div>}

          <div>
            <label className={label} htmlFor="login-email">
              E-mail
            </label>
            <input
              id="login-email"
              className={input}
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@escritorio.com.br"
            />
          </div>

          <div>
            <label className={label} htmlFor="login-senha">
              Senha
            </label>
            <input
              id="login-senha"
              className={input}
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className={btn({ variant: "gold" })} disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  )
}
