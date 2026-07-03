"use client"

// Projetos & Tarefas — the "Tarefas" tab: every task across all projects, in the
// same five views, with quick-add + filters (incl. a DYNAMIC project filter by
// projetoId) + multi-select for bulk edit.
import { useState, type CSSProperties } from "react"
import { PRIO, type TaskRow, type TaskStatus, type TeamMember } from "@/lib/tarefas/types"
import type { ProjetoView } from "@/lib/projetos/types"
import { Icon } from "@/components/tarefas/tf-icons"
import { AssigneeAvatar, Menu, MenuItem, ViewSwitcher, type ViewId } from "@/components/tarefas/tf-kit"
import { dataLabel, parseQuickAdd } from "@/components/tarefas/tf-meta"
import type { NovaTarefa } from "@/components/tarefas/QuickAddModal"
import { AgendaView, CalendarioView, GROUP_OPTS, HojeView, ListaView, QuadroView, type GroupBy, type ViewCallbacks } from "@/components/tarefas/views"
import { FilterBtn, PageFrame, PageHeader } from "./pj-kit"
import { statusMeta, STATUS } from "@/lib/tarefas/types"

const segBtn = (on: boolean): CSSProperties => ({
  height: 28,
  padding: "0 11px",
  borderRadius: 7,
  border: "none",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: on ? "var(--surface)" : "transparent",
  color: on ? "var(--text)" : "var(--text-muted)",
  fontSize: 12,
  fontWeight: on ? 600 : 500,
  boxShadow: on ? "var(--shadow-sm)" : "none",
  fontFamily: "var(--font-sans)",
})

