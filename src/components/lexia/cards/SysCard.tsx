"use client"

// LexIA · Chat — família única de avisos do sistema (handoff, Fase 4/R2).
// Ícone com tom + microcopy curto + no máximo 1 ação. Erros usam crit/warn/
// neutral — NUNCA dourado (dourado é só proveniência de IA). `codigo` deriva
// tom/ícone/título/ação automaticamente; cada estado é coberto: offline,
// stream caído, modo econômico, sobrecarga, timeout, sessão expirada, IA sem
// chave, e o genérico.
import { useState } from "react"
import { Icon } from "@/components/crm/crm-icons"
import { CC_TONE, type CcTone } from "../cc/CcKit"
import type { ErroCodigo } from "@/lib/lexia/types"
import "../cc/cc.css"

export type SysCardCodigo = ErroCodigo

interface SysPreset {
  tone: CcTone
  icon: string
  title: string
  actionLabel?: string
  dismissible?: boolean
}

const PRESETS: Record<SysCardCodigo, SysPreset> = {
  offline: { tone: "crit", icon: "wifiOff", title: "Sem conexão", actionLabel: "Tentar de novo" },
  stream: { tone: "warn", icon: "zap", title: "Conexão perdida no meio da resposta", actionLabel: "Reconectar" },
  overloaded: { tone: "crit", icon: "alertCircle", title: "Modelo sobrecarregado", actionLabel: "Tentar de novo" },
  timeout: { tone: "warn", icon: "clock", title: "Tempo esgotado", actionLabel: "Tentar de novo" },
  sessao: { tone: "neutral", icon: "logout", title: "Sessão expirada", actionLabel: "Entrar de novo" },
  "sem-chave": { tone: "neutral", icon: "alertCircle", title: "LexIA indisponível" },
  "modo-economico": { tone: "warn", icon: "zap", title: "Modo econômico ativado", dismissible: true },
  generico: { tone: "crit", icon: "alertTriangle", title: "Algo deu errado", actionLabel: "Tentar de novo" },
}

export function SysCard({
  codigo = "generico",
  mensagem,
  working = false,
  workingLabel = "Tentando de novo…",
  onAction,
}: {
  codigo?: SysCardCodigo
  mensagem: string
  working?: boolean
  workingLabel?: string
  onAction?: () => void
}) {
  const [dismissed, setDismissed] = useState(false)
  const preset = PRESETS[codigo] ?? PRESETS.generico
  const t = CC_TONE[preset.tone]
  if (dismissed) return null
  // "Sessão expirada" tem uma única ação possível — não depende do chamador.
  const action = codigo === "sessao" ? () => window.location.assign("/login") : onAction

  return (
    <div className="cc-sys">
      <span className="cc-sys-ic" style={{ background: t.soft, color: t.fg }}>
        <Icon name={preset.icon} size={15} strokeWidth={1.9} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{preset.title}</div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.45 }}>{mensagem}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, alignSelf: "center" }}>
        {working ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-subtle)" }}>
            <Icon name="refreshCw" size={13} className="lx-spin" />
            {workingLabel}
          </span>
        ) : (
          preset.actionLabel &&
          action && (
            <button className="btn btn-secondary btn-sm" onClick={action} style={{ fontSize: 12.5, height: 30 }}>
              <Icon name="refreshCw" size={13} />
              {preset.actionLabel}
            </button>
          )
        )}
        {preset.dismissible && !working && (
          <button className="cc-sys-dismiss" onClick={() => setDismissed(true)} aria-label="Dispensar">
            <Icon name="x" size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
