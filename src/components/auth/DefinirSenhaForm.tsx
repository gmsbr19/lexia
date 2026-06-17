"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { btn, input, label } from "@/styles/components.css"
import * as css from "./login.css"
import * as own from "./definir-senha.css"

const SENHA_MIN = 8

export function DefinirSenhaForm({ token, nome: nomeInicial, email }: { token: string; nome: string; email: string }) {
  const router = useRouter()
  const [nome, setNome] = useState(nomeInicial)
  const [senha, setSenha] = useState("")
  const [confirma, setConfirma] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setErro(null)
    if (!nome.trim()) {
      setErro("Informe o seu nome.")
      return
    }
    if (senha.length < SENHA_MIN) {
      setErro(`A senha deve ter pelo menos ${SENHA_MIN} caracteres.`)
      return
    }
    if (senha !== confirma) {
      setErro("As senhas não conferem.")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/convite/definir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, senha, nome: nome.trim() }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setErro(data.error || "Não foi possível definir a senha.")
        return
      }
      setOk(true)
      setTimeout(() => {
        router.push("/login")
        router.refresh()
      }, 1400)
    } catch {
      setErro("Não foi possível definir a senha — tente novamente.")
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
            <div className={css.brandSubtitle}>Configurar acesso</div>
          </div>
        </div>

        {ok ? (
          <div className={own.successBox}>Senha definida! Redirecionando para o login…</div>
        ) : (
          <form className={css.form} onSubmit={onSubmit}>
            <p className={own.intro}>Defina a sua senha para ativar a conta e confirme o seu nome.</p>

            {erro && <div className={css.errorBox}>{erro}</div>}

            <div>
              <label className={label}>E-mail</label>
              <div className={own.emailPill}>{email}</div>
            </div>

            <div>
              <label className={label} htmlFor="ds-nome">
                Nome
              </label>
              <input
                id="ds-nome"
                className={input}
                type="text"
                autoComplete="name"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div>
              <label className={label} htmlFor="ds-senha">
                Senha
              </label>
              <input
                id="ds-senha"
                className={input}
                type="password"
                autoComplete="new-password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
              />
              <div className={own.hint}>Mínimo de {SENHA_MIN} caracteres.</div>
            </div>

            <div>
              <label className={label} htmlFor="ds-confirma">
                Confirmar senha
              </label>
              <input
                id="ds-confirma"
                className={input}
                type="password"
                autoComplete="new-password"
                required
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className={btn({ variant: "gold" })} disabled={busy}>
              {busy ? "Salvando…" : "Definir senha e entrar"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
