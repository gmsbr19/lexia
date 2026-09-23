"use client"

// Tarefas — detalhe da tarefa no layout do Trello, com os tokens do LexIA:
// janela ~1040px (vidro do app) em duas colunas. Topo: status (pílula com
// menu), "…" e fechar. Esquerda: círculo de concluir + título; ações
// (Checklist, Anexo, Ligação); campos em pílulas com rótulo (Responsável,
// Projeto, Grupo, Prazo, Repetir, Cliente); seções com ícone (Descrição,
// Checklist, Anexos, Ligações). Direita: "Comentários e atividade" — os
// comentários sempre; o histórico entra com "Mostrar detalhes". No celular:
// tela cheia, uma coluna só.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { apiSend } from "@/lib/client/api"
import { normalizar } from "@/lib/text"
import {
  clienteEfetivo,
  conflitosPrazo,
  dataCurta,
  dataSP,
  grupoCurto,
  hojeSP,
  motivosRisco,
  rotuloQuando,
  vencida,
} from "@/lib/tarefas/regras"
import { segmentosComentario, serializeMencoes, type ComentarioRow, type MencaoPick } from "@/lib/tarefas/comentario-core"
import { STATUS, statusLabel, type AnexoRow, type HistoricoRow, type TaskRow, type TaskStatus } from "@/lib/tarefas/types"
import { Icon, type TfIconName } from "./tf-icons"
import { useTk } from "./tk-context"
import { TkClientPicker, TkDatePop, TkGrupoDialog, TkRecurMenu, useGruposDoProjeto, useOpcoesProjeto, type OpcaoMenu } from "./tk-pickers"
import { TkProjectForm } from "./tk-projects"
import { TkAvatar, TkDialog, TkEspera, TkIconBtn, TkMenuItem, TkMenuLabel, TkMenuSep, TkPop, useEsc, usePop } from "./tk-ui"
import { ELEVACAO_JANELA, TK_JANELA } from "./tk-glass"

const HORA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })
/** "hoje, 14:32" / "21 mai, 09:10" — carimbo da atividade. */
function quando(iso: string, hoje: string): string {
  const d = new Date(iso)
  return `${rotuloQuando(dataSP(d) ?? hoje, hoje)}, ${HORA.format(d)}`
}

/** Caixa de texto que cresce com o conteúdo (vazia, fica baixa). */
function crescer(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = "auto"
  el.style.height = `${el.scrollHeight + 2}px`
}

// ── blocos de layout ─────────────────────────────────────────────────────────
/** Seção com ícone na calha da esquerda (alinhado ao círculo do título). */
function TkSecao({ icon, titulo, extra, children }: { icon: TfIconName; titulo: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="tk-dsec">
      <div className="tk-dsec-head">
        <Icon name={icon} size={18} />
        <span className="tk-dsec-title">{titulo}</span>
        {extra ?? <span />}
      </div>
      <div className="tk-dsec-body">{children}</div>
    </section>
  )
}

/** Campo com rótulo em cima (Membros / Etiquetas no Trello). */
function TkCampo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      <span className="tk-campo-label">{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flexWrap: "wrap" }}>{children}</div>
    </div>
  )
}

/** Avatar da pessoa, ou um círculo neutro quando não há (sistema / inativo). */
function TkAutor({ id }: { id: number | null }) {
  const { pessoa } = useTk()
  if (pessoa(id)) return <TkAvatar id={id} size={32} />
  return (
    <span className="tk-avatar-vazio" aria-hidden>
      <Icon name="user" size={15} />
    </span>
  )
}

// ── topo: status ─────────────────────────────────────────────────────────────
function TkStatusPill({ t }: { t: TaskRow }) {
  const { act } = useTk()
  const pop = usePop()
  return (
    <span style={{ display: "inline-flex", flexShrink: 0 }}>
      <button type="button" className="tk-status-pill" onClick={pop.toggle} aria-label={`Status: ${statusLabel(t.status)}`}>
        {statusLabel(t.status)}
        <Icon name="chevronDown" size={14} />
      </button>
      <TkPop open={pop.open} onClose={pop.close} anchor={pop.anchor} width={200}>
        {STATUS.map((s) => (
          <TkMenuItem
            key={s.id}
            checked={t.status === s.id}
            onClick={() => {
              pop.close()
              if (s.id !== t.status) act.mover(t.id, s.id as TaskStatus)
            }}
          >
            {s.label}
          </TkMenuItem>
        ))}
      </TkPop>
    </span>
  )
}

