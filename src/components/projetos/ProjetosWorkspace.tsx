"use client"

// Tarefas v2 — client orchestrator (Todoist-inspired). Owns the task list +
// projetos (seeded from the server) and the module SIDEBAR navigation
// (Entrada · Hoje · Em breve · Agenda · Todas · Dashboard · Modelos ·
// projetos dinâmicos · Arquivados), lazy-loads templates + the dashboard, and
// persists every change through the REST routes (apiSend → runMutation). Task
// mutations are optimistic + (modal edits) debounced; project/template
// mutations refetch the affected dataset so the derived progresso/saúde stay
// authoritative. Quick-add (tecla Q) e Ramble (ditado por voz) criam tarefas
// pelo mesmo caminho (POST /api/tarefas).
import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { apiSend } from "@/lib/client/api"
import { tfRoot } from "@/components/tarefas/tf-classes"
import { TarefasProvider } from "@/components/tarefas/TarefasContext"
import { TaskDetailModal } from "@/components/tarefas/TaskDetailModal"
import { QuickAddModal, type NovaTarefa } from "@/components/tarefas/QuickAddModal"
import { RambleModal } from "@/components/tarefas/RambleModal"
import { TasksSidebar, T2Frame, T2Title, type T2Nav } from "@/components/tarefas/t2-shell"
import { dayHeading } from "@/components/tarefas/t2-rows"
import { ArchivedProjectsView, EmBreveV2, EntradaV2, HojeV2 } from "@/components/tarefas/t2-views"
import { Icon } from "@/components/tarefas/tf-icons"
import { AssigneeAvatar, Menu, MenuItem } from "@/components/tarefas/tf-kit"
import { TODAY, tDiff } from "@/components/tarefas/tf-meta"
import { AgendaView, type ViewCallbacks } from "@/components/tarefas/views"
import type { TarefaPatch } from "@/lib/tarefas/mutations"
import {
  PRIO,
  type IdNome,
  type TarefasDataset,
  type TaskPrio,
  type TaskRow,
  type TaskStatus,
  type TeamMember,
  type VinculoRef,
} from "@/lib/tarefas/types"
import type { ProdutividadeDashboard, ProjetosDataset, ProjetoView, TemplateView } from "@/lib/projetos/types"
import { BulkBar, type BulkField, type ModuleTab } from "./pj-kit"
import { CrossTarefasTab } from "./CrossTarefasTab"
import { CanvasSkeleton, NoProjectsState, ProjectCanvas } from "./ProjectsTab"
import { DashboardTab } from "./DashboardTab"
import { TemplatesTab, TemplateEditor, InstantiateWizard, type TemplateFormValue, type InstanciarPayload } from "./TemplatesTab"
import { ProjectModal, type ProjetoFormValue } from "./ProjectModal"
import { lexGlassStrong } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"

const send = <T,>(url: string, method = "POST", body?: unknown) => apiSend<T>(url, method, body)

const CAN_EDIT_PROJETO = ["admin", "socio", "advogado"]
const CAN_TEMPLATE = ["admin", "socio"]

function Toast({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div
      className={lexGlassStrong}
      style={{
        position: "fixed",
        bottom: 22,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "11px 16px",
        borderRadius: 10,
        color: "var(--text)",
        fontSize: 12,
        fontWeight: 500,
        ...glassElevation("0 12px 32px rgba(2,13,37,0.18)"),
      }}
    >
      <Icon name="checkCircle" size={15} strokeWidth={2} style={{ color: "var(--accent)" }} />
      {msg}
    </div>
  )
}

// ── "Mostrar" (filtros globais do módulo) ─────────────────────────────────────
interface GlobalFilters {
  assignee: number | null
  prio: TaskPrio | null
  hideDone: boolean
}

