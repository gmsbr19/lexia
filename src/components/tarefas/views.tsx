"use client"

// Tarefas — the five views (ported from the design's views.jsx). All read a
// filtered task list + shared callbacks.
import { useEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import { PRIO, STATUS, type TaskPrio, type TaskRow, type TaskStatus, type VinculoRef } from "@/lib/tarefas/types"
import { Icon, type TfIconName } from "./tf-icons"
import { useTarefasCtx } from "./TarefasContext"
import { MO, MONTHS_LONG, TODAY, WD_LONG, byTime, tDiff, tParse } from "./tf-meta"
import {
  AssigneeAvatar,
  DataChip,
  IaBadge,
  LinkChip,
  PriorityFlag,
  PrazoChip,
  SectionHeader,
  SubProgress,
  TaskCheck,
} from "./tf-kit"

// Dynamic project chip (dot + nome). `projetoId == null` reads as Entrada.
export function ProjTag({ projetoId, showName = true }: { projetoId: number | null; showName?: boolean }) {
  const { projetoById } = useTarefasCtx()
  const p = projetoById(projetoId)
  const cor = p?.cor || "var(--text-subtle)"
  const nome = p?.nome ?? "Entrada"
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: cor, flexShrink: 0 }} />
      {showName && (
        <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {nome}
        </span>
      )}
    </span>
  )
}

export interface ViewCallbacks {
  onToggle: (id: number) => void
  onOpen: (id: number) => void
  onLinkClick: (v: VinculoRef) => void
}

// Optional multi-select layer (bulk edit). When `selectable`, a click toggles
// selection instead of opening the task, and a square box replaces the toggle.
export interface Selectable {
  selectable?: boolean
  selectedIds?: Set<number>
  onSelect?: (id: number) => void
}

function SelectBox({ checked }: { checked: boolean }) {
  return (
    <span
      style={{
        width: 19,
        height: 19,
        flexShrink: 0,
        borderRadius: 6,
        border: `1.7px solid ${checked ? "var(--accent)" : "var(--border-strong)"}`,
        background: checked ? "var(--accent)" : "transparent",
        color: "var(--brand-navy)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name="check" size={12} strokeWidth={3} style={{ opacity: checked ? 1 : 0 }} />
    </span>
  )
}

// Whether to hide completed tasks (Hoje/Lista). Default ON at the call sites.
export interface HideDone {
  hideDone?: boolean
}

const COMPLETION_GRACE_MS = 650

// Tracks tasks that JUST transitioned to done so they can linger (showing the
// filled check + strikethrough) before being animated out when hideDone is on.
export function useJustCompleted(tasks: TaskRow[]): Set<number> {
  const [ids, setIds] = useState<Set<number>>(() => new Set())
  const prev = useRef<Map<number, boolean>>(new Map())
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  useEffect(() => {
    tasks.forEach((t) => {
      const was = prev.current.get(t.id)
      if (was === false && t.done) {
        setIds((s) => (s.has(t.id) ? s : new Set(s).add(t.id)))
        const old = timers.current.get(t.id)
        if (old) clearTimeout(old)
        timers.current.set(
          t.id,
          setTimeout(() => {
            timers.current.delete(t.id)
            setIds((s) => {
              if (!s.has(t.id)) return s
              const n = new Set(s)
              n.delete(t.id)
              return n
            })
          }, COMPLETION_GRACE_MS),
        )
      } else if (was === true && !t.done) {
        // reopened before the grace expired — show it again immediately
        const old = timers.current.get(t.id)
        if (old) {
          clearTimeout(old)
          timers.current.delete(t.id)
        }
        setIds((s) => {
          if (!s.has(t.id)) return s
          const n = new Set(s)
          n.delete(t.id)
          return n
        })
      }
      prev.current.set(t.id, t.done)
    })
  }, [tasks])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  return ids
}

// Applies hide-completed (keeping just-completed tasks during their grace window)
// and returns the visible slice. The grace set is what powers the exit animation.
export function useVisibleTasks(tasks: TaskRow[], hideDone: boolean | undefined): TaskRow[] {
  const just = useJustCompleted(tasks)
  if (!hideDone) return tasks
  return tasks.filter((t) => !t.done || just.has(t.id))
}

const ROW_EASE = [0.22, 1, 0.36, 1] as const

// Wraps task rows so completion (removal from the list) collapses + fades out
// instead of snapping. Keyed by task id; entrance is suppressed on first paint.
export function AnimatedRows({ rows }: { rows: { id: number; el: ReactNode }[] }) {
  return (
    <AnimatePresence initial={false}>
      {rows.map((r) => (
        <motion.div
          key={r.id}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0, scale: 0.97 }}
          transition={{ duration: 0.3, ease: ROW_EASE }}
          style={{ overflow: "hidden" }}
        >
          {r.el}
        </motion.div>
      ))}
    </AnimatePresence>
  )
}

