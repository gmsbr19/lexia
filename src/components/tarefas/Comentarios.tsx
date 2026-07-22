"use client"

// Comentários da tarefa — thread cronológico + composer com autocomplete de
// menção (@colega / @todos). Só texto (anexos ficam p/ a fase 2). Renderiza no
// fim da coluna esquerda do TaskDetailModal. Atualização otimista via apiSend;
// as menções viram tokens `@[id]`/`@[todos]` (serializeMencoes) no envio e são
// realçadas no render (segmentosComentario) — nunca via HTML (anti-XSS).
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  type ComentarioRow,
  type MencaoPick,
  segmentosComentario,
  serializeMencoes,
} from "@/lib/tarefas/comentario-core"
import { apiSend } from "@/lib/client/api"
import { toast } from "@/lib/client/toast"
import { glassElevation } from "@/styles/glass"
import { lexGlassStrong } from "@/styles/glass.css"
import { tempoRelativo } from "@/components/shell/notif-ui"
import { detectarToken, substituirToken } from "@/components/lexia/composer-token"
import { Icon } from "./tf-icons"
import { AssigneeAvatar } from "./tf-kit"
import { useTarefasCtx } from "./TarefasContext"

type Ok<T> = { ok: boolean; result: T }
const norm = (s: string): string => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()

