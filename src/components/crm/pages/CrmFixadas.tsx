"use client"

// LexIA · CRM — notas e informações FIXADAS na ficha do contato e na página do
// caso. Fixada = aparece em todas as tarefas daquele cliente/caso (quadro de
// Tarefas, "Saiba antes"). Seção "Fixadas" no topo (fora das abas), a linha de
// nota (fixar/desafixar, editar no lugar, excluir — só o autor ou sócio/admin)
// e o campo de nova nota. Visual neutro: o dourado é reservado à IA.
import { useState } from "react"
import { CrmBadge, FxCardTitle, useCrmToast } from "../crm-kit"
import { Icon } from "../crm-icons"
import { crmDate } from "../crm-fmt"
import { criarInformacao, deleteInformacao, patchInformacao } from "../crm-api"
import {
  CONTEUDO_MAX,
  atualizadaEm,
  chaveInfo,
  podeExcluirInformacao,
  talvezDesatualizada,
  tempoDesde,
  type Ancora,
  type InformacaoRow,
} from "@/lib/informacoes/core"

const errMsg = (err: unknown) => (err instanceof Error ? err.message : "Erro")

/** Quem está vendo (excluir: autor ou admin/sócio). */
export interface QuemVe {
  id: number | null
  role: string
}

const areaTexto = {
  width: "100%",
  resize: "vertical" as const,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-soft)",
  color: "var(--text)",
  padding: "10px 12px",
  fontSize: 13,
  fontFamily: "inherit",
}

const iconBtn = { width: 28, height: 28, padding: 0, flexShrink: 0 }