// ── shared task row (Hoje / Lista) ───────────────────────────────────────────
export function TaskRow({
  task,
  showProject = true,
  selectable,
  selected,
  onSelect,
  ...cb
}: { task: TaskRow; showProject?: boolean; selected?: boolean } & Pick<Selectable, "selectable" | "onSelect"> & ViewCallbacks) {
  const handleClick = () => (selectable && onSelect ? onSelect(task.id) : cb.onOpen(task.id))
  return (
    <div
      onClick={handleClick}
      className="task-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "9px 10px",
        borderRadius: 10,
        cursor: "pointer",
        opacity: task.done && !selectable ? 0.5 : 1,
        background: selected ? "var(--accent-soft)" : undefined,
      }}
    >
      {selectable ? (
        <SelectBox checked={!!selected} />
      ) : (
        <TaskCheck done={task.done} prio={task.prio} onToggle={() => cb.onToggle(task.id)} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text)",
              letterSpacing: "-0.01em",
              textDecoration: task.done ? "line-through" : "none",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {task.titulo}
          </span>
          {task.ai && <IaBadge />}
          {task.recur && <Icon name="repeat" size={12} strokeWidth={1.9} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />}
          {task.reminder && <Icon name="bell" size={11} strokeWidth={1.9} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
          {showProject && <ProjTag projetoId={task.projetoId} />}
          <LinkChip vinculo={task.vinculo} onClick={cb.onLinkClick} />
          <SubProgress subtasks={task.subtasks} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <DataChip data={task.data} hora={task.hora} faded={task.done} />
        <PrazoChip prazo={task.prazo} done={task.done} />
        {task.responsavelId != null && <AssigneeAvatar id={task.responsavelId} />}
      </div>
    </div>
  )
}

export function EmptyState({ icon = "checkCircle", title, sub }: { icon?: TfIconName; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "54px 20px", color: "var(--text-subtle)" }}>
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 10,
          background: "var(--bg-sunken)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
          color: "var(--text-muted)",
        }}
      >
        <Icon name={icon} size={22} strokeWidth={1.7} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-muted)" }}>{title}</div>
      {sub && <div style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 22 }}>{children}</div>
}