// ── campos ───────────────────────────────────────────────────────────────────
function TkPessoaCampo({ t }: { t: TaskRow }) {
  const { pessoas, pessoa, meId, act } = useTk()
  const pop = usePop()
  const atual = pessoa(t.responsavelId)
  const escolher = (id: number | null) => {
    pop.close()
    if (id !== t.responsavelId) act.atualizar(t.id, { responsavelId: id })
  }
  return (
    <span style={{ display: "inline-flex" }}>
      <button type="button" className={"tk-fchip tk-fchip-pessoa" + (atual ? "" : " muted")} onClick={pop.toggle} title={atual?.nome}>
        {atual ? <TkAvatar id={atual.id} size={24} /> : <Icon name="user" size={14} />}
        <span>{atual ? atual.first : "Sem responsável"}</span>
      </button>
      <TkPop open={pop.open} onClose={pop.close} anchor={pop.anchor} width={250}>
        {pessoas.map((p) => (
          <TkMenuItem key={p.id} checked={p.id === t.responsavelId} onClick={() => escolher(p.id)}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <TkAvatar id={p.id} size={22} />
              {p.id === meId ? `${p.nome} (eu)` : p.nome}
            </span>
          </TkMenuItem>
        ))}
        <TkMenuSep />
        <TkMenuItem checked={t.responsavelId == null} onClick={() => escolher(null)}>
          Sem responsável
        </TkMenuItem>
      </TkPop>
    </span>
  )
}

/** Projeto como etiqueta colorida (a cor do projeto = a etiqueta do Trello). */
function TkProjetoCampo({ t, opcoes }: { t: TaskRow; opcoes: OpcaoMenu<number | null>[] }) {
  const { projeto, act, podeProjeto, portal } = useTk()
  const p = projeto(t.projetoId)
  const pop = usePop()
  const [novo, setNovo] = useState(false)
  return (
    <span style={{ display: "inline-flex", minWidth: 0 }}>
      {p ? (
        <button type="button" className="tk-label" style={{ background: p.cor }} title={p.nome} onClick={pop.toggle}>
          <span>{p.nomeCurto}</span>
        </button>
      ) : (
        <button type="button" className="tk-fadd" aria-label="Projeto" title="Projeto" onClick={pop.toggle}>
          <Icon name="plus" size={16} />
        </button>
      )}
      <TkPop open={pop.open} onClose={pop.close} anchor={pop.anchor} width={240}>
        {opcoes.map((o) => (
          <TkMenuItem
            key={String(o.id)}
            dot={o.dot}
            checked={o.id === t.projetoId}
            onClick={() => {
              pop.close()
              if (o.id !== t.projetoId) act.atualizar(t.id, { projetoId: o.id })
            }}
          >
            {o.label}
          </TkMenuItem>
        ))}
        {podeProjeto && (
          <>
            <TkMenuSep />
            <TkMenuItem
              icon="plus"
              onClick={() => {
                pop.close()
                setNovo(true)
              }}
            >
              Novo projeto…
            </TkMenuItem>
          </>
        )}
      </TkPop>
      {novo &&
        portal &&
        createPortal(
          <TkProjectForm projeto={null} onClose={() => setNovo(false)} onCriado={(id) => act.atualizar(t.id, { projetoId: id })} />,
          portal,
        )}
    </span>
  )
}

function TkGrupoMenu({ t }: { t: TaskRow }) {
  const { act } = useTk()
  const pop = usePop()
  const [novo, setNovo] = useState(false)
  const grupos = useGruposDoProjeto(t.projetoId)
  const escolher = (g: string | null) => {
    pop.close()
    if (g !== t.grupo) act.atualizar(t.id, { grupo: g })
  }
  return (
    <span style={{ display: "inline-flex", minWidth: 0 }}>
      <button type="button" className={"tk-fchip" + (t.grupo ? "" : " muted")} onClick={pop.toggle} title={t.grupo ?? undefined}>
        <span>{t.grupo ?? "Sem grupo"}</span>
        <Icon name="chevronDown" size={13} style={{ flexShrink: 0, color: "var(--text-muted)" }} />
      </button>
      <TkPop open={pop.open} onClose={pop.close} anchor={pop.anchor} width={260}>
        {grupos.map((g) => (
          <TkMenuItem key={g} checked={g === t.grupo} onClick={() => escolher(g)}>
            {g}
          </TkMenuItem>
        ))}
        <TkMenuItem checked={!t.grupo} onClick={() => escolher(null)}>
          Sem grupo
        </TkMenuItem>
        <TkMenuSep />
        <TkMenuItem
          icon="plus"
          onClick={() => {
            pop.close()
            setNovo(true)
          }}
        >
          Novo grupo…
        </TkMenuItem>
      </TkPop>
      {novo && <TkGrupoDialog onClose={() => setNovo(false)} onSalvar={(g) => escolher(g)} />}
    </span>
  )
}

