"use client"

// Tarefas (redesign) — montagem do módulo: estado, carga, TODAS as ações (cada
// uma espelha um endpoint; aplica a prévia otimista com as MESMAS regras puras
// do servidor, chama a API e mostra o aviso com "Desfazer"), barra lateral,
// diálogos de regra (Começar mesmo assim? / Aguardando o quê? / Ajustar os
// prazos seguintes? / Quem cuida do próximo passo?) e o aviso (toast).
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { apiSend } from "@/lib/client/api"
import { FILTROS_PADRAO, SEM_PROJETO, reposicionar, type Filtros, type PrefsQuadro } from "@/lib/tarefas/filtros"
import {
  aguardandoRotulo,
  criariaCiclo,
  dataCurta,
  deslocamentoCadeia,
  grupoCurto,
  indexar,
  liberadasAoConcluir,
  mapaSeguintes,
  pendentes,
  precisaConfirmarInicio,
  precisaTextoAguardando,
  rotuloPrazo,
  statusAoDesligar,
  statusAoLigar,
} from "@/lib/tarefas/regras"
import { addDays } from "@/lib/datas/util"
import { statusLabel, type ModeloView, type ProjetoRow, type TarefasBoard, type TaskRow, type TaskStatus } from "@/lib/tarefas/types"
import { Icon, type TfIconName } from "./tf-icons"
import { TkBoardPage } from "./tk-board"
import { TkCtx, useTk, type Acoes, type Aviso, type PatchTarefaUI, type TkCtxValue } from "./tk-context"
import { TkDetail } from "./tk-detail"
import { TkMobileBoard, TkMobileNav, type Pagina } from "./tk-mobile"
import { TkNewTask } from "./tk-newtask"
import { TkModeloEditor, TkProjectForm, TkProjectsPage, TkWizard } from "./tk-projects"
import { TkTeamPage } from "./tk-team"
import { TkDialog, TkIconBtn } from "./tk-ui"
import { ELEVACAO_AVISO, TK_AVISO } from "./tk-glass"

type Dialogo =
  | { kind: "start"; texto: string; ok: () => void }
  | { kind: "wait"; salvar: (v: string) => void }
  | { kind: "shift"; n: number; fatais: number; manter: () => void; ajustar: () => void }
  | { kind: "owner"; tarefa: { id: number; titulo: string; grupo: string | null } }
  | { kind: "nova" }
  | { kind: "projeto"; projeto: ProjetoRow | null }
  | { kind: "wizard"; modeloId: number | null }
  | { kind: "modelo"; modelo: ModeloView | null }

type Resp<T> = { ok: true; result: T }

// ── celular: largura ≤ 720px ────────────────────────────────────────────────
const MQ = "(max-width: 720px)"
function useMobile(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(MQ)
      m.addEventListener("change", cb)
      return () => m.removeEventListener("change", cb)
    },
    () => window.matchMedia(MQ).matches,
    () => false,
  )
}

// ── aviso (toast) ────────────────────────────────────────────────────────────
function TkToast({ aviso, onUndo, onClose }: { aviso: (Aviso & { k: number }) | null; onUndo: () => void; onClose: () => void }) {
  useEffect(() => {
    if (!aviso) return
    const id = window.setTimeout(onClose, 7000)
    return () => window.clearTimeout(id)
  }, [aviso, onClose])
  if (!aviso) return null
  return (
    <div className={TK_AVISO} role="status" key={aviso.k} style={ELEVACAO_AVISO}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{aviso.msg}</span>
          {(aviso.sub ?? []).map((s, i) => (
            <span key={i} style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {s}
            </span>
          ))}
        </div>
        {aviso.acaoId && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onUndo}>
            Desfazer
          </button>
        )}
        <TkIconBtn icon="x" title="Fechar" onClick={onClose} />
      </div>
    </div>
  )
}

function TkWaitDialog({ onClose, onSave }: { onClose: () => void; onSave: (v: string) => void }) {
  const [v, setV] = useState("")
  return (
    <TkDialog
      title="Aguardando o quê?"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" disabled={!v.trim()} onClick={() => onSave(v.trim())}>
            Salvar
          </button>
        </>
      }
    >
      <input
        className="input"
        autoFocus
        placeholder="Terceiro"
        aria-label="Terceiro"
        value={v}
        onChange={(e) => setV(e.target.value)}
        style={{ color: "var(--text)" }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && v.trim()) onSave(v.trim())
        }}
      />
    </TkDialog>
  )
}

