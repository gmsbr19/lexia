"use client"

// Tarefas — client orchestrator. Owns the task list (seeded from the server
// dataset) + all callbacks; hosts quick-add, the view switcher, filters, the
// task modal, and a toast. Mutations are optimistic: local state updates
// instantly, then a PATCH/POST/DELETE persists to the REST routes. Modal field
// edits are debounced (coalesced) to avoid a request per keystroke; discrete
// actions (toggle / drag / schedule) persist immediately. Mirrors ComercialApp.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { apiSend } from "@/lib/client/api"
import {
  PRIO,
  PROJECTS,
  type ProjetoKey,
  type TarefasDataset,
  type TaskPrio,
  type TaskRow,
  type TaskStatus,
  type TeamMember,
  type VinculoRef,
} from "@/lib/tarefas/types"
import type { TarefaPatch } from "@/lib/tarefas/mutations"
import { tfInline, tfRoot } from "./tf-classes"
import { TarefasProvider } from "./TarefasContext"
import { Icon } from "./tf-icons"
import { AssigneeAvatar, Menu, MenuItem, ViewSwitcher, type ViewId } from "./tf-kit"
import { AgendaView, CalendarioView, GROUP_OPTS, HojeView, ListaView, QuadroView, type GroupBy, type ViewCallbacks } from "./views"
import { TaskModal } from "./TaskModal"
import { TODAY, dataLabel, parseQuickAdd } from "./tf-meta"

// ── network helper (same shape as ComercialApp.send) ─────────────────────────
const send = (url: string, body?: unknown, method = "POST") =>
  apiSend<{ ok?: boolean; result?: { id?: number } }>(url, method, body)

const projectDef = (key: string) => PROJECTS.find((p) => p.id === key) ?? PROJECTS[0]

// ── quick-add with live natural-language parse preview ───────────────────────
function QuickAddBar({
  socios,
  onAdd,
}: {
  socios: TeamMember[]
  onAdd: (parsed: ReturnType<typeof parseQuickAdd>) => void
}) {
  const [v, setV] = useState("")
  const parsed = v.trim() ? parseQuickAdd(v, { socios, projects: PROJECTS }) : null
  const hasTokens = parsed && (parsed.projeto || parsed.responsavelId || parsed.prio || parsed.data || parsed.hora)
  const submit = () => {
    if (!parsed || !parsed.titulo) return
    onAdd(parsed)
    setV("")
  }
  const member = parsed?.responsavelId != null ? socios.find((m) => m.id === parsed.responsavelId) : null
  return (
    <div className="card" style={{ padding: hasTokens ? "11px 14px 9px" : "11px 14px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <Icon name="plus" size={17} strokeWidth={2} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit()
          }}
          placeholder="Adicionar tarefa…  ex.: Protocolar recurso amanhã 14h #trabalhista @leandro !alta"
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--text)" }}
        />
        <span style={{ fontSize: 11, color: "var(--text-subtle)", whiteSpace: "nowrap" }}>#projeto · @pessoa · !prioridade · data</span>
        <button className="btn btn-primary" onClick={submit} disabled={!parsed || !parsed.titulo} style={{ height: 30, fontSize: 12, opacity: parsed && parsed.titulo ? 1 : 0.5 }}>
          Adicionar
        </button>
      </div>
      {hasTokens && parsed && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, paddingTop: 9, borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>Detectado:</span>
          {parsed.data && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, color: "var(--accent)", background: "var(--accent-soft)", padding: "2px 8px", borderRadius: 999 }}>
              <Icon name="calendar" size={11} />
              {dataLabel(parsed.data)}
              {parsed.hora ? ` ${parsed.hora}` : ""}
            </span>
          )}
          {parsed.projeto && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, color: "var(--text-muted)", background: "var(--bg-sunken)", padding: "2px 8px", borderRadius: 999 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: projectDef(parsed.projeto).color }} />
              {projectDef(parsed.projeto).name}
            </span>
          )}
          {member && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, color: "var(--text-muted)", background: "var(--bg-sunken)", padding: "2px 8px 2px 4px", borderRadius: 999 }}>
              <AssigneeAvatar id={member.id} size={15} title={false} />
              {member.first}
            </span>
          )}
          {parsed.assigneeAmbiguous && <span style={{ fontSize: 11, color: "var(--fin-neg)" }}>responsável ambíguo</span>}
          {parsed.prio && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, color: PRIO[parsed.prio].color, background: "var(--bg-sunken)", padding: "2px 8px", borderRadius: 999 }}>
              <Icon name="flag" size={10} strokeWidth={2.2} />
              {PRIO[parsed.prio].label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function FilterBtn({ icon, active, children }: { icon?: Parameters<typeof Icon>[0]["name"]; active?: boolean; children: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        height: 32,
        padding: "0 11px",
        borderRadius: 8,
        border: `1px solid ${active ? "var(--accent)" : "var(--border-strong)"}`,
        background: active ? "var(--accent-soft)" : "var(--surface)",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        color: active ? "var(--accent)" : "var(--text-muted)",
        whiteSpace: "nowrap",
      }}
    >
      {icon && <Icon name={icon} size={14} strokeWidth={1.85} />}
      {children}
      <Icon name="chevronDown" size={12} />
    </span>
  )
}

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

