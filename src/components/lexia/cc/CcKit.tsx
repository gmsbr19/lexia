"use client"

// LexIA · Chat — cc-kit compartilhado (handoff "LexIA · Chat de IA"). Tons,
// selo de IA, formas genéricas (linha compacta / card de detalhe / grid de
// campos), dinheiro, avatar, banner de urgência, progresso de pagamento e
// estepper de funil — a base sobre a qual os cards de entidade (Fase 3) são
// construídos. 100% sobre os tokens já existentes + o componente Icon
// compartilhado — nenhuma cor nova.
import type { CSSProperties, ReactNode } from "react"
import { Icon } from "@/components/crm/crm-icons"
import { formatBRL } from "@/lib/finance/money"
import type { CardLeadData } from "@/lib/lexia/cards-types"

/* ============================================================================
   TONS — os mesmos 4 semânticos do app + dourado (reservado à proveniência de IA)
   ============================================================================ */
export type CcTone = "ok" | "warn" | "crit" | "neutral" | "gold"

export const CC_TONE: Record<CcTone, { fg: string; soft: string }> = {
  ok: { fg: "var(--ok)", soft: "var(--ok-soft)" },
  warn: { fg: "var(--warn)", soft: "var(--warn-soft)" },
  crit: { fg: "var(--crit)", soft: "var(--crit-soft)" },
  neutral: { fg: "var(--text-muted)", soft: "var(--bg-sunken)" },
  gold: { fg: "var(--accent)", soft: "var(--accent-soft)" },
}

/**
 * Dias até um prazo → tom + rótulo de exibição (camada de UI; QUEM conta os
 * dias é o motor de prazos em src/lib/processos/*, não isto). `unidade`
 * distingue a contagem exata em dias ÚTEIS (motor CPC, ex. PrazoRow.urgencia)
 * de uma contagem em dias CORRIDOS (ex. Processo/Tarefa sem o contexto de
 * feriados carregado) — nunca rotular dias corridos como "úteis", isso
 * inventaria uma precisão jurídica que a contagem não tem.
 */
export function ccUrgency(dias: number | null | undefined, unidade: "uteis" | "corridos" = "corridos"): { tone: CcTone; label: string } {
  const unSg = unidade === "uteis" ? "dia útil" : "dia"
  const unPl = unidade === "uteis" ? "dias úteis" : "dias"
  if (dias == null) return { tone: "neutral", label: "Sem prazo" }
  if (dias < 0) {
    const n = Math.abs(dias)
    return { tone: "crit", label: n === 1 ? `Venceu há 1 ${unSg}` : `Venceu há ${n} ${unPl}` }
  }
  if (dias === 0) return { tone: "crit", label: "Vence hoje" }
  if (dias <= 2) return { tone: "crit", label: `Vence em ${dias} ${unPl}` }
  if (dias <= 6) return { tone: "warn", label: `Vence em ${dias} ${unPl}` }
  return { tone: "ok", label: `Vence em ${dias} ${unPl}` }
}

/* ============================================================================
   SELO DE IA — "isso veio da LexIA". Só isto usa dourado fora de dinheiro/CTA.
   Nunca representa status de negócio — só aparece no card de detalhe.
   ============================================================================ */
export function AiSeal() {
  return (
    <span
      title="Trazido pela LexIA"
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "var(--accent-soft)",
        color: "var(--accent)",
        zIndex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon name="sparkles" size={10.5} strokeWidth={2.1} />
    </span>
  )
}

/* ============================================================================
   BADGE — pill de status (raio 6, fill 10-12%, sem borda)
   ============================================================================ */
export function CcBadge({
  tone = "neutral",
  dot = true,
  size = "md",
  children,
}: {
  tone?: CcTone
  dot?: boolean
  size?: "sm" | "md"
  children: ReactNode
}) {
  const t = CC_TONE[tone] || CC_TONE.neutral
  const h = size === "sm" ? 18 : 22
  const fs = size === "sm" ? 10.5 : 12
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: h,
        padding: size === "sm" ? "0 7px" : "0 9px",
        borderRadius: 6,
        fontSize: fs,
        fontWeight: 500,
        background: t.soft,
        color: t.fg,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />}
      {children}
    </span>
  )
}

