"use client"

// Projetos & Tarefas — QUADRO POR SEÇÕES (estilo Todoist), escopado a UM projeto.
// Substitui, dentro do projeto, o kanban por status: as colunas são as SEÇÕES
// personalizadas do projeto + uma coluna "Sem seção". Arrastar um card grava
// `Tarefa.secaoId` (via onAssign); o status vira só o check de concluído. É um
// componente NOVO (não o QuadroView compartilhado) porque seção é por-projeto.
import { useState } from "react"
import type { TaskRow } from "@/lib/tarefas/types"
import type { ProjetoView, SecaoView } from "@/lib/projetos/types"
import { Icon } from "@/components/tarefas/tf-icons"
import { Menu, MenuItem } from "@/components/tarefas/tf-kit"
import { byTime } from "@/components/tarefas/tf-meta"
import { KanbanCard, type ViewCallbacks } from "@/components/tarefas/views"
import { COLOR_CHOICES } from "./pj-kit"

type ColId = number | null // number = seção; null = "Sem seção"

export interface SecoesBoardProps {
  proj: ProjetoView
  tasks: TaskRow[] // já filtradas ao projeto
  secoes: SecaoView[] // já ordenadas por `ordem`
  cb: ViewCallbacks
  canEdit: boolean
  onAssign: (id: number, secaoId: number | null) => void
  onAddSecao: (nome: string) => void
  onRenameSecao: (id: number, nome: string) => void
  onRecolorSecao: (id: number, cor: string | null) => void
  onDeleteSecao: (id: number) => void
  onReorderSecoes: (ids: number[]) => void
  onNewTaskInSection: (secaoId: number | null) => void
}

const COL_WIDTH = 288

function ColHeader({
  secao,
  count,
  canEdit,
  onRename,
  onRecolor,
  onDelete,
  onMove,
  first,
  last,
}: {
  secao: SecaoView
  count: number
  canEdit: boolean
  onRename: (nome: string) => void
  onRecolor: (cor: string | null) => void
  onDelete: () => void
  onMove: (dir: -1 | 1) => void
  first: boolean
  last: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(secao.nome)
  const commit = () => {
    setEditing(false)
    const t = name.trim()
    if (t && t !== secao.nome) onRename(t)
    else setName(secao.nome)
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 2px 10px" }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: secao.cor || "var(--text-muted)", flexShrink: 0 }} />
      {editing && canEdit ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") { setName(secao.nome); setEditing(false) }
          }}
          className="input"
          style={{ flex: 1, height: 26, fontSize: 12.5, fontWeight: 500, padding: "0 6px" }}
        />
      ) : (
        <span
          onClick={() => canEdit && setEditing(true)}
          title={canEdit ? "Clique para renomear" : undefined}
          style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: "var(--text)", cursor: canEdit ? "text" : "default", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {secao.nome}
        </span>
      )}
      <span style={{ fontSize: 12, color: "var(--text-subtle)", fontFeatureSettings: '"tnum"' }}>{count}</span>
      {canEdit && (
        <Menu align="right" width={188} trigger={
          <button className="btn btn-ghost" style={{ width: 26, height: 26, padding: 0 }} title="Opções da seção">
            <Icon name="moreHorizontal" size={15} />
          </button>
        }>
          {(close) => (
            <>
              <MenuItem icon="edit" label="Renomear" onClick={() => { setEditing(true); close() }} />
              <div style={{ padding: "6px 9px 4px", fontSize: 10.5, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Cor</div>
              <div style={{ display: "flex", gap: 6, padding: "0 9px 8px", flexWrap: "wrap" }}>
                <button onClick={() => { onRecolor(null); close() }} title="Sem cor" style={{ width: 20, height: 20, borderRadius: 6, background: "transparent", border: `1px solid ${secao.cor ? "var(--border-strong)" : "var(--text)"}`, cursor: "pointer" }} />
                {COLOR_CHOICES.map((c) => (
                  <button key={c} onClick={() => { onRecolor(c); close() }} style={{ width: 20, height: 20, borderRadius: 6, background: c, border: secao.cor === c ? "2px solid var(--text)" : "2px solid transparent", cursor: "pointer" }} />
                ))}
              </div>
              {!first && <MenuItem icon="chevronLeft" label="Mover para a esquerda" onClick={() => { onMove(-1); close() }} />}
              {!last && <MenuItem icon="chevronRight" label="Mover para a direita" onClick={() => { onMove(1); close() }} />}
              <div style={{ height: 1, background: "var(--border)", margin: "4px 6px" }} />
              <MenuItem icon="trash2" label="Excluir seção" onClick={() => { onDelete(); close() }} />
            </>
          )}
        </Menu>
      )}
    </div>
  )
}