export function TarefasApp({ dataset }: { dataset: TarefasDataset }) {
  const { socios, casos, clientes } = dataset
  const meId = socios[0]?.id ?? null

  const [tasks, setTasks] = useState<TaskRow[]>(dataset.tarefas)
  const [view, setView] = useState<ViewId>("hoje")
  const [groupBy, setGroupBy] = useState<GroupBy>("projeto")
  const [fProject, setFProject] = useState<ProjetoKey | null>(null)
  const [fAssignee, setFAssignee] = useState<number | null>(null)
  const [onlyMine, setOnlyMine] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)
  const [toast, setToast] = useState("")

  // Re-seed from the server when a navigation re-fetch delivers a new dataset.
  useEffect(() => setTasks(dataset.tarefas), [dataset.tarefas])

  // Deep-link: /tarefas?tarefa=<id> opens that task once (e.g. the LexIA "Ver
  // tarefa" chip after the agent creates one). The ref keeps it from re-opening
  // after the user closes the modal.
  const params = useSearchParams()
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
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(""), 3400)
    return () => clearTimeout(t)
  }, [toast])
  const flash = (m: string) => setToast(m)

  const casoMap = useMemo(() => new Map(casos.map((c) => [c.id, c.nome])), [casos])
  const clienteMap = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes])

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

  // ── persistence ────────────────────────────────────────────────────────────
  const pending = useRef<Map<number, TarefaPatch>>(new Map())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sendPatch = async (id: number, patch: TarefaPatch) => {
    try {
      await send(`/api/tarefas/${id}`, patch, "PATCH")
    } catch {
      flash("Erro ao salvar tarefa")
    }
  }
  const flushPending = async () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const entries = [...pending.current.entries()]
    pending.current.clear()
    for (const [id, p] of entries) await sendPatch(id, p)
  }
  // discrete action → persist immediately
  const commit = (id: number, patch: Partial<TaskRow>) => {
    applyLocal(id, patch)
    void sendPatch(id, patch as TarefaPatch)
  }
  // modal field edit → optimistic + debounced (coalesced) PATCH
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
    void send(`/api/tarefas/${id}`, undefined, "DELETE").catch(() => flash("Erro ao excluir tarefa"))
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
    vinculo: null,
    ordem: 0,
  })

  const addTask = async (parsed: ReturnType<typeof parseQuickAdd>) => {
    const body = {
      titulo: parsed.titulo,
      projeto: parsed.projeto ?? "inbox",
      responsavelId: parsed.responsavelId ?? null,
      prio: parsed.prio ?? 4,
      data: parsed.data ?? null,
      hora: parsed.hora ?? null,
    }
    try {
      const res = await send("/api/tarefas", body, "POST")
      const id = res?.result?.id
      if (id) setTasks((ts) => [makeRow(id, body), ...ts])
      flash(`Tarefa adicionada${body.projeto !== "inbox" ? ` em ${projectDef(body.projeto).name}` : " na Caixa de entrada"}`)
    } catch {
      flash("Erro ao adicionar tarefa")
    }
  }

  const newBlank = async () => {
    const body = { titulo: "Nova tarefa", projeto: "inbox", responsavelId: meId, prio: 4, data: TODAY() }
    try {
      const res = await send("/api/tarefas", body, "POST")
      const id = res?.result?.id
      if (id) {
        setTasks((ts) => [makeRow(id, body), ...ts])
        setOpenId(id)
      }
    } catch {
      flash("Erro ao criar tarefa")
    }
  }

  const closeModal = () => {
    void flushPending()
    setOpenId(null)
  }

  // ── filtering ────────────────────────────────────────────────────────────
  let filtered = tasks
  if (fProject) filtered = filtered.filter((t) => t.projeto === fProject)
  if (fAssignee != null) filtered = filtered.filter((t) => t.responsavelId === fAssignee)
  if (onlyMine) filtered = filtered.filter((t) => t.responsavelId === meId)

  const cb: ViewCallbacks = { onToggle: toggle, onOpen: (id: number) => setOpenId(id), onLinkClick }
  const openTask = tasks.find((t) => t.id === openId) ?? null
  const mineCount = tasks.filter((t) => t.responsavelId === meId && !t.done).length

  const actions = (
    <span className={tfInline} style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <button className="btn btn-primary" onClick={newBlank} style={{ height: 32, fontSize: 12 }}>
        <Icon name="plus" size={13} strokeWidth={2.2} />
        Nova tarefa
      </button>
    </span>
  )

  const breadcrumb = [
    "Tarefas",
    view === "hoje" ? "Hoje" : view === "lista" ? "Lista" : view === "quadro" ? "Quadro" : view === "calendario" ? "Calendário" : "Agenda do dia",
  ]

  return (
    <>
      <div className={tfRoot}>
        <TarefasProvider socios={socios} casos={casos} clientes={clientes}>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", width: "100%" }}>
            <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 40px 48px", width: "100%", boxSizing: "border-box" }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: 25, fontWeight: 500, letterSpacing: "-0.025em", color: "var(--text)" }}>Tarefas</h1>
                  <p style={{ margin: "5px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Delegue, agende e acompanhe o trabalho do escritório.</p>
                </div>
                {actions}
              </div>

              <QuickAddBar socios={socios} onAdd={addTask} />

              {/* controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                <ViewSwitcher view={view} setView={setView} />
                <div style={{ flex: 1 }} />
                {view === "lista" && (
                  <Menu align="right" width={190} trigger={<FilterBtn icon="layoutGrid">Agrupar: {GROUP_OPTS.find((g) => g.id === groupBy)?.label}</FilterBtn>}>
                    {(close) =>
                      GROUP_OPTS.map((g) => (
                        <MenuItem
                          key={g.id}
                          icon={g.icon}
                          label={g.label}
                          active={groupBy === g.id}
                          onClick={() => {
                            setGroupBy(g.id)
                            close()
                          }}
                        />
                      ))
                    }
                  </Menu>
                )}
                <Menu
                  align="right"
                  width={220}
                  trigger={
                    <FilterBtn active={!!fProject}>
                      {fProject ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: projectDef(fProject).color }} />
                          {projectDef(fProject).name}
                        </span>
                      ) : (
                        "Projeto"
                      )}
                    </FilterBtn>
                  }
                >
                  {(close) => (
                    <>
                      <MenuItem label="Todos os projetos" active={!fProject} onClick={() => { setFProject(null); close() }} />
                      {PROJECTS.map((p) => (
                        <MenuItem key={p.id} dot={p.color} label={p.name} active={fProject === p.id} onClick={() => { setFProject(p.id); close() }} />
                      ))}
                    </>
                  )}
                </Menu>
                <Menu
                  align="right"
                  width={220}
                  trigger={<FilterBtn active={fAssignee != null} icon="user">{fAssignee != null ? socios.find((m) => m.id === fAssignee)?.first : "Responsável"}</FilterBtn>}
                >
                  {(close) => (
                    <>
                      <MenuItem label="Toda a equipe" active={fAssignee == null} onClick={() => { setFAssignee(null); close() }} />
                      {socios.map((m) => (
                        <MenuItem
                          key={m.id}
                          label={m.nome}
                          sub={m.role}
                          active={fAssignee === m.id}
                          onClick={() => { setFAssignee(m.id); close() }}
                          right={<AssigneeAvatar id={m.id} size={18} title={false} />}
                        />
                      ))}
                    </>
                  )}
                </Menu>
                <button
                  onClick={() => setOnlyMine((v) => !v)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    height: 32,
                    padding: "0 11px",
                    borderRadius: 8,
                    cursor: "pointer",
                    border: `1px solid ${onlyMine ? "var(--accent)" : "var(--border-strong)"}`,
                    background: onlyMine ? "var(--accent-soft)" : "var(--surface)",
                    fontSize: 12,
                    fontWeight: 500,
                    color: onlyMine ? "var(--accent)" : "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon name="inbox" size={14} strokeWidth={1.85} />
                  Atribuídas a mim
                  <span style={{ fontSize: 11, fontWeight: 500, background: onlyMine ? "var(--accent-strong)" : "var(--bg-sunken)", color: onlyMine ? "#fff" : "var(--text-subtle)", padding: "1px 6px", borderRadius: 999 }}>
                    {mineCount}
                  </span>
                </button>
              </div>

              {view === "hoje" && <HojeView tasks={filtered} {...cb} />}
              {view === "lista" && <ListaView tasks={filtered} groupBy={groupBy} {...cb} />}
              {view === "quadro" && <QuadroView tasks={filtered} onMove={move} {...cb} />}
              {view === "calendario" && <CalendarioView tasks={filtered} {...cb} />}
              {view === "agenda" && <AgendaView tasks={filtered} onSchedule={schedule} {...cb} />}
            </div>
          </div>

          {openTask && <TaskModal task={openTask} onClose={closeModal} onChange={liveEdit} onDelete={del} />}
          <Toast msg={toast} />
        </TarefasProvider>
      </div>
    </>
  )
}
