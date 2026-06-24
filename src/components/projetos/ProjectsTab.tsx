"use client"

// Projetos & Tarefas — the Projetos tab: a searchable project rail + the canvas
// (project header, filters, and the SAME five task views scoped to one project's
// tasks via `projetoId`). Live progresso/saúde are derived from the optimistic
// task list (pj-meta.deriveRollup).
import { useEffect, useRef, useState } from "react"
import type { ProjetoView } from "@/lib/projetos/types"
import { STATUS, type TaskRow, type TaskStatus } from "@/lib/tarefas/types"
import { statusMeta } from "@/lib/tarefas/types"
import { Icon } from "@/components/tarefas/tf-icons"
import { AssigneeAvatar, Menu, MenuItem, ViewSwitcher, type ViewId } from "@/components/tarefas/tf-kit"
import { useTarefasCtx } from "@/components/tarefas/TarefasContext"
import {
  AgendaView,
  CalendarioView,
  GROUP_OPTS,
  HojeView,
  ListaView,
  QuadroView,
  type GroupBy,
  type ViewCallbacks,
} from "@/components/tarefas/views"
import { dateFull, deriveRollup, type LiveRollup } from "./pj-meta"
import {
  AreaTag,
  FilterBtn,
  useAreaOptions,
  MiniStat,
  PageFrame,
  ProgressBar,
  ProgressRing,
  ProjStatusPill,
  ProjectIcon,
  ProjectRailItem,
  SaudeChip,
  SkelRow,
} from "./pj-kit"
import { tDiff } from "@/components/tarefas/tf-meta"

type RailGroupBy = "area" | "status"
const PROJ_STATUS_GROUPS: { id: ProjetoView["status"]; label: string }[] = [
  { id: "ativo", label: "Ativo" },
  { id: "pausado", label: "Pausado" },
  { id: "concluido", label: "Concluído" },
  { id: "arquivado", label: "Arquivado" },
]
const railGroupLbl: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "6px 10px 5px", fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }
const miniSeg = (on: boolean): React.CSSProperties => ({ height: 24, padding: "0 10px", borderRadius: 6, border: "none", cursor: "pointer", background: on ? "var(--surface)" : "transparent", color: on ? "var(--text)" : "var(--text-muted)", fontSize: 11.5, fontWeight: 500, boxShadow: on ? "var(--shadow-sm)" : "none", fontFamily: "var(--font-sans)" })