// ── ligações ─────────────────────────────────────────────────────────────────
function TkLinkRow({ t, onRemove }: { t: TaskRow; onRemove?: () => void }) {
  const { openTask, hoje, pessoa } = useTk()
  const done = t.status === "done"
  const late = vencida(t, hoje)
  const resp = pessoa(t.responsavelId)
  return (
    <div className="tk-linkrow">
      <button
        type="button"
        className="tk-linkrow-main"
        onClick={() => openTask(t.id)}
        title={`${t.titulo}${t.grupo ? " — " + t.grupo : ""} (${resp ? resp.first : "sem responsável"})`}
      >
        <Icon
          name={done ? "checkCircle" : late ? "alertCircle" : "circleDot"}
          size={13}
          style={{ color: done ? "var(--ok)" : late ? "var(--crit)" : "var(--text-muted)", flexShrink: 0 }}
        />
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: done ? "var(--text-muted)" : "var(--text)" }}>
          {t.titulo}
          {t.grupo ? <span style={{ color: "var(--text-muted)" }}> — {grupoCurto(t.grupo)}</span> : null}
        </span>
        <span style={{ fontSize: 12, whiteSpace: "nowrap", color: done ? "var(--ok)" : late ? "var(--crit)" : "var(--text-muted)" }}>
          {done ? "Concluída" : resp ? resp.first : "Sem responsável"}
        </span>
      </button>
      {onRemove && <TkIconBtn icon="x" title="Remover" size={13} onClick={onRemove} />}
    </div>
  )
}

/** Escolhe a tarefa de que esta depende ("Só começa depois de…"). */
function TkLinkPicker({ t, acao }: { t: TaskRow; acao?: boolean }) {
  const { tarefas, act } = useTk()
  const pop = usePop()
  const [q, setQ] = useState("")
  if (t.projetoId == null) return null
  const nq = normalizar(q)
  const opts = tarefas.filter(
    (x) =>
      x.projetoId === t.projetoId &&
      x.id !== t.id &&
      !t.anteriores.includes(x.id) &&
      normalizar(`${x.titulo} ${x.grupo ?? ""}`).includes(nq),
  )
  const fechar = () => {
    pop.close()
    setQ("")
  }
  return (
    <span style={{ alignSelf: "flex-start", display: "inline-flex" }}>
      {acao ? (
        <button type="button" className="tk-dbtn" onClick={pop.toggle}>
          <Icon name="link2" size={15} />
          Ligação
        </button>
      ) : (
        <button type="button" className="tk-inline-add" onClick={pop.toggle}>
          <Icon name="plus" size={13} />
          Adicionar
        </button>
      )}
      <TkPop open={pop.open} onClose={fechar} anchor={pop.anchor} width={300}>
        <TkMenuLabel>Só começa depois de…</TkMenuLabel>
        <input className="input" autoFocus placeholder="Buscar" aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} style={{ margin: "3px 0" }} />
        <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
          {opts.map((x) => (
            <TkMenuItem
              key={x.id}
              onClick={() => {
                act.ligar(x.id, t.id)
                fechar()
              }}
            >
              <span style={{ display: "flex", flexDirection: "column" }}>
                <span>{x.titulo}</span>
                {x.grupo && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{x.grupo}</span>}
              </span>
            </TkMenuItem>
          ))}
          {!opts.length && <div style={{ padding: "6px 10px", fontSize: 12, color: "var(--text-muted)" }}>Nenhuma tarefa</div>}
        </div>
      </TkPop>
    </span>
  )
}

// ── checklist ────────────────────────────────────────────────────────────────
function TkChecklist({ t, adding, setAdding }: { t: TaskRow; adding: boolean; setAdding: (v: boolean) => void }) {
  const { act } = useTk()
  const [val, setVal] = useState("")
  if (!t.checklist.length && !adding) return null
  const feitos = t.checklist.filter((c) => c.marcado).length
  const pct = t.checklist.length ? Math.round((feitos / t.checklist.length) * 100) : 0
  const add = () => {
    if (!val.trim()) return
    act.checklistAdicionar(t.id, val.trim())
    setVal("")
  }
  return (
    <TkSecao icon="checkSquare" titulo="Checklist">
      <div className="tk-ckprog">
        <span className="tnum">{pct}%</span>
        <span className="tk-ckbar">
          <span style={{ width: `${pct}%`, background: pct === 100 ? "var(--ok)" : "var(--accent-strong)" }} />
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {t.checklist.map((c) => (
          <div key={c.id} className="tk-ckrow">
            <button
              type="button"
              className={"tk-box" + (c.marcado ? " on" : "")}
              role="checkbox"
              aria-checked={c.marcado}
              aria-label={c.texto}
              onClick={() => act.checklistEditar(t.id, c, { marcado: !c.marcado })}
            >
              {c.marcado && <Icon name="check" size={11} strokeWidth={3} />}
            </button>
            <span style={{ flex: 1, fontSize: 14, color: c.marcado ? "var(--text-muted)" : "var(--text)", textDecoration: c.marcado ? "line-through" : "none" }}>
              {c.texto}
            </span>
            <button type="button" className="tk-ck-convert" onClick={() => act.checklistParaTarefa(t.id, c)}>
              Transformar em tarefa
            </button>
            <button type="button" className="tk-ck-x" title="Remover" aria-label="Remover" onClick={() => act.checklistRemover(t.id, c)}>
              <Icon name="x" size={12} />
            </button>
          </div>
        ))}
      </div>
      {adding ? (
        <input
          className="input"
          autoFocus
          placeholder="Item"
          aria-label="Item"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add()
            if (e.key === "Escape") {
              e.stopPropagation()
              setAdding(false)
              setVal("")
            }
          }}
          onBlur={() => {
            add()
            setAdding(false)
          }}
          style={{ marginTop: 4 }}
        />
      ) : (
        <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start", marginTop: 4 }} onClick={() => setAdding(true)}>
          Adicionar item
        </button>
      )}
    </TkSecao>
  )
}

