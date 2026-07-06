"use client"

// LexIA · Chat — timeline de passos do agente (handoff, Fase 3). Substitui os
// chips soltos de tool: rodando, o passo atual ganha destaque (ThinkingOrb) e
// os anteriores viram check numa linha fina vertical; ao terminar, colapsa
// sozinho em "N passos" (só expande se o usuário clicar).
import { useState } from "react"
import { Icon } from "@/components/crm/crm-icons"
import { ThinkingOrb } from "./cc/motion"
import "./cc/cc.css"

export interface TimelineStep {
  label: string
  status: "run" | "ok" | "erro"
}

function TimelineRunning({ steps }: { steps: TimelineStep[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {steps.map((s, i) => {
        const isLast = i === steps.length - 1
        return (
          <div key={i} style={{ display: "flex", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 18, flexShrink: 0 }}>
              {s.status === "run" ? (
                <ThinkingOrb size={18} spin={1.1} loading />
              ) : (
                <span
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: "50%",
                    background: s.status === "erro" ? "var(--crit-soft)" : "var(--ok-soft)",
                    color: s.status === "erro" ? "var(--crit)" : "var(--ok)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1.5,
                    flexShrink: 0,
                  }}
                >
                  <Icon name={s.status === "erro" ? "alertTriangle" : "check"} size={9} strokeWidth={3} />
                </span>
              )}
              {!isLast && <span style={{ width: 1, flex: 1, minHeight: 12, background: "var(--border)", marginTop: 3 }} />}
            </div>
            <div style={{ paddingBottom: isLast ? 0 : 10, paddingTop: 1, fontSize: 12.5, color: s.status === "run" ? "var(--text)" : "var(--text-muted)" }}>{s.label}</div>
          </div>
        )
      })}
    </div>
  )
}

function TimelineCollapsed({ steps, expanded, onToggle }: { steps: TimelineStep[]; expanded: boolean; onToggle: () => void }) {
  const hasErro = steps.some((s) => s.status === "erro")
  return (
    <div>
      <button onClick={onToggle} className="cc-timeline-toggle">
        <Icon name={hasErro ? "alertTriangle" : "checkCircle"} size={13} style={{ color: hasErro ? "var(--crit)" : "var(--ok)" }} />
        <span>
          {steps.length} passo{steps.length === 1 ? "" : "s"}
        </span>
        <Icon name="chevronDown" size={13} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {expanded && (
        <div style={{ marginTop: 6, paddingLeft: 2, display: "flex", flexDirection: "column", gap: 6 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name={s.status === "erro" ? "alertTriangle" : "check"} size={12} style={{ color: s.status === "erro" ? "var(--crit)" : "var(--ok)", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AgentTimeline({ steps }: { steps: TimelineStep[] }) {
  const [expanded, setExpanded] = useState(false)
  const running = steps.some((s) => s.status === "run")
  if (steps.length === 0) return null
  return running ? <TimelineRunning steps={steps} /> : <TimelineCollapsed steps={steps} expanded={expanded} onToggle={() => setExpanded((e) => !e)} />
}