/** Uma nota: texto (editável no lugar), quem/quando, fixar/desafixar e excluir. */
export function CrmNotaRow({
  info,
  quem,
  onChanged,
  badge,
  first,
}: {
  info: InformacaoRow
  quem: QuemVe
  onChanged: () => void
  /** Rótulo extra (ex.: "Do cliente" na página do caso). */
  badge?: string
  first?: boolean
}) {
  const { toast } = useCrmToast()
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(info.conteudo)
  const [confirmar, setConfirmar] = useState(false)
  const [busy, setBusy] = useState(false)
  const pode = podeExcluirInformacao(info, quem)

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try {
      await fn()
      toast(ok)
      onChanged()
      return true
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
      return false
    } finally {
      setBusy(false)
    }
  }
  const salvar = async () => {
    const v = texto.trim()
    if (!v || v === info.conteudo) return setEditando(false)
    if (await run(() => patchInformacao(info.fonte, info.id, { conteudo: v }), "Nota editada")) setEditando(false)
  }

  const meta = [
    `${info.autor} · ${crmDate(info.criadaEm)}`,
    info.editadaEm ? `editada${info.editadaPor ? ` por ${info.editadaPor}` : ""} ${tempoDesde(info.editadaEm)}` : null,
    info.fixado && info.fixadaPor ? `fixada por ${info.fixadaPor}` : null,
    info.fixado && talvezDesatualizada(info) ? `sem atualização ${tempoDesde(atualizadaEm(info))}` : null,
  ].filter(Boolean)

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 16px", borderTop: first ? "none" : "1px solid var(--border)" }}>
      <div
        style={{
          width: 30, height: 30, borderRadius: 8, background: "var(--bg-sunken)", color: "var(--text-muted)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        <Icon name={info.fixado ? "pin" : "fileText"} size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {(info.fixado || badge) && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 5 }}>
            {info.fixado && <CrmBadge tone="neutral">Fixada</CrmBadge>}
            {badge && <CrmBadge tone="neutral">{badge}</CrmBadge>}
          </div>
        )}
        {editando ? (
          <>
            <textarea
              autoFocus
              value={texto}
              maxLength={CONTEUDO_MAX}
              rows={3}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditando(false)
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void salvar()
              }}
              style={areaTexto}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditando(false)} disabled={busy}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={() => void salvar()} disabled={busy || !texto.trim()}>Salvar</button>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: "var(--text)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{info.conteudo}</div>
        )}
        <div style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 4 }}>{meta.join(" · ")}</div>
      </div>
      {!editando && (
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          {confirmar ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmar(false)} disabled={busy}>Cancelar</button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={busy}
                onClick={() => void run(() => deleteInformacao(info.fonte, info.id), "Nota excluída")}
                style={{ color: "var(--fin-neg,#C0492F)" }}
              >
                Excluir
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-ghost"
                disabled={busy}
                title={info.fixado ? "Desafixar (sai das tarefas)" : "Fixar nas tarefas"}
                aria-label={info.fixado ? "Desafixar" : "Fixar nas tarefas"}
                onClick={() =>
                  void run(
                    () => patchInformacao(info.fonte, info.id, { fixado: !info.fixado }),
                    info.fixado ? "Nota desafixada" : "Fixada: aparece nas tarefas",
                  )
                }
                style={iconBtn}
              >
                <Icon name={info.fixado ? "pinOff" : "pin"} size={14} />
              </button>
              <button
                className="btn btn-ghost"
                disabled={busy}
                title="Editar"
                aria-label="Editar"
                onClick={() => {
                  setTexto(info.conteudo)
                  setEditando(true)
                }}
                style={iconBtn}
              >
                <Icon name="edit" size={14} />
              </button>
              {pode && (
                <button className="btn btn-ghost" disabled={busy} title="Excluir" aria-label="Excluir" onClick={() => setConfirmar(true)} style={iconBtn}>
                  <Icon name="trash2" size={14} />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** "Fixadas" no topo da página: aparecem em todas as tarefas deste cliente/caso. */
export function CrmFixadasSection({
  itens,
  sub,
  quem,
  onChanged,
  badgeDe,
}: {
  itens: InformacaoRow[]
  sub: string
  quem: QuemVe
  onChanged: () => void
  /** Rótulo extra por item (ex.: "Do cliente"). */
  badgeDe?: (i: InformacaoRow) => string | undefined
}) {
  if (!itens.length) return null
  return (
    <div style={{ marginBottom: 20 }}>
      <FxCardTitle title="Fixadas" sub={sub} />
      <div className="card" style={{ overflow: "hidden" }}>
        {itens.map((i, n) => (
          <CrmNotaRow key={chaveInfo(i)} info={i} quem={quem} onChanged={onChanged} badge={badgeDe?.(i)} first={n === 0} />
        ))}
      </div>
    </div>
  )
}

/** Nova nota (com "Fixar nas tarefas"). */
export function CrmNotaComposer({
  ancora,
  placeholder,
  onCreated,
}: {
  ancora: Ancora
  placeholder: string
  onCreated: () => void
}) {
  const { toast } = useCrmToast()
  const [texto, setTexto] = useState("")
  const [fixar, setFixar] = useState(false)
  const [busy, setBusy] = useState(false)
  const adicionar = async () => {
    const v = texto.trim()
    if (!v) return
    setBusy(true)
    try {
      await criarInformacao({ ancora, conteudo: v, fixado: fixar })
      setTexto("")
      setFixar(false)
      toast(fixar ? "Fixada: aparece nas tarefas" : "Nota adicionada")
      onCreated()
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="card" style={{ padding: 14, marginBottom: 14 }}>
      <textarea
        value={texto}
        maxLength={CONTEUDO_MAX}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void adicionar()
        }}
        placeholder={placeholder}
        rows={2}
        style={areaTexto}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-muted)", cursor: "pointer" }}>
          <input type="checkbox" checked={fixar} onChange={(e) => setFixar(e.target.checked)} />
          Fixar nas tarefas
        </label>
        <button className="btn btn-secondary" disabled={busy || !texto.trim()} onClick={() => void adicionar()}>
          <Icon name={fixar ? "pin" : "plus"} size={14} />
          {fixar ? "Fixar nota" : "Adicionar nota"}
        </button>
      </div>
    </div>
  )
}