// ── anexos ───────────────────────────────────────────────────────────────────
function useAnexos(tarefaId: number, recarregar: () => void) {
  const { act } = useTk()
  const arquivo = useRef<HTMLInputElement>(null)
  const [link, setLink] = useState<{ nome: string; url: string } | null>(null)
  const [enviando, setEnviando] = useState(false)

  const enviarArquivo = async (f: File) => {
    setEnviando(true)
    try {
      const fd = new FormData()
      fd.append("arquivo", f)
      const res = await fetch(`/api/tarefas/${tarefaId}/anexos`, { method: "POST", body: fd })
      const data = (await res.json().catch(() => ({}))) as { error?: string; result?: { acaoId?: string } }
      if (!res.ok || data.error) throw new Error(data.error ?? "Falha ao enviar")
      act.avisar({ msg: `Anexo: ${f.name}`, acaoId: data.result?.acaoId ?? null })
      recarregar()
      void act.recarregar()
    } catch (e) {
      act.erro(e)
    } finally {
      setEnviando(false)
    }
  }
  const salvarLink = async () => {
    if (!link) return
    try {
      const r = await apiSend<{ result: { acaoId: string } }>(`/api/tarefas/${tarefaId}/anexos`, "POST", link)
      act.avisar({ msg: `Anexo: ${link.nome}`, acaoId: r.result.acaoId })
      setLink(null)
      recarregar()
      void act.recarregar()
    } catch (e) {
      act.erro(e)
    }
  }
  const remover = async (a: AnexoRow) => {
    try {
      const r = await apiSend<{ result: { acaoId: string } }>(`/api/tarefas/${tarefaId}/anexos/${a.id}`, "DELETE")
      act.avisar({ msg: `Anexo removido: ${a.nome}`, acaoId: r.result.acaoId })
      recarregar()
      void act.recarregar()
    } catch (e) {
      act.erro(e)
    }
  }

  const extras = (
    <>
      <input
        ref={arquivo}
        type="file"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ""
          if (f) void enviarArquivo(f)
        }}
      />
      {link && (
        <TkDialog
          title="Link"
          onClose={() => setLink(null)}
          actions={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setLink(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" disabled={!link.nome.trim() || !/^https?:\/\//i.test(link.url.trim())} onClick={() => void salvarLink()}>
                Salvar
              </button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input className="input" autoFocus placeholder="Nome" aria-label="Nome" value={link.nome} onChange={(e) => setLink({ ...link, nome: e.target.value })} style={{ color: "var(--text)" }} />
            <input
              className="input"
              placeholder="Endereço"
              aria-label="Endereço"
              value={link.url}
              onChange={(e) => setLink({ ...link, url: e.target.value })}
              style={{ color: "var(--text)" }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void salvarLink()
              }}
            />
          </div>
        </TkDialog>
      )}
    </>
  )
  return {
    enviando,
    extras,
    remover,
    escolherArquivo: () => arquivo.current?.click(),
    novoLink: () => setLink({ nome: "", url: "" }),
  }
}
type Anexos = ReturnType<typeof useAnexos>

