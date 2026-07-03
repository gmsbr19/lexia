"use client"

// Tarefas v2 — quick-add modal (Todoist-style): título com parsing de linguagem
// natural + highlight inline dos tokens (técnica do espelho), chips de
// data/prazo/responsável/prioridade/lembrete e seletor de projeto DINÂMICO.
// Ported from the design's t2-modals.jsx; superfície = vidro compartilhado.
import { useEffect, useRef, useState } from "react"
import { PRIO, REMINDER_OPTS, type TaskPrio } from "@/lib/tarefas/types"
import { useModalGuard } from "@/lib/client/modal-guard"
import { lexGlass } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"
import { Icon, type TfIconName } from "./tf-icons"
import { useTarefasCtx } from "./TarefasContext"
import { QUICKADD_TOKEN_RE, TODAY, dataLabel, isQuickAddToken, parseQuickAdd, tRel } from "./tf-meta"
import { AssigneeAvatar, Menu, MenuItem } from "./tf-kit"

/** Payload de criação usado pelo quick-add, pelo Ramble e pelos inline-adds. */
export interface NovaTarefa {
  titulo: string
  notes: string | null
  data: string | null
  hora: string | null
  prazo: string | null
  prio: TaskPrio
  responsavelId: number | null
  projetoId: number | null
  reminder: string | null
}

// ── chip button ──────────────────────────────────────────────────────────────
function QChip({
  icon,
  label,
  color,
  active,
  onClear,
  children,
}: {
  icon?: TfIconName
  label?: string
  color?: string
  active?: boolean
  onClear?: (() => void) | null
  children?: React.ReactNode
}) {
  return (
    <span
      className="picker-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 30,
        padding: "0 10px",
        borderRadius: 8,
        border: `1px solid ${active ? "var(--border-gold)" : "var(--border-strong)"}`,
        background: active ? "var(--accent-soft)" : "transparent",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        color: color || (active ? "var(--accent)" : "var(--text-muted)"),
        whiteSpace: "nowrap",
      }}
    >
      {icon && <Icon name={icon} size={13.5} strokeWidth={1.9} />}
      {children || label}
      {onClear && (
        <span
          // stopPropagation: limpar sem abrir o menu do chip
          onClick={(e) => {
            e.stopPropagation()
            onClear()
          }}
          style={{ display: "inline-flex", cursor: "pointer", lineHeight: 0 }}
        >
          <Icon name="x" size={12} />
        </span>
      )}
    </span>
  )
}