// ── rail ──────────────────────────────────────────────────────────────────────
function ProjectRail({
  projetos,
  tasks,
  activeId,
  onSelectProj,
  onToggleFav,
  onNewProject,
  canCreate,
  open,
  onClose,
}: {
  projetos: ProjetoView[]
  tasks: TaskRow[]
  activeId: number | null
  onSelectProj: (id: number) => void
  onToggleFav: (id: number) => void
  onNewProject: () => void
  canCreate: boolean
  open: boolean
  onClose: () => void
}) {
  const [q, setQ] = useState("")
  const [groupBy, setGroupBy] = useState<RailGroupBy>("area")
  const areaOpts = useAreaOptions()
  const list = projetos.filter((p) => p.nome.toLowerCase().includes(q.toLowerCase()))
  const favs = list.filter((p) => p.favorito)

  const groups: { key: string; label: string; items: ProjetoView[] }[] = []
  if (groupBy === "area") {
    areaOpts.forEach((a) => {
      const items = list.filter((p) => p.area === a.id)
      if (items.length) groups.push({ key: a.id, label: a.label, items })
    })
    const known = new Set(areaOpts.map((a) => a.id))
    const sem = list.filter((p) => !p.area || !known.has(p.area))
    if (sem.length) groups.push({ key: "sem", label: "Outros", items: sem })
  } else {
    PROJ_STATUS_GROUPS.forEach((s) => {
      const items = list.filter((p) => p.status === s.id)
      if (items.length) groups.push({ key: s.id, label: s.label, items })
    })
  }

  const railItem = (p: ProjetoView) => (
    <ProjectRailItem
      key={p.id}
      proj={p}
      live={deriveRollup(p.id, tasks)}
      active={activeId === p.id}
      onClick={() => { onSelectProj(p.id); onClose() }}
      onToggleFav={() => onToggleFav(p.id)}
    />
  )

  return (
    <aside className={`proj-rail${open ? " is-open" : ""}`}>
      <div style={{ padding: "12px 12px 10px", display: "flex", flexDirection: "column", gap: 10, borderBottom: "1px solid var(--border)" }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)" }}><Icon name="search" size={14} /></div>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input" placeholder="Buscar projeto…" style={{ paddingLeft: 32, height: 34, fontSize: 13 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 500 }}>Agrupar:</span>
          <div style={{ display: "flex", gap: 2, background: "var(--bg-soft)", borderRadius: 8, padding: 2, border: "1px solid var(--border)" }}>
            <button onClick={() => setGroupBy("area")} style={miniSeg(groupBy === "area")}>Área</button>
            <button onClick={() => setGroupBy("status")} style={miniSeg(groupBy === "status")}>Status</button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 4px" }}>
        {favs.length > 0 && (
          <div style={{ marginBottom: 6 }}>
            <div style={railGroupLbl}><Icon name="star" size={11} strokeWidth={2} style={{ fill: "currentColor" }} />Favoritos</div>
            {favs.map(railItem)}
            <div style={{ height: 1, background: "var(--border)", margin: "8px 10px" }} />
          </div>
        )}
        {groups.map((g) => (
          <div key={g.key} style={{ marginBottom: 6 }}>
            <div style={railGroupLbl}>{g.label}<span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>{g.items.length}</span></div>
            {g.items.map(railItem)}
          </div>
        ))}
        {!list.length && <div style={{ fontSize: 12, color: "var(--text-subtle)", textAlign: "center", padding: "24px 12px" }}>Nenhum projeto encontrado.</div>}
      </div>

      {canCreate && (
        <div style={{ padding: 10, borderTop: "1px solid var(--border)" }}>
          <button onClick={onNewProject} className="btn btn-secondary" style={{ width: "100%", height: 38, fontSize: 13 }}>
            <Icon name="plus" size={15} strokeWidth={2} />
            Novo projeto
          </button>
        </div>
      )}
    </aside>
  )
}