// ── barra lateral do módulo ──────────────────────────────────────────────────
function TkSidebar({ pagina, ir, onNova, gestao }: { pagina: Pagina; ir: (p: Pagina) => void; onNova: () => void; gestao: boolean }) {
  const itens: [Pagina, TfIconName, string][] = [
    ["board", "kanban", "Quadro"],
    ["projects", "folder", "Projetos"],
    ...(gestao ? ([["team", "users", "Equipe"]] as [Pagina, TfIconName, string][]) : []),
  ]
  return (
    <aside className="tk-side" aria-label="Tarefas">
      <div className="tk-side-head">Tarefas</div>
      <button type="button" className="btn btn-primary" onClick={onNova} style={{ width: "100%", height: 34, borderRadius: 8, marginBottom: 10 }}>
        <Icon name="plus" size={16} strokeWidth={2.2} />
        Nova tarefa
      </button>
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {itens.map(([id, ic, l]) => (
          <button
            type="button"
            key={id}
            className={"tk-navitem" + (pagina === id ? " on" : "")}
            aria-current={pagina === id ? "page" : undefined}
            onClick={() => ir(id)}
          >
            <Icon name={ic} size={17} strokeWidth={pagina === id ? 2 : 1.75} />
            {l}
          </button>
        ))}
      </nav>
    </aside>
  )
}

// ── o app ────────────────────────────────────────────────────────────────────
export interface TarefasAppProps {
  inicial: TarefasBoard
  meId: number | null
  gestao: boolean
  podeProjeto: boolean
  podeModelo: boolean
  pagina: Pagina
  projetoId?: number | null
  tarefaId?: number | null
  visao?: Filtros["visao"] | null
  /** Visão preferida de quem está vendo (ordenar, direção, agrupar). */
  prefs: PrefsQuadro
  /** Ordem manual de quem está vendo: { tarefaId: posição }. */
  ordemManual: Record<number, number>
}

const msgErro = (e: unknown) => (e instanceof Error && e.message ? e.message : "Não foi possível concluir a ação")