// ── title input with inline token highlighting (mirror technique) ────────────
function HighlightInput({
  value,
  onChange,
  onEnter,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  onEnter: () => void
  placeholder: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  const font: React.CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontSize: 17,
    fontWeight: 500,
    letterSpacing: "-0.015em",
    lineHeight: "26px",
  }
  const parts = value.split(QUICKADD_TOKEN_RE)
  return (
    <div style={{ position: "relative" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", whiteSpace: "pre", overflow: "hidden", color: "var(--text)", ...font }}>
        {parts.map((p, i) =>
          isQuickAddToken(p) ? (
            <span key={i} style={{ background: "var(--accent-soft)", color: "var(--accent)", borderRadius: 4, boxShadow: "0 0 0 2px var(--accent-soft)" }}>
              {p}
            </span>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
      </div>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter()
        }}
        placeholder={placeholder}
        style={{
          position: "relative",
          width: "100%",
          border: "none",
          outline: "none",
          background: "transparent",
          color: "transparent",
          caretColor: "var(--text)",
          padding: 0,
          ...font,
        }}
      />
    </div>
  )
}

// ── quick-add modal ──────────────────────────────────────────────────────────
export function QuickAddModal({
  presetDate,
  presetProject,
  onClose,
  onAdd,
  onRamble,
}: {
  presetDate: string | null
  presetProject: number | null
  onClose: () => void
  onAdd: (t: NovaTarefa) => void
  onRamble: () => void
}) {
  const { socios, projetos, meId, member, projetoById } = useTarefasCtx()
  const [raw, setRaw] = useState("")
  const [desc, setDesc] = useState("")
  const [ov, setOv] = useState<{
    data: string | null
    prazo: string | null
    assignee: number | null
    prio: TaskPrio | null
    projetoId: number | null
    reminder: string | null
  }>({ data: presetDate, prazo: null, assignee: meId, prio: null, projetoId: presetProject, reminder: null })

  useModalGuard()
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])

  const ativos = projetos.filter((p) => p.status !== "arquivado")
  const parsed = raw.trim() ? parseQuickAdd(raw, { socios, projetos: ativos }) : null
  const eff: NovaTarefa = {
    titulo: parsed?.titulo ?? "",
    notes: desc.trim() || null,
    data: parsed?.data || ov.data,
    hora: parsed?.hora || null,
    prazo: ov.prazo,
    responsavelId: parsed?.responsavelId ?? ov.assignee,
    prio: (parsed?.prio || ov.prio || 4) as TaskPrio,
    projetoId: parsed?.projetoId ?? ov.projetoId,
    reminder: ov.reminder,
  }
  const canAdd = !!eff.titulo
  const submit = () => {
    if (!canAdd) return
    onAdd(eff)
    onClose()
  }
  const set = <K extends keyof typeof ov>(k: K, v: (typeof ov)[K]) => setOv((o) => ({ ...o, [k]: v }))
  const projMeta = projetoById(eff.projetoId)

  return (
    <div
      onClick={onClose}
      className="overlay-scrim"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        background: "var(--overlay)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "14vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`overlay-panel ${lexGlass}`}
        style={{
          width: 580,
          maxWidth: "calc(100% - 48px)",
          borderRadius: 14,
          overflow: "visible",
          ...glassElevation("0 24px 60px rgba(2,13,37,0.28)"),
        }}
      >
        <div style={{ padding: "16px 18px 4px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <HighlightInput value={raw} onChange={setRaw} onEnter={submit} placeholder="Protocolar recurso amanhã 14h #projeto @responsável !alta" />
            </div>
            <button
              onClick={onRamble}
              title="Ditar (Ramble)"
              className="btn btn-ghost"
              style={{ width: 30, height: 30, padding: 0, color: "var(--accent)", flexShrink: 0 }}
            >
              <Icon name="mic" size={16} strokeWidth={1.9} />
            </button>
          </div>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Descrição"
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--text-muted)",
              fontSize: 13,
              marginTop: 6,
              padding: 0,
              fontFamily: "var(--font-sans)",
            }}
          />
        </div>

        {/* chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", padding: "12px 18px 14px" }}>
          <Menu width={200} trigger={
            <QChip
              icon="calendar"
              active={!!eff.data}
              label={eff.data ? `${dataLabel(eff.data)}${eff.hora ? " " + eff.hora : ""}` : "Data"}
              onClear={eff.data && !parsed?.data ? () => set("data", null) : null}
            />
          }>
            {(close) => (
              <>
                <MenuItem icon="sun" label="Hoje" onClick={() => { set("data", TODAY()); close() }} />
                <MenuItem icon="sunrise" label="Amanhã" onClick={() => { set("data", tRel(1)); close() }} />
                <MenuItem icon="calendarRange" label="Próxima semana" onClick={() => { set("data", tRel(7)); close() }} />
                <MenuItem icon="x" label="Sem data" onClick={() => { set("data", null); close() }} />
              </>
            )}
          </Menu>
          <Menu width={200} trigger={
            <QChip icon="target" active={!!eff.prazo} label={eff.prazo ? `Prazo ${dataLabel(eff.prazo)}` : "Prazo"} onClear={eff.prazo ? () => set("prazo", null) : null} />
          }>
            {(close) => (
              <>
                <MenuItem icon="sun" label="Hoje" onClick={() => { set("prazo", TODAY()); close() }} />
                <MenuItem icon="sunrise" label="Amanhã" onClick={() => { set("prazo", tRel(1)); close() }} />
                <MenuItem icon="calendarRange" label="Em 3 dias" onClick={() => { set("prazo", tRel(3)); close() }} />
                <MenuItem icon="calendarRange" label="Em 1 semana" onClick={() => { set("prazo", tRel(7)); close() }} />
                <MenuItem icon="x" label="Sem prazo" onClick={() => { set("prazo", null); close() }} />
              </>
            )}
          </Menu>
          <Menu width={210} trigger={
            <QChip active={eff.responsavelId != null} onClear={eff.responsavelId != null && parsed?.responsavelId == null ? () => set("assignee", null) : null}>
              {eff.responsavelId != null ? (
                <>
                  <AssigneeAvatar id={eff.responsavelId} size={16} title={false} />
                  {member(eff.responsavelId)?.first}
                </>
              ) : (
                <>
                  <Icon name="user" size={13.5} strokeWidth={1.9} />
                  Responsável
                </>
              )}
            </QChip>
          }>
            {(close) =>
              socios.map((m) => (
                <MenuItem
                  key={m.id}
                  label={m.nome}
                  sub={m.role}
                  active={eff.responsavelId === m.id}
                  right={<AssigneeAvatar id={m.id} size={18} title={false} />}
                  onClick={() => { set("assignee", m.id); close() }}
                />
              ))
            }
          </Menu>
          <Menu width={170} trigger={
            <QChip icon="flag" active={eff.prio < 4} color={eff.prio < 4 ? PRIO[eff.prio].color : undefined} label={eff.prio < 4 ? PRIO[eff.prio].label : "Prioridade"} />
          }>
            {(close) =>
              ([1, 2, 3, 4] as TaskPrio[]).map((n) => (
                <MenuItem key={n} dot={PRIO[n].color} label={`${PRIO[n].short} · ${PRIO[n].label}`} active={eff.prio === n} onClick={() => { set("prio", n); close() }} />
              ))
            }
          </Menu>
          <Menu width={190} trigger={<QChip icon="bell" active={!!eff.reminder} label={eff.reminder || "Lembretes"} />}>
            {(close) =>
              REMINDER_OPTS.map((r) => (
                <MenuItem key={r} label={r} active={(eff.reminder || "Sem lembrete") === r} onClick={() => { set("reminder", r === "Sem lembrete" ? null : r); close() }} />
              ))
            }
          </Menu>
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", borderTop: "1px solid var(--border)" }}>
          <Menu width={230} trigger={
            <span
              className="picker-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 30, padding: "0 9px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}
            >
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: projMeta?.cor || "var(--text-subtle)" }} />
              {projMeta?.nome ?? "Entrada"}
              <Icon name="chevronDown" size={12} />
            </span>
          }>
            {(close) => (
              <>
                <MenuItem dot="var(--text-subtle)" label="Entrada" active={eff.projetoId == null} onClick={() => { set("projetoId", null); close() }} />
                {ativos.map((p) => (
                  <MenuItem key={p.id} dot={p.cor || "var(--text-muted)"} label={p.nome} active={eff.projetoId === p.id} onClick={() => { set("projetoId", p.id); close() }} />
                ))}
              </>
            )}
          </Menu>
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ fontSize: 12 }}>
            Cancelar
          </button>
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={!canAdd} style={{ fontSize: 12 }}>
            Adicionar tarefa
          </button>
        </div>
      </div>
    </div>
  )
}
