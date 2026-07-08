"use client"

// Tarefas v2 — views Hoje / Em breve / Entrada / Arquivados (ported from the
// design's t2-views.jsx + o ArchivedProjectsView do projetos-tabs.jsx). Todas
// recebem a lista já sob os filtros GLOBAIS (Mostrar) e aplicam hideDone com a
// janela de graça compartilhada (conclusão colapsa/esvanece em vez de sumir).
import { useRef, useState } from "react"
import type { ProjetoView } from "@/lib/projetos/types"
import type { TaskRow } from "@/lib/tarefas/types"
import { deriveRollup } from "@/components/projetos/pj-meta"
import { ProjectIcon, useAreaLabel } from "@/components/projetos/pj-kit"
import { Icon } from "./tf-icons"
import { MONTHS_LONG, TODAY, WD, tDiff, tIso, tParse } from "./tf-meta"
import { AgendaDia, AnimatedRows, useVisibleTasks, type ViewCallbacks } from "./views"
import { InlineAdd, OverdueBlock, T2Empty, T2SectionHead, byTimeV2, dayHeading, t2Rows } from "./t2-rows"
import { T2Frame, T2Title } from "./t2-shell"

export type HojeMode = "lista" | "agenda"

export interface T2ViewProps {
  tasks: TaskRow[]
  hideDone?: boolean
  cb: ViewCallbacks
  onQuickAdd: (presetDate: string | null) => void
  onReschedule: () => void
}

// ── HOJE (fundida com a Agenda do dia via modo lista/agenda) ─────────────────
// A escolha Minhas/Equipe vem do menu "Mostrar" (prop onlyMine). No modo AGENDA só
// entram tarefas minhas — não dá p/ agendar horário de terceiros, nem devem aparecer
// na timeline. Tarefas atrasadas ficam agrupadas no topo em AMBOS os modos.
export function HojeV2({
  tasks,
  hideDone,
  cb,
  onQuickAdd,
  onReschedule,
  meId,
  mode,
  onlyMine,
  onSchedule,
}: T2ViewProps & { meId: number | null; mode: HojeMode; onlyMine: boolean; onSchedule: (id: number, hora: string, dateIso?: string) => void }) {
  const mine = mode === "agenda" ? true : onlyMine
  const scoped = mine && meId != null ? tasks.filter((t) => t.responsavelId === meId) : tasks
  const vis = useVisibleTasks(scoped, hideDone)
  const overdue = vis.filter((t) => !t.done && t.data && tDiff(t.data) < 0).sort(byTimeV2)
  const today = vis.filter((t) => t.data && tDiff(t.data) === 0).sort(byTimeV2)
  const open = overdue.length + today.filter((t) => !t.done).length
  if (mode === "agenda") {
    return (
      <AgendaDia
        tasks={scoped}
        onSchedule={onSchedule}
        overdue={overdue.length > 0 ? <OverdueBlock tasks={overdue} cb={cb} onReschedule={onReschedule} /> : null}
        {...cb}
      />
    )
  }
  return (
    <T2Frame>
      <T2Title title="Hoje" sub={`${open} tarefa${open !== 1 ? "s" : ""}`} />
      <OverdueBlock tasks={overdue} cb={cb} onReschedule={onReschedule} />
      <T2SectionHead label={dayHeading(TODAY())} />
      <AnimatedRows rows={t2Rows(today, cb)} />
      <InlineAdd onClick={() => onQuickAdd(TODAY())} />
      {!today.length && !overdue.length && (
        <T2Empty title="Anote agora, planeje depois" sub="Nada agendado para hoje. Adicione uma tarefa ou puxe algo de Em breve." />
      )}
    </T2Frame>
  )
}