/** Botão + menu Arquivo / Link. */
function TkAnexoBotao({ an, className, children }: { an: Anexos; className: string; children: ReactNode }) {
  const { mobile } = useTk()
  const pop = usePop()
  return (
    <span style={{ display: "inline-flex" }}>
      <button type="button" className={className} onClick={pop.toggle} disabled={an.enviando}>
        {children}
      </button>
      <TkPop open={pop.open} onClose={pop.close} anchor={pop.anchor} width={170} up={mobile}>
        <TkMenuItem
          icon="paperclip"
          onClick={() => {
            pop.close()
            an.escolherArquivo()
          }}
        >
          Arquivo
        </TkMenuItem>
        <TkMenuItem
          icon="link2"
          onClick={() => {
            pop.close()
            an.novoLink()
          }}
        >
          Link
        </TkMenuItem>
      </TkPop>
    </span>
  )
}

function TkAnexos({ anexos, an }: { anexos: AnexoRow[]; an: Anexos }) {
  const hoje = hojeSP()
  if (!anexos.length) return null
  return (
    <TkSecao
      icon="paperclip"
      titulo="Anexos"
      extra={
        <TkAnexoBotao an={an} className="btn btn-secondary btn-sm">
          Adicionar
        </TkAnexoBotao>
      }
    >
      {anexos.map((a) => (
        <div key={a.id} className="tk-file">
          <span className="tk-file-ico" aria-hidden>
            <Icon name={a.tipo === "link" ? "link2" : "paperclip"} size={16} />
          </span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <a href={a.url ?? "#"} target="_blank" rel="noopener noreferrer" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
              {a.nome}
            </a>
            <span className="tk-when">{quando(a.criadoEm, hoje)}</span>
          </span>
          <TkIconBtn icon="x" title="Remover" size={13} onClick={() => void an.remover(a)} />
        </div>
      ))}
    </TkSecao>
  )
}

// ── comentários e atividade ──────────────────────────────────────────────────
function Mencionado({ texto }: { texto: string }) {
  const { pessoa } = useTk()
  return (
    <>
      {segmentosComentario(texto).map((s, i) =>
        s.t === "texto" ? (
          <span key={i}>{s.v}</span>
        ) : (
          <span key={i} style={{ color: "var(--accent)", fontWeight: 500 }}>
            @{s.t === "todos" ? "todos" : (pessoa(s.id)?.first ?? "alguém")}
          </span>
        ),
      )}
    </>
  )
}

type ItemFeed = { k: string; at: string } & ({ c: ComentarioRow } | { h: HistoricoRow })