// ── HOJE / PRÓXIMAS ──────────────────────────────────────────────────────────
export function HojeView({ tasks, hideDone, selectable, selectedIds, onSelect, ...cb }: { tasks: TaskRow[] } & HideDone & Selectable & ViewCallbacks) {
  const vis = useVisibleTasks(tasks, hideDone)
  const rows = (arr: TaskRow[]) =>
    arr.map((t) => ({ id: t.id, el: <TaskRow task={t} selectable={selectable} selected={selectedIds?.has(t.id)} onSelect={onSelect} {...cb} /> }))
  const scheduled = vis.filter((t) => t.data)
  const overdue = scheduled.filter((t) => !t.done && tDiff(t.data as string) < 0).sort(byTime)
  const today = scheduled.filter((t) => tDiff(t.data as string) === 0).sort(byTime)
  const upcoming = scheduled
    .filter((t) => tDiff(t.data as string) >= 1)
    .sort((a, b) => (a.data as string).localeCompare(b.data as string) || byTime(a, b))

  const dayGroups: Record<string, TaskRow[]> = {}
  const later: TaskRow[] = []
  upcoming.forEach((t) => {
    const n = tDiff(t.data as string)
    if (n <= 7) (dayGroups[t.data as string] = dayGroups[t.data as string] || []).push(t)
    else later.push(t)
  })
  const noDate = vis.filter((t) => !t.data && !t.done).length
  const td = tParse(TODAY())

  return (
    <div>
      {overdue.length > 0 && (
        <RowGroup>
          <SectionHeader
            icon="flame"
            label="Atrasadas"
            count={overdue.length}
            tone="vencido"
            right={<span style={{ fontSize: 12, color: "var(--fin-neg)", fontWeight: 500 }}>{overdue.length} pendente{overdue.length > 1 ? "s" : ""}</span>}
          />
          <AnimatedRows rows={rows(overdue)} />
        </RowGroup>
      )}
      <RowGroup>
        <SectionHeader
          icon="sun"
          label="Hoje"
          count={today.length}
          tone="accent"
          right={<span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{WD_LONG[td.getDay()]}, {td.getDate()} {MO[td.getMonth()]}</span>}
        />
        {today.length ? (
          <AnimatedRows rows={rows(today)} />
        ) : (
          <EmptyState icon="checkCircle" title="Nada para hoje" sub="Aproveite ou puxe uma tarefa de Próximas." />
        )}
      </RowGroup>
      {Object.keys(dayGroups)
        .sort()
        .map((d) => {
          const dt = tParse(d)
          const n = tDiff(d)
          return (
            <RowGroup key={d}>
              <SectionHeader
                icon="calendar"
                label={n === 1 ? "Amanhã" : WD_LONG[dt.getDay()].replace(/^./, (c) => c.toUpperCase())}
                count={dayGroups[d].length}
                right={<span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{dt.getDate()} {MO[dt.getMonth()]}</span>}
              />
              <AnimatedRows rows={rows(dayGroups[d])} />
            </RowGroup>
          )
        })}
      {later.length > 0 && (
        <RowGroup>
          <SectionHeader icon="calendarClock" label="Mais tarde" count={later.length} />
          <AnimatedRows rows={rows(later)} />
        </RowGroup>
      )}
      {noDate > 0 && (
        <div style={{ fontSize: 12, color: "var(--text-subtle)", padding: "4px 10px" }}>
          <Icon name="inbox" size={13} strokeWidth={1.8} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          {noDate} tarefa{noDate > 1 ? "s" : ""} sem data na Caixa de entrada — defina uma data para agendá-la{noDate > 1 ? "s" : ""}.
        </div>
      )}
    </div>
  )
}

// ── LISTA (agrupável) ─────────────────────────────────────────────────────────
export type GroupBy = "projeto" | "responsavel" | "prazo" | "prioridade"
export const GROUP_OPTS: { id: GroupBy; label: string; icon: TfIconName }[] = [
  { id: "projeto", label: "Projeto", icon: "inbox" },
  { id: "responsavel", label: "Responsável", icon: "user" },
  { id: "prazo", label: "Prazo", icon: "flag" },
  { id: "prioridade", label: "Prioridade", icon: "flag" },
]

interface GroupHeader {
  dot?: string | null
  avatar?: number
  label: string
}
interface Group {
  key: string | number
  header: GroupHeader
  items: TaskRow[]
}

