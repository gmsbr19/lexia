"use client"

// Projetos & Tarefas — a "Todas as tarefas": lista única e flexível de tarefas de
// qualquer projeto, com busca, agrupamento, ordenação e filtros (projeto/status/
// responsável + Minhas/Equipe) + seleção múltipla para edição em lote. Sem input de
// nova tarefa e sem seletor de visões (só a lista agrupada).
import { useState, type CSSProperties } from "react"
import { type TaskRow, type TaskStatus, type TeamMember } from "@/lib/tarefas/types"
import type { ProjetoView } from "@/lib/projetos/types"
import { contemNormalizado, normalizar } from "@/lib/text"
import { Icon } from "@/components/tarefas/tf-icons"
import { AssigneeAvatar, Menu, MenuItem } from "@/components/tarefas/tf-kit"
import { GROUP_OPTS, ListaView, SORT_OPTS, type GroupBy, type SortBy, type ViewCallbacks } from "@/components/tarefas/views"
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

export function CrossTarefasTab({
  tasks,
  projetos,
  socios,
  meId,
  cb,
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
  selectMode: boolean
  setSelectMode: (v: boolean) => void
  selectedIds: Set<number>
  onSelect: (id: number) => void
}) {
  const [q, setQ] = useState("")
  const [groupBy, setGroupBy] = useState<GroupBy>("projeto")
  const [sortBy, setSortBy] = useState<SortBy>("padrao")
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
  const needle = normalizar(q)
  if (needle) scoped = scoped.filter((t) => contemNormalizado(needle, t.titulo, t.notes))

  const fProj = typeof fProjetoId === "number" ? projetos.find((p) => p.id === fProjetoId) : null

  return (
    <PageFrame>
      <PageHeader title="Todas as tarefas" sub="De qualquer projeto — busque, agrupe, ordene e filtre" />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
          <Icon name="search" size={15} strokeWidth={1.85} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)", pointerEvents: "none" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar tarefas…"
            style={{ width: "100%", height: 32, padding: "0 11px 0 32px", borderRadius: 9, border: "1px solid var(--border-strong)", background: "var(--surface)", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "var(--font-sans)" }}
          />
          {q && (
            <button onClick={() => setQ("")} title="Limpar busca" style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: "var(--text-subtle)", padding: 4, lineHeight: 0 }}>
              <Icon name="x" size={14} strokeWidth={2} />
            </button>
          )}
        </div>
        <button
          onClick={() => setHideDone(!hideDone)}
          title={hideDone ? "Mostrar tarefas concluídas" : "Ocultar tarefas concluídas"}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 32, padding: "0 11px", borderRadius: 9, cursor: "pointer", border: `1px solid ${!hideDone ? "var(--accent)" : "var(--border-strong)"}`, background: !hideDone ? "var(--accent-soft)" : "var(--surface)", fontSize: 12, fontWeight: 500, color: !hideDone ? "var(--accent)" : "var(--text-muted)", whiteSpace: "nowrap", fontFamily: "var(--font-sans)" }}
        >
          <Icon name={hideDone ? "eyeOff" : "eye"} size={14} strokeWidth={1.85} />
          Concluídas
        </button>
        <button
          onClick={() => setSelectMode(!selectMode)}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 32, padding: "0 11px", borderRadius: 9, cursor: "pointer", border: `1px solid ${selectMode ? "var(--accent)" : "var(--border-strong)"}`, background: selectMode ? "var(--accent-soft)" : "var(--surface)", fontSize: 12, fontWeight: 500, color: selectMode ? "var(--accent)" : "var(--text-muted)", whiteSpace: "nowrap", fontFamily: "var(--font-sans)" }}
        >
          <Icon name="checkSquare" size={14} strokeWidth={1.85} />
          {selectMode ? "Selecionando" : "Selecionar"}
        </button>
        <div style={{ display: "flex", gap: 3, background: "var(--bg-soft)", borderRadius: 9, padding: 3, border: "1px solid var(--border)" }}>
          <button onClick={() => setOnlyMine(true)} style={segBtn(onlyMine)}>{meId != null && <AssigneeAvatar id={meId} size={16} title={false} />}Minhas</button>
          <button onClick={() => setOnlyMine(false)} style={segBtn(!onlyMine)}><Icon name="users" size={14} strokeWidth={1.85} />Equipe</button>
        </div>
        <Menu align="right" width={200} trigger={<FilterBtn icon="layoutGrid" label={`Agrupar: ${GROUP_OPTS.find((g) => g.id === groupBy)?.label}`} />}>
          {(close) => GROUP_OPTS.map((g) => <MenuItem key={g.id} icon={g.icon} label={g.label} active={groupBy === g.id} onClick={() => { setGroupBy(g.id); close() }} />)}
        </Menu>
        <Menu align="right" width={220} trigger={<FilterBtn active={sortBy !== "padrao"} icon="sliders">{`Ordenar: ${SORT_OPTS.find((s) => s.id === sortBy)?.label.replace(/ \(.*\)$/, "")}`}</FilterBtn>}>
          {(close) => SORT_OPTS.map((s) => <MenuItem key={s.id} icon={s.icon} label={s.label} active={sortBy === s.id} onClick={() => { setSortBy(s.id); close() }} />)}
        </Menu>
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

      <ListaView tasks={scoped} groupBy={groupBy} sortBy={sortBy} hideDone={hideDone} {...cb} selectable={selectMode} selectedIds={selectedIds} onSelect={onSelect} />
    </PageFrame>
  )
}