function TkAtividade({
  t,
  comentarios,
  historico,
  recarregar,
}: {
  t: TaskRow
  comentarios: ComentarioRow[]
  historico: HistoricoRow[]
  recarregar: () => void
}) {
  const { pessoas, pessoa, meId, gestao, act } = useTk()
  const [detalhes, setDetalhes] = useState(false)
  const [val, setVal] = useState("")
  const [picks, setPicks] = useState<MencaoPick[]>([])
  const [editando, setEditando] = useState<{ id: number; texto: string; picks: MencaoPick[] } | null>(null)
  const [ancora, setAncora] = useState<HTMLElement | null>(null)
  const [mencaoFechada, setMencaoFechada] = useState(false)
  const hoje = hojeSP()

  // "@[12] ok" → "@Leonardo ok" para editar; os picks refazem os tokens ao salvar.
  const paraEdicao = (c: ComentarioRow) => {
    const ps: MencaoPick[] = []
    const texto = c.conteudo.replace(/@\[(\d+|todos)\]/g, (_m, raw: string) => {
      if (raw === "todos") {
        ps.push({ id: "todos", label: "todos" })
        return "@todos"
      }
      const p = pessoa(Number(raw))
      if (!p) return "@alguém"
      ps.push({ id: p.id, label: p.first })
      return `@${p.first}`
    })
    return { id: c.id, texto, picks: ps }
  }
  const mencao = /@([\p{L}]*)$/u.exec(val)
  const candidatos = mencao
    ? [
        ...pessoas.map((p) => ({ id: p.id as number | "todos", label: p.first, nome: p.nome })),
        { id: "todos" as const, label: "todos", nome: "todos" },
      ].filter((c) => normalizar(c.nome).startsWith(normalizar(mencao[1])) || normalizar(c.label).startsWith(normalizar(mencao[1])))
    : []
  const escolher = (c: { id: number | "todos"; label: string }) => {
    setVal(val.replace(/@([\p{L}]*)$/u, `@${c.label} `))
    setPicks((p) => [...p.filter((x) => x.id !== c.id), { id: c.id, label: c.label }])
    ancora?.focus()
  }
  const publicar = async () => {
    const conteudo = serializeMencoes(val.trim(), picks)
    if (!conteudo) return
    try {
      const r = await apiSend<{ result: { acaoId: string } }>(`/api/tarefas/${t.id}/comentarios`, "POST", { conteudo })
      setVal("")
      setPicks([])
      act.avisar({ msg: "Comentário publicado", acaoId: r.result.acaoId })
      recarregar()
      void act.recarregar()
    } catch (e) {
      act.erro(e)
    }
  }
  const salvarEdicao = async () => {
    if (!editando || !editando.texto.trim()) return
    try {
      const conteudo = serializeMencoes(editando.texto.trim(), editando.picks)
      const r = await apiSend<{ result: { acaoId: string } }>(`/api/tarefas/${t.id}/comentarios/${editando.id}`, "PATCH", { conteudo })
      setEditando(null)
      act.avisar({ msg: "Comentário editado", acaoId: r.result.acaoId })
      recarregar()
    } catch (e) {
      act.erro(e)
    }
  }
  const excluir = async (c: ComentarioRow) => {
    try {
      const r = await apiSend<{ result: { acaoId: string } }>(`/api/tarefas/${t.id}/comentarios/${c.id}`, "DELETE")
      act.avisar({ msg: "Comentário excluído", acaoId: r.result.acaoId })
      recarregar()
      void act.recarregar()
    } catch (e) {
      act.erro(e)
    }
  }

  const itens: ItemFeed[] = [
    ...comentarios.map((c) => ({ k: `c${c.id}`, at: c.createdAt, c })),
    ...(detalhes ? historico.map((h) => ({ k: `h${h.id}`, at: h.criadoEm, h })) : []),
  ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))

  return (
    <>
      <div className="tk-act-head">
        <Icon name="messageSquare" size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        <span className="tk-dsec-title" style={{ flex: 1, minWidth: 0 }}>
          Comentários e atividade
        </span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDetalhes((d) => !d)}>
          {detalhes ? "Ocultar detalhes" : "Mostrar detalhes"}
        </button>
      </div>
      <div className="tk-act-compose">
        <input
          className="input"
          placeholder="Comentário"
          aria-label="Comentário"
          value={val}
          onFocus={(e) => setAncora(e.currentTarget)}
          onChange={(e) => {
            setVal(e.target.value)
            setAncora(e.currentTarget)
            setMencaoFechada(false)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              if (candidatos.length && mencao) escolher(candidatos[0])
              else void publicar()
            }
          }}
        />
        <TkPop open={candidatos.length > 0 && !mencaoFechada} onClose={() => setMencaoFechada(true)} anchor={ancora} width={220}>
          {candidatos.map((c) => (
            <TkMenuItem key={String(c.id)} onClick={() => escolher(c)}>
              {c.nome}
            </TkMenuItem>
          ))}
        </TkPop>
      </div>
      <div className="tk-feed">
        {!itens.length && <div className="tk-feed-vazio">{detalhes ? "Nenhuma atividade" : "Nenhum comentário"}</div>}
        {itens.map((it) => {
          if ("h" in it) {
            const h = it.h
            return (
              <div key={it.k} className="tk-feeditem">
                <TkAutor id={h.autorId} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, lineHeight: 1.45 }}>
                    <span style={{ fontWeight: 500 }}>{pessoa(h.autorId)?.nome ?? "Sistema"}</span> {h.texto}
                  </div>
                  <div className="tk-when">{quando(h.criadoEm, hoje)}</div>
                </div>
              </div>
            )
          }
          const c = it.c
          const meu = c.autorId === meId
          return (
            <div key={it.k} className="tk-feeditem">
              <TkAutor id={c.autorId} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{pessoa(c.autorId)?.nome ?? "—"}</span>
                  <span className="tk-when">
                    {quando(c.createdAt, hoje)}
                    {c.editado ? " · editado" : ""}
                  </span>
                </div>
                {editando?.id === c.id ? (
                  <input
                    className="input"
                    autoFocus
                    aria-label="Comentário"
                    value={editando.texto}
                    onChange={(e) => setEditando({ ...editando, texto: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void salvarEdicao()
                      if (e.key === "Escape") {
                        e.stopPropagation()
                        setEditando(null)
                      }
                    }}
                    style={{ marginTop: 4 }}
                  />
                ) : (
                  <div className="tk-bubble">
                    <Mencionado texto={c.conteudo} />
                  </div>
                )}
                {editando?.id !== c.id && (meu || gestao) && (
                  <div className="tk-feedacts">
                    {meu && (
                      <button type="button" className="tk-feedlink" onClick={() => setEditando(paraEdicao(c))}>
                        Editar
                      </button>
                    )}
                    <button type="button" className="tk-feedlink" onClick={() => void excluir(c)}>
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── dados do detalhe (histórico, anexos, comentários) ────────────────────────
function useDetalhe(id: number, versao: unknown) {
  const [dados, setDados] = useState<{ historico: HistoricoRow[]; anexos: AnexoRow[]; comentarios: ComentarioRow[] }>({
    historico: [],
    anexos: [],
    comentarios: [],
  })
  const [n, setN] = useState(0)
  useEffect(() => {
    let vivo = true
    Promise.all([
      apiSend<{ historico: HistoricoRow[]; anexos: AnexoRow[] }>(`/api/tarefas/${id}`, "GET"),
      apiSend<ComentarioRow[]>(`/api/tarefas/${id}/comentarios`, "GET"),
    ])
      .then(([d, c]) => {
        if (vivo) setDados({ historico: d.historico, anexos: d.anexos, comentarios: Array.isArray(c) ? c : [] })
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [id, versao, n])
  return { ...dados, recarregar: () => setN((x) => x + 1) }
}

// ── o detalhe ────────────────────────────────────────────────────────────────
export function TkDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const { map, seguintes, act, hoje, nomePessoa, clienteDoProjeto, projeto, projetosAtivos, mobile } = useTk()
  const t = map.get(id)
  const [titulo, setTitulo] = useState(t?.titulo ?? "")
  // Ressincroniza o título quando ele muda fora daqui (Desfazer, recarga).
  const [tituloBase, setTituloBase] = useState(t?.titulo ?? "")
  if (t && t.titulo !== tituloBase) {
    setTituloBase(t.titulo)
    setTitulo(t.titulo)
  }
  const [addItem, setAddItem] = useState(false)
  const mais = usePop()
  const det = useDetalhe(id, t)
  const opcoesProjetoBase = useOpcoesProjeto()
  const an = useAnexos(id, det.recarregar)
  useEsc(onClose, !mobile)

  const proximas = useMemo(() => (seguintes.get(id) ?? []).map((s) => map.get(s)).filter((x): x is TaskRow => !!x), [seguintes, id, map])
  if (!t) return null
  const done = t.status === "done"
  const anteriores = t.anteriores.map((a) => map.get(a)).filter((x): x is TaskRow => !!x)
  const risco = motivosRisco(t, map, hoje)
  const conflitos = conflitosPrazo(t, map)
  const late = vencida(t, hoje)
  const ce = clienteEfetivo(t, clienteDoProjeto)
  const projAtual = projeto(t.projetoId)
  const opcoesProjeto =
    projAtual && !projetosAtivos.some((p) => p.id === projAtual.id)
      ? [{ id: projAtual.id as number | null, label: projAtual.nomeCurto, dot: projAtual.cor }, ...opcoesProjetoBase]
      : opcoesProjetoBase
  const commitTitulo = () => {
    const v = titulo.trim()
    if (v && v !== t.titulo) act.atualizar(t.id, { titulo: v })
    else setTitulo(t.titulo)
  }

  const cabecalho = (
    <div className={"tk-dhead" + (mobile ? " glass-bar" : "")}>
      <TkStatusPill t={t} />
      {t.status === "wait" && <TkEspera t={t} />}
      <span style={{ flex: 1 }} />
      <span style={{ display: "inline-flex" }}>
        <TkIconBtn icon="moreHorizontal" title="Mais opções" onClick={mais.toggle} />
      </span>
      <TkPop open={mais.open} onClose={mais.close} anchor={mais.anchor} align="right" width={180}>
        <TkMenuItem
          icon="copy"
          onClick={() => {
            mais.close()
            act.duplicar(t.id, true)
          }}
        >
          Duplicar
        </TkMenuItem>
        <TkMenuSep />
        <TkMenuItem
          icon="trash2"
          danger
          onClick={() => {
            mais.close()
            onClose()
            act.excluir(t.id)
          }}
        >
          Excluir
        </TkMenuItem>
      </TkPop>
      <TkIconBtn icon="x" title="Fechar" onClick={onClose} />
    </div>
  )

  const principal = (
    <>
      <div className="tk-dtitle">
        <button
          type="button"
          className={"tk-round" + (done ? " on" : "")}
          role="checkbox"
          aria-checked={done}
          aria-label={done ? "Reabrir" : "Concluir"}
          title={done ? "Reabrir" : "Concluir"}
          onClick={() => (done ? act.mover(t.id, "todo") : act.concluir(t.id))}
        >
          <Icon name="check" size={13} strokeWidth={3} />
        </button>
        <textarea
          className="tk-title-input tk-dtitle-input"
          rows={1}
          value={titulo}
          aria-label="Título"
          placeholder="Título"
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={commitTitulo}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              e.currentTarget.blur()
            }
          }}
          ref={(el) => {
            if (el) {
              el.style.height = "auto"
              el.style.height = `${el.scrollHeight}px`
            }
          }}
        />
      </div>

      <div className="tk-dind">
        {(late || risco.length > 0 || conflitos.length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {late && (
              <div className="tk-note crit">
                <Icon name="alertCircle" size={13} />
                Vencida desde {dataCurta(t.prazo)}
              </div>
            )}
            {!late &&
              risco.map((r) => (
                <div key={r.id} className="tk-note warn">
                  <Icon name="alertTriangle" size={13} />
                  Em risco: {r.titulo}
                  {r.grupo ? ` — ${grupoCurto(r.grupo)}` : ""} venceu {dataCurta(r.prazo)} ({nomePessoa(r.responsavelId)})
                </div>
              ))}
            {conflitos.map((c) => (
              <div key={c.id} className="tk-note warn">
                <Icon name="calendar" size={13} />
                {c.titulo} vence {dataCurta(c.prazo)}, depois deste prazo
              </div>
            ))}
          </div>
        )}

        <div className="tk-dacts">
          <button type="button" className="tk-dbtn" onClick={() => setAddItem(true)}>
            <Icon name="checkSquare" size={15} />
            Checklist
          </button>
          <TkAnexoBotao an={an} className="tk-dbtn">
            <Icon name="paperclip" size={15} />
            {an.enviando ? "Enviando…" : "Anexo"}
          </TkAnexoBotao>
          <TkLinkPicker t={t} acao />
        </div>

        <div className="tk-dmeta">
          <TkCampo label="Responsável">
            <TkPessoaCampo t={t} />
          </TkCampo>
          <TkCampo label="Prazo">
            <TkDatePop
              chip
              value={t.prazo}
              late={late}
              onChange={(v) => act.definirPrazo(t.id, v)}
              fatal={t.prazoFatal}
              onFatal={(v) => act.atualizar(t.id, { prazoFatal: v })}
            />
          </TkCampo>
          <TkCampo label="Repetir">
            <TkRecurMenu chip value={t.recur} prazo={t.prazo} onChange={(v) => act.atualizar(t.id, { recur: v })} />
          </TkCampo>
          <TkCampo label="Projeto">
            <TkProjetoCampo t={t} opcoes={opcoesProjeto} />
          </TkCampo>
          <TkCampo label="Grupo">
            {t.projetoId != null ? <TkGrupoMenu t={t} /> : <span className="tk-fchip ro muted">—</span>}
          </TkCampo>
          <TkCampo label="Cliente">
            <TkClientPicker chip value={ce?.id ?? null} herdado={ce?.herdado} onChange={(v) => act.atualizar(t.id, { clienteId: v })} />
          </TkCampo>
        </div>
      </div>

      <TkSecao icon="fileText" titulo="Descrição">
        <textarea
          key={`${t.id}-d-${t.descricao ?? ""}`}
          className="textarea tk-desc"
          rows={2}
          defaultValue={t.descricao ?? ""}
          placeholder="Descrição"
          aria-label="Descrição"
          ref={crescer}
          onInput={(e) => crescer(e.currentTarget)}
          onBlur={(e) => {
            if (e.target.value !== (t.descricao ?? "")) act.atualizar(t.id, { descricao: e.target.value || null })
          }}
        />
      </TkSecao>

      <TkChecklist t={t} adding={addItem} setAdding={setAddItem} />
      <TkAnexos anexos={det.anexos} an={an} />

      {t.projetoId != null && (anteriores.length > 0 || proximas.length > 0) && (
        <TkSecao icon="link2" titulo="Ligações">
          <div className="tk-links2">
            <div className="tk-links2-col">
              <span className="tk-campo-label">Só começa depois de…</span>
              {anteriores.map((p) => (
                <TkLinkRow key={p.id} t={p} onRemove={() => act.desligar(p.id, t.id)} />
              ))}
              <TkLinkPicker t={t} />
            </div>
            <div className="tk-links2-col">
              <span className="tk-campo-label">Libera</span>
              {proximas.map((n) => (
                <TkLinkRow key={n.id} t={n} />
              ))}
              {!proximas.length && <span className="tk-when">Nenhuma</span>}
            </div>
          </div>
        </TkSecao>
      )}
      {an.extras}
    </>
  )

  const atividade = <TkAtividade t={t} comentarios={det.comentarios} historico={det.historico} recarregar={det.recarregar} />

  if (mobile) {
    return (
      <div className="tk-mobile" style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", flexDirection: "column" }}>
        {cabecalho}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <div className="tk-dmain" style={{ overflow: "visible" }}>
            {principal}
          </div>
          <div className="tk-activity">{atividade}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="tk-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={TK_JANELA}
        role="dialog"
        aria-label={t.titulo}
        style={{ ...ELEVACAO_JANELA, width: 1040, maxWidth: "calc(100% - 48px)", height: "min(720px, calc(100% - 64px))", display: "flex", flexDirection: "column" }}
      >
        {cabecalho}
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <div className="tk-dmain">{principal}</div>
          <aside className="tk-activity">{atividade}</aside>
        </div>
      </div>
    </div>
  )
}