// ── project header ──────────────────────────────────────────────────────────────
function ProjectHeader({
  proj,
  live,
  onRename,
  onEdit,
  onArchive,
  onDelete,
  onLinkClick,
  canEdit,
}: {
  proj: ProjetoView
  live: LiveRollup
  onRename: (name: string) => void
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
  onLinkClick: () => void
  canEdit: boolean
}) {
  const { member } = useTarefasCtx()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(proj.nome)
  useEffect(() => setName(proj.nome), [proj.id, proj.nome])
  const resp = proj.responsavel ? member(proj.responsavel.id) : null
  const prazoCrit = proj.prazo != null && proj.status !== "concluido" && proj.status !== "arquivado" && tDiff(proj.prazo) < 0

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 18, padding: "4px 0 18px", borderBottom: "1px solid var(--border)", marginBottom: 18, flexWrap: "wrap" }}>
      <ProjectIcon cor={proj.cor} icone={proj.icone} size={46} radius={12} />
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {editing && canEdit ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => { setEditing(false); onRename(name.trim() || proj.nome) }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { setEditing(false); onRename(name.trim() || proj.nome) }
                if (e.key === "Escape") { setName(proj.nome); setEditing(false) }
              }}
              className="input"
              style={{ fontSize: 22, fontWeight: 500, height: 38, width: "min(560px, 100%)", letterSpacing: "-0.02em" }}
            />
          ) : (
            <h1 onClick={() => canEdit && setEditing(true)} title={canEdit ? "Clique para renomear" : undefined} style={{ margin: 0, fontSize: 23, fontWeight: 500, letterSpacing: "-0.025em", color: "var(--text)", cursor: canEdit ? "text" : "default" }}>
              {proj.nome}
            </h1>
          )}
          <ProjStatusPill status={proj.status} />
          {proj.area && <AreaTag area={proj.area} />}
        </div>
        {proj.descricao && <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-muted)", maxWidth: 680, lineHeight: 1.5 }}>{proj.descricao}</p>}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 11, flexWrap: "wrap" }}>
          {resp && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <AssigneeAvatar id={resp.id} size={22} />
              <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{resp.nome}</span>
            </span>
          )}
          {proj.prazo && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, color: prazoCrit ? "var(--crit)" : "var(--text-muted)" }}>
              <Icon name="flag" size={13} strokeWidth={1.9} />
              Prazo {dateFull(proj.prazo)}
            </span>
          )}
          {proj.vinculo && (
            <span onClick={onLinkClick} className="vinc-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "var(--text-muted)", background: "var(--bg-sunken)", border: "1px solid var(--border)", padding: "3px 9px 3px 7px", borderRadius: 6, cursor: "pointer" }}>
              <Icon name={proj.vinculo.tipo === "caso" ? "briefcase" : "user"} size={12} strokeWidth={1.9} />
              {proj.vinculo.nome}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <MiniStat value={`${live.done}/${live.total}`} label="tarefas" />
          {live.overdue > 0 ? <MiniStat value={`${live.overdue} atrasada${live.overdue > 1 ? "s" : ""}`} label="prazo vencido" tone="crit" /> : <SaudeChip saude={live.saude} />}
        </div>
        <ProgressRing value={live.progresso} size={64} color={proj.cor || "var(--accent)"} />
        {canEdit && (
          <Menu align="right" width={190} trigger={<button className="btn btn-ghost" style={{ width: 34, height: 34, padding: 0 }}><Icon name="moreHorizontal" size={18} /></button>}>
            {(close) => (
              <>
                <MenuItem icon="edit" label="Editar projeto" onClick={() => { onEdit(); close() }} />
                <MenuItem icon="inbox" label={proj.status === "arquivado" ? "Desarquivar" : "Arquivar"} onClick={() => { onArchive(); close() }} />
                <div style={{ height: 1, background: "var(--border)", margin: "4px 6px" }} />
                <MenuItem icon="trash2" label="Excluir" onClick={() => { onDelete(); close() }} />
              </>
            )}
          </Menu>
        )}
      </div>
    </div>
  )
}

// ── canvas ────────────────────────────────────────────────────────────────────
interface CanvasUi {
  view: ViewId
  groupBy: GroupBy
  fStatus: TaskStatus | null
  fAssignee: number | null
  onlyMine: boolean
  hideDone: boolean
}