export function TarefasApp(props: TarefasAppProps) {
  const { meId, gestao, podeProjeto, podeModelo } = props
  const [board, setBoard] = useState<TarefasBoard>(props.inicial)
  const filtrosIniciais = (projetoId: number | null | undefined, visao?: Filtros["visao"] | null): Filtros => ({
    ...FILTROS_PADRAO,
    ...props.prefs,
    escopo: gestao ? "team" : "mine",
    projetos: projetoId ? [projetoId] : [],
    visao: visao && (visao !== "flow" || projetoId) ? visao : "board",
  })
  const [F, setFState] = useState<Filtros>(() => filtrosIniciais(props.projetoId, props.visao))
  const [pagina, setPagina] = useState<Pagina>(props.pagina === "team" && !gestao ? "board" : props.pagina)
  const [openId, setOpenId] = useState<number | null>(props.tarefaId ?? null)
  const [dialogo, setDialogo] = useState<Dialogo | null>(null)
  const [aviso, setAviso] = useState<(Aviso & { k: number }) | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [ordemManual, setOrdemManual] = useState<Map<number, number>>(
    () => new Map(Object.entries(props.ordemManual).map(([k, v]) => [Number(k), v])),
  )
  const [ultimoProjeto, setUltimoProjeto] = useState<number | null>(null)
  const [portal, setPortal] = useState<HTMLElement | null>(null)
  const mobile = useMobile()
  const seq = useRef(0)

  const { tarefas, projetos, pessoas, clientes, modelos, hoje } = board
  const map = useMemo(() => indexar(tarefas), [tarefas])
  const seguintes = useMemo(() => mapaSeguintes(tarefas), [tarefas])
  const projMap = useMemo(() => indexar(projetos), [projetos])
  const projetosAtivos = useMemo(() => projetos.filter((p) => !p.arquivadoEm), [projetos])
  const pessoaMap = useMemo(() => indexar(pessoas), [pessoas])
  const clienteMap = useMemo(() => indexar(clientes), [clientes])
  const nomePessoa = useCallback((id: number | null) => (id == null ? "sem responsável" : (pessoaMap.get(id)?.first ?? "sem responsável")), [pessoaMap])

  const setF = useCallback((p: Partial<Filtros>) => setFState((f) => ({ ...f, ...p })), [])
  // Volta aos filtros padrão SEM perder a visão preferida (ordenar/direção/agrupar).
  const resetFiltros = useCallback(
    (p: Partial<Filtros>) => setFState((f) => ({ ...FILTROS_PADRAO, ordenar: f.ordenar, direcao: f.direcao, agrupar: f.agrupar, ...p })),
    [],
  )

  // A visão (ordenar/direção/agrupar) fica salva por pessoa: grava quando muda.
  const prefsSalvas = useRef(JSON.stringify(props.prefs))
  useEffect(() => {
    const atual = JSON.stringify({ ordenar: F.ordenar, direcao: F.direcao, agrupar: F.agrupar })
    if (atual === prefsSalvas.current) return
    prefsSalvas.current = atual
    apiSend("/api/tarefas/preferencias", "PATCH", JSON.parse(atual)).catch(() => {})
  }, [F.ordenar, F.direcao, F.agrupar])

  // ── URL ↔ estado (sem navegação do Next: nada é recarregado) ──
  useEffect(() => {
    const url = new URL(window.location.href)
    url.pathname = pagina === "projects" ? "/projetos" : "/tarefas"
    url.search = ""
    if (pagina === "team") url.searchParams.set("pagina", "equipe")
    if (pagina === "board" && F.projetos.length === 1 && F.projetos[0] !== SEM_PROJETO) url.searchParams.set("projeto", String(F.projetos[0]))
    if (pagina === "board" && F.visao !== "board") url.searchParams.set("visao", F.visao === "list" ? "lista" : "fluxo")
    if (openId != null) url.searchParams.set("tarefa", String(openId))
    const alvo = url.pathname + url.search
    // `null` (e não history.state) mantém o roteador do Next sincronizado (usePathname
    // do shell, aba de rota, contexto da LexIA) sem navegar nem recarregar.
    if (alvo !== window.location.pathname + window.location.search) window.history.replaceState(null, "", alvo)
  }, [pagina, F.projetos, F.visao, openId])

  // ── carga ──
  // Cada recarga é uma requisição PRÓPRIA (o apiSend compartilha requisições
  // idênticas em voo, o que reaplicaria uma resposta antiga) e só vale se nenhuma
  // outra recarga ou mutação começou depois dela (`seq`).
  const recarregar = useCallback(async () => {
    const n = ++seq.current
    try {
      const res = await fetch(`/api/tarefas?r=${n}`, { cache: "no-store" })
      if (res.status === 401) {
        window.location.assign("/login")
        return
      }
      if (!res.ok) return
      const b = (await res.json()) as TarefasBoard
      if (n === seq.current) setBoard(b)
    } catch {
      /* rede: o próximo recarregar corrige */
    }
  }, [])

  const local = (fn: (ts: TaskRow[]) => TaskRow[]) => setBoard((b) => ({ ...b, tarefas: fn(b.tarefas) }))
  const patchLocal = (id: number, p: Partial<TaskRow> | ((t: TaskRow) => Partial<TaskRow>)) =>
    local((ts) => ts.map((t) => (t.id === id ? { ...t, ...(typeof p === "function" ? p(t) : p) } : t)))

  const avisar = useCallback((a: Aviso) => setAviso({ ...a, k: Date.now() }), [])
  const fecharAviso = useCallback(() => setAviso(null), [])
  const erro = useCallback(
    (e: unknown) => {
      setAviso({ msg: msgErro(e), k: Date.now() })
      void recarregar()
    },
    [recarregar],
  )

  async function enviar<T>(url: string, metodo: string, corpo?: unknown): Promise<T | null> {
    seq.current++ // uma recarga iniciada antes desta mutação não pode sobrescrever a prévia otimista
    try {
      const r = await apiSend<Resp<T>>(url, metodo, corpo)
      return r.result
    } catch (e) {
      erro(e)
      return null
    }
  }

  const desfazer = async () => {
    const id = aviso?.acaoId
    setAviso(null)
    if (!id) return
    const r = await enviar<{ descricao: string }>(`/api/tarefas/acoes/${id}/desfazer`, "POST")
    if (r) {
      setDialogo((d) => (d && (d.kind === "owner" || d.kind === "shift") ? null : d))
      await recarregar()
    }
  }

  const suaVez = (l: { titulo: string; grupo: string | null; responsavelId: number | null }) => {
    const alvo = `Sua vez: ${l.titulo}${l.grupo ? ` — ${grupoCurto(l.grupo)}` : ""}`
    return l.responsavelId === meId ? alvo : `${nomePessoa(l.responsavelId).replace(/^./, (c) => c.toUpperCase())} recebeu “${alvo}”`
  }

  // ── ações ──
  const enviarStatus = async (id: number, status: TaskStatus, extra: { aguardandoTexto?: string; confirmarInicio?: boolean }) => {
    const t = map.get(id)
    if (!t) return
    patchLocal(id, { status, concluidaEm: null, aguardandoTexto: status === "wait" ? (extra.aguardandoTexto ?? t.aguardandoTexto) : null })
    type R = { acaoId: string | null; precisaConfirmacao?: true; texto?: string; precisaTexto?: true }
    const r = await enviar<R>(`/api/tarefas/${id}/status`, "POST", { status, ...extra })
    if (!r) return
    if (r.precisaConfirmacao) {
      void recarregar()
      setDialogo({
        kind: "start",
        texto: r.texto ?? "",
        ok: () => {
          setDialogo(null)
          void enviarStatus(id, status, { ...extra, confirmarInicio: true })
        },
      })
      return
    }
    if (r.precisaTexto) {
      void recarregar()
      setDialogo({
        kind: "wait",
        salvar: (v) => {
          setDialogo(null)
          void enviarStatus(id, "wait", { aguardandoTexto: v })
        },
      })
      return
    }
    if (r.acaoId) avisar({ msg: `Movida para ${statusLabel(status)}`, sub: [t.titulo], acaoId: r.acaoId })
    void recarregar()
  }

  const concluir = async (id: number) => {
    const t = map.get(id)
    if (!t || t.status === "done") return
    const liberadas = new Set(liberadasAoConcluir(id, tarefas).map((l) => l.id))
    local((ts) =>
      ts.map((x) =>
        x.id === id ? { ...x, status: "done" as TaskStatus, concluidaEm: hoje, aguardandoTexto: null } : liberadas.has(x.id) ? { ...x, status: "todo" as TaskStatus } : x,
      ),
    )
    type L = { id: number; titulo: string; grupo: string | null; responsavelId: number | null }
    const r = await enviar<{ acaoId: string | null; liberadas: L[]; semResponsavel: L[] }>(`/api/tarefas/${id}/concluir`, "POST")
    if (!r) return
    avisar({ msg: `Concluída: ${t.titulo}`, sub: r.liberadas.map(suaVez), acaoId: r.acaoId })
    if (r.semResponsavel.length) {
      const o = r.semResponsavel[0]
      setDialogo({ kind: "owner", tarefa: { id: o.id, titulo: o.titulo, grupo: o.grupo } })
    }
    void recarregar()
  }

  const mover = (id: number, status: TaskStatus) => {
    const t = map.get(id)
    if (!t || t.status === status) return
    if (status === "done") return void concluir(id)
    if (precisaConfirmarInicio(t, map, status)) {
      setDialogo({
        kind: "start",
        texto: aguardandoRotulo(t, map, nomePessoa) ?? "",
        ok: () => {
          setDialogo(null)
          void enviarStatus(id, status, { confirmarInicio: true })
        },
      })
      return
    }
    if (precisaTextoAguardando(t, map, status)) {
      setDialogo({
        kind: "wait",
        salvar: (v) => {
          setDialogo(null)
          void enviarStatus(id, "wait", { aguardandoTexto: v })
        },
      })
      return
    }
    void enviarStatus(id, status, {})
  }

  const rotuloPatch = (t: TaskRow, p: PatchTarefaUI): string => {
    if (p.titulo !== undefined) return "Título alterado"
    if (p.descricao !== undefined) return "Descrição alterada"
    if (p.responsavelId !== undefined) return "Responsável alterado"
    if (p.projetoId !== undefined) return "Projeto alterado"
    if (p.grupo !== undefined) return "Grupo alterado"
    if (p.clienteId !== undefined) return p.clienteId ? `Cliente: ${clienteMap.get(p.clienteId)?.nome ?? ""}` : "Cliente removido"
    if (p.prazoFatal !== undefined) return p.prazoFatal ? "Marcada como prazo fatal" : "Prazo fatal removido"
    if (p.recur !== undefined) return p.recur ? `Repetição: ${p.recur}` : "Repetição removida"
    return t.titulo
  }

  const atualizar = async (id: number, p: PatchTarefaUI) => {
    const t = map.get(id)
    if (!t) return
    local((ts) => {
      let n = ts.map((x) => {
        if (x.id !== id) return x
        const y: TaskRow = { ...x }
        if (p.titulo !== undefined) y.titulo = p.titulo
        if (p.descricao !== undefined) y.descricao = p.descricao
        if (p.responsavelId !== undefined) y.responsavelId = p.responsavelId
        if (p.prazoFatal !== undefined) y.prazoFatal = p.prazoFatal
        if (p.recur !== undefined) y.recur = p.recur
        if (p.grupo !== undefined) y.grupo = p.grupo
        if (p.clienteId !== undefined) y.clienteId = p.clienteId
        if (p.projetoId !== undefined && p.projetoId !== x.projetoId) {
          y.projetoId = p.projetoId
          y.grupo = null
          y.anteriores = []
        }
        return y
      })
      if (p.projetoId !== undefined && p.projetoId !== t.projetoId) n = n.map((x) => (x.anteriores.includes(id) ? { ...x, anteriores: x.anteriores.filter((a) => a !== id) } : x))
      return n
    })
    const r = await enviar<{ acaoId: string | null }>(`/api/tarefas/${id}`, "PATCH", p)
    if (!r) return
    if (r.acaoId) avisar({ msg: rotuloPatch(t, p), acaoId: r.acaoId })
    void recarregar()
  }

  const enviarPrazo = async (id: number, prazo: string, ajustar: boolean) => {
    const t = map.get(id)
    if (!t) return
    const desloc = deslocamentoCadeia(id, prazo, tarefas)
    const moveis = new Set(ajustar ? desloc.moveis : [])
    local((ts) => ts.map((x) => (x.id === id ? { ...x, prazo } : moveis.has(x.id) ? { ...x, prazo: addDays(x.prazo, desloc.delta) } : x)))
    const r = await enviar<{ acaoId: string | null; ajustadas: number }>(`/api/tarefas/${id}/prazo`, "PATCH", { prazo, ajustarSeguintes: ajustar })
    if (!r) return
    if (r.acaoId) {
      avisar({
        msg: `Prazo: ${dataCurta(prazo)}`,
        sub: r.ajustadas ? [`${r.ajustadas} ${r.ajustadas === 1 ? "prazo seguinte ajustado" : "prazos seguintes ajustados"}`] : undefined,
        acaoId: r.acaoId,
      })
    }
    void recarregar()
  }

  const definirPrazo = (id: number, prazo: string) => {
    const t = map.get(id)
    if (!t || t.prazo === prazo) return
    const d = deslocamentoCadeia(id, prazo, tarefas)
    if (!d.delta || !d.moveis.length) return void enviarPrazo(id, prazo, false)
    setDialogo({
      kind: "shift",
      n: d.moveis.length,
      fatais: d.fatais,
      manter: () => {
        setDialogo(null)
        void enviarPrazo(id, prazo, false)
      },
      ajustar: () => {
        setDialogo(null)
        void enviarPrazo(id, prazo, true)
      },
    })
  }

  const ligar = async (anteriorId: number, seguinteId: number) => {
    const a = map.get(anteriorId)
    const b = map.get(seguinteId)
    if (!a || !b || anteriorId === seguinteId || b.anteriores.includes(anteriorId)) return
    if (a.projetoId == null || a.projetoId !== b.projetoId) return avisar({ msg: "Ligações só entre tarefas do mesmo projeto." })
    if (criariaCiclo(anteriorId, seguinteId, map)) return avisar({ msg: "Não é possível: as tarefas ficariam esperando uma pela outra." })
    patchLocal(seguinteId, (x) => ({ anteriores: [...x.anteriores, anteriorId], status: statusAoLigar(x, a) }))
    const r = await enviar<{ acaoId: string }>("/api/tarefas/ligacoes", "POST", { anteriorId, seguinteId })
    if (!r) return
    avisar({ msg: "Ligação criada", sub: [`${b.titulo} só começa depois de ${a.titulo}`], acaoId: r.acaoId })
    void recarregar()
  }

  const desligar = async (anteriorId: number, seguinteId: number) => {
    const b = map.get(seguinteId)
    if (!b) return
    const restantes = pendentes({ ...b, anteriores: b.anteriores.filter((x) => x !== anteriorId) }, map).length
    patchLocal(seguinteId, (x) => ({ anteriores: x.anteriores.filter((y) => y !== anteriorId), status: statusAoDesligar(x, restantes) }))
    const r = await enviar<{ acaoId: string }>("/api/tarefas/ligacoes", "DELETE", { anteriorId, seguinteId })
    if (!r) return
    avisar({ msg: "Ligação removida", acaoId: r.acaoId })
    void recarregar()
  }

  // Item recém-adicionado ainda tem id provisório até a recarga — não edita antes disso.
  const provisorio = (item: { id: string }) => item.id.startsWith("tmp-")

  const comAviso = async (req: Promise<{ acaoId: string } | null>, msg: string) => {
    const r = await req
    if (!r) return
    avisar({ msg, acaoId: r.acaoId })
    void recarregar()
  }

  const acoes: Acoes = {
    mover,
    concluir: (id) => void concluir(id),
    atualizar: (id, p) => void atualizar(id, p),
    definirPrazo,
    ligar: (a, b) => void ligar(a, b),
    desligar: (a, b) => void desligar(a, b),
    checklistAdicionar: (id, texto) => {
      patchLocal(id, (t) => ({ checklist: [...t.checklist, { id: `tmp-${Date.now()}`, texto, marcado: false }] }))
      void comAviso(enviar(`/api/tarefas/${id}/checklist`, "POST", { texto }), "Item adicionado ao checklist")
    },
    checklistEditar: (id, item, p) => {
      if (provisorio(item)) return
      patchLocal(id, (t) => ({ checklist: t.checklist.map((c) => (c.id === item.id ? { ...c, ...p } : c)) }))
      const msg = p.marcado === undefined ? "Item alterado" : p.marcado ? "Item marcado" : "Item desmarcado"
      void comAviso(enviar(`/api/tarefas/${id}/checklist/${encodeURIComponent(item.id)}`, "PATCH", p), msg)
    },
    checklistRemover: (id, item) => {
      if (provisorio(item)) return
      patchLocal(id, (t) => ({ checklist: t.checklist.filter((c) => c.id !== item.id) }))
      void comAviso(enviar(`/api/tarefas/${id}/checklist/${encodeURIComponent(item.id)}`, "DELETE"), "Item removido do checklist")
    },
    checklistParaTarefa: (id, item) => {
      if (provisorio(item)) return
      patchLocal(id, (t) => ({ checklist: t.checklist.filter((c) => c.id !== item.id) }))
      void comAviso(enviar(`/api/tarefas/${id}/checklist/${encodeURIComponent(item.id)}/virar-tarefa`, "POST"), `Tarefa criada: ${item.texto}`)
    },
    excluir: (id) => {
      const t = map.get(id)
      if (!t) return
      local((ts) => ts.filter((x) => x.id !== id).map((x) => (x.anteriores.includes(id) ? { ...x, anteriores: x.anteriores.filter((a) => a !== id) } : x)))
      if (openId === id) setOpenId(null)
      void comAviso(enviar(`/api/tarefas/${id}`, "DELETE"), `Excluída: ${t.titulo}`)
    },
    novaTarefa: () => setDialogo({ kind: "nova" }),
    criar: async (n) => {
      const r = await enviar<{ id: number; prazo: string; acaoId: string }>("/api/tarefas", "POST", n)
      if (!r) return false
      if (n.projetoId != null) setUltimoProjeto(n.projetoId)
      const partes = [
        projMap.get(n.projetoId ?? -1)?.nomeCurto ?? "Sem projeto",
        n.responsavelId != null ? pessoaMap.get(n.responsavelId)?.first : null,
        rotuloPrazo(r.prazo, hoje),
      ].filter(Boolean) as string[]
      avisar({ msg: `Criada: ${n.titulo}`, sub: [partes.join(" · ")], acaoId: r.acaoId })
      await recarregar()
      return true
    },
    criarProjeto: async (v) => {
      const r = await enviar<{ id: number; acaoId: string }>("/api/projetos", "POST", v)
      if (!r) return null
      avisar({ msg: `Projeto criado: ${v.nomeCurto.trim()}`, acaoId: r.acaoId })
      await recarregar()
      return r.id
    },
    editarProjeto: async (id, v) => {
      const p = projMap.get(id)
      const r = await enviar<{ acaoId: string | null }>(`/api/projetos/${id}`, "PATCH", v)
      if (!r) return false
      const nome = p?.nomeCurto ?? ""
      const msg = v.arquivado === true ? `Projeto arquivado: ${nome}` : v.arquivado === false ? `Projeto desarquivado: ${nome}` : "Projeto alterado"
      if (r.acaoId) avisar({ msg, acaoId: r.acaoId })
      if (v.arquivado === true) setFState((f) => ({ ...f, projetos: f.projetos.filter((x) => x !== id) }))
      await recarregar()
      return true
    },
    excluirProjeto: (id) => {
      const p = projMap.get(id)
      setFState((f) => ({ ...f, projetos: f.projetos.filter((x) => x !== id) }))
      void comAviso(enviar(`/api/projetos/${id}`, "DELETE"), `Projeto excluído: ${p?.nomeCurto ?? ""}`)
    },
    criarDeModelo: async (modeloId, v, grupos, responsaveis) => {
      const r = await enviar<{ id: number; acaoId: string; tarefas: number; ligacoes: number }>("/api/projetos/de-modelo", "POST", {
        modeloId,
        projeto: v,
        grupos,
        responsaveis,
      })
      if (!r) return null
      avisar({
        msg: `Projeto criado: ${v.nomeCurto.trim()}`,
        sub: r.tarefas ? [`${r.tarefas} tarefas · ${r.ligacoes} ligações`] : undefined,
        acaoId: r.acaoId,
      })
      await recarregar()
      return r.id
    },
    abrirProjeto: (id) => {
      resetFiltros({ escopo: gestao ? "team" : "mine", projetos: [id] })
      setPagina("board")
    },
    reordenar: (ids) => {
      const itens = reposicionar(ids, ordemManual)
      setOrdemManual((m) => {
        const n = new Map(m)
        for (const i of itens) n.set(i.id, i.ordem)
        return n
      })
      if (F.ordenar !== "manual") setF({ ordenar: "manual" })
      apiSend("/api/tarefas/ordem", "PUT", { itens }).catch(erro)
    },
    recarregar,
    avisar,
    erro,
  }

  const atribuirProximo = async (tarefa: { id: number; titulo: string; grupo: string | null }, responsavelId: number) => {
    setDialogo(null)
    patchLocal(tarefa.id, { responsavelId })
    const r = await enviar<{ acaoId: string }>(`/api/tarefas/${tarefa.id}/responsavel`, "POST", { responsavelId })
    if (!r) return
    avisar({ msg: suaVez({ ...tarefa, responsavelId }), acaoId: r.acaoId })
    void recarregar()
  }

  const ctx: TkCtxValue = {
    tarefas,
    map,
    seguintes,
    projetos,
    projetosAtivos,
    projeto: (id) => (id == null ? null : (projMap.get(id) ?? null)),
    pessoas,
    pessoa: (id) => (id == null ? null : (pessoaMap.get(id) ?? null)),
    nomePessoa,
    clientes,
    cliente: (id) => (id == null ? null : (clienteMap.get(id) ?? null)),
    clienteDoProjeto: (pid) => projMap.get(pid)?.clienteId ?? null,
    modelos,
    hoje,
    meId,
    gestao,
    podeProjeto,
    podeModelo,
    mobile,
    act: acoes,
    openTask: setOpenId,
    ordemManual: (id) => ordemManual.get(id),
    dragging,
    setDragging,
    portal,
  }

  const ir = (p: Pagina) => {
    if (p === "team" && !gestao) return
    setPagina(p)
  }
  const limparFiltros = () => setFState((f) => ({ ...f, projetos: [], responsavel: null, prazo: null, visao: f.visao === "flow" ? "board" : f.visao }))
  const projetoParaNova = F.projetos.length === 1 && F.projetos[0] !== SEM_PROJETO ? F.projetos[0] : ultimoProjeto

  const conteudo =
    pagina === "board" ? (
      mobile ? (
        <TkMobileBoard F={F} setF={setF} limpar={limparFiltros} />
      ) : (
        <TkBoardPage F={F} setF={setF} setFState={setFState} onEditarProjeto={(p) => setDialogo({ kind: "projeto", projeto: p })} />
      )
    ) : pagina === "projects" ? (
      <TkProjectsPage
        onNovoEmBranco={() => setDialogo({ kind: "projeto", projeto: null })}
        onAssistente={(modeloId) => setDialogo({ kind: "wizard", modeloId })}
        onEditarModelo={(m) => setDialogo({ kind: "modelo", modelo: m })}
      />
    ) : (
      <TkTeamPage
        onAbrirPessoa={(id) => {
          resetFiltros({ escopo: "team", responsavel: id })
          setPagina("board")
        }}
      />
    )

  return (
    <TkCtx.Provider value={ctx}>
      <div className="tk-scope tk-root">
        {mobile ? (
          <div className="tk-mobile">
            {conteudo}
            <TkMobileNav pagina={pagina} ir={ir} />
          </div>
        ) : (
          <>
            <TkSidebar pagina={pagina} ir={ir} onNova={acoes.novaTarefa} gestao={gestao} />
            {conteudo}
          </>
        )}
        {openId != null && map.has(openId) && <TkDetail key={openId} id={openId} onClose={() => setOpenId(null)} />}
        <Dialogos
          dialogo={dialogo}
          fechar={() => setDialogo(null)}
          projetoParaNova={projetoParaNova}
          atribuirProximo={atribuirProximo}
        />
        <div ref={setPortal} className="tk-portal">
          <TkToast aviso={aviso} onUndo={() => void desfazer()} onClose={fecharAviso} />
        </div>
      </div>
    </TkCtx.Provider>
  )
}