/* ============================================================================
   DINHEIRO — sinal + cor. ÚNICA exceção ao "dourado só marca IA": aqui verde/
   vermelho representam a direção do valor (convenção financeira do resto do
   app). `valueCents` é SEMPRE centavos inteiros (convenção do projeto).
   ============================================================================ */
export function CcMoney({
  valueCents,
  dir,
  size = 14,
  weight = 600,
  plain = false,
}: {
  valueCents: number
  dir?: "in" | "out"
  size?: number
  weight?: number
  plain?: boolean
}) {
  const neg = dir === "out"
  const color = plain ? "var(--text)" : neg ? "var(--crit)" : "var(--ok)"
  const sign = plain ? "" : neg ? "− " : "+ "
  return (
    <span style={{ fontSize: size, fontWeight: weight, color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
      {sign}
      {formatBRL(Math.abs(valueCents))}
    </span>
  )
}

/* ============================================================================
   AVATAR — círculo de iniciais (responsável / cliente)
   ============================================================================ */
export function CcAvatar({ label, tone = "neutral", size = 26 }: { label: string; tone?: CcTone; size?: number }) {
  const t = CC_TONE[tone] || CC_TONE.neutral
  const initials = (label || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: t.soft,
        color: t.fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 600,
        letterSpacing: "0.01em",
      }}
    >
      {initials}
    </div>
  )
}

/* ============================================================================
   CAIXA DE ÍCONE — neutra por padrão; só Lançamento colore por direção
   ============================================================================ */
export function CcIconBox({ icon, tone = "neutral", size = 32 }: { icon: string; tone?: CcTone; size?: number }) {
  const t = CC_TONE[tone] || CC_TONE.neutral
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size >= 34 ? 10 : 9,
        flexShrink: 0,
        background: tone === "neutral" ? "var(--bg-sunken)" : t.soft,
        color: tone === "neutral" ? "var(--text-muted)" : t.fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} strokeWidth={1.8} />
    </div>
  )
}

/* ============================================================================
   LINHA COMPACTA — "linha de tabela cartonizada". leading · título/meta · direita
   ============================================================================ */