// ── EM BREVE (cabeçalho fixo; tabs de dia linkadas às seções via scroll suave) ──
export function EmBreveV2({ tasks, hideDone, cb, onQuickAdd, onReschedule }: T2ViewProps) {
  const todayIso = TODAY()
  const [anchor, setAnchor] = useState(todayIso) // dia central da faixa semanal visível
  const [selected, setSelected] = useState(todayIso) // dia com realce (último clicado)
  const vis = useVisibleTasks(tasks, hideDone)
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const anchorD = tParse(anchor)
  const weekStart = new Date(anchorD)
  weekStart.setDate(anchorD.getDate() - anchorD.getDay()) // domingo
  const strip = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  const overdue = vis.filter((t) => !t.done && t.data && tDiff(t.data) < 0).sort(byTimeV2)
  const openCount = (dIso: string) => vis.filter((t) => t.data === dIso && !t.done).length

  // seções = os mesmos dias da faixa que são hoje ou futuro (link 1:1 com as tabs)
  const days = strip.map(tIso).filter((dIso) => tDiff(dIso) >= 0)
  const weekIncludesToday = strip.some((d) => tIso(d) === todayIso)

  const goToDay = (dIso: string) => {
    setSelected(dIso)
    sectionRefs.current.get(dIso)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }
  const shiftWeek = (n: number) => {
    const start = new Date(weekStart)
    start.setDate(start.getDate() + n * 7)
    const mid = new Date(start)
    mid.setDate(start.getDate() + 3)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const startIso = tIso(start)
    setAnchor(tIso(mid))
    setSelected(tDiff(startIso) < 0 && tDiff(tIso(end)) >= 0 ? todayIso : startIso)
  }

  return (
    <T2Frame>
      {/* cabeçalho fixo: título + mês + faixa da semana */}
      <div style={{ position: "sticky", top: 0, zIndex: 5, background: "var(--bg)", paddingTop: 2, margin: "-2px -4px 22px", paddingLeft: 4, paddingRight: 4 }}>
        <T2Title title="Em breve" />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text)" }}>
            {MONTHS_LONG[anchorD.getMonth()]} {anchorD.getFullYear()}
          </span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm" onClick={() => shiftWeek(-1)} style={{ width: 28, padding: 0 }}>
            <Icon name="chevronLeft" size={15} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setAnchor(todayIso)
              goToDay(todayIso)
            }}
            style={{ fontSize: 12, padding: "0 10px" }}
          >
            Hoje
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => shiftWeek(1)} style={{ width: 28, padding: 0 }}>
            <Icon name="chevronRight" size={15} />
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
          {strip.map((d) => {
            const dIso = tIso(d)
            const isSel = dIso === selected
            const isPast = tDiff(dIso) < 0
            const n = openCount(dIso)
            return (
              <div
                key={dIso}
                onClick={() => !isPast && goToDay(dIso)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "8px 0 10px",
                  cursor: isPast ? "default" : "pointer",
                  borderBottom: isSel ? "2px solid var(--accent)" : "2px solid transparent",
                  marginBottom: -1,
                  color: isPast ? "var(--text-subtle)" : isSel ? "var(--text)" : "var(--text-muted)",
                  fontSize: 13,
                  fontWeight: isSel ? 600 : 500,
                  opacity: isPast ? 0.55 : 1,
                }}
              >
                {WD[d.getDay()].replace(/^./, (c) => c.toUpperCase())} {d.getDate()}
                {n > 0 && !isPast && (
                  <span
                    style={{
                      minWidth: 18,
                      height: 18,
                      padding: "0 5px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFeatureSettings: '"tnum"',
                      background: dIso === todayIso ? "var(--accent-soft)" : "var(--bg-sunken)",
                      color: dIso === todayIso ? "var(--accent)" : "var(--text-subtle)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {n}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {weekIncludesToday && <OverdueBlock tasks={overdue} cb={cb} onReschedule={onReschedule} />}

      {days.map((dIso) => {
        const items = vis.filter((t) => t.data === dIso).sort(byTimeV2)
        const openN = items.filter((t) => !t.done).length
        return (
          <div
            key={dIso}
            ref={(el) => {
              if (el) sectionRefs.current.set(dIso, el)
              else sectionRefs.current.delete(dIso)
            }}
            style={{ marginBottom: 26, scrollMarginTop: 118 }}
          >
            <T2SectionHead label={dayHeading(dIso)} count={openN || null} />
            <AnimatedRows rows={t2Rows(items, cb)} />
            <InlineAdd onClick={() => onQuickAdd(dIso)} />
          </div>
        )
      })}
      {!days.length && <T2Empty title="Nada em breve" sub="Sem tarefas agendadas nesta semana. Navegue para outra semana ou adicione uma tarefa." />}
    </T2Frame>
  )
}

// ── ENTRADA ──────────────────────────────────────────────────────────────────
export function EntradaV2({ tasks, cb, onQuickAdd, meId }: Omit<T2ViewProps, "onReschedule" | "hideDone"> & { meId: number | null }) {
  // Caixa de entrada = capturas minhas sem projeto e SEM DATA (o prazo é
  // irrelevante). Só o que está aberto; concluir colapsa com a janela de graça.
  const inbox = tasks.filter((t) => t.projetoId == null && !t.data && t.responsavelId === meId)
  const vis = useVisibleTasks(inbox, true)
  const open = vis.filter((t) => !t.done)
  return (
    <T2Frame>
      <T2Title title="Entrada" sub={open.length ? `${open.length} tarefa${open.length !== 1 ? "s" : ""}` : null} />
      <AnimatedRows rows={t2Rows(vis, cb, false)} />
      <InlineAdd onClick={() => onQuickAdd(null)} />
      {!vis.length && (
        <T2Empty
          icon="inbox"
          title="Anote agora, planeje depois"
          sub="A Entrada é o seu lugar para capturar tarefas. Esvazie a mente agora, organize quando estiver pronto."
        />
      )}
    </T2Frame>
  )
}

// ── ARQUIVADOS ───────────────────────────────────────────────────────────────
function ArchivedRow({
  proj,
  tasks,
  onOpen,
  onUnarchive,
}: {
  proj: ProjetoView
  tasks: TaskRow[]
  onOpen: () => void
  onUnarchive: () => void
}) {
  const live = deriveRollup(proj.id, tasks)
  const areaLabel = useAreaLabel(proj.area)
  return (
    <div
      onClick={onOpen}
      className="lift-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "12px 14px",
        borderRadius: 11,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        cursor: "pointer",
      }}
    >
      <ProjectIcon cor={proj.cor} icone={proj.icone} size={38} radius={10} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{proj.nome}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
          {live.done}/{live.total} tarefas
          {proj.area ? ` · ${areaLabel}` : ""}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onUnarchive()
        }}
        className="btn btn-secondary"
        style={{ height: 30, fontSize: 12, flexShrink: 0 }}
      >
        <Icon name="archive" size={13} strokeWidth={1.9} />
        Desarquivar
      </button>
    </div>
  )
}

export function ArchivedProjectsView({
  projetos,
  tasks,
  onOpenProject,
  onUnarchive,
}: {
  projetos: ProjetoView[]
  tasks: TaskRow[]
  onOpenProject: (id: number) => void
  onUnarchive: (p: ProjetoView) => void
}) {
  const arquivados = projetos.filter((p) => p.status === "arquivado")
  if (!arquivados.length) {
    return (
      <div style={{ textAlign: "center", padding: "70px 20px", color: "var(--text-subtle)" }}>
        <Icon name="archive" size={28} strokeWidth={1.6} />
        <div style={{ fontSize: 13.5, marginTop: 12 }}>Nenhum projeto arquivado.</div>
      </div>
    )
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {arquivados.map((p) => (
        <ArchivedRow key={p.id} proj={p} tasks={tasks} onOpen={() => onOpenProject(p.id)} onUnarchive={() => onUnarchive(p)} />
      ))}
    </div>
  )
}