export function Comentarios({ taskId }: { taskId: number }) {
  const { member, meId } = useTarefasCtx()
  const [list, setList] = useState<ComentarioRow[] | null>(null)
  const [erro, setErro] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  const meRole = member(meId)?.role ?? ""
  const isGestor = meRole === "Admin" || meRole === "Sócio"

  const fetchList = useCallback(() => {
    apiSend<ComentarioRow[]>(`/api/tarefas/${taskId}/comentarios`, "GET")
      .then((rows) => {
        setList(rows)
        setErro(false)
      })
      .catch(() => setErro(true))
  }, [taskId])
  // fetch-on-mount (remonta via key={task.id}); setState só nos callbacks async.
  useEffect(() => {
    fetchList()
  }, [fetchList])
  const recarregar = () => {
    setErro(false)
    setList(null)
    fetchList()
  }

  const enviar = async (conteudo: string) => {
    const tempId = -Date.now()
    const temp: ComentarioRow | null =
      meId != null ? { id: tempId, autorId: meId, conteudo, editado: false, createdAt: new Date().toISOString() } : null
    if (temp) setList((l) => [...(l ?? []), temp])
    try {
      const { result } = await apiSend<Ok<ComentarioRow>>(`/api/tarefas/${taskId}/comentarios`, "POST", { conteudo })
      setList((l) => (temp ? (l ?? []).map((c) => (c.id === tempId ? result : c)) : [...(l ?? []), result]))
    } catch {
      if (temp) setList((l) => (l ?? []).filter((c) => c.id !== tempId))
      // apiSend já mostra o toast de rede; um 400 (ex.: tarefa sumiu) cai aqui.
    }
  }

  const salvarEdicao = async (id: number, conteudo: string) => {
    const antes = list
    setList((l) => (l ?? []).map((c) => (c.id === id ? { ...c, conteudo, editado: true } : c)))
    setEditId(null)
    try {
      const { result } = await apiSend<Ok<ComentarioRow>>(`/api/tarefas/${taskId}/comentarios/${id}`, "PATCH", { conteudo })
      setList((l) => (l ?? []).map((c) => (c.id === id ? result : c)))
    } catch {
      setList(antes)
      toast("Não foi possível editar o comentário", { kind: "error" })
    }
  }

  const excluir = async (id: number) => {
    const antes = list
    setList((l) => (l ?? []).filter((c) => c.id !== id))
    try {
      await apiSend<Ok<{ id: number }>>(`/api/tarefas/${taskId}/comentarios/${id}`, "DELETE")
    } catch {
      setList(antes)
      toast("Não foi possível excluir o comentário", { kind: "error" })
    }
  }

  const total = list?.length ?? 0
  return (
    <div style={{ marginLeft: 33, marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Icon name="messageSquare" size={15} strokeWidth={1.95} style={{ color: "var(--text-muted)" }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>Comentários</span>
        {total > 0 && (
          <span style={{ fontSize: 12, color: "var(--text-subtle)", fontFeatureSettings: '"tnum"' }}>{total}</span>
        )}
      </div>

      {list === null && !erro && (
        <div style={{ fontSize: 12.5, color: "var(--text-subtle)", padding: "2px 0 10px" }}>Carregando comentários…</div>
      )}
      {erro && (
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", padding: "2px 0 10px" }}>
          Não foi possível carregar os comentários.{" "}
          <button
            className="btn btn-ghost"
            onClick={recarregar}
            style={{ height: 24, fontSize: 12, padding: "0 8px", color: "var(--accent)" }}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {list !== null && total === 0 && (
        <div style={{ fontSize: 12.5, color: "var(--text-subtle)", padding: "2px 0 10px" }}>Nenhum comentário ainda.</div>
      )}

      {list?.map((c) =>
        editId === c.id ? (
          <ComentarioComposer
            key={c.id}
            initial={c.conteudo}
            autoFocus
            submitLabel="Salvar"
            onCancel={() => setEditId(null)}
            onSubmit={(txt) => salvarEdicao(c.id, txt)}
          />
        ) : (
          <ComentarioItem
            key={c.id}
            c={c}
            podeEditar={c.id > 0 && c.autorId === meId}
            podeExcluir={c.id > 0 && (c.autorId === meId || isGestor)}
            onEdit={() => setEditId(c.id)}
            onDelete={() => excluir(c.id)}
          />
        ),
      )}

      {editId === null && (
        <div style={{ marginTop: 6 }}>
          <ComentarioComposer submitLabel="Comentar" onSubmit={enviar} />
        </div>
      )}
    </div>
  )
}

// ── uma linha do thread ──────────────────────────────────────────────────────
function ComentarioItem({
  c,
  podeEditar,
  podeExcluir,
  onEdit,
  onDelete,
}: {
  c: ComentarioRow
  podeEditar: boolean
  podeExcluir: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { member } = useTarefasCtx()
  const m = member(c.autorId)
  return (
    <div style={{ display: "flex", gap: 10, padding: "8px 0" }}>
      <div style={{ marginTop: 1 }}>
        {m ? (
          <AssigneeAvatar id={c.autorId} size={26} title={false} />
        ) : (
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "var(--text-subtle)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10.4,
              fontWeight: 500,
            }}
          >
            ?
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{m?.nome ?? "Usuário"}</span>
          <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>{tempoRelativo(c.createdAt)}</span>
          {c.editado && <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>· editado</span>}
          <div style={{ flex: 1 }} />
          {podeEditar && (
            <button
              aria-label="Editar comentário"
              onClick={onEdit}
              className="btn btn-ghost"
              style={{ width: 24, height: 24, padding: 0, color: "var(--text-subtle)" }}
            >
              <Icon name="edit" size={13} />
            </button>
          )}
          {podeExcluir && (
            <button
              aria-label="Excluir comentário"
              onClick={onDelete}
              className="btn btn-ghost"
              style={{ width: 24, height: 24, padding: 0, color: "var(--text-subtle)" }}
            >
              <Icon name="trash2" size={13} />
            </button>
          )}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            lineHeight: 1.55,
            marginTop: 1,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <ConteudoRender conteudo={c.conteudo} />
        </div>
      </div>
    </div>
  )
}

// ── corpo com menções realçadas (nós React → auto-escapado) ──────────────────
function ConteudoRender({ conteudo }: { conteudo: string }) {
  const { member } = useTarefasCtx()
  const segs = useMemo(() => segmentosComentario(conteudo), [conteudo])
  return (
    <>
      {segs.map((s, i) => {
        if (s.t === "texto") return <span key={i}>{s.v}</span>
        const label = s.t === "todos" ? "todos" : member(s.id)?.first ?? "?"
        return (
          <span
            key={i}
            style={{
              color: "var(--accent)",
              fontWeight: 500,
              background: "var(--accent-soft)",
              borderRadius: 4,
              padding: "0 3px",
            }}
          >
            @{label}
          </span>
        )
      })}
    </>
  )
}

// ── composer com autocomplete de menção ──────────────────────────────────────
type Cand =
  | { kind: "user"; id: number; label: string; sub: string }
  | { kind: "todos"; id: "todos"; label: string; sub: string }

/** Converte o `conteudo` armazenado (com tokens) de volta p/ rascunho editável. */
function rascunhoDeTokens(
  conteudo: string,
  nomeDe: (id: number) => string | null,
): { texto: string; picks: MencaoPick[] } {
  let texto = ""
  const picks: MencaoPick[] = []
  for (const s of segmentosComentario(conteudo)) {
    if (s.t === "texto") texto += s.v
    else if (s.t === "todos") {
      texto += "@todos"
      picks.push({ label: "todos", id: "todos" })
    } else {
      const nome = nomeDe(s.id) ?? `#${s.id}`
      texto += `@${nome}`
      picks.push({ label: nome, id: s.id })
    }
  }
  return { texto, picks }
}

function ComentarioComposer({
  onSubmit,
  onCancel,
  initial = "",
  autoFocus = false,
  submitLabel = "Comentar",
}: {
  onSubmit: (conteudo: string) => void
  onCancel?: () => void
  initial?: string
  autoFocus?: boolean
  submitLabel?: string
}) {
  const { socios, member } = useTarefasCtx()
  const seed = useMemo(() => rascunhoDeTokens(initial, (id) => member(id)?.nome ?? null), [initial, member])
  const [texto, setTexto] = useState(seed.texto)
  const [picks, setPicks] = useState<MencaoPick[]>(seed.picks)
  const [active, setActive] = useState(0)
  const [suprimir, setSuprimir] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const modoNovo = !onCancel

  useEffect(() => {
    if (autoFocus && taRef.current) {
      const el = taRef.current
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [autoFocus])

  const tok = useMemo(() => detectarToken(texto), [texto])
  const mencaoAberta = !suprimir && tok?.trigger === "@"
  const query = mencaoAberta ? tok!.query : ""
  const cands = useMemo<Cand[]>(() => {
    if (!mencaoAberta) return []
    const q = norm(query)
    const arr: Cand[] = socios
      .filter((m) => norm(m.nome).includes(q) || norm(m.first).includes(q))
      .slice(0, 6)
      .map((m) => ({ kind: "user", id: m.id, label: m.nome, sub: m.role }))
    if (!q || "todos".startsWith(q)) arr.unshift({ kind: "todos", id: "todos", label: "todos", sub: "todos os envolvidos" })
    return arr
  }, [mencaoAberta, query, socios])

  const pick = (c: Cand) => {
    const t = detectarToken(texto)
    if (!t) return
    const novo = substituirToken(texto, t, `@${c.label} `)
    setTexto(novo)
    setPicks((ps) => [...ps, { label: c.label, id: c.id }])
    setSuprimir(true)
    requestAnimationFrame(() => {
      const el = taRef.current
      if (el) {
        el.focus()
        el.setSelectionRange(novo.length, novo.length)
      }
    })
  }

  const submit = () => {
    const conteudo = serializeMencoes(texto, picks).trim()
    if (!conteudo) return
    onSubmit(conteudo)
    if (modoNovo) {
      setTexto("")
      setPicks([])
    }
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mencaoAberta && cands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActive((a) => (a + 1) % cands.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActive((a) => (a - 1 + cands.length) % cands.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        pick(cands[active] ?? cands[0])
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setSuprimir(true)
        return
      }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
      return
    }
    if (e.key === "Escape" && onCancel) {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={taRef}
        value={texto}
        aria-label="Escrever comentário"
        role="combobox"
        aria-expanded={mencaoAberta}
        aria-controls="mencao-listbox"
        aria-activedescendant={mencaoAberta && cands.length > 0 ? `mencao-opt-${active}` : undefined}
        onChange={(e) => {
          setTexto(e.target.value)
          setSuprimir(false)
          setActive(0)
        }}
        onKeyDown={onKey}
        rows={2}
        placeholder="Escreva um comentário…  (@ para mencionar, Ctrl+Enter envia)"
        style={{
          width: "100%",
          resize: "vertical",
          minHeight: 54,
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "var(--bg-sunken)",
          padding: "8px 10px",
          outline: "none",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          color: "var(--text)",
          lineHeight: 1.5,
        }}
      />
      {mencaoAberta && (
        <div
          id="mencao-listbox"
          role="listbox"
          className={lexGlassStrong}
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            width: 260,
            borderRadius: 10,
            padding: 6,
            maxHeight: 240,
            overflowY: "auto",
            zIndex: 70,
            ...glassElevation("0 12px 28px rgba(2,13,37,0.16)"),
          }}
        >
          {cands.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--text-subtle)", padding: "8px 9px" }}>Nenhum colega encontrado</div>
          )}
          {cands.map((c, i) => (
            <button
              key={c.kind === "todos" ? "todos" : c.id}
              id={`mencao-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(c)
              }}
              onMouseEnter={() => setActive(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                width: "100%",
                textAlign: "left",
                padding: "6px 8px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: i === active ? "var(--accent-soft)" : "transparent",
                color: i === active ? "var(--accent)" : "var(--text)",
              }}
            >
              {c.kind === "todos" ? (
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name="users" size={14} />
                </span>
              ) : (
                <AssigneeAvatar id={c.id} size={26} title={false} />
              )}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.label}
                </span>
                <span style={{ display: "block", fontSize: 11, color: "var(--text-subtle)" }}>{c.sub}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
        <button
          type="button"
          aria-label="Mencionar alguém"
          className="btn btn-ghost"
          onClick={() => {
            const base = texto && !texto.endsWith(" ") && texto.length > 0 ? `${texto} ` : texto
            const novo = `${base}@`
            setTexto(novo)
            setSuprimir(false)
            requestAnimationFrame(() => {
              const el = taRef.current
              if (el) {
                el.focus()
                el.setSelectionRange(novo.length, novo.length)
              }
            })
          }}
          style={{ width: 28, height: 28, padding: 0 }}
        >
          <Icon name="atSign" size={15} />
        </button>
        <div style={{ flex: 1 }} />
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ height: 30, fontSize: 12.5, padding: "0 12px" }}>
            Cancelar
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={!texto.trim()}
          style={{ height: 30, fontSize: 12.5, padding: "0 14px" }}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  )
}