function MostrarBtn({ f, setF, socios }: { f: GlobalFilters; setF: (fn: (f: GlobalFilters) => GlobalFilters) => void; socios: TeamMember[] }) {
  const active = f.assignee != null || f.prio != null || f.hideDone
  return (
    <Menu align="right" width={250} trigger={
      <span
        className="picker-btn"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          height: 32,
          padding: "0 12px",
          borderRadius: 8,
          border: `1px solid ${active ? "var(--border-gold)" : "var(--border-strong)"}`,
          background: active ? "var(--accent-soft)" : "transparent",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 500,
          color: active ? "var(--accent)" : "var(--text-muted)",
        }}
      >
        <Icon name="sliders" size={14} strokeWidth={1.85} />
        Mostrar
      </span>
    }>
      {() => (
        <>
          <MenuItem
            icon={f.hideDone ? "eye" : "checkCircle"}
            label={f.hideDone ? "Mostrar concluídas" : "Ocultar concluídas"}
            onClick={() => setF((x) => ({ ...x, hideDone: !x.hideDone }))}
          />
          <div style={{ height: 1, background: "var(--border)", margin: "5px 0" }} />
          <div style={{ padding: "5px 9px 3px", fontSize: 10, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Responsável</div>
          <MenuItem label="Toda a equipe" active={f.assignee == null} onClick={() => setF((x) => ({ ...x, assignee: null }))} />
          {socios.map((m) => (
            <MenuItem
              key={m.id}
              label={m.nome}
              sub={m.role}
              active={f.assignee === m.id}
              right={<AssigneeAvatar id={m.id} size={17} title={false} />}
              onClick={() => setF((x) => ({ ...x, assignee: m.id }))}
            />
          ))}
          <div style={{ height: 1, background: "var(--border)", margin: "5px 0" }} />
          <div style={{ padding: "5px 9px 3px", fontSize: 10, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Prioridade</div>
          <MenuItem label="Todas" active={f.prio == null} onClick={() => setF((x) => ({ ...x, prio: null }))} />
          {([1, 2, 3, 4] as TaskPrio[]).map((n) => (
            <MenuItem key={n} dot={PRIO[n].color} label={`${PRIO[n].short} · ${PRIO[n].label}`} active={f.prio === n} onClick={() => setF((x) => ({ ...x, prio: n }))} />
          ))}
        </>
      )}
    </Menu>
  )
}

export interface WorkspaceDataset {
  tarefas: TaskRow[]
  projetos: ProjetoView[]
  socios: TeamMember[]
  casos: IdNome[]
  clientes: IdNome[]
  meId: number | null
}

export function ProjetosWorkspace({
  dataset,
  role,
  initialTab = "tarefas",
  initialProjetoId = null,
}: {
  dataset: WorkspaceDataset
  role: string
  initialTab?: ModuleTab
  initialProjetoId?: number | null
}) {
  const params = useSearchParams()
  const { socios, casos, clientes, meId } = dataset
  const canEdit = CAN_EDIT_PROJETO.includes(role)
  const canTemplate = CAN_TEMPLATE.includes(role)

  const [tasks, setTasks] = useState<TaskRow[]>(dataset.tarefas)
  const [projetos, setProjetos] = useState<ProjetoView[]>(dataset.projetos)
  const [nav, setNav] = useState<T2Nav>(() => {
    if (initialTab === "projetos") {
      const pid = initialProjetoId ?? dataset.projetos.find((p) => p.status !== "arquivado")?.id ?? dataset.projetos[0]?.id ?? null
      return pid != null ? { view: "projeto", projectId: pid } : { view: "hoje", projectId: null }
    }
    if (initialTab === "dashboard") return { view: "dashboard", projectId: null }
    if (initialTab === "templates") return { view: "templates", projectId: null }
    return { view: "hoje", projectId: null }
  })
  const [f, setF] = useState<GlobalFilters>({ assignee: null, prio: null, hideDone: false })
  const [sideOpen, setSideOpen] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)
  const [quickAdd, setQuickAdd] = useState<{ presetDate: string | null; presetProject: number | null } | null>(null)
  const [ramble, setRamble] = useState(false)
  const [toast, setToast] = useState("")
  const [favs, setFavs] = useState<Set<number>>(new Set())

  // modals
  const [projModal, setProjModal] = useState<{ projeto: ProjetoView | null } | null>(null)
  const [wizard, setWizard] = useState<TemplateView | null>(null)
  const [tplEditor, setTplEditor] = useState<{ tpl: TemplateView | null } | null>(null)

  // lazy datasets
  const [templates, setTemplates] = useState<TemplateView[] | null>(null)
  const [tplLoading, setTplLoading] = useState(false)
  const [dash, setDash] = useState<ProdutividadeDashboard | null>(null)
  const [dashLoading, setDashLoading] = useState(false)
  const [dashError, setDashError] = useState(false)

  // bulk select
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const clearSel = () => setSelected(new Set())
  const toggleSel = (id: number) =>
    setSelected((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  useEffect(() => { if (!selectMode) clearSel() }, [selectMode])
  useEffect(() => { clearSel(); setSelectMode(false); setSideOpen(false) }, [nav.view, nav.projectId])

  // brief skeleton on project switch
  const prevProj = useRef<number | null>(nav.projectId)
  const [switching, setSwitching] = useState(false)
  useEffect(() => {
    if (nav.view === "projeto" && prevProj.current !== nav.projectId) {
      prevProj.current = nav.projectId
      setSwitching(true)
      const t = setTimeout(() => setSwitching(false), 280)
      return () => clearTimeout(t)
    }
  }, [nav.view, nav.projectId])

  useEffect(() => setTasks(dataset.tarefas), [dataset.tarefas])
  useEffect(() => setProjetos(dataset.projetos), [dataset.projetos])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(""), 3400)
    return () => clearTimeout(t)
  }, [toast])
  const flash = (m: string) => setToast(m)

  // deep-link: ?tarefa=<id> opens that task once
  const handledParam = useRef<string | null>(null)
  useEffect(() => {
    const raw = params.get("tarefa")
    if (!raw || handledParam.current === raw) return
    const tid = Number(raw)
    if (tid && tasks.some((t) => t.id === tid)) {
      handledParam.current = raw
      setOpenId(tid)
    }
  }, [params, tasks])

  const anyModalOpen = openId != null || quickAdd != null || ramble || projModal != null || wizard != null || tplEditor != null

  // keyboard: Q abre o quick-add
  const modalOpenRef = useRef(false)
  useEffect(() => {
    modalOpenRef.current = anyModalOpen
  }, [anyModalOpen])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (modalOpenRef.current || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      const tag = (el?.tagName || "").toLowerCase()
      if (tag === "input" || tag === "textarea" || el?.isContentEditable) return
      if (e.key === "q" || e.key === "Q") {
        e.preventDefault()
        setQuickAdd({ presetDate: null, presetProject: null })
      }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [])

  const casoMap = useMemo(() => new Map(casos.map((c) => [c.id, c.nome])), [casos])
  const clienteMap = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes])
  const projetosView = useMemo(() => projetos.map((p) => (favs.has(p.id) ? { ...p, favorito: true } : p)), [projetos, favs])
  const projetoById = (id: number | null) => (id == null ? null : projetosView.find((p) => p.id === id) ?? null)

  // ── task persistence ──────────────────────────────────────────────────────────
  function mergeTask(t: TaskRow, patch: Partial<TaskRow>): TaskRow {
    const next: TaskRow = { ...t, ...patch }
    if (patch.status !== undefined) next.done = patch.status === "done"
    else if (patch.done !== undefined) next.status = patch.done ? "done" : t.status === "done" ? "todo" : t.status
    if ("casoId" in patch || "clienteId" in patch) {
      const casoId = patch.casoId ?? null
      const clienteId = patch.clienteId ?? null
      next.casoId = casoId
      next.clienteId = clienteId
      next.vinculo = casoId
        ? { tipo: "caso", id: casoId, nome: casoMap.get(casoId) ?? `Caso #${casoId}` }
        : clienteId
          ? { tipo: "cliente", id: clienteId, nome: clienteMap.get(clienteId) ?? `Cliente #${clienteId}` }
          : null
    }
    return next
  }
  const applyLocal = (id: number, patch: Partial<TaskRow>) => setTasks((ts) => ts.map((t) => (t.id === id ? mergeTask(t, patch) : t)))

  const pending = useRef<Map<number, TarefaPatch>>(new Map())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sendPatch = async (id: number, patch: TarefaPatch) => {
    try {
      await send(`/api/tarefas/${id}`, "PATCH", patch)
    } catch {
      flash("Erro ao salvar tarefa")
    }
  }
  const flushPending = async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    const entries = [...pending.current.entries()]
    pending.current.clear()
    for (const [id, p] of entries) await sendPatch(id, p)
  }
  const commit = (id: number, patch: Partial<TaskRow>) => { applyLocal(id, patch); void sendPatch(id, patch as TarefaPatch) }
  const liveEdit = (id: number, patch: Partial<TaskRow>) => {
    applyLocal(id, patch)
    pending.current.set(id, { ...(pending.current.get(id) ?? {}), ...(patch as TarefaPatch) })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void flushPending(), 600)
  }

  const toggle = (id: number) => {
    const t = tasks.find((x) => x.id === id)
    if (t) commit(id, { done: !t.done })
  }
  const move = (id: number, status: TaskStatus) => commit(id, { status })
  const schedule = (id: number, hora: string) => commit(id, { data: TODAY(), hora })
  const onLinkClick = (v: VinculoRef) => flash(`${v.tipo === "caso" ? "Caso" : "Cliente"}: ${v.nome}`)
  const del = (id: number) => {
    setTasks((ts) => ts.filter((t) => t.id !== id))
    void send(`/api/tarefas/${id}`, "DELETE").catch(() => flash("Erro ao excluir tarefa"))
  }

  const makeRow = (id: number, body: Record<string, unknown>): TaskRow => ({
    id,
    titulo: String(body.titulo ?? "Nova tarefa"),
    status: "todo",
    done: false,
    prio: ((body.prio as TaskPrio) ?? 4) as TaskPrio,
    projeto: "inbox",
    data: (body.data as string | null) ?? null,
    hora: (body.hora as string | null) ?? null,
    prazo: (body.prazo as string | null) ?? null,
    notes: (body.notes as string | null) ?? null,
    reminder: (body.reminder as string | null) ?? null,
    recur: null,
    ai: false,
    subtasks: [],
    dor: [],
    dod: [],
    responsavelId: (body.responsavelId as number | null) ?? null,
    casoId: null,
    clienteId: null,
    projetoId: (body.projetoId as number | null) ?? null,
    vinculo: null,
    ordem: 0,
  })

  const novaBody = (t: NovaTarefa) => ({
    titulo: t.titulo,
    projeto: "inbox",
    responsavelId: t.responsavelId,
    prio: t.prio,
    data: t.data,
    hora: t.hora,
    prazo: t.prazo,
    notes: t.notes,
    reminder: t.reminder,
    projetoId: t.projetoId,
  })

  const addTask = async (t: NovaTarefa) => {
    const body = novaBody(t)
    try {
      const res = await send<{ result?: { id?: number } }>("/api/tarefas", "POST", body)
      const id = res?.result?.id
      if (id) setTasks((ts) => [makeRow(id, body), ...ts])
      const proj = projetoById(t.projetoId)
      flash(proj ? `Tarefa adicionada em ${proj.nome}` : "Tarefa adicionada na Entrada")
    } catch {
      flash("Erro ao adicionar tarefa")
    }
  }

  // Ramble: cria a lista confirmada em sequência (mantém a ordem do ditado)
  const addTasks = async (list: NovaTarefa[]) => {
    const created: TaskRow[] = []
    let failed = 0
    for (const t of list) {
      const body = novaBody(t)
      try {
        const res = await send<{ result?: { id?: number } }>("/api/tarefas", "POST", body)
        const id = res?.result?.id
        if (id) created.push(makeRow(id, body))
      } catch {
        failed++
      }
    }
    if (created.length) setTasks((ts) => [...created, ...ts])
    flash(
      failed
        ? `${created.length} criada${created.length === 1 ? "" : "s"} · ${failed} falhou${failed === 1 ? "" : "aram"}`
        : `${created.length} tarefa${created.length === 1 ? "" : "s"} adicionada${created.length === 1 ? "" : "s"}`,
    )
  }

  const duplicateTask = async (t: TaskRow) => {
    const body = {
      titulo: t.titulo,
      projeto: t.projeto,
      responsavelId: t.responsavelId,
      prio: t.prio,
      data: t.data,
      hora: t.hora,
      prazo: t.prazo,
      notes: t.notes,
      reminder: t.reminder,
      recur: t.recur,
      subtasks: t.subtasks.map((s) => ({ ...s, done: false })),
      dor: t.dor,
      dod: t.dod,
      ai: t.ai,
      casoId: t.casoId,
      clienteId: t.clienteId,
      projetoId: t.projetoId,
    }
    try {
      const res = await send<{ result?: { id?: number } }>("/api/tarefas", "POST", body)
      const id = res?.result?.id
      if (id) {
        setTasks((ts) => [{ ...t, id, status: "todo", done: false, subtasks: body.subtasks }, ...ts])
        setOpenId(id)
        flash("Tarefa duplicada")
      }
    } catch {
      flash("Erro ao duplicar tarefa")
    }
  }

  const newTaskInProject = async (projetoId: number) => {
    const body = { titulo: "Nova tarefa", projeto: "inbox", responsavelId: meId, prio: 4, projetoId }
    try {
      const res = await send<{ result?: { id?: number } }>("/api/tarefas", "POST", body)
      const id = res?.result?.id
      if (id) {
        setTasks((ts) => [makeRow(id, body), ...ts])
        setOpenId(id)
      }
    } catch {
      flash("Erro ao criar tarefa")
    }
  }

  // Atrasadas → hoje (bloco "Reagendar" do Hoje/Em breve)
  const reschedule = () => {
    const hoje = TODAY()
    const ids = tasks.filter((t) => !t.done && t.data && tDiff(t.data) < 0).map((t) => t.id)
    if (!ids.length) return
    setTasks((ts) => ts.map((t) => (ids.includes(t.id) ? { ...t, data: hoje } : t)))
    void send("/api/tarefas/lote", "PATCH", { ids, data: hoje }).catch(() => flash("Erro ao reagendar tarefas"))
    flash("Tarefas atrasadas reagendadas para hoje")
  }

  // ── bulk edit ─────────────────────────────────────────────────────────────────
  const bulkApply = (field: BulkField, value: string | number | null) => {
    const ids = [...selected]
    setTasks((ts) =>
      ts.map((t) => {
        if (!selected.has(t.id)) return t
        if (field === "status") return { ...t, status: value as TaskStatus, done: value === "done" }
        if (field === "responsavelId") return { ...t, responsavelId: value as number | null }
        if (field === "prazo") return { ...t, prazo: value as string | null }
        if (field === "projetoId") return { ...t, projetoId: value as number | null }
        return t
      }),
    )
    void send("/api/tarefas/lote", "PATCH", { ids, [field]: value }).catch(() => flash("Erro ao atualizar tarefas"))
    flash(`${ids.length} tarefa${ids.length > 1 ? "s" : ""} atualizada${ids.length > 1 ? "s" : ""}`)
    clearSel()
  }
  const bulkDelete = () => {
    const ids = [...selected]
    setTasks((ts) => ts.filter((t) => !selected.has(t.id)))
    void send("/api/tarefas/lote", "PATCH", { ids, excluir: true }).catch(() => flash("Erro ao excluir tarefas"))
    flash(`${ids.length} tarefa${ids.length > 1 ? "s" : ""} excluída${ids.length > 1 ? "s" : ""}`)
    clearSel()
  }

  // ── projetos ──────────────────────────────────────────────────────────────────
  const reloadProjetos = async () => {
    try {
      const d = await send<ProjetosDataset>("/api/projetos", "GET")
      setProjetos(d.projetos)
    } catch {
      /* keep current */
    }
  }
  const reloadTarefas = async () => {
    try {
      const d = await send<TarefasDataset>("/api/tarefas", "GET")
      setTasks(d.tarefas)
    } catch {
      /* keep current */
    }
  }

  const openProject = (id: number) => setNav({ view: "projeto", projectId: id })
  const toggleFav = (id: number) =>
    setFavs((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const saveProject = async (form: ProjetoFormValue) => {
    const body = {
      nome: form.nome,
      descricao: form.descricao,
      status: form.status,
      cor: form.cor,
      icone: form.icone,
      area: form.area,
      prazo: form.prazo,
      responsavelId: form.responsavelId,
      casoId: form.casoId,
      clienteId: form.clienteId,
    }
    try {
      if (form.id) {
        await send(`/api/projetos/${form.id}`, "PATCH", body)
        flash("Projeto atualizado")
      } else {
        const res = await send<{ result?: { id?: number } }>("/api/projetos", "POST", body)
        const id = res?.result?.id
        if (id) setNav({ view: "projeto", projectId: id })
        flash("Projeto criado")
      }
      await reloadProjetos()
    } catch {
      flash("Erro ao salvar projeto")
    }
    setProjModal(null)
  }

  const archiveProject = async (p: ProjetoView) => {
    const novo = p.status === "arquivado" ? "ativo" : "arquivado"
    setProjetos((ps) => ps.map((x) => (x.id === p.id ? { ...x, status: novo } : x)))
    try {
      await send(`/api/projetos/${p.id}`, "PATCH", { status: novo })
      flash(novo === "arquivado" ? "Projeto arquivado" : "Projeto reativado")
      await reloadProjetos()
    } catch {
      flash("Erro ao arquivar projeto")
    }
  }

  const deleteProject = async (id: number) => {
    setProjetos((ps) => ps.filter((p) => p.id !== id))
    if (nav.view === "projeto" && nav.projectId === id) setNav({ view: "hoje", projectId: null })
    try {
      await send(`/api/projetos/${id}`, "DELETE")
      flash("Projeto excluído")
      await Promise.all([reloadProjetos(), reloadTarefas()])
    } catch {
      flash("Erro ao excluir projeto")
    }
    setProjModal(null)
  }

  const renameProject = (id: number, nome: string) => {
    setProjetos((ps) => ps.map((p) => (p.id === id ? { ...p, nome } : p)))
    void send(`/api/projetos/${id}`, "PATCH", { nome }).catch(() => flash("Erro ao renomear projeto"))
  }

  // ── templates ─────────────────────────────────────────────────────────────────
  const loadTemplates = async () => {
    if (templates || tplLoading) return
    setTplLoading(true)
    try {
      const d = await send<{ templates: TemplateView[] }>("/api/projetos/templates", "GET")
      setTemplates(d.templates)
    } catch {
      setTemplates([])
    } finally {
      setTplLoading(false)
    }
  }
  useEffect(() => { if (nav.view === "templates") void loadTemplates() }, [nav.view])

  const templatePayload = (form: TemplateFormValue) => ({
    nome: form.nome,
    descricao: form.descricao,
    area: form.area,
    cor: form.cor,
    icone: form.icone,
    itens: form.itens.map((it) => ({
      titulo: it.titulo,
      prio: it.prio,
      responsavelPlaceholder: it.responsavelPlaceholder || null,
      offsetDias: it.offsetDiasUteis,
      base: it.base,
      dor: it.dor,
      dod: it.dod,
    })),
  })
  const saveTemplate = async (form: TemplateFormValue) => {
    try {
      if (form.id) {
        await send(`/api/projetos/templates/${form.id}`, "PATCH", templatePayload(form))
        flash("Template salvo")
      } else {
        await send("/api/projetos/templates", "POST", templatePayload(form))
        flash("Template criado")
      }
      setTemplates(null)
      void loadTemplates()
    } catch {
      flash("Erro ao salvar template")
    }
    setTplEditor(null)
  }

  const createFromWizard = async (payload: InstanciarPayload) => {
    try {
      const res = await send<{ result?: { id?: number; tarefas?: number } }>("/api/projetos/instanciar", "POST", {
        templateId: payload.templateId,
        dataInicio: payload.dataInicio,
        nome: payload.nome,
        casoId: payload.casoId,
        clienteId: payload.clienteId,
        responsavelId: payload.responsavelId,
        responsaveis: payload.responsaveis,
      })
      const id = res?.result?.id
      const n = res?.result?.tarefas ?? 0
      await Promise.all([reloadProjetos(), reloadTarefas()])
      if (id) setNav({ view: "projeto", projectId: id })
      setTemplates(null) // usos count changed
      flash(`Projeto criado com ${n} tarefa${n === 1 ? "" : "s"} · prazos em dias úteis`)
    } catch {
      flash("Erro ao criar projeto a partir do template")
    }
    setWizard(null)
  }

  // ── dashboard ───────────────────────────────────────────────────────────────────
  const loadDashboard = async () => {
    setDashLoading(true)
    setDashError(false)
    try {
      const d = await send<ProdutividadeDashboard>("/api/projetos/dashboard", "GET")
      setDash(d)
    } catch {
      setDashError(true)
    } finally {
      setDashLoading(false)
    }
  }
  useEffect(() => { if (nav.view === "dashboard" && !dash && !dashLoading) void loadDashboard() }, [nav.view])

  // ── filtros globais (Mostrar) ─────────────────────────────────────────────────
  let filtered = tasks
  if (f.assignee != null) filtered = filtered.filter((t) => t.responsavelId === f.assignee)
  if (f.prio != null) filtered = filtered.filter((t) => t.prio === f.prio)
  // As views v2 (Hoje/Em breve/Entrada) tratam hideDone internamente (janela de
  // graça na conclusão); para as demais o filtro global é aplicado direto.
  const filteredHard = f.hideDone ? filtered.filter((t) => !t.done) : filtered
  const filtersActive = f.assignee != null || f.prio != null || f.hideDone

  // ── render ──────────────────────────────────────────────────────────────────────
  const closeModal = () => { void flushPending(); setOpenId(null) }
  const cb: ViewCallbacks = { onToggle: toggle, onOpen: (id: number) => setOpenId(id), onLinkClick }
  const openTask = tasks.find((t) => t.id === openId) ?? null
  const visibleIds = filtered.map((t) => t.id)
  const onQuickAdd = (presetDate: string | null = null) =>
    setQuickAdd({ presetDate, presetProject: nav.view === "projeto" ? nav.projectId : null })

  const counts = {
    hoje: tasks.filter((t) => !t.done && t.data && tDiff(t.data) <= 0).length,
    entrada: tasks.filter((t) => !t.done && t.projetoId == null).length,
  }
  const openCountProj = (pid: number) => tasks.filter((t) => t.projetoId === pid && !t.done).length
  const selProj = nav.view === "projeto" ? projetosView.find((p) => p.id === nav.projectId) ?? null : null
  const t2ViewProps = { hideDone: f.hideDone, cb, onQuickAdd, onReschedule: reschedule }

  return (
    <div className={`${tfRoot} t2-workspace`}>
      <TarefasProvider socios={socios} casos={casos} clientes={clientes} projetos={projetosView} meId={meId}>
        <div className={`t2-scrim${sideOpen ? " is-open" : ""}`} onClick={() => setSideOpen(false)} />
        <div className={`t2-side-wrap${sideOpen ? " is-open" : ""}`}>
          <TasksSidebar
            nav={nav}
            go={setNav}
            counts={counts}
            projetos={projetosView}
            openCount={openCountProj}
            canEdit={canEdit}
            onToggleFav={toggleFav}
            onNewProject={() => setProjModal({ projeto: null })}
            onQuickAdd={() => onQuickAdd(null)}
            onRamble={() => setRamble(true)}
            onNavigate={() => setSideOpen(false)}
          />
        </div>

        <main className="t2-main">
          {/* top strip: filtros globais */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px 0", flexShrink: 0 }}>
            <button className="t2-side-toggle btn btn-ghost" onClick={() => setSideOpen(true)} style={{ height: 32, fontSize: 12, padding: "0 10px" }}>
              <Icon name="list" size={15} strokeWidth={1.9} />
              Menu
            </button>
            <div style={{ flex: 1 }} />
            {filtersActive && (
              <span onClick={() => setF({ assignee: null, prio: null, hideDone: false })} style={{ fontSize: 12, color: "var(--text-subtle)", cursor: "pointer" }}>
                Limpar filtros
              </span>
            )}
            <MostrarBtn f={f} setF={setF} socios={socios} />
          </div>

          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {nav.view === "hoje" && <HojeV2 tasks={filtered} {...t2ViewProps} />}
            {nav.view === "embreve" && <EmBreveV2 tasks={filtered} {...t2ViewProps} />}
            {nav.view === "entrada" && <EntradaV2 tasks={filtered} cb={cb} onQuickAdd={onQuickAdd} />}
            {nav.view === "agenda" && (
              <T2Frame wide>
                <T2Title title="Agenda do dia" sub={dayHeading(TODAY())} />
                <AgendaView tasks={filteredHard} onSchedule={schedule} {...cb} />
              </T2Frame>
            )}
            {nav.view === "todas" && (
              <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
                <CrossTarefasTab
                  tasks={filteredHard}
                  projetos={projetosView}
                  socios={socios}
                  meId={meId}
                  cb={cb}
                  onMove={move}
                  onSchedule={schedule}
                  onAdd={addTask}
                  selectMode={selectMode}
                  setSelectMode={setSelectMode}
                  selectedIds={selected}
                  onSelect={toggleSel}
                />
              </div>
            )}
            {nav.view === "dashboard" && (
              <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
                <DashboardTab
                  data={dash}
                  loading={dashLoading}
                  error={dashError}
                  onRetry={loadDashboard}
                  projetos={projetosView}
                  onOpenProject={openProject}
                  onOpenTask={(id) => setOpenId(id)}
                />
              </div>
            )}
            {nav.view === "templates" && (
              <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
                <TemplatesTab
                  templates={templates ?? []}
                  loading={tplLoading && !templates}
                  canEdit={canTemplate}
                  onUse={(tpl) => setWizard(tpl)}
                  onEdit={(tpl) => setTplEditor({ tpl })}
                  onNew={() => setTplEditor({ tpl: null })}
                />
              </div>
            )}
            {nav.view === "arquivados" && (
              <T2Frame>
                <T2Title
                  title="Arquivados"
                  sub={`${projetosView.filter((p) => p.status === "arquivado").length} projeto(s) arquivado(s)`}
                />
                <ArchivedProjectsView projetos={projetosView} tasks={tasks} onOpenProject={openProject} onUnarchive={archiveProject} />
              </T2Frame>
            )}
            {nav.view === "projeto" &&
              (!projetosView.length ? (
                <NoProjectsState canCreate={canEdit} onNew={() => setProjModal({ projeto: null })} onTemplates={() => setNav({ view: "templates", projectId: null })} />
              ) : switching ? (
                <CanvasSkeleton />
              ) : !selProj ? (
                <NoProjectsState canCreate={canEdit} onNew={() => setProjModal({ projeto: null })} onTemplates={() => setNav({ view: "templates", projectId: null })} />
              ) : (
                <ProjectCanvas
                  proj={selProj}
                  tasks={filteredHard}
                  cb={cb}
                  onMove={move}
                  onSchedule={schedule}
                  onRename={(name) => renameProject(selProj.id, name)}
                  onEdit={() => setProjModal({ projeto: selProj })}
                  onArchive={() => archiveProject(selProj)}
                  onDelete={() => deleteProject(selProj.id)}
                  onLinkClick={() => selProj.vinculo && onLinkClick(selProj.vinculo)}
                  canEdit={canEdit}
                  onNewTask={() => newTaskInProject(selProj.id)}
                  selectMode={selectMode}
                  setSelectMode={setSelectMode}
                  selectedIds={selected}
                  onSelect={toggleSel}
                />
              ))}
          </div>
        </main>

        {quickAdd && (
          <QuickAddModal
            presetDate={quickAdd.presetDate}
            presetProject={quickAdd.presetProject}
            onClose={() => setQuickAdd(null)}
            onAdd={(t) => void addTask(t)}
            onRamble={() => {
              setQuickAdd(null)
              setRamble(true)
            }}
          />
        )}
        {ramble && (
          <RambleModal
            onClose={() => setRamble(false)}
            onCreate={addTasks}
            onManual={() => {
              setRamble(false)
              setQuickAdd({ presetDate: null, presetProject: null })
            }}
          />
        )}
        {openTask && (
          <TaskDetailModal
            task={openTask}
            ids={visibleIds}
            onNavigate={setOpenId}
            onClose={closeModal}
            onChange={liveEdit}
            onDelete={del}
            onDuplicate={(t) => void duplicateTask(t)}
          />
        )}
        {projModal && (
          <ProjectModal
            projeto={projModal.projeto}
            socios={socios}
            casos={casos}
            clientes={clientes}
            onClose={() => setProjModal(null)}
            onSave={saveProject}
            onDelete={deleteProject}
            onUseTemplate={() => { setProjModal(null); setNav({ view: "templates", projectId: null }) }}
          />
        )}
        {wizard && <InstantiateWizard tpl={wizard} socios={socios} casos={casos} clientes={clientes} onClose={() => setWizard(null)} onCreate={createFromWizard} />}
        {tplEditor && <TemplateEditor tpl={tplEditor.tpl} onClose={() => setTplEditor(null)} onSave={saveTemplate} />}
        {selected.size > 0 && (
          <BulkBar count={selected.size} socios={socios} projetos={projetosView} onClear={clearSel} onApply={bulkApply} onDelete={bulkDelete} />
        )}
        <Toast msg={toast} />
      </TarefasProvider>
    </div>
  )
}
