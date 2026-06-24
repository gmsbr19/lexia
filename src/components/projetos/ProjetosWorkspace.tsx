"use client"

// Projetos & Tarefas — client orchestrator. Owns the task list + projetos (seeded
// from the server), lazy-loads templates + the dashboard, and persists every
// change through the REST routes (apiSend → runMutation). The four module tabs
// (Tarefas · Projetos · Dashboard · Templates) all read this single state. Task
// mutations are optimistic + (modal edits) debounced, mirroring the old
// TarefasApp; project/template mutations refetch the affected dataset so the
// derived progresso/saúde stay authoritative.
import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { apiSend } from "@/lib/client/api"
import { tfRoot } from "@/components/tarefas/tf-classes"
import { TarefasProvider } from "@/components/tarefas/TarefasContext"
import { TaskModal } from "@/components/tarefas/TaskModal"
import { Icon } from "@/components/tarefas/tf-icons"
import { TODAY } from "@/components/tarefas/tf-meta"
import type { ViewCallbacks } from "@/components/tarefas/views"
import type { TarefaPatch } from "@/lib/tarefas/mutations"
import {
  type IdNome,
  type ProjetoKey,
  type TarefasDataset,
  type TaskPrio,
  type TaskRow,
  type TaskStatus,
  type TeamMember,
  type VinculoRef,
} from "@/lib/tarefas/types"
import type { ProdutividadeDashboard, ProjetosDataset, ProjetoView, TemplateView } from "@/lib/projetos/types"
import { ModuleTabs, type ModuleTab, BulkBar, type BulkField } from "./pj-kit"
import { CrossTarefasTab } from "./CrossTarefasTab"
import { ProjectsTab } from "./ProjectsTab"
import { DashboardTab } from "./DashboardTab"
import { TemplatesTab, TemplateEditor, InstantiateWizard, type TemplateFormValue, type InstanciarPayload } from "./TemplatesTab"
import { ProjectModal, type ProjetoFormValue } from "./ProjectModal"
import type { QuickAddResult } from "@/components/tarefas/tf-meta"

const send = <T,>(url: string, method = "POST", body?: unknown) => apiSend<T>(url, method, body)

const CAN_EDIT_PROJETO = ["admin", "socio", "advogado"]
const CAN_TEMPLATE = ["admin", "socio"]

function Toast({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div
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
        background: "var(--lex-acrylic-strong)",
        backdropFilter: "var(--lex-blur)",
        WebkitBackdropFilter: "var(--lex-blur)",
        color: "var(--text)",
        boxShadow: "var(--lex-glass-shadow), 0 12px 32px rgba(2,13,37,0.18), inset 0 1px 0 rgba(255,255,255,0.16)",
        fontSize: 12,
        fontWeight: 500,
        border: "1px solid var(--lex-acrylic-border)",
      }}
    >
      <Icon name="checkCircle" size={15} strokeWidth={2} style={{ color: "var(--accent)" }} />
      {msg}
    </div>
  )
}

export interface WorkspaceDataset {
  tarefas: TaskRow[]
  projetos: ProjetoView[]
  socios: TeamMember[]
  casos: IdNome[]
  clientes: IdNome[]
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
  const { socios, casos, clientes } = dataset
  const meId = socios[0]?.id ?? null
  const canEdit = CAN_EDIT_PROJETO.includes(role)
  const canTemplate = CAN_TEMPLATE.includes(role)