export function ListaView({ tasks, groupBy, hideDone, selectable, selectedIds, onSelect, ...cb }: { tasks: TaskRow[]; groupBy: GroupBy } & HideDone & Selectable & ViewCallbacks) {
  const { projetos, socios } = useTarefasCtx()
  const vis = useVisibleTasks(tasks, hideDone)
  let groups: Group[] = []

  if (groupBy === "projeto") {
    groups = [
      { key: "inbox", header: { dot: "var(--text-subtle)", label: "Entrada" }, items: vis.filter((t) => t.projetoId == null) },
      ...projetos.map((p) => ({
        key: p.id,
        header: { dot: p.cor || "var(--text-muted)", label: p.nome },
        items: vis.filter((t) => t.projetoId === p.id),
      })),
    ]
  } else if (groupBy === "responsavel") {
    groups = socios.map((m) => ({ key: m.id, header: { avatar: m.id, label: m.nome }, items: vis.filter((t) => t.responsavelId === m.id) }))
    groups.push({ key: "none", header: { label: "Não atribuídas" }, items: vis.filter((t) => t.responsavelId == null) })
  } else if (groupBy === "prioridade") {
    groups = ([1, 2, 3, 4] as TaskPrio[]).map((n) => ({
      key: n,
      header: { dot: PRIO[n].color, label: `${PRIO[n].short} · ${PRIO[n].label}` },
      items: vis.filter((t) => t.prio === n),
    }))
  } else {
    // Group strictly by the deadline's distance from today. "Vence hoje" means
    // exactly today (n === 0); anything in the past — done OR not — is "Vencido".
    const bucket = (t: TaskRow): string => {
      if (!t.prazo) return "sem"
      const n = tDiff(t.prazo)
      if (n < 0) return "venc"
      if (n === 0) return "hoje"
      if (n <= 7) return "sem7"
      return "depois"
    }
    const defs: [string, string, string | null][] = [
      ["venc", "Vencido", "var(--fin-neg)"],
      ["hoje", "Vence hoje", "var(--warn)"],
      ["sem7", "Próximos 7 dias", null],
      ["depois", "Depois", null],
      ["sem", "Sem prazo", null],
    ]
    groups = defs.map(([k, label, dot]) => ({ key: k, header: { dot, label }, items: vis.filter((t) => bucket(t) === k) }))
  }

  groups = groups.filter((g) => g.items.length)
  if (!groups.length) return <EmptyState icon="list" title="Nenhuma tarefa" sub="Ajuste os filtros ou adicione uma tarefa." />

  return (
    <div>
      {groups.map((g) => (
        <RowGroup key={g.key}>
          <SectionHeader
            icon={!g.header.dot && g.header.avatar == null ? "circleDot" : undefined}
            label={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {g.header.dot && <span style={{ width: 9, height: 9, borderRadius: "50%", background: g.header.dot }} />}
                {g.header.avatar != null && <AssigneeAvatar id={g.header.avatar} size={18} title={false} />}
                {g.header.label}
              </span>
            }
            count={g.items.length}
          />
          <AnimatedRows
            rows={g.items
              .slice()
              .sort(byTime)
              .map((t) => ({
                id: t.id,
                el: <TaskRow task={t} showProject={groupBy !== "projeto"} selectable={selectable} selected={selectedIds?.has(t.id)} onSelect={onSelect} {...cb} />,
              }))}
          />
        </RowGroup>
      ))}
    </div>
  )
}

// ── QUADRO (Kanban com drag) ──────────────────────────────────────────────────
function KanbanCard({
  task,
  dragging,
  onDragStart,
  onDragEnd,
  ...cb
}: {
  task: TaskRow
  dragging: boolean
  onDragStart: (id: number) => void
  onDragEnd: () => void
} & ViewCallbacks) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", String(task.id))
        onDragStart(task.id)
      }}
      onDragEnd={onDragEnd}
      onClick={() => cb.onOpen(task.id)}
      className="card kanban-card"
      style={{ padding: "11px 12px", cursor: "pointer", opacity: dragging ? 0.4 : 1, borderColor: "var(--border)" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        <div style={{ marginTop: 1 }}>
          <TaskCheck done={task.done} prio={task.prio} onToggle={() => cb.onToggle(task.id)} size={17} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", lineHeight: 1.35, textDecoration: task.done ? "line-through" : "none" }}>
            {task.titulo}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {task.ai && <IaBadge />}
        <LinkChip vinculo={task.vinculo} onClick={cb.onLinkClick} />
        <SubProgress subtasks={task.subtasks} />
        <div style={{ flex: 1 }} />
        <PriorityFlag prio={task.prio} />
        <PrazoChip prazo={task.prazo} done={task.done} compact />
        {task.responsavelId != null && <AssigneeAvatar id={task.responsavelId} size={20} />}
      </div>
    </div>
  )
}