function Dialogos({
  dialogo,
  fechar,
  projetoParaNova,
  atribuirProximo,
}: {
  dialogo: Dialogo | null
  fechar: () => void
  projetoParaNova: number | null
  atribuirProximo: (t: { id: number; titulo: string; grupo: string | null }, responsavelId: number) => void
}) {
  if (!dialogo) return null
  switch (dialogo.kind) {
    case "start":
      return (
        <TkDialog
          title="Começar mesmo assim?"
          onClose={fechar}
          actions={
            <>
              <button type="button" className="btn btn-secondary" onClick={fechar}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={dialogo.ok}>
                Começar
              </button>
            </>
          }
        >
          Aguardando: {dialogo.texto}
        </TkDialog>
      )
    case "wait":
      return <TkWaitDialog onClose={fechar} onSave={dialogo.salvar} />
    case "shift":
      return (
        <TkDialog
          title="Ajustar os prazos seguintes?"
          onClose={dialogo.manter}
          actions={
            <>
              <button type="button" className="btn btn-secondary" onClick={dialogo.manter}>
                Manter
              </button>
              <button type="button" className="btn btn-primary" onClick={dialogo.ajustar}>
                Ajustar
              </button>
            </>
          }
        >
          {dialogo.n} {dialogo.n === 1 ? "tarefa" : "tarefas"}
          {dialogo.fatais ? ` · ${dialogo.fatais} com prazo fatal não muda${dialogo.fatais > 1 ? "m" : ""}` : ""}
        </TkDialog>
      )
    case "owner":
      return <OwnerDialog tarefa={dialogo.tarefa} fechar={fechar} atribuir={atribuirProximo} />
    case "nova":
      return <TkNewTask projetoInicial={projetoParaNova} onClose={fechar} />
    case "projeto":
      return <TkProjectForm projeto={dialogo.projeto} onClose={fechar} />
    case "wizard":
      return <TkWizard modeloId={dialogo.modeloId} onClose={fechar} />
    case "modelo":
      return <TkModeloEditor modelo={dialogo.modelo} onClose={fechar} />
  }
}

function OwnerDialog({
  tarefa,
  fechar,
  atribuir,
}: {
  tarefa: { id: number; titulo: string; grupo: string | null }
  fechar: () => void
  atribuir: (t: { id: number; titulo: string; grupo: string | null }, responsavelId: number) => void
}) {
  const { pessoas } = useTk()
  return (
    <TkDialog
      title="Quem cuida do próximo passo?"
      onClose={fechar}
      actions={
        <>
          <button type="button" className="btn btn-ghost" onClick={fechar}>
            Depois
          </button>
          {pessoas.map((p) => (
            <button type="button" key={p.id} className="btn btn-secondary" onClick={() => atribuir(tarefa, p.id)}>
              {p.first}
            </button>
          ))}
        </>
      }
    >
      {tarefa.titulo}
      {tarefa.grupo ? ` — ${tarefa.grupo}` : ""}
    </TkDialog>
  )
}
