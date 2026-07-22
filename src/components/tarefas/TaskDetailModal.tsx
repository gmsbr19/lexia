"use client"

// Tarefas v2 — modal de detalhe da tarefa em 2 colunas (Todoist-style, ported
// from the design's t2-detail.jsx): conteúdo à esquerda (título, descrição,
// subtarefas, DoR/DoD com geração real pela LexIA), propriedades à direita
// (projeto DINÂMICO, status, responsável, datas, prioridade, vínculo real com
// busca, recorrência, lembretes) + navegação anterior/próxima na lista visível.
import { useEffect, useRef, useState } from "react"
import {
  PRIO,
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
import { lexGlass } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"
import { Icon } from "./tf-icons"
import { useTarefasCtx } from "./TarefasContext"
import { AssigneeAvatar, IaBadge, LinkChip, Menu, MenuItem, PrazoChip, TaskCheck } from "./tf-kit"
import { InlineAdd } from "./t2-rows"
import { Comentarios } from "./Comentarios"

const subId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s${Math.random().toString(36).slice(2)}`

// ── right-column field ───────────────────────────────────────────────────────
function DetField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>{label}</div>
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{children}</div>
    </div>
  )
}

function DetPicker({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className="picker-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        minHeight: 28,
        padding: "2px 9px",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 500,
        color: muted ? "var(--text-subtle)" : "var(--text)",
      }}
    >
      {children}
    </span>
  )
}

// ── DoR/DoD box (geração real via /api/tarefas/criterios) ────────────────────
function T2Criteria({
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
    <div style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: items.length ? 9 : 0 }}>
        <span style={{ fontSize: 10.5, fontWeight: 500, color: accent, letterSpacing: "0.08em", textTransform: "uppercase" }}>{title}</span>
        <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>{sub}</span>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-ghost"
          onClick={onGenerate}
          disabled={loading}
          style={{ height: 24, fontSize: 11.5, padding: "0 8px", color: "var(--accent)", opacity: loading ? 0.6 : 1 }}
        >
          <Icon name="sparkles" size={11} strokeWidth={2} />
          {loading ? "Gerando…" : items.length ? "Refazer" : "Gerar com IA"}
        </button>
      </div>
      {items.map((c, i) => (
        <div key={i} className="crit-row" style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "3px 0" }}>
          <button
            onClick={() => onToggle(i)}
            style={{
              width: 15,
              height: 15,
              borderRadius: 4,
              marginTop: 2,
              flexShrink: 0,
              cursor: "pointer",
              padding: 0,
              border: c.done ? "none" : "1.5px solid var(--border-strong)",
              background: c.done ? accent : "transparent",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {c.done && <Icon name="check" size={10} strokeWidth={3} />}
          </button>
          <span style={{ flex: 1, fontSize: 12, lineHeight: 1.45, color: c.done ? "var(--text-subtle)" : "var(--text-muted)", textDecoration: c.done ? "line-through" : "none" }}>
            {c.text}
          </span>
          <button
            onClick={() => onRemove(i)}
            className="crit-x"
            style={{ border: "none", background: "transparent", color: "var(--text-subtle)", cursor: "pointer", padding: 2, opacity: 0, transition: "opacity .12s" }}
          >
            <Icon name="x" size={11} strokeWidth={2} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── vínculo picker (busca real sobre casos + clientes) ───────────────────────
function VinculoMenuBody({ onPick, close }: { onPick: (tipo: VinculoTipo, id: number) => void; close: () => void }) {
  const { casos, clientes } = useTarefasCtx()
  const [q, setQ] = useState("")
  const ql = q.trim().toLowerCase()
  const fc = (ql ? casos.filter((c) => c.nome.toLowerCase().includes(ql)) : casos).slice(0, 30)
  const fcl = (ql ? clientes.filter((c) => c.nome.toLowerCase().includes(ql)) : clientes).slice(0, 30)
  const groupLbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 9px 2px" }
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
      {fc.length > 0 && <div style={groupLbl}>Casos</div>}
      {fc.map((c) => (
        <MenuItem key={`c${c.id}`} icon="briefcase" label={c.nome} onClick={() => { onPick("caso", c.id); close() }} />
      ))}
      {fcl.length > 0 && <div style={{ ...groupLbl, paddingTop: 8 }}>Clientes</div>}
      {fcl.map((c) => (
        <MenuItem key={`cl${c.id}`} icon="user" label={c.nome} onClick={() => { onPick("cliente", c.id); close() }} />
      ))}
      {!fc.length && !fcl.length && <div style={{ fontSize: 12, color: "var(--text-subtle)", padding: "8px 9px" }}>Nenhum resultado</div>}
    </div>
  )
}

// ── modal ────────────────────────────────────────────────────────────────────
export function TaskDetailModal({
  task,
  ids,
  onNavigate,
  onClose,
  onChange,
  onDelete,
  onDuplicate,
}: {
  task: TaskRow
  ids: number[]
  onNavigate: (id: number) => void
  onClose: () => void
  onChange: (id: number, patch: Partial<TaskRow>) => void
  onDelete: (id: number) => void
  onDuplicate: (task: TaskRow) => void
}) {
  const { socios, member, projetoById, projetos, secoesDoProjeto } = useTarefasCtx()
  const [subInput, setSubInput] = useState("")
  const [showSubInput, setShowSubInput] = useState(false)
  const [gerando, setGerando] = useState<{ dor: boolean; dod: boolean }>({ dor: false, dod: false })
  const titleRef = useRef<HTMLTextAreaElement>(null)

  useModalGuard()
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])

  // auto-resize do título (1 linha por padrão, cresce com o conteúdo)
  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [task.titulo, task.id])

  const p = projetoById(task.projetoId)
  const secoes = secoesDoProjeto(task.projetoId)
  const secaoAtual = secoes.find((s) => s.id === task.secaoId) ?? null
  const prio = PRIO[task.prio as TaskPrio] ?? PRIO[4]
  const st = statusMeta(task.status)
  const subs = task.subtasks ?? []
  const subsDone = subs.filter((s) => s.done).length
  const patch = (o: Partial<TaskRow>) => onChange(task.id, o)
  const idx = ids.indexOf(task.id)

  const editCrit = (key: "dor" | "dod", fn: (arr: Criterio[]) => Criterio[]) => {
    const arr = fn(task[key] ?? [])
    patch(key === "dor" ? { dor: arr } : { dod: arr })
  }
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

  const addSub = () => {
    if (!subInput.trim()) return
    patch({ subtasks: [...subs, { id: subId(), title: subInput.trim(), done: false }] })
    setSubInput("")
  }
  const pickVinculo = (tipo: VinculoTipo, id: number) =>
    patch(tipo === "caso" ? { casoId: id, clienteId: null } : { clienteId: id, casoId: null })

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", padding: 28 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={lexGlass}
        style={{
          width: 920,
          maxWidth: "100%",
          height: "min(640px, 100%)",
          display: "flex",
          flexDirection: "column",
          borderRadius: 16,
          overflow: "hidden",
          ...glassElevation("0 40px 100px rgba(2,13,37,0.42), 0 12px 32px rgba(2,13,37,0.24)"),
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: p?.cor || "var(--text-subtle)" }} />
            {p?.nome ?? "Entrada"}
          </span>
          {task.ai && <IaBadge />}
          <div style={{ flex: 1 }} />
          <button
            className="btn btn-ghost"
            disabled={idx <= 0}
            onClick={() => onNavigate(ids[idx - 1])}
            style={{ width: 28, height: 28, padding: 0 }}
            title="Tarefa anterior"
          >
            <Icon name="chevronDown" size={15} style={{ transform: "rotate(180deg)" }} />
          </button>
          <button
            className="btn btn-ghost"
            disabled={idx < 0 || idx >= ids.length - 1}
            onClick={() => onNavigate(ids[idx + 1])}
            style={{ width: 28, height: 28, padding: 0 }}
            title="Próxima tarefa"
          >
            <Icon name="chevronDown" size={15} />
          </button>
          <Menu align="right" width={190} trigger={
            <button className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
              <Icon name="moreHorizontal" size={16} />
            </button>
          }>
            {(close) => (
              <>
                <MenuItem icon="copy" label="Duplicar" onClick={() => { onDuplicate(task); close() }} />
                <MenuItem icon="trash2" label="Excluir tarefa" onClick={() => { onDelete(task.id); onClose() }} />
              </>
            )}
          </Menu>
          <button onClick={onClose} className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* left: content */}
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ marginTop: 4 }}>
                <TaskCheck done={task.done} prio={task.prio} onToggle={() => patch({ done: !task.done })} size={21} />
              </div>
              <textarea
                ref={titleRef}
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
                  fontWeight: 600,
                  color: "var(--text)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.3,
                  overflow: "hidden",
                  textDecoration: task.done ? "line-through" : "none",
                }}
              />
            </div>
            <textarea
              value={task.notes ?? ""}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Descrição"
              rows={2}
              style={{
                border: "none",
                outline: "none",
                resize: "none",
                background: "transparent",
                margin: "4px 0 16px 33px",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-muted)",
                lineHeight: 1.55,
              }}
            />

            {/* subtarefas */}
            <div style={{ marginLeft: 33, marginBottom: 18 }}>
              {subs.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>Subtarefas</span>
                  <span style={{ fontSize: 12, color: "var(--text-subtle)", fontFeatureSettings: '"tnum"' }}>
                    {subsDone}/{subs.length}
                  </span>
                </div>
              )}
              {subs.map((s) => (
                <div key={s.id} className="crit-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                  <TaskCheck done={s.done} prio={task.prio} onToggle={() => patch({ subtasks: subs.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) })} size={15} />
                  <span style={{ flex: 1, fontSize: 13, color: s.done ? "var(--text-subtle)" : "var(--text)", textDecoration: s.done ? "line-through" : "none" }}>{s.title}</span>
                  <button
                    onClick={() => patch({ subtasks: subs.filter((x) => x.id !== s.id) })}
                    className="crit-x"
                    style={{ border: "none", background: "transparent", color: "var(--text-subtle)", cursor: "pointer", padding: 2, opacity: 0, transition: "opacity .12s" }}
                  >
                    <Icon name="x" size={12} strokeWidth={2} />
                  </button>
                </div>
              ))}
              {showSubInput ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
                  <Icon name="plus" size={14} style={{ color: "var(--text-subtle)" }} />
                  <input
                    autoFocus
                    value={subInput}
                    onChange={(e) => setSubInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addSub()
                      if (e.key === "Escape") setShowSubInput(false)
                    }}
                    placeholder="Nome da subtarefa"
                    style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--text)", fontFamily: "var(--font-sans)" }}
                  />
                </div>
              ) : (
                <InlineAdd label="Adicionar subtarefa" onClick={() => setShowSubInput(true)} />
              )}
            </div>

            {/* DoR / DoD */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginLeft: 33, marginBottom: 8 }}>
              <T2Criteria
                title="DoR"
                sub="pronto p/ começar"
                accent="var(--text-muted)"
                items={task.dor ?? []}
                loading={gerando.dor}
                onGenerate={() => genCrit("dor")}
                onToggle={(i) => editCrit("dor", (arr) => arr.map((c, j) => (j === i ? { ...c, done: !c.done } : c)))}
                onRemove={(i) => editCrit("dor", (arr) => arr.filter((_, j) => j !== i))}
              />
              <T2Criteria
                title="DoD"
                sub="pronto p/ entregar"
                accent="var(--ok)"
                items={task.dod ?? []}
                loading={gerando.dod}
                onGenerate={() => genCrit("dod")}
                onToggle={(i) => editCrit("dod", (arr) => arr.map((c, j) => (j === i ? { ...c, done: !c.done } : c)))}
                onRemove={(i) => editCrit("dod", (arr) => arr.filter((_, j) => j !== i))}
              />
            </div>

            <Comentarios key={task.id} taskId={task.id} />
          </div>

          {/* right: properties */}
          <div style={{ width: 288, flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--bg-soft)", overflowY: "auto", padding: "6px 18px 18px" }}>
            <DetField label="Projeto">
              <Menu width={220} trigger={
                <DetPicker>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: p?.cor || "var(--text-subtle)" }} />
                  {p?.nome ?? "Entrada"}
                  <Icon name="chevronDown" size={12} style={{ color: "var(--text-subtle)" }} />
                </DetPicker>
              }>
                {(close) => (
                  <>
                    <MenuItem dot="var(--text-subtle)" label="Entrada" active={task.projetoId == null} onClick={() => { patch({ projetoId: null, secaoId: null }); close() }} />
                    {projetos.filter((pr) => pr.status !== "arquivado").map((pr) => (
                      <MenuItem key={pr.id} dot={pr.cor || "var(--text-muted)"} label={pr.nome} active={task.projetoId === pr.id} onClick={() => { patch({ projetoId: pr.id, secaoId: null }); close() }} />
                    ))}
                  </>
                )}
              </Menu>
            </DetField>
            {task.projetoId != null && secoes.length > 0 && (
              <DetField label="Seção">
                <Menu width={220} trigger={
                  <DetPicker muted={secaoAtual == null}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: secaoAtual?.cor || "var(--text-subtle)" }} />
                    {secaoAtual?.nome ?? "Sem seção"}
                    <Icon name="chevronDown" size={12} style={{ color: "var(--text-subtle)" }} />
                  </DetPicker>
                }>
                  {(close) => (
                    <>
                      <MenuItem dot="var(--text-subtle)" label="Sem seção" active={task.secaoId == null} onClick={() => { patch({ secaoId: null }); close() }} />
                      {secoes.map((s) => (
                        <MenuItem key={s.id} dot={s.cor || "var(--text-muted)"} label={s.nome} active={task.secaoId === s.id} onClick={() => { patch({ secaoId: s.id }); close() }} />
                      ))}
                    </>
                  )}
                </Menu>
              </DetField>
            )}
            <DetField label="Status">
              <Menu width={180} trigger={
                <DetPicker>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: st.color }} />
                  {st.label}
                  <Icon name="chevronDown" size={12} style={{ color: "var(--text-subtle)" }} />
                </DetPicker>
              }>
                {(close) =>
                  STATUS.map((s) => (
                    <MenuItem key={s.id} dot={s.color} label={s.label} active={task.status === s.id} onClick={() => { patch({ status: s.id }); close() }} />
                  ))
                }
              </Menu>
            </DetField>
            <DetField label="Responsável">
              <Menu width={220} trigger={
                <DetPicker muted={task.responsavelId == null}>
                  {task.responsavelId != null ? (
                    <>
                      <AssigneeAvatar id={task.responsavelId} size={19} title={false} />
                      {member(task.responsavelId)?.nome}
                    </>
                  ) : (
                    "Atribuir"
                  )}
                  <Icon name="chevronDown" size={12} style={{ color: "var(--text-subtle)" }} />
                </DetPicker>
              }>
                {(close) => (
                  <>
                    <MenuItem label="Não atribuída" active={task.responsavelId == null} onClick={() => { patch({ responsavelId: null }); close() }} />
                    {socios.map((m) => (
                      <MenuItem key={m.id} label={m.nome} sub={m.role} active={task.responsavelId === m.id} right={<AssigneeAvatar id={m.id} size={18} title={false} />} onClick={() => { patch({ responsavelId: m.id }); close() }} />
                    ))}
                  </>
                )}
              </Menu>
            </DetField>
            <DetField label="Data · quando fazer">
              <input type="date" className="dt-input" value={task.data ?? ""} onChange={(e) => patch({ data: e.target.value || null })} />
              <input type="time" className="dt-input" value={task.hora ?? ""} onChange={(e) => patch({ hora: e.target.value || null })} style={{ width: 88 }} />
            </DetField>
            <DetField label="Prazo · limite">
              <input type="date" className="dt-input" value={task.prazo ?? ""} onChange={(e) => patch({ prazo: e.target.value || null })} />
              <PrazoChip prazo={task.prazo} done={task.done} compact />
            </DetField>
            <DetField label="Prioridade">
              <Menu width={170} trigger={
                <DetPicker>
                  <Icon name="flag" size={13} strokeWidth={2} style={{ color: task.prio < 4 ? prio.color : "var(--text-subtle)" }} />
                  {prio.short} · {prio.label}
                  <Icon name="chevronDown" size={12} style={{ color: "var(--text-subtle)" }} />
                </DetPicker>
              }>
                {(close) =>
                  ([1, 2, 3, 4] as TaskPrio[]).map((n) => (
                    <MenuItem key={n} dot={PRIO[n].color} label={`${PRIO[n].short} · ${PRIO[n].label}`} active={task.prio === n} onClick={() => { patch({ prio: n }); close() }} />
                  ))
                }
              </Menu>
            </DetField>
            <DetField label="Vínculo">
              {task.vinculo ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <LinkChip vinculo={task.vinculo} />
                  <button onClick={() => patch({ casoId: null, clienteId: null })} className="btn btn-ghost" style={{ width: 22, height: 22, padding: 0 }}>
                    <Icon name="x" size={11} />
                  </button>
                </span>
              ) : (
                <Menu width={260} trigger={
                  <DetPicker muted>
                    <Icon name="plus" size={12} />
                    Caso / cliente
                  </DetPicker>
                }>
                  {(close) => <VinculoMenuBody onPick={pickVinculo} close={close} />}
                </Menu>
              )}
            </DetField>
            <DetField label="Recorrência">
              <Menu width={180} trigger={
                <DetPicker muted={!task.recur}>
                  <Icon name="repeat" size={12} strokeWidth={1.9} />
                  {task.recur || "Não repete"}
                  <Icon name="chevronDown" size={12} style={{ color: "var(--text-subtle)" }} />
                </DetPicker>
              }>
                {(close) =>
                  RECUR_OPTS.map((r) => (
                    <MenuItem key={r} label={r} active={(task.recur || "Não repete") === r} onClick={() => { patch({ recur: r === "Não repete" ? null : r }); close() }} />
                  ))
                }
              </Menu>
            </DetField>
            <DetField label="Lembretes">
              <Menu width={180} trigger={
                <DetPicker muted={!task.reminder}>
                  <Icon name="bell" size={12} strokeWidth={1.9} />
                  {task.reminder || "Sem lembrete"}
                  <Icon name="chevronDown" size={12} style={{ color: "var(--text-subtle)" }} />
                </DetPicker>
              }>
                {(close) =>
                  REMINDER_OPTS.map((r) => (
                    <MenuItem key={r} label={r} active={(task.reminder || "Sem lembrete") === r} onClick={() => { patch({ reminder: r === "Sem lembrete" ? null : r }); close() }} />
                  ))
                }
              </Menu>
            </DetField>
          </div>
        </div>
      </div>
    </div>
  )
}