function QuickAddBar({ socios, projetos, onAdd }: { socios: TeamMember[]; projetos: ProjetoView[]; onAdd: (t: NovaTarefa) => void }) {
  const [v, setV] = useState("")
  const ativos = projetos.filter((p) => p.status !== "arquivado")
  const parsed = v.trim() ? parseQuickAdd(v, { socios, projetos: ativos }) : null
  const hasTokens = parsed && (parsed.projetoId != null || parsed.responsavelId != null || parsed.prio || parsed.data || parsed.hora)
  const member = parsed?.responsavelId != null ? socios.find((m) => m.id === parsed.responsavelId) : null
  const proj = parsed?.projetoId != null ? projetos.find((p) => p.id === parsed.projetoId) : null
  const submit = () => {
    if (!parsed || !parsed.titulo) return
    onAdd({
      titulo: parsed.titulo,
      notes: null,
      data: parsed.data,
      hora: parsed.hora,
      prazo: null,
      prio: parsed.prio ?? 4,
      responsavelId: parsed.responsavelId,
      projetoId: parsed.projetoId,
      reminder: null,
    })
    setV("")
  }
  return (
    <div className="card" style={{ padding: hasTokens ? "11px 14px 9px" : "11px 14px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <Icon name="plus" size={17} strokeWidth={2} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit() }}
          placeholder="Adicionar tarefa…  ex.: Protocolar recurso amanhã 14h #trabalhista @joão !alta"
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--text)" }}
        />
        <span style={{ fontSize: 11, color: "var(--text-subtle)", whiteSpace: "nowrap" }}>#projeto · @pessoa · !prioridade · data</span>
        <button className="btn btn-primary" onClick={submit} disabled={!parsed || !parsed.titulo} style={{ height: 30, fontSize: 12, opacity: parsed && parsed.titulo ? 1 : 0.5 }}>Adicionar</button>
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
          {proj && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, color: "var(--text-muted)", background: "var(--bg-sunken)", padding: "2px 8px", borderRadius: 999 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: proj.cor || "var(--text-muted)" }} />
              {proj.nome}
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

export function CrossTarefasTab({
  tasks,
  projetos,
  socios,
  meId,
  cb,
  onMove,
  onSchedule,
  onAdd,
  selectMode,
  setSelectMode,
  selectedIds,
  onSelect,
}: {
  tasks: TaskRow[]
  projetos: ProjetoView[]
  socios: TeamMember[]
  meId: number | null
  cb: ViewCallbacks
  onMove: (id: number, status: TaskStatus) => void
  onSchedule: (id: number, hora: string) => void
  onAdd: (t: NovaTarefa) => void
  selectMode: boolean
  setSelectMode: (v: boolean) => void
  selectedIds: Set<number>
  onSelect: (id: number) => void
}) {
  const [view, setView] = useState<ViewId>("hoje")
  const [groupBy, setGroupBy] = useState<GroupBy>("projeto")
  const [fProjetoId, setFProjetoId] = useState<number | "none" | null>(null)
  const [fStatus, setFStatus] = useState<TaskStatus | null>(null)
  const [fAssignee, setFAssignee] = useState<number | null>(null)
  const [onlyMine, setOnlyMine] = useState(true)
  const [hideDone, setHideDone] = useState(true)

  let scoped = onlyMine ? tasks.filter((t) => t.responsavelId === meId) : tasks
  if (fProjetoId === "none") scoped = scoped.filter((t) => t.projetoId == null)
  else if (fProjetoId != null) scoped = scoped.filter((t) => t.projetoId === fProjetoId)
  if (fStatus) scoped = scoped.filter((t) => t.status === fStatus)
  if (fAssignee != null) scoped = scoped.filter((t) => t.responsavelId === fAssignee)

  const selectable = view === "lista" || view === "hoje"
  const fProj = typeof fProjetoId === "number" ? projetos.find((p) => p.id === fProjetoId) : null

  return (
    <PageFrame>
      <PageHeader title="Todas as tarefas" sub="De qualquer projeto — nas mesmas visões, com filtros" />

      <QuickAddBar socios={socios} projetos={projetos} onAdd={onAdd} />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <ViewSwitcher view={view} setView={setView} />
        <div style={{ flex: 1 }} />
        {selectable && (
          <button
            onClick={() => setHideDone(!hideDone)}
            title={hideDone ? "Mostrar tarefas concluídas" : "Ocultar tarefas concluídas"}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 32, padding: "0 11px", borderRadius: 9, cursor: "pointer", border: `1px solid ${!hideDone ? "var(--accent)" : "var(--border-strong)"}`, background: !hideDone ? "var(--accent-soft)" : "var(--surface)", fontSize: 12, fontWeight: 500, color: !hideDone ? "var(--accent)" : "var(--text-muted)", whiteSpace: "nowrap", fontFamily: "var(--font-sans)" }}
          >
            <Icon name={hideDone ? "eyeOff" : "eye"} size={14} strokeWidth={1.85} />
            Concluídas
          </button>
        )}
        {selectable && (
          <button
            onClick={() => setSelectMode(!selectMode)}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 32, padding: "0 11px", borderRadius: 9, cursor: "pointer", border: `1px solid ${selectMode ? "var(--accent)" : "var(--border-strong)"}`, background: selectMode ? "var(--accent-soft)" : "var(--surface)", fontSize: 12, fontWeight: 500, color: selectMode ? "var(--accent)" : "var(--text-muted)", whiteSpace: "nowrap", fontFamily: "var(--font-sans)" }}
          >
            <Icon name="checkSquare" size={14} strokeWidth={1.85} />
            {selectMode ? "Selecionando" : "Selecionar"}
          </button>
        )}
        <div style={{ display: "flex", gap: 3, background: "var(--bg-soft)", borderRadius: 9, padding: 3, border: "1px solid var(--border)" }}>
          <button onClick={() => setOnlyMine(true)} style={segBtn(onlyMine)}>{meId != null && <AssigneeAvatar id={meId} size={16} title={false} />}Minhas</button>
          <button onClick={() => setOnlyMine(false)} style={segBtn(!onlyMine)}><Icon name="users" size={14} strokeWidth={1.85} />Equipe</button>
        </div>
        {view === "lista" && (
          <Menu align="right" width={190} trigger={<FilterBtn icon="layoutGrid" label={`Agrupar: ${GROUP_OPTS.find((g) => g.id === groupBy)?.label}`} />}>
            {(close) => GROUP_OPTS.map((g) => <MenuItem key={g.id} icon={g.icon} label={g.label} active={groupBy === g.id} onClick={() => { setGroupBy(g.id); close() }} />)}
          </Menu>
        )}
        <Menu
          align="right"
          width={240}
          trigger={
            <FilterBtn active={fProjetoId != null}>
              {fProj ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: fProj.cor || "var(--text-muted)" }} />
                  {fProj.nome}
                </span>
              ) : fProjetoId === "none" ? (
                "Sem projeto"
              ) : (
                "Projeto"
              )}
            </FilterBtn>
          }
        >
          {(close) => (
            <>
              <MenuItem label="Todos os projetos" active={fProjetoId == null} onClick={() => { setFProjetoId(null); close() }} />
              <MenuItem label="Sem projeto" active={fProjetoId === "none"} onClick={() => { setFProjetoId("none"); close() }} />
              {projetos.map((p) => (
                <MenuItem key={p.id} dot={p.cor || "var(--text-muted)"} label={p.nome} active={fProjetoId === p.id} onClick={() => { setFProjetoId(p.id); close() }} />
              ))}
            </>
          )}
        </Menu>
        <Menu align="right" width={200} trigger={<FilterBtn active={!!fStatus} icon="circleDot">{fStatus ? statusMeta(fStatus).label : "Status"}</FilterBtn>}>
          {(close) => (
            <>
              <MenuItem label="Todos os status" active={!fStatus} onClick={() => { setFStatus(null); close() }} />
              {STATUS.map((s) => <MenuItem key={s.id} dot={s.color} label={s.label} active={fStatus === s.id} onClick={() => { setFStatus(s.id); close() }} />)}
            </>
          )}
        </Menu>
        <Menu width={220} trigger={<FilterBtn active={fAssignee != null} icon="user">{fAssignee != null ? socios.find((m) => m.id === fAssignee)?.first : "Responsável"}</FilterBtn>}>
          {(close) => (
            <>
              <MenuItem label="Toda a equipe" active={fAssignee == null} onClick={() => { setFAssignee(null); close() }} />
              {socios.map((m) => <MenuItem key={m.id} label={m.nome} sub={m.role} active={fAssignee === m.id} onClick={() => { setFAssignee(m.id); close() }} right={<AssigneeAvatar id={m.id} size={18} title={false} />} />)}
            </>
          )}
        </Menu>
      </div>

      {view === "hoje" && <HojeView tasks={scoped} hideDone={hideDone} {...cb} selectable={selectMode && selectable} selectedIds={selectedIds} onSelect={onSelect} />}
      {view === "lista" && <ListaView tasks={scoped} groupBy={groupBy} hideDone={hideDone} {...cb} selectable={selectMode && selectable} selectedIds={selectedIds} onSelect={onSelect} />}
      {view === "quadro" && <QuadroView tasks={scoped} onMove={onMove} {...cb} />}
      {view === "calendario" && <CalendarioView tasks={scoped} {...cb} />}
      {view === "agenda" && <AgendaView tasks={scoped} onSchedule={onSchedule} {...cb} />}
    </PageFrame>
  )
}