export function QuadroView({ tasks, onMove, ...cb }: { tasks: TaskRow[]; onMove: (id: number, status: TaskStatus) => void } & ViewCallbacks) {
  const [dragId, setDragId] = useState<number | null>(null)
  const [over, setOver] = useState<string | null>(null)
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${STATUS.length}, 1fr)`, gap: 14, alignItems: "start" }}>
      {STATUS.map((col) => {
        const items = tasks.filter((t) => t.status === col.id).sort(byTime)
        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(col.id)
            }}
            onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault()
              const raw = e.dataTransfer.getData("text/plain")
              const id = raw ? Number(raw) : dragId
              if (id) onMove(id, col.id)
              setDragId(null)
              setOver(null)
            }}
            style={{
              background: over === col.id ? "var(--accent-soft)" : "var(--bg-soft)",
              border: `1px solid ${over === col.id ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 14,
              padding: 10,
              minHeight: 220,
              transition: "background .12s, border-color .12s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px 10px" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: col.color }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{col.label}</span>
              <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{items.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {items.map((t) => (
                <KanbanCard
                  key={t.id}
                  task={t}
                  dragging={dragId === t.id}
                  onDragStart={setDragId}
                  onDragEnd={() => {
                    setDragId(null)
                    setOver(null)
                  }}
                  {...cb}
                />
              ))}
              {!items.length && <div style={{ fontSize: 12, color: "var(--text-subtle)", textAlign: "center", padding: "14px 0" }}>Arraste tarefas aqui</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── CALENDÁRIO ────────────────────────────────────────────────────────────────
export function CalendarioView({ tasks, ...cb }: { tasks: TaskRow[] } & ViewCallbacks) {
  const { projetoById } = useTarefasCtx()
  const todayIso = TODAY()
  const tnow = tParse(todayIso)
  const [ref, setRef] = useState({ y: tnow.getFullYear(), m: tnow.getMonth() })
  const first = new Date(ref.y, ref.m, 1)
  const startPad = first.getDay()
  const days = new Date(ref.y, ref.m + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(d)
  while (cells.length % 7) cells.push(null)
  const iso = (d: number) => `${ref.y}-${String(ref.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>
          {MONTHS_LONG[ref.m]} {ref.y}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            className="btn btn-ghost"
            onClick={() => setRef((r) => ({ ...r, m: r.m - 1 < 0 ? 11 : r.m - 1, y: r.m - 1 < 0 ? r.y - 1 : r.y }))}
            style={{ width: 28, height: 28, padding: 0 }}
          >
            <Icon name="chevronLeft" size={15} />
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setRef((r) => ({ ...r, m: r.m + 1 > 11 ? 0 : r.m + 1, y: r.m + 1 > 11 ? r.y + 1 : r.y }))}
            style={{ width: 28, height: 28, padding: 0 }}
          >
            <Icon name="chevronRight" size={15} />
          </button>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-subtle)" }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--accent)" }} />
          agendada
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-subtle)" }}>
          <Icon name="flag" size={11} style={{ color: "var(--fin-neg)" }} />
          prazo
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((w) => (
          <div key={w} style={{ background: "var(--bg-soft)", padding: "7px 8px", fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          const dateStr = d ? iso(d) : null
          const isToday = dateStr === todayIso
          const scheduled = d ? tasks.filter((t) => t.data === dateStr) : []
          const deadlines = d ? tasks.filter((t) => t.prazo === dateStr && !t.done).length : 0
          return (
            <div
              key={i}
              style={{
                background: "var(--surface)",
                height: 120,
                minWidth: 0,
                overflow: "hidden",
                padding: 6,
                display: d ? "flex" : "block",
                flexDirection: "column",
                gap: 3,
              }}
            >
              {d && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2, flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      fontFeatureSettings: '"tnum"',
                      color: isToday ? "#fff" : "var(--text-muted)",
                      background: isToday ? "var(--accent-strong)" : "transparent",
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {d}
                  </span>
                  {deadlines > 0 && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 500, color: "var(--fin-neg)", flexShrink: 0 }}>
                      <Icon name="flag" size={10} strokeWidth={2.2} />
                      {deadlines}
                    </span>
                  )}
                </div>
              )}
              {scheduled.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  onClick={() => cb.onOpen(t.id)}
                  title={t.titulo}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--text)",
                    background: "var(--bg-sunken)",
                    borderLeft: `3px solid ${projetoById(t.projetoId)?.cor || "var(--text-subtle)"}`,
                    borderRadius: 6,
                    padding: "2px 5px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    opacity: t.done ? 0.5 : 1,
                    textDecoration: t.done ? "line-through" : "none",
                    flexShrink: 0,
                  }}
                >
                  {t.hora ? `${t.hora} ` : ""}
                  {t.titulo}
                </div>
              ))}
              {scheduled.length > 3 && <span style={{ fontSize: 11, color: "var(--text-subtle)", paddingLeft: 4, flexShrink: 0 }}>+{scheduled.length - 3} mais</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── AGENDA DO DIA (timeline com drag, snap de 15 min) ─────────────────────────
const HOURS = Array.from({ length: 14 }, (_, i) => 7 + i) // 07..20
const SLOT_H = 56
const SNAP_MIN = 15

// Replaces the native drag ghost by a compact chip anchored at its TOP-left
// corner, so the preview always hangs BELOW/right of the pointer instead of
// covering the timeline slots above it (a transparent spacer adds a small gap).
// The node is appended inside the .tf-scope wrapper so the CSS vars resolve.
function dragChipBelowCursor(e: React.DragEvent, titulo: string, cor: string) {
  const host = (e.currentTarget as HTMLElement).closest(".tf-scope")
  if (!host) return
  const g = document.createElement("div")
  g.style.cssText = "position:fixed;top:-1000px;left:-1000px;padding:14px 0 0 10px;background:transparent;pointer-events:none;"
  const chip = document.createElement("div")
  chip.textContent = titulo
  chip.style.cssText =
    "max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" +
    "font-family:var(--font-sans);font-size:12px;font-weight:500;color:var(--text);" +
    `background:var(--bg-elevated);border:1px solid var(--border-strong);border-left:3px solid ${cor};` +
    "border-radius:8px;padding:6px 10px;box-shadow:var(--shadow-md);"
  g.appendChild(chip)
  host.appendChild(g)
  e.dataTransfer.setDragImage(g, 4, 0)
  setTimeout(() => g.remove(), 0)
}

/** Minutes since midnight, re-evaluated every 30s (keeps the now-line honest). */
function useNowMin(): number {
  const [m, setM] = useState(() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })
  useEffect(() => {
    const h = setInterval(() => {
      const d = new Date()
      setM(d.getHours() * 60 + d.getMinutes())
    }, 30_000)
    return () => clearInterval(h)
  }, [])
  return m
}

export function AgendaView({ tasks, onSchedule, ...cb }: { tasks: TaskRow[]; onSchedule: (id: number, hora: string) => void } & ViewCallbacks) {
  const { projetoById } = useTarefasCtx()
  const gridRef = useRef<HTMLDivElement>(null)
  const [overMin, setOverMin] = useState<number | null>(null) // minuto sob o cursor (snap 15)
  const nowMin = useNowMin()
  const todayIso = TODAY()
  const todays = tasks.filter((t) => t.data === todayIso)
  const pool = todays.filter((t) => !t.hora && !t.done)
  const placed = todays.filter((t) => t.hora)
  const corDe = (t: TaskRow) => projetoById(t.projetoId)?.cor || "var(--accent)"

  const minuteFromEvent = (e: React.DragEvent): number => {
    const rect = gridRef.current!.getBoundingClientRect()
    const y = e.clientY - rect.top
    let m = HOURS[0] * 60 + (y / SLOT_H) * 60
    m = Math.round(m / SNAP_MIN) * SNAP_MIN
    return Math.max(HOURS[0] * 60, Math.min((HOURS[HOURS.length - 1] + 1) * 60 - SNAP_MIN, m))
  }
  const fmtMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
  const dropAt = (e: React.DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData("text/plain")
    if (id) onSchedule(Number(id), fmtMin(minuteFromEvent(e)))
    setOverMin(null)
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "236px 1fr", gap: 16, alignItems: "start" }}>
      {/* pool */}
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Icon name="inbox" size={15} strokeWidth={1.9} style={{ color: "var(--text-muted)" }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>A agendar hoje</span>
          <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{pool.length}</span>
        </div>
        <p style={{ margin: "0 0 12px", fontSize: 11, color: "var(--text-subtle)", lineHeight: 1.45 }}>Arraste para um horário no dia →</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pool.map((t) => (
            <div
              key={t.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move"
                e.dataTransfer.setData("text/plain", String(t.id))
                dragChipBelowCursor(e, t.titulo, corDe(t))
              }}
              onClick={() => cb.onOpen(t.id)}
              className="card pool-card"
              style={{ padding: "9px 10px", cursor: "grab", borderColor: "var(--border)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Icon name="gripVertical" size={14} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "var(--text)", lineHeight: 1.3, minWidth: 0 }}>{t.titulo}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7, paddingLeft: 21 }}>
                <PriorityFlag prio={t.prio} />
                <PrazoChip prazo={t.prazo} done={t.done} compact />
                <div style={{ flex: 1 }} />
                {t.responsavelId != null && <AssigneeAvatar id={t.responsavelId} size={18} />}
              </div>
            </div>
          ))}
          {!pool.length && <div style={{ fontSize: 12, color: "var(--text-subtle)", textAlign: "center", padding: "16px 0" }}>Tudo agendado ✓</div>}
        </div>
      </div>

      {/* timeline — solta em qualquer horário (snap de 15 min) */}
      <div className="card" style={{ padding: "8px 8px 8px 0", position: "relative" }}>
        <div
          ref={gridRef}
          style={{ position: "relative" }}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = "move"
            setOverMin(minuteFromEvent(e))
          }}
          onDragLeave={(e) => {
            if (gridRef.current && !gridRef.current.contains(e.relatedTarget as Node)) setOverMin(null)
          }}
          onDrop={dropAt}
        >
          {HOURS.map((h) => (
            <div key={h} style={{ display: "flex", height: SLOT_H, borderTop: "1px solid var(--border)" }}>
              <div style={{ width: 56, flexShrink: 0, textAlign: "right", paddingRight: 10, paddingTop: 4, fontSize: 11, color: "var(--text-subtle)", fontFeatureSettings: '"tnum"' }}>
                {String(h).padStart(2, "0")}:00
              </div>
              <div style={{ flex: 1, borderLeft: "1px solid var(--border)" }} />
            </div>
          ))}
          {/* indicador de soltura — a hora fica ABAIXO da linha, fora do caminho do olhar */}
          {overMin != null && (
            <div
              style={{
                position: "absolute",
                left: 56,
                right: 0,
                top: ((overMin - HOURS[0] * 60) / 60) * SLOT_H,
                height: 0,
                borderTop: "2px dashed var(--accent)",
                zIndex: 4,
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 6,
                  top: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFeatureSettings: '"tnum"',
                  background: "var(--accent)",
                  color: "var(--brand-navy)",
                  padding: "1px 7px",
                  borderRadius: 6,
                }}
              >
                {fmtMin(overMin)}
              </span>
            </div>
          )}
          {/* now line */}
          {nowMin >= HOURS[0] * 60 && nowMin <= (HOURS[HOURS.length - 1] + 1) * 60 && (
            <div
              style={{
                position: "absolute",
                left: 56,
                right: 0,
                top: ((nowMin - HOURS[0] * 60) / 60) * SLOT_H,
                height: 0,
                borderTop: "2px solid var(--fin-neg)",
                zIndex: 3,
                pointerEvents: "none",
              }}
            >
              <span style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: "var(--fin-neg)" }} />
            </div>
          )}
          {/* placed blocks */}
          {placed.map((t) => {
            const [hh, mm] = (t.hora as string).split(":").map(Number)
            const top = ((hh * 60 + mm - HOURS[0] * 60) / 60) * SLOT_H
            const col = corDe(t)
            return (
              <div
                key={t.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move"
                  e.dataTransfer.setData("text/plain", String(t.id))
                  dragChipBelowCursor(e, t.titulo, col)
                }}
                onClick={() => cb.onOpen(t.id)}
                style={{
                  position: "absolute",
                  left: 64,
                  right: 10,
                  top: top + 2,
                  height: SLOT_H - 6,
                  background: "var(--surface)",
                  border: "1px solid var(--border-strong)",
                  borderLeft: `3px solid ${col}`,
                  borderRadius: 8,
                  boxShadow: "var(--shadow-sm)",
                  padding: "5px 10px",
                  cursor: "grab",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: t.done ? 0.55 : 1,
                }}
              >
                <TaskCheck done={t.done} prio={t.prio} onToggle={() => cb.onToggle(t.id)} size={16} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: t.done ? "line-through" : "none" }}>
                  {t.titulo}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-subtle)", fontFeatureSettings: '"tnum"' }}>{t.hora}</span>
                <LinkChip vinculo={t.vinculo} onClick={cb.onLinkClick} />
                {t.responsavelId != null && <AssigneeAvatar id={t.responsavelId} size={18} />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
