"use client"

// Tarefas — central task modal (ported from the design's task-modal.jsx).
// Distinct "Data (quando fazer)" vs "Prazo (limite)", subtarefas, recorrência,
// lembrete, vínculo (real caso/cliente), e DoR/DoD. The DoR/DoD "Gerar" button
// seeds the static suggestions in Phase A (Phase B swaps it for a Claude call).
import { useEffect, useState, type ReactNode } from "react"
import {
  PRIO,
  PROJECTS,
  RECUR_OPTS,
  REMINDER_OPTS,
  STATUS,
  statusMeta,
  type Criterio,
  type TaskPrio,
  type TaskRow,
  type VinculoTipo,
} from "@/lib/tarefas/types"
import { apiSend } from "@/lib/client/api"
import { useModalGuard } from "@/lib/client/modal-guard"
import { toast } from "@/lib/client/toast"
import { Icon } from "./tf-icons"
import { useTarefasCtx } from "./TarefasContext"
import { AssigneeAvatar, IaBadge, LinkChip, Menu, MenuItem, PrazoChip, TaskCheck } from "./tf-kit"

const subId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s${Math.random().toString(36).slice(2)}`

function FieldRow({ icon, label, children }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 34 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: 132, flexShrink: 0, color: "var(--text-muted)" }}>
        <Icon name={icon} size={15} strokeWidth={1.8} />
        <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{children}</div>
    </div>
  )
}

function PickerButton({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <span
      className="picker-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        height: 30,
        padding: "0 10px",
        borderRadius: 8,
        border: "1px solid var(--border-strong)",
        background: "var(--surface)",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        color: muted ? "var(--text-subtle)" : "var(--text)",
      }}
    >
      {children}
    </span>
  )
}

function CriteriaList({
  title,
  sub,
  items,
  accent,
  loading,
  onToggle,
  onGenerate,
  onRemove,
}: {
  title: string
  sub: string
  items: Criterio[]
  accent: string
  loading: boolean
  onToggle: (i: number) => void
  onGenerate: () => void
  onRemove: (i: number) => void
}) {
  return (
    <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10, padding: "13px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: items.length ? 10 : 0 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: accent, letterSpacing: "0.08em", textTransform: "uppercase" }}>{title}</span>
        <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>{sub}</span>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-ghost"
          onClick={onGenerate}
          disabled={loading}
          title="Gerar critérios com a LexIA"
          style={{ height: 26, fontSize: 12, padding: "0 9px", color: "var(--accent)", opacity: loading ? 0.6 : 1 }}
        >
          <Icon name="sparkles" size={12} strokeWidth={2} />
          {loading ? "Gerando…" : items.length ? "Refazer" : "Gerar"}
        </button>
      </div>
      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {items.map((c, i) => (
            <div key={i} className="crit-row" style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
              <button
                onClick={() => onToggle(i)}
                style={{
                  width: 17,
                  height: 17,
                  borderRadius: 6,
                  marginTop: 1,
                  flexShrink: 0,
                  cursor: "pointer",
                  padding: 0,
                  border: c.done ? "none" : "1.6px solid var(--border-strong)",
                  background: c.done ? accent : "transparent",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {c.done && <Icon name="check" size={11} strokeWidth={3} />}
              </button>
              <span style={{ flex: 1, fontSize: 12, lineHeight: 1.45, color: c.done ? "var(--text-subtle)" : "var(--text-muted)", textDecoration: c.done ? "line-through" : "none" }}>
                {c.text}
              </span>
              <button
                onClick={() => onRemove(i)}
                className="crit-x"
                style={{ border: "none", background: "transparent", color: "var(--text-subtle)", cursor: "pointer", padding: 2, opacity: 0, transition: "opacity .12s" }}
              >
                <Icon name="x" size={12} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Searchable vínculo picker over the real casos + clientes.
function VinculoPicker({ onPick }: { onPick: (tipo: VinculoTipo, id: number) => void }) {
  const { casos, clientes } = useTarefasCtx()
  return (
    <Menu
      width={260}
      trigger={
        <PickerButton muted>
          <Icon name="plus" size={13} />
          Vincular caso / cliente
        </PickerButton>
      }
    >
      {(close) => <VinculoMenuBody casos={casos} clientes={clientes} onPick={onPick} close={close} />}
    </Menu>
  )
}

function VinculoMenuBody({
  casos,
  clientes,
  onPick,
  close,
}: {
  casos: { id: number; nome: string }[]
  clientes: { id: number; nome: string }[]
  onPick: (tipo: VinculoTipo, id: number) => void
  close: () => void
}) {
  const [q, setQ] = useState("")
  const ql = q.trim().toLowerCase()
  const fc = (ql ? casos.filter((c) => c.nome.toLowerCase().includes(ql)) : casos).slice(0, 30)
  const fcl = (ql ? clientes.filter((c) => c.nome.toLowerCase().includes(ql)) : clientes).slice(0, 30)
  return (
    <div>
      <input
        className="input"
        autoFocus
        placeholder="Buscar caso ou cliente…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ height: 30, fontSize: 12, marginBottom: 6 }}
      />
      {fc.length > 0 && <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 9px 2px" }}>Casos</div>}
      {fc.map((c) => (
        <MenuItem key={`c${c.id}`} icon="briefcase" label={c.nome} onClick={() => { onPick("caso", c.id); close() }} />
      ))}
      {fcl.length > 0 && <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 9px 2px" }}>Clientes</div>}
      {fcl.map((c) => (
        <MenuItem key={`cl${c.id}`} icon="user" label={c.nome} onClick={() => { onPick("cliente", c.id); close() }} />
      ))}
      {!fc.length && !fcl.length && <div style={{ fontSize: 12, color: "var(--text-subtle)", padding: "8px 9px" }}>Nenhum resultado</div>}
    </div>
  )
}

export function TaskModal({
  task,
  onClose,
  onChange,
  onDelete,
}: {
  task: TaskRow
  onClose: () => void
  onChange: (id: number, patch: Partial<TaskRow>) => void
  onDelete: (id: number) => void
}) {
  const { member, project, socios } = useTarefasCtx()
  const [subInput, setSubInput] = useState("")
  const [gerando, setGerando] = useState<{ dor: boolean; dod: boolean }>({ dor: false, dod: false })

  useModalGuard()
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])

  const p = PRIO[task.prio as TaskPrio] ?? PRIO[4]
  const st = statusMeta(task.status)
  const subs = task.subtasks ?? []
  const subsDone = subs.filter((s) => s.done).length

  const patch = (o: Partial<TaskRow>) => onChange(task.id, o)
  const toggleSub = (sid: string) => patch({ subtasks: subs.map((s) => (s.id === sid ? { ...s, done: !s.done } : s)) })
  const removeSub = (sid: string) => patch({ subtasks: subs.filter((s) => s.id !== sid) })
  const addSub = () => {
    if (!subInput.trim()) return
    patch({ subtasks: [...subs, { id: subId(), title: subInput.trim(), done: false }] })
    setSubInput("")
  }

  const editCrit = (key: "dor" | "dod", fn: (arr: Criterio[]) => Criterio[]) => {
    const arr = fn(task[key] ?? [])
    patch(key === "dor" ? { dor: arr } : { dod: arr })
  }
  // Generate DoR/DoD with the LexIA endpoint, tailored to this task's context.
  const genCrit = async (key: "dor" | "dod") => {
    if (gerando[key]) return
    if (!task.titulo.trim()) {
      toast("Dê um título à tarefa antes de gerar os critérios", { kind: "error" })
      return
    }
    setGerando((g) => ({ ...g, [key]: true }))
    try {
      const res = await apiSend<{ dor: string[]; dod: string[] }>("/api/tarefas/criterios", "POST", {
        titulo: task.titulo,
        projeto: task.projeto,
        notes: task.notes,
        prazo: task.prazo,
        vinculo: task.vinculo ? { tipo: task.vinculo.tipo, nome: task.vinculo.nome } : null,
        tipo: key,
      })
      const arr: Criterio[] = (key === "dor" ? res.dor : res.dod).map((text) => ({ text, done: false }))
      if (arr.length) patch(key === "dor" ? { dor: arr } : { dod: arr })
    } catch {
      /* apiSend already surfaced a toast */
    } finally {
      setGerando((g) => ({ ...g, [key]: false }))
    }
  }

  const pickVinculo = (tipo: VinculoTipo, id: number) =>
    patch(tipo === "caso" ? { casoId: id, clienteId: null } : { clienteId: id, casoId: null })

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 720, maxWidth: "100%", maxHeight: "100%", display: "flex", flexDirection: "column", borderRadius: 14, overflow: "hidden",
          background: "var(--lex-acrylic)", backdropFilter: "var(--lex-blur)", WebkitBackdropFilter: "var(--lex-blur)",
          border: "1px solid var(--lex-acrylic-border)",
          boxShadow: "0 40px 100px rgba(2,13,37,0.42), 0 12px 32px rgba(2,13,37,0.24), inset 0 1px 0 rgba(255,255,255,0.16)",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderBottom: "1px solid var(--border)" }}>
          <Menu
            width={150}
            trigger={
              <PickerButton>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.color }} />
                {st.label}
                <Icon name="chevronDown" size={13} />
              </PickerButton>
            }
          >
            {(close) =>
              STATUS.map((s) => (
                <MenuItem key={s.id} dot={s.color} label={s.label} active={task.status === s.id} onClick={() => { patch({ status: s.id }); close() }} />
              ))
            }
          </Menu>
          {task.ai && <IaBadge />}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0 }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "18px 22px 22px" }}>
          {/* title */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
            <div style={{ marginTop: 3 }}>
              <TaskCheck done={task.done} prio={task.prio} onToggle={() => patch({ done: !task.done })} size={22} />
            </div>
            <textarea
              value={task.titulo}
              onChange={(e) => patch({ titulo: e.target.value })}
              rows={1}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                resize: "none",
                background: "transparent",
                fontFamily: "var(--font-sans)",
                fontSize: 20,
                fontWeight: 500,
                color: "var(--text)",
                letterSpacing: "-0.02em",
                lineHeight: 1.3,
                textDecoration: task.done ? "line-through" : "none",
              }}
            />
          </div>

          {/* meta grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 18 }}>
            <FieldRow icon="calendar" label="Data">
              <input type="date" value={task.data ?? ""} onChange={(e) => patch({ data: e.target.value || null })} className="dt-input" />
              <input type="time" value={task.hora ?? ""} onChange={(e) => patch({ hora: e.target.value || null })} className="dt-input" style={{ width: 96 }} />
              <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>quando você vai fazer</span>
            </FieldRow>
            <FieldRow icon="flag" label="Prazo">
              <input type="date" value={task.prazo ?? ""} onChange={(e) => patch({ prazo: e.target.value || null })} className="dt-input" />
              <PrazoChip prazo={task.prazo} done={task.done} />
              {!task.prazo && <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>limite máximo (deadline)</span>}
            </FieldRow>
            <FieldRow icon="flag" label="Prioridade">
              <Menu
                width={150}
                trigger={
                  <PickerButton>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
                    {p.label}
                    <Icon name="chevronDown" size={13} />
                  </PickerButton>
                }
              >
                {(close) =>
                  ([1, 2, 3, 4] as TaskPrio[]).map((n) => (
                    <MenuItem key={n} dot={PRIO[n].color} label={`${PRIO[n].short} · ${PRIO[n].label}`} active={task.prio === n} onClick={() => { patch({ prio: n }); close() }} />
                  ))
                }
              </Menu>
            </FieldRow>
            <FieldRow icon="inbox" label="Projeto">
              <Menu
                width={220}
                trigger={
                  <PickerButton>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: project(task.projeto).color }} />
                    {project(task.projeto).name}
                    <Icon name="chevronDown" size={13} />
                  </PickerButton>
                }
              >
                {(close) =>
                  PROJECTS.map((pr) => (
                    <MenuItem key={pr.id} dot={pr.color} label={pr.name} active={task.projeto === pr.id} onClick={() => { patch({ projeto: pr.id }); close() }} />
                  ))
                }
              </Menu>
            </FieldRow>
            <FieldRow icon="user" label="Responsável">
              <Menu
                width={220}
                trigger={
                  <PickerButton>
                    {task.responsavelId != null ? (
                      <>
                        <AssigneeAvatar id={task.responsavelId} size={18} title={false} />
                        {member(task.responsavelId)?.nome}
                      </>
                    ) : (
                      <span style={{ color: "var(--text-subtle)" }}>Não atribuída</span>
                    )}
                    <Icon name="chevronDown" size={13} />
                  </PickerButton>
                }
              >
                {(close) => (
                  <>
                    <MenuItem label="Não atribuída" active={task.responsavelId == null} onClick={() => { patch({ responsavelId: null }); close() }} />
                    {socios.map((m) => (
                      <MenuItem
                        key={m.id}
                        label={m.nome}
                        sub={m.role}
                        active={task.responsavelId === m.id}
                        onClick={() => { patch({ responsavelId: m.id }); close() }}
                        right={<AssigneeAvatar id={m.id} size={18} title={false} />}
                      />
                    ))}
                  </>
                )}
              </Menu>
            </FieldRow>
            <FieldRow icon="link2" label="Vínculo">
              {task.vinculo ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <LinkChip vinculo={task.vinculo} />
                  <button onClick={() => patch({ casoId: null, clienteId: null })} className="btn btn-ghost" style={{ width: 24, height: 24, padding: 0 }}>
                    <Icon name="x" size={12} />
                  </button>
                </span>
              ) : (
                <VinculoPicker onPick={pickVinculo} />
              )}
            </FieldRow>
            <FieldRow icon="repeat" label="Recorrência">
              <Menu
                width={180}
                trigger={
                  <PickerButton muted={!task.recur}>
                    {task.recur || "Não repete"}
                    <Icon name="chevronDown" size={13} />
                  </PickerButton>
                }
              >
                {(close) =>
                  RECUR_OPTS.map((r) => (
                    <MenuItem key={r} label={r} active={(task.recur || "Não repete") === r} onClick={() => { patch({ recur: r === "Não repete" ? null : r }); close() }} />
                  ))
                }
              </Menu>
              {task.recur && <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>(lembrete visual — não gera série)</span>}
            </FieldRow>
            <FieldRow icon="bell" label="Lembrete">
              <Menu
                width={180}
                trigger={
                  <PickerButton muted={!task.reminder}>
                    {task.reminder || "Sem lembrete"}
                    <Icon name="chevronDown" size={13} />
                  </PickerButton>
                }
              >
                {(close) =>
                  REMINDER_OPTS.map((r) => (
                    <MenuItem key={r} label={r} active={(task.reminder || "Sem lembrete") === r} onClick={() => { patch({ reminder: r === "Sem lembrete" ? null : r }); close() }} />
                  ))
                }
              </Menu>
            </FieldRow>
          </div>

          {/* subtasks */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Icon name="listChecks" size={15} strokeWidth={1.9} style={{ color: "var(--text-muted)" }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>Subtarefas</span>
              {subs.length > 0 && <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{subsDone}/{subs.length}</span>}
            </div>
            {subs.length > 0 && (
              <div style={{ height: 4, borderRadius: 999, background: "var(--bg-sunken)", marginBottom: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(subsDone / subs.length) * 100}%`, background: "var(--fin-pos, #2E9E5B)", transition: "width .3s" }} />
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {subs.map((s) => (
                <div key={s.id} className="crit-row" style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 0" }}>
                  <TaskCheck done={s.done} prio={task.prio} onToggle={() => toggleSub(s.id)} size={16} />
                  <span style={{ flex: 1, fontSize: 13, color: s.done ? "var(--text-subtle)" : "var(--text)", textDecoration: s.done ? "line-through" : "none" }}>{s.title}</span>
                  <button onClick={() => removeSub(s.id)} className="crit-x" style={{ border: "none", background: "transparent", color: "var(--text-subtle)", cursor: "pointer", padding: 2, opacity: 0, transition: "opacity .12s" }}>
                    <Icon name="x" size={13} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <Icon name="plus" size={14} style={{ color: "var(--text-subtle)" }} />
              <input
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addSub()
                }}
                placeholder="Adicionar subtarefa"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--text)" }}
              />
            </div>
          </div>

          {/* DoR / DoD */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
            <CriteriaList
              title="DoR"
              sub="pronto para começar"
              accent="var(--text-muted)"
              items={task.dor ?? []}
              loading={gerando.dor}
              onGenerate={() => genCrit("dor")}
              onToggle={(i) => editCrit("dor", (arr) => arr.map((c, j) => (j === i ? { ...c, done: !c.done } : c)))}
              onRemove={(i) => editCrit("dor", (arr) => arr.filter((_, j) => j !== i))}
            />
            <CriteriaList
              title="DoD"
              sub="pronto para entregar"
              accent="var(--ok)"
              items={task.dod ?? []}
              loading={gerando.dod}
              onGenerate={() => genCrit("dod")}
              onToggle={(i) => editCrit("dod", (arr) => arr.map((c, j) => (j === i ? { ...c, done: !c.done } : c)))}
              onRemove={(i) => editCrit("dod", (arr) => arr.filter((_, j) => j !== i))}
            />
          </div>

          {/* notes */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Icon name="fileText" size={15} strokeWidth={1.9} style={{ color: "var(--text-muted)" }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>Descrição</span>
            </div>
            <textarea
              className="textarea"
              value={task.notes ?? ""}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Detalhes, instruções, links…"
              style={{ minHeight: 64, fontSize: 13, lineHeight: 1.5 }}
            />
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--bg-soft)" }}>
          <button onClick={() => { onDelete(task.id); onClose() }} className="btn btn-ghost" style={{ height: 32, fontSize: 12, color: "var(--fin-neg)" }}>
            <Icon name="trash2" size={14} strokeWidth={1.9} />
            Excluir
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} className="btn btn-primary" style={{ height: 32, fontSize: 12 }}>
            Concluir edição
          </button>
        </div>
      </div>
    </div>
  )
}