export function CcRow({
  leading,
  title,
  meta,
  rightTop,
  rightBottom,
  onClick,
  forceHover,
}: {
  leading?: ReactNode
  title: ReactNode
  meta?: ReactNode
  rightTop?: ReactNode
  rightBottom?: ReactNode
  onClick?: () => void
  forceHover?: boolean
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={`cc-row${forceHover ? " demo-hover" : ""}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 11px",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        cursor: onClick ? "pointer" : undefined,
      }}
    >
      {leading}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        {meta && <div style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta}</div>}
      </div>
      {(rightTop || rightBottom) && (
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          {rightTop}
          {rightBottom}
        </div>
      )}
      <Icon name="chevronRight" size={14} style={{ color: "var(--text-subtle)", opacity: 0.55, flexShrink: 0 }} />
    </div>
  )
}

/* ============================================================================
   CARD DE DETALHE — shell genérico: header (leading+título+sub+badge) · banner
   opcional de urgência · corpo (grid de campos) · rodapé "Abrir no app".
   ============================================================================ */
export function CcDetail({
  leading,
  title,
  sub,
  badge,
  banner,
  children,
  onOpen,
  width = 376,
}: {
  leading?: ReactNode
  title: ReactNode
  sub?: ReactNode
  badge?: ReactNode
  banner?: ReactNode
  children?: ReactNode
  onOpen?: () => void
  width?: number | string
}) {
  return (
    <div style={{ width, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)", position: "relative", overflow: "hidden" }}>
      <AiSeal />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "13px 34px 12px 13px" }}>
        {leading}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em", lineHeight: 1.35 }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 2 }}>{sub}</div>}
          {badge && <div style={{ marginTop: 8 }}>{badge}</div>}
        </div>
      </div>
      {banner && <div style={{ padding: "0 13px 13px" }}>{banner}</div>}
      {children && (
        <div style={{ padding: 13, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
      )}
      <div style={{ padding: "0 13px 13px" }}>
        <button className="btn btn-secondary" onClick={onOpen} style={{ width: "100%", height: 36, fontSize: 12.5 }}>
          <Icon name="externalLink" size={13.5} />
          Abrir no app
        </button>
      </div>
    </div>
  )
}

const eyebrowStyle: CSSProperties = { fontSize: 10.5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-subtle)" }

/* ---- grid de campos rótulo → valor (2 colunas) --------------------------- */
export function CcField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...eyebrowStyle, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{children}</div>
    </div>
  )
}
export function CcGrid({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 14, columnGap: 12 }}>{children}</div>
}

/* ============================================================================
   BANNER DE URGÊNCIA — prazo é o dado mais crítico em Tarefa/Processo; precisa
   saltar aos olhos. Faixa cheia (não só um chip), ponto pulsante quando crítico.
   ============================================================================ */
export function CcUrgencyBanner({ tone, icon, eyebrow, label }: { tone: CcTone; icon: string; eyebrow: string; label: string }) {
  const t = CC_TONE[tone] || CC_TONE.neutral
  return (
    <div style={{ padding: "10px 12px", borderRadius: 10, background: t.soft, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: "rgba(0,0,0,0.16)", color: t.fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={14} strokeWidth={2.1} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: t.fg, opacity: 0.85 }}>{eyebrow}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: t.fg, letterSpacing: "-0.01em", marginTop: 1 }}>{label}</div>
      </div>
      {tone === "crit" && <span className="cc-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: t.fg, flexShrink: 0 } as CSSProperties} />}
    </div>
  )
}

/* ============================================================================
   PROGRESSO DE PAGAMENTO — Honorário (pago vs. pendente), estrutural em vez de
   frase. `totalCents`/`paidCents` são centavos inteiros.
   ============================================================================ */

/** % pago, arredondado; 0 quando o total é 0 (evita divisão por zero/NaN). */
export function pagamentoPct(totalCents: number, paidCents: number): number {
  return totalCents > 0 ? Math.round((paidCents / totalCents) * 100) : 0
}

export function CcPayProgress({ totalCents, paidCents }: { totalCents: number; paidCents: number }) {
  const pct = pagamentoPct(totalCents, paidCents)
  return (
    <div>
      <div style={{ height: 7, borderRadius: 999, background: "var(--bg-sunken)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--ok)", borderRadius: 999 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-subtle)" }}>
        <span>{pct}% pago</span>
        <span>{100 - pct}% pendente</span>
      </div>
    </div>
  )
}

/* ============================================================================
   ESTEPPER DE FUNIL — Lead (posição na jornada, estrutural em vez de frase)
   ============================================================================ */
export const CC_FUNNEL: CardLeadData["estagio"][] = ["novo", "contato", "qualificado", "proposta", "ganho"]
export const CC_FUNNEL_LABEL: Record<CardLeadData["estagio"], string> = {
  novo: "Novo",
  contato: "Contato",
  qualificado: "Qualificado",
  proposta: "Proposta",
  ganho: "Ganho",
  perdido: "Perdido",
}

export function CcFunnelStepper({ stage }: { stage: CardLeadData["estagio"] }) {
  const lost = stage === "perdido"
  const idx = lost ? 0 : CC_FUNNEL.indexOf(stage)
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {CC_FUNNEL.map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: 5,
              borderRadius: 999,
              background: lost ? (i === 0 ? "var(--crit)" : "var(--bg-sunken)") : i <= idx ? (i === 4 ? "var(--ok)" : "var(--text-muted)") : "var(--bg-sunken)",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: lost ? "var(--crit)" : idx === 4 ? "var(--ok)" : "var(--text)" }}>{lost ? "Perdido" : CC_FUNNEL_LABEL[stage]}</span>
        <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>{lost ? `parou em ${CC_FUNNEL_LABEL[CC_FUNNEL[idx]]}` : `Etapa ${idx + 1} de 5`}</span>
      </div>
    </div>
  )
}

/* ============================================================================
   ENVELOPE DE CHAT — simula um recorte real da conversa: avatar dourado
   estático + prosa curta acima do card. Princípio central do sistema: "prosa
   curta + card carrega o resto".
   ============================================================================ */
export function CcChatLine({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          flexShrink: 0,
          marginTop: 1,
          background: "linear-gradient(135deg, #D8BE7A, #9A7F2E)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(192,161,71,0.35)",
        }}
      >
        <Icon name="sparkles" size={11} strokeWidth={2} style={{ color: "#020D25" }} />
      </div>
      <div style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.5, letterSpacing: "-0.01em", paddingTop: 2 }}>{children}</div>
    </div>
  )
}