function ProjectCanvas({
  proj,
  tasks,
  cb,
  onMove,
  onSchedule,
  onRename,
  onEdit,
  onArchive,
  onDelete,
  onLinkClick,
  canEdit,
  onRailOpen,
  onNewTask,
  selectMode,
  setSelectMode,
  selectedIds,
  onSelect,
}: {
  proj: ProjetoView
  tasks: TaskRow[]
  cb: ViewCallbacks
  onMove: (id: number, status: TaskStatus) => void
  onSchedule: (id: number, hora: string) => void
  onRename: (name: string) => void
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
  onLinkClick: () => void
  canEdit: boolean
  onRailOpen: () => void
  onNewTask: () => void
  selectMode: boolean
  setSelectMode: (v: boolean) => void
  selectedIds: Set<number>
  onSelect: (id: number) => void
}) {
  const { meId, socios } = useTarefasCtx()
  const [ui, setUi] = useState<CanvasUi>({ view: "lista", groupBy: "prazo", fStatus: null, fAssignee: null, onlyMine: false, hideDone: true })
  const set = <K extends keyof CanvasUi>(k: K, v: CanvasUi[K]) => setUi((u) => ({ ...u, [k]: v }))

  const all = tasks.filter((t) => t.projetoId === proj.id)
  const live = deriveRollup(proj.id, tasks)
  let projTasks = all
  if (ui.fStatus) projTasks = projTasks.filter((t) => t.status === ui.fStatus)
  if (ui.fAssignee != null) projTasks = projTasks.filter((t) => t.responsavelId === ui.fAssignee)
  if (ui.onlyMine) projTasks = projTasks.filter((t) => t.responsavelId === meId)

  const selectable = selectMode && (ui.view === "lista" || ui.view === "hoje")

  return (
    <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
      <PageFrame pad="22px 32px 60px">
        <button className="rail-toggle btn btn-secondary" onClick={onRailOpen} style={{ height: 32, fontSize: 12, marginBottom: 14 }}>
          <Icon name="layoutGrid" size={14} strokeWidth={1.9} />
          Projetos
        </button>
        <ProjectHeader proj={proj} live={live} canEdit={canEdit} onRename={onRename} onEdit={onEdit} onArchive={onArchive} onDelete={onDelete} onLinkClick={onLinkClick} />

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <ViewSwitcher view={ui.view} setView={(v) => set("view", v)} />
          <div style={{ flex: 1 }} />
          {ui.view === "lista" && (
            <Menu align="right" width={190} trigger={<FilterBtn icon="layoutGrid" label={`Agrupar: ${GROUP_OPTS.find((g) => g.id === ui.groupBy)?.label}`} />}>
              {(close) => GROUP_OPTS.map((g) => <MenuItem key={g.id} icon={g.icon} label={g.label} active={ui.groupBy === g.id} onClick={() => { set("groupBy", g.id); close() }} />)}
            </Menu>
          )}
          <Menu align="right" width={200} trigger={<FilterBtn active={!!ui.fStatus} icon="circleDot">{ui.fStatus ? statusMeta(ui.fStatus).label : "Status"}</FilterBtn>}>
            {(close) => (
              <>
                <MenuItem label="Todos os status" active={!ui.fStatus} onClick={() => { set("fStatus", null); close() }} />
                {STATUS.map((s) => <MenuItem key={s.id} dot={s.color} label={s.label} active={ui.fStatus === s.id} onClick={() => { set("fStatus", s.id); close() }} />)}
              </>
            )}
          </Menu>
          <Menu width={220} trigger={<FilterBtn active={ui.fAssignee != null} icon="user">{ui.fAssignee != null ? socios.find((m) => m.id === ui.fAssignee)?.first : "Responsável"}</FilterBtn>}>
            {(close) => (
              <>
                <MenuItem label="Toda a equipe" active={ui.fAssignee == null} onClick={() => { set("fAssignee", null); close() }} />
                {socios.map((m) => <MenuItem key={m.id} label={m.nome} sub={m.role} active={ui.fAssignee === m.id} onClick={() => { set("fAssignee", m.id); close() }} right={<AssigneeAvatar id={m.id} size={18} title={false} />} />)}
              </>
            )}
          </Menu>
          <button
            onClick={() => set("onlyMine", !ui.onlyMine)}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 32, padding: "0 11px", borderRadius: 9, cursor: "pointer", border: `1px solid ${ui.onlyMine ? "var(--accent)" : "var(--border-strong)"}`, background: ui.onlyMine ? "var(--accent-soft)" : "var(--surface)", fontSize: 12, fontWeight: 500, color: ui.onlyMine ? "var(--accent)" : "var(--text-muted)", whiteSpace: "nowrap", fontFamily: "var(--font-sans)" }}
          >
            <Icon name="user" size={14} strokeWidth={1.85} />
            Só minhas
          </button>
          {(ui.view === "lista" || ui.view === "hoje") && (
            <button
              onClick={() => set("hideDone", !ui.hideDone)}
              title={ui.hideDone ? "Mostrar tarefas concluídas" : "Ocultar tarefas concluídas"}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 32, padding: "0 11px", borderRadius: 9, cursor: "pointer", border: `1px solid ${!ui.hideDone ? "var(--accent)" : "var(--border-strong)"}`, background: !ui.hideDone ? "var(--accent-soft)" : "var(--surface)", fontSize: 12, fontWeight: 500, color: !ui.hideDone ? "var(--accent)" : "var(--text-muted)", whiteSpace: "nowrap", fontFamily: "var(--font-sans)" }}
            >
              <Icon name={ui.hideDone ? "eyeOff" : "eye"} size={14} strokeWidth={1.85} />
              Concluídas
            </button>
          )}
          {(ui.view === "lista" || ui.view === "hoje") && (
            <button
              onClick={() => setSelectMode(!selectMode)}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 32, padding: "0 11px", borderRadius: 9, cursor: "pointer", border: `1px solid ${selectMode ? "var(--accent)" : "var(--border-strong)"}`, background: selectMode ? "var(--accent-soft)" : "var(--surface)", fontSize: 12, fontWeight: 500, color: selectMode ? "var(--accent)" : "var(--text-muted)", whiteSpace: "nowrap", fontFamily: "var(--font-sans)" }}
            >
              <Icon name="checkSquare" size={14} strokeWidth={1.85} />
              {selectMode ? "Selecionando" : "Selecionar"}
            </button>
          )}
          {canEdit && (
            <button className="btn btn-secondary" onClick={onNewTask} style={{ height: 32, fontSize: 12 }}>
              <Icon name="plus" size={14} strokeWidth={2} />
              Tarefa
            </button>
          )}
        </div>

        {!all.length ? (
          <ProjectEmptyState proj={proj} canEdit={canEdit} onNewTask={onNewTask} />
        ) : (
          <>
            {ui.view === "hoje" && <HojeView tasks={projTasks} hideDone={ui.hideDone} {...cb} selectable={selectable} selectedIds={selectedIds} onSelect={onSelect} />}
            {ui.view === "lista" && <ListaView tasks={projTasks} groupBy={ui.groupBy} hideDone={ui.hideDone} {...cb} selectable={selectable} selectedIds={selectedIds} onSelect={onSelect} />}
            {ui.view === "quadro" && <QuadroView tasks={projTasks} onMove={onMove} {...cb} />}
            {ui.view === "calendario" && <CalendarioView tasks={projTasks} {...cb} />}
            {ui.view === "agenda" && <AgendaView tasks={projTasks} onSchedule={onSchedule} {...cb} />}
          </>
        )}
      </PageFrame>
    </div>
  )
}

