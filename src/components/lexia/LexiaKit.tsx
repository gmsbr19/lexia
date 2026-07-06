"use client"

// LexIA · Assistente — kit compartilhado das 3 superfícies (orbe, spotlight,
// chat). Orbe/sparkle acrílicos (vidro fosco + dourado girando, reaproveitando as
// classes do crm-theme.css) + textarea auto-crescente. Estilo bound aos tokens.
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"
import { lexGlassStrong } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"
import "./asst.css"

// ── Orbe: vidro fosco navy + borda dourada girando (.lex-aura-edge) + sparkle
//    dourado girando (.lx-sparkle + .lex-orb-grad) + glow interno + auroras. ──
export function Orb({ size = 46, glow = false }: { size?: number; glow?: boolean }) {
  const icon = Math.round(size * 0.5)
  const auraD = Math.round(size * 0.82)
  const aura3 = Math.round(size * 0.62)
  const auraBlur = Math.max(6, Math.round(size * 0.18))
  const auraBase: CSSProperties = { position: "absolute", borderRadius: "50%", pointerEvents: "none", filter: `blur(${auraBlur}px)` }
  return (
    <span
      className="lex-aura-edge"
      style={
        {
          position: "relative",
          width: size,
          height: size,
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
          background: "color-mix(in srgb, #15264A 42%, transparent)",
          backdropFilter: "blur(16px) saturate(150%)",
          WebkitBackdropFilter: "blur(16px) saturate(150%)",
          boxShadow: glow
            ? "0 12px 30px rgba(192,161,71,0.34), inset 0 1px 0 rgba(255,255,255,0.22)"
            : "0 8px 22px rgba(2,13,37,0.42), inset 0 1px 0 rgba(255,255,255,0.18)",
          "--lex-edge-dur": "8s",
        } as CSSProperties
      }
    >
      <span aria-hidden="true" className="lx-aura" style={{ ...auraBase, left: 0, top: 0, width: auraD, height: auraD, background: "radial-gradient(circle, rgba(216,190,122,0.9), rgba(192,161,71,0) 70%)", animation: "lxAuroraA 8.5s ease-in-out infinite" }} />
      <span aria-hidden="true" className="lx-aura" style={{ ...auraBase, right: 0, bottom: 0, width: auraD, height: auraD, background: "radial-gradient(circle, rgba(154,127,46,0.85), rgba(154,127,46,0) 70%)", animation: "lxAuroraB 8.5s ease-in-out infinite" }} />
      <span aria-hidden="true" className="lx-aura" style={{ ...auraBase, left: "50%", top: "50%", width: aura3, height: aura3, marginLeft: -aura3 / 2, marginTop: -aura3 / 2, background: "radial-gradient(circle, rgba(241,221,166,0.8), rgba(241,221,166,0) 72%)", animation: "lxAuroraC 11s ease-in-out infinite" }} />
      <span
        aria-hidden="true"
        className="lex-icon-glow"
        style={{ position: "absolute", inset: "22%", borderRadius: "50%", background: "radial-gradient(circle, rgba(192,161,71,0.85), rgba(192,161,71,0) 70%)", filter: "blur(5px)", pointerEvents: "none" }}
      />
      <span className="lx-sparkle" style={{ width: icon, height: icon, position: "relative", zIndex: 1 }}>
        <span className="lex-orb-grad" style={{ position: "absolute", inset: "-60%", borderRadius: "50%" }} />
      </span>
    </span>
  )
}

/** Chip quadrado com borda dourada + sparkle girando (sugestões de IA). */
export function SparkleChip({ size = 34 }: { size?: number }) {
  const icon = Math.round(size * 0.46)
  return (
    <span className="lx-chip" style={{ width: size, height: size }}>
      <span className="lx-sparkle" style={{ width: icon, height: icon, position: "relative", zIndex: 1 }}>
        <span className="lex-orb-grad" style={{ position: "absolute", inset: "-60%", borderRadius: "50%" }} />
      </span>
    </span>
  )
}

/** Sparkle dourado puro (input do spotlight, marca do rodapé). */
export function Sparkle({ size = 18 }: { size?: number }) {
  return (
    <span className="lx-sparkle" style={{ width: size, height: size }}>
      <span className="lex-orb-grad" style={{ position: "absolute", inset: "-60%", borderRadius: "50%" }} />
    </span>
  )
}

// ── Textarea auto-crescente — cresce até maxHeight, depois rola. Enter envia,
//    Shift+Enter quebra linha; onKeyDownExtra para navegação (↑↓/esc). ──
export function AutoTextarea({
  value,
  onChange,
  onSubmit,
  placeholder,
  maxHeight = 168,
  minHeight = 24,
  className,
  style,
  autoFocus,
  onKeyDownExtra,
  onPasteExtra,
  taRef,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit?: () => void
  placeholder?: string
  maxHeight?: number
  minHeight?: number
  className?: string
  style?: CSSProperties
  autoFocus?: boolean
  onKeyDownExtra?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  /** Colar (Fase 7) — oferta de anexar como .txt quando o texto colado é longo. */
  onPasteExtra?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
  taRef?: React.RefObject<HTMLTextAreaElement | null>
}) {
  const innerRef = useRef<HTMLTextAreaElement>(null)
  const ref = taRef ?? innerRef
  const resize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    const h = Math.min(el.scrollHeight, maxHeight)
    el.style.height = `${Math.max(h, minHeight)}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden"
  }
  useEffect(() => {
    resize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus()
      resize()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      rows={1}
      placeholder={placeholder}
      style={style}
      onChange={(e) => onChange(e.target.value)}
      onInput={resize}
      onPaste={onPasteExtra}
      onKeyDown={(e) => {
        onKeyDownExtra?.(e)
        if (e.defaultPrevented) return
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          onSubmit?.()
        }
      }}
    />
  )
}

/** Item de menu acrílico (popover). Reusa o visual de .fx-menu-item via inline. */
export function MenuPanel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className={`crm-pop-in ${lexGlassStrong}`}
      style={{
        borderRadius: 12,
        padding: 6,
        ...glassElevation("0 12px 28px rgba(2,13,37,0.18)"),
        ...style,
      }}
    >
      {children}
    </div>
  )
}