  const [tasks, setTasks] = useState<TaskRow[]>(dataset.tarefas)
  const [projetos, setProjetos] = useState<ProjetoView[]>(dataset.projetos)
  const [tab, setTab] = useState<ModuleTab>(initialTab)
  const [selId, setSelId] = useState<number | null>(initialProjetoId ?? dataset.projetos[0]?.id ?? null)
  const [openId, setOpenId] = useState<number | null>(null)
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
  useEffect(() => { clearSel() }, [tab, selId])

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
      setTab("tarefas")
      setOpenId(tid)
    }
  }, [params, tasks])

  const casoMap = useMemo(() => new Map(casos.map((c) => [c.id, c.nome])), [casos])
  const clienteMap = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes])

  const projetosView = useMemo(() => projetos.map((p) => (favs.has(p.id) ? { ...p, favorito: true } : p)), [projetos, favs])

  // ── task persistence (mirrors TarefasApp) ────────────────────────────────────
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
    projeto: ((body.projeto as ProjetoKey) ?? "inbox") as ProjetoKey,
    data: (body.data as string | null) ?? null,
    hora: (body.hora as string | null) ?? null,
    prazo: null,
    notes: null,
    reminder: null,
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

  const addTask = async (parsed: QuickAddResult) => {
    const body = { titulo: parsed.titulo, projeto: parsed.projeto ?? "inbox", responsavelId: parsed.responsavelId ?? null, prio: parsed.prio ?? 4, data: parsed.data ?? null, hora: parsed.hora ?? null }
    try {
      const res = await send<{ result?: { id?: number } }>("/api/tarefas", "POST", body)
      const id = res?.result?.id
      if (id) setTasks((ts) => [makeRow(id, body), ...ts])
      flash("Tarefa adicionada")
    } catch {
      flash("Erro ao adicionar tarefa")
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

  const selectProject = (id: number) => {
    setSelId(id)
    setTab("projetos")
  }
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
        if (id) setSelId(id)
        setTab("projetos")
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
    if (selId === id) setSelId(null)
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
  useEffect(() => { if (tab === "templates") void loadTemplates() }, [tab])

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
      if (id) setSelId(id)
      setTab("projetos")
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
  useEffect(() => { if (tab === "dashboard" && !dash && !dashLoading) void loadDashboard() }, [tab])

  // ── render ──────────────────────────────────────────────────────────────────────
  const closeModal = () => { void flushPending(); setOpenId(null) }
  const cb: ViewCallbacks = { onToggle: toggle, onOpen: (id: number) => setOpenId(id), onLinkClick }
  const openTask = tasks.find((t) => t.id === openId) ?? null
  const counts = { projetos: projetosView.length, templates: templates?.length }

  return (
    <div className={`${tfRoot} pj-workspace`}>
      <TarefasProvider socios={socios} casos={casos} clientes={clientes}>
        <div className="pj-tabbar">
          <ModuleTabs active={tab} onChange={setTab} counts={counts} />
        </div>

        <div className="pj-body">
          {tab === "tarefas" && (
            <div className="pj-scroll">
              <CrossTarefasTab
                tasks={tasks}
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

          {tab === "projetos" && (
            <ProjectsTab
              projetos={projetosView}
              tasks={tasks}
              activeId={selId}
              loadingProj={false}
              canEdit={canEdit}
              onSelectProj={selectProject}
              onToggleFav={toggleFav}
              onNewProject={() => setProjModal({ projeto: null })}
              onEditProject={(p) => setProjModal({ projeto: p })}
              onRename={renameProject}
              onArchive={archiveProject}
              onDelete={deleteProject}
              onLinkClick={(p) => p.vinculo && onLinkClick(p.vinculo)}
              onNewTask={newTaskInProject}
              onTemplates={() => setTab("templates")}
              cb={cb}
              onMove={move}
              onSchedule={schedule}
              selectMode={selectMode}
              setSelectMode={setSelectMode}
              selectedIds={selected}
              onSelect={toggleSel}
            />
          )}

          {tab === "dashboard" && (
            <div className="pj-scroll">
              <DashboardTab
                data={dash}
                loading={dashLoading}
                error={dashError}
                onRetry={loadDashboard}
                projetos={projetosView}
                onOpenProject={selectProject}
                onOpenTask={(id) => { setTab("tarefas"); setOpenId(id) }}
              />
            </div>
          )}

          {tab === "templates" && (
            <div className="pj-scroll">
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
        </div>

        {openTask && <TaskModal task={openTask} onClose={closeModal} onChange={liveEdit} onDelete={del} />}
        {projModal && (
          <ProjectModal
            projeto={projModal.projeto}
            socios={socios}
            casos={casos}
            clientes={clientes}
            onClose={() => setProjModal(null)}
            onSave={saveProject}
            onDelete={deleteProject}
            onUseTemplate={() => { setProjModal(null); setTab("templates") }}
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