function ProjectEmptyState({ proj, canEdit, onNewTask }: { proj: ProjetoView; canEdit: boolean; onNewTask: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "64px 20px" }}>
      <ProjectIcon cor={proj.cor} icone={proj.icone} size={56} radius={15} />
      <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", marginTop: 16 }}>Nenhuma tarefa neste projeto</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6, maxWidth: 420, margin: "6px auto 0" }}>
        Adicione tarefas manualmente, instancie um template ou peça à LexIA para montar o plano de trabalho.
      </div>
      {canEdit && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onNewTask}><Icon name="plus" size={15} strokeWidth={2} />Adicionar tarefa</button>
        </div>
      )}
    </div>
  )
}

function CanvasSkeleton() {
  return (
    <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
      <PageFrame pad="22px 32px 60px">
        <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 18, borderBottom: "1px solid var(--border)", marginBottom: 18 }}>
          <div className="skeleton" style={{ width: 46, height: 46, borderRadius: 12 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: 280, height: 18 }} />
            <div className="skeleton" style={{ width: 180, height: 12, marginTop: 10 }} />
          </div>
          <div className="skeleton" style={{ width: 64, height: 64, borderRadius: "50%" }} />
        </div>
        {Array.from({ length: 6 }).map((_, i) => <SkelRow key={i} />)}
      </PageFrame>
    </div>
  )
}