function Column({
  colId,
  title,
  tasks,
  over,
  setOver,
  onDropCard,
  dragId,
  setDragId,
  onNewTask,
  canEdit,
  cb,
  header,
}: {
  colId: ColId
  title: string
  tasks: TaskRow[]
  over: ColId | "none"
  setOver: (v: ColId | "none") => void
  onDropCard: (id: number) => void
  dragId: number | null
  setDragId: (id: number | null) => void
  onNewTask: () => void
  canEdit: boolean
  cb: ViewCallbacks
  header: React.ReactNode
}) {
  const key = colId ?? "none"
  const isOver = (over === "none" ? "none" : over) === key
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(colId) }}
      onDragLeave={() => setOver("none")}
      onDrop={(e) => {
        e.preventDefault()
        const raw = e.dataTransfer.getData("text/plain")
        const id = raw ? Number(raw) : dragId
        if (id) onDropCard(id)
        setDragId(null)
        setOver("none")
      }}
      style={{
        width: COL_WIDTH,
        flexShrink: 0,
        background: isOver ? "var(--accent-soft)" : "var(--bg-soft)",
        border: `1px solid ${isOver ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 14,
        padding: 10,
        minHeight: 240,
        transition: "background .12s, border-color .12s",
      }}
      aria-label={title}
    >
      {header}
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {tasks.map((t) => (
          <KanbanCard
            key={t.id}
            task={t}
            dragging={dragId === t.id}
            onDragStart={setDragId}
            onDragEnd={() => { setDragId(null); setOver("none") }}
            {...cb}
          />
        ))}
        {!tasks.length && <div style={{ fontSize: 12, color: "var(--text-subtle)", textAlign: "center", padding: "14px 0" }}>Arraste tarefas aqui</div>}
      </div>
      {canEdit && (
        <button
          onClick={onNewTask}
          className="t2-add"
          style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, padding: "6px 4px", cursor: "pointer", color: "var(--text-subtle)", fontSize: 12.5, border: "none", background: "transparent", width: "100%", fontFamily: "var(--font-sans)" }}
        >
          <Icon name="plus" size={14} strokeWidth={2.2} style={{ color: "var(--accent)" }} />
          Adicionar tarefa
        </button>
      )}
    </div>
  )
}

function AddSecaoColumn({ onAdd }: { onAdd: (nome: string) => void }) {
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState("")
  const commit = () => {
    const t = nome.trim()
    if (t) onAdd(t)
    setNome("")
    setOpen(false)
  }
  return (
    <div style={{ width: COL_WIDTH, flexShrink: 0 }}>
      {open ? (
        <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 14, padding: 10 }}>
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit()
              if (e.key === "Escape") { setNome(""); setOpen(false) }
            }}
            placeholder="Nome da seção"
            className="input"
            style={{ width: "100%", height: 32, fontSize: 13 }}
          />
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "12px 12px", borderRadius: 14, border: "1px dashed var(--border-strong)", background: "transparent", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, fontWeight: 500, fontFamily: "var(--font-sans)" }}
        >
          <Icon name="plus" size={15} strokeWidth={2} />
          Adicionar seção
        </button>
      )}
    </div>
  )
}

export function SecoesBoard({
  tasks,
  secoes,
  cb,
  canEdit,
  onAssign,
  onAddSecao,
  onRenameSecao,
  onRecolorSecao,
  onDeleteSecao,
  onReorderSecoes,
  onNewTaskInSection,
}: SecoesBoardProps) {
  const [dragId, setDragId] = useState<number | null>(null)
  const [over, setOver] = useState<ColId | "none">("none")

  const move = (id: number, dir: -1 | 1) => {
    const ids = secoes.map((s) => s.id)
    const i = ids.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    onReorderSecoes(ids)
  }

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", overflowX: "auto", paddingBottom: 8 }}>
      {secoes.map((s, i) => (
        <Column
          key={s.id}
          colId={s.id}
          title={s.nome}
          tasks={tasks.filter((t) => t.secaoId === s.id).sort(byTime)}
          over={over}
          setOver={setOver}
          onDropCard={(id) => onAssign(id, s.id)}
          dragId={dragId}
          setDragId={setDragId}
          onNewTask={() => onNewTaskInSection(s.id)}
          canEdit={canEdit}
          cb={cb}
          header={
            <ColHeader
              secao={s}
              count={tasks.filter((t) => t.secaoId === s.id).length}
              canEdit={canEdit}
              onRename={(nome) => onRenameSecao(s.id, nome)}
              onRecolor={(cor) => onRecolorSecao(s.id, cor)}
              onDelete={() => onDeleteSecao(s.id)}
              onMove={(dir) => move(s.id, dir)}
              first={i === 0}
              last={i === secoes.length - 1}
            />
          }
        />
      ))}
      <Column
        colId={null}
        title="Sem seção"
        tasks={tasks.filter((t) => t.secaoId == null).sort(byTime)}
        over={over}
        setOver={setOver}
        onDropCard={(id) => onAssign(id, null)}
        dragId={dragId}
        setDragId={setDragId}
        onNewTask={() => onNewTaskInSection(null)}
        canEdit={canEdit}
        cb={cb}
        header={
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 2px 10px" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--text-subtle)", flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: "var(--text-muted)" }}>Sem seção</span>
            <span style={{ fontSize: 12, color: "var(--text-subtle)", fontFeatureSettings: '"tnum"' }}>{tasks.filter((t) => t.secaoId == null).length}</span>
          </div>
        }
      />
      {canEdit && <AddSecaoColumn onAdd={onAddSecao} />}
    </div>
  )
}