function NoProjectsState({ canCreate, onNew, onTemplates }: { canCreate: boolean; onNew: () => void; onTemplates: () => void }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <div style={{ textAlign: "center", maxWidth: 460 }}>
        <div style={{ width: 56, height: 56, borderRadius: 15, background: "var(--accent-soft)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="layoutGrid" size={26} strokeWidth={1.7} /></div>
        <div style={{ fontSize: 18, fontWeight: 500, color: "var(--text)", marginTop: 16, letterSpacing: "-0.02em" }}>Crie seu primeiro projeto</div>
        <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>Organize demandas jurídicas em projetos com dono, prazo e progresso — comece do zero ou use um template do escritório.</div>
        {canCreate && (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 22 }}>
            <button className="btn btn-secondary" onClick={onTemplates}><Icon name="copy" size={15} strokeWidth={1.9} />Usar template</button>
            <button className="btn btn-primary" onClick={onNew}><Icon name="plus" size={15} strokeWidth={2} />Novo projeto</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── tab shell (rail + canvas) ───────────────────────────────────────────────────
export function ProjectsTab(props: {
  projetos: ProjetoView[]
  tasks: TaskRow[]
  activeId: number | null
  loadingProj: boolean
  canEdit: boolean
  onSelectProj: (id: number) => void
  onToggleFav: (id: number) => void
  onNewProject: () => void
  onEditProject: (p: ProjetoView) => void
  onRename: (id: number, name: string) => void
  onArchive: (p: ProjetoView) => void
  onDelete: (id: number) => void
  onLinkClick: (p: ProjetoView) => void
  onNewTask: (projetoId: number) => void
  onTemplates: () => void
  cb: ViewCallbacks
  onMove: (id: number, status: TaskStatus) => void
  onSchedule: (id: number, hora: string) => void
  selectMode: boolean
  setSelectMode: (v: boolean) => void
  selectedIds: Set<number>
  onSelect: (id: number) => void
}) {
  const { projetos, tasks, activeId } = props
  const [railOpen, setRailOpen] = useState(false)
  const prevActive = useRef(activeId)
  // brief skeleton on project switch
  const [switching, setSwitching] = useState(false)
  useEffect(() => {
    if (prevActive.current !== activeId) {
      prevActive.current = activeId
      setSwitching(true)
      const t = setTimeout(() => setSwitching(false), 280)
      return () => clearTimeout(t)
    }
  }, [activeId])

  const sel = activeId != null ? projetos.find((p) => p.id === activeId) ?? null : projetos[0] ?? null

  return (
    <div className="proj-two-pane">
      <div className={`rail-scrim${railOpen ? " is-open" : ""}`} onClick={() => setRailOpen(false)} />
      <ProjectRail
        projetos={projetos}
        tasks={tasks}
        activeId={sel?.id ?? null}
        onSelectProj={props.onSelectProj}
        onToggleFav={props.onToggleFav}
        onNewProject={props.onNewProject}
        canCreate={props.canEdit}
        open={railOpen}
        onClose={() => setRailOpen(false)}
      />
      {!projetos.length ? (
        <NoProjectsState canCreate={props.canEdit} onNew={props.onNewProject} onTemplates={props.onTemplates} />
      ) : props.loadingProj || switching || !sel ? (
        <CanvasSkeleton />
      ) : (
        <ProjectCanvas
          proj={sel}
          tasks={tasks}
          cb={props.cb}
          onMove={props.onMove}
          onSchedule={props.onSchedule}
          onRename={(name) => props.onRename(sel.id, name)}
          onEdit={() => props.onEditProject(sel)}
          onArchive={() => props.onArchive(sel)}
          onDelete={() => props.onDelete(sel.id)}
          onLinkClick={() => props.onLinkClick(sel)}
          canEdit={props.canEdit}
          onRailOpen={() => setRailOpen(true)}
          onNewTask={() => props.onNewTask(sel.id)}
          selectMode={props.selectMode}
          setSelectMode={props.setSelectMode}
          selectedIds={props.selectedIds}
          onSelect={props.onSelect}
        />
      )}
    </div>
  )
}
