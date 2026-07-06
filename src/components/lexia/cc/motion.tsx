"use client"

// LexIA · Motion kit — estados animados do assistente (handoff "LexIA · Chat de
// IA", base compartilhada). Reúne: conjuntos de palavras "-ndo…" por persona,
// ícones animados, o estado "pensando" (3 variantes), a revelação da resposta
// (palavra/letra/linha) e o caret dourado de streaming. Constrói 100% sobre os
// tokens já existentes + cc.css.ts (máscaras/keyframes); nenhuma cor nova.
import { useEffect, useRef, useState, type CSSProperties } from "react"
import type { LexiaPersona } from "@/lib/lexia/preferencias-core"
import { LEX_PACE, LEX_TONES, LEX_TONE_ORDER, type AnimatedIconName, type LexPace, type LexPaceName, type LexTone } from "@/lib/lexia/motion-data"
import "./cc.css"

// Tabelas de dados puras (persona→palavras, ritmo) moraram para motion-data.ts
// (testável sem puxar o vanilla-extract deste arquivo) — reexportadas aqui p/
// quem já importa de cc/motion.tsx.
export { LEX_PACE, LEX_TONES, LEX_TONE_ORDER }
export type { AnimatedIconName, LexPace, LexPaceName, LexTone }

/** Detecta `prefers-reduced-motion: reduce` (reativo a mudanças). `force` sobrepõe (ex.: toggle de settings). */
export function useLexmReduced(force?: boolean): boolean {
  const [reduced, setReduced] = useState(() => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches)
  useEffect(() => {
    if (typeof matchMedia === "undefined") return
    const mq = matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setReduced(mq.matches)
    if (mq.addEventListener) mq.addEventListener("change", onChange)
    else mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange)
      else mq.removeListener(onChange)
    }
  }, [])
  return Boolean(force) || reduced
}

/* ============================================================================
   3 · ÍCONES ANIMADOS — partes internas com classe própria, animadas via CSS
   ============================================================================ */
export function AnimatedIcon({
  name,
  size = 18,
  strokeWidth = 1.85,
  style,
  keyed = false,
}: {
  name: AnimatedIconName
  size?: number
  strokeWidth?: number
  style?: CSSProperties
  keyed?: boolean
}) {
  const p = {
    className: `cc-ic cc-ic-${name}${keyed ? " cc-pop" : ""}`,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style,
  }
  switch (name) {
    case "pen":
      return (
        <svg {...p}>
          <path className="pen" d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
          <path className="ink" d="M12.5 20.5h8" />
        </svg>
      )
    case "scale":
      return (
        <svg {...p}>
          <g className="beam">
            <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="M7 21h10" />
            <path d="M12 3v18" />
            <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
          </g>
        </svg>
      )
    case "spark":
      return (
        <svg {...p}>
          <path
            className="s1"
            d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0Z"
          />
          <path className="s2" d="M20 3.5v3.4" />
          <path className="s2" d="M21.7 5.2h-3.4" />
        </svg>
      )
    case "gavel":
      return (
        <svg {...p}>
          <g className="mallet">
            <path d="m14.5 12.5-8 8a2.12 2.12 0 1 1-3-3l8-8" />
            <path d="m16 16 6-6" />
            <path d="m8 8 6-6" />
            <path d="m9 7 8 8" />
            <path d="m21 11-8-8" />
          </g>
        </svg>
      )
    case "scroll":
      return (
        <svg {...p}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path className="ln l3" style={{ "--l": 4 } as CSSProperties} d="M8 8.5h2" />
          <path className="ln l1" style={{ "--l": 10 } as CSSProperties} d="M8 13h8" />
          <path className="ln l2" style={{ "--l": 10 } as CSSProperties} d="M8 17h8" />
        </svg>
      )
    case "search":
      return (
        <svg {...p}>
          <g className="glass">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </g>
        </svg>
      )
    case "sigma":
      return (
        <svg {...p}>
          <path className="sig" d="M18 7V4H6l6 8-6 8h12v-3" />
        </svg>
      )
    case "bars":
      return (
        <svg {...p}>
          <line className="b1" x1="6" y1="20" x2="6" y2="13" />
          <line className="b2" x1="12" y1="20" x2="12" y2="7" />
          <line className="b3" x1="18" y1="20" x2="18" y2="4" />
        </svg>
      )
    case "braces":
      return (
        <svg {...p}>
          <path className="lft" d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1" />
          <path className="rgt" d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
        </svg>
      )
    case "orbit":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="7.5" strokeOpacity={0.28} />
          <circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none" />
          <g className="rev">
            <circle cx="12" cy="4.5" r="1.7" fill="currentColor" stroke="none" />
          </g>
        </svg>
      )
    default:
      return null
  }
}

/* ============================================================================
   MOTOR DO ANEL — idle e loading são os DOIS EXTREMOS do mesmo movimento.
   Um único conic-gradient (.cc-ring); a rotação é integrada via rAF (velocidade
   angular) — nunca por troca de animation-duration (isso causaria salto). Um
   progresso 0→1 (`load`) com easing dirige velocidade, arco e suavidade das
   pontas ao mesmo tempo.
   ============================================================================ */
interface RingEngine {
  angle: number
  load: number
  transFrom: number
  transStart: number
  lastLoading: boolean
  lastT: number
}

function useOrbRing(loading: boolean, reduced: boolean, spinSec: number) {
  const ringRef = useRef<HTMLSpanElement>(null)
  const engine = useRef<RingEngine>({ angle: 0, load: 0, transFrom: 0, transStart: 0, lastLoading: loading, lastT: 0 })

  useEffect(() => {
    const el = ringRef.current
    if (!el) return

    // ---- parâmetros de "feel" — velocidades em ms/volta (menor = mais rápido);
    // acelera/desacelera em ms; arco em graus (extensão do trecho aceso, NUNCA a espessura).
    const IDLE_REV_MS = 7600 // 1 volta em idle (~7-8s)
    const SPIN_REV_MS = Math.max(120, spinSec * 1000) // 1 volta em loading sustentado
    const ACCEL_MS = 900 // idle → spinner ao ligar `loading`
    const DECEL_MS = 1200 // spinner → idle ao desligar (pouso macio)
    const ARC_OSC_HZ = 0.62 // frequência da "respiração" do arco em loading
    const IDLE_ARC_DEG = 200 // arco base do idle — largo
    const IDLE_FEATHER_DEG = 64 // suavidade das pontas no idle — macia
    const SPIN_ARC_MID_DEG = 80 // arco médio em loading sustentado
    const SPIN_ARC_AMP_DEG = 62 // amplitude do cresce/encolhe em loading
    const SPIN_FEATHER_DEG = 14 // suavidade das pontas em loading — nítida

    if (reduced) {
      el.style.setProperty("--angle", "0deg")
      el.style.setProperty("--arc", `${IDLE_ARC_DEG}deg`)
      el.style.setProperty("--feather", `${IDLE_FEATHER_DEG}deg`)
      return
    }

    const idleSpeed = 360 / (IDLE_REV_MS / 1000) // graus/seg
    const spinSpeed = 360 / (SPIN_REV_MS / 1000) // graus/seg
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2) // easeInOutCubic
    const e = engine.current
    let raf = requestAnimationFrame(function frame(t: number) {
      if (!e.lastT) e.lastT = t
      const dt = Math.min(0.05, (t - e.lastT) / 1000) // seg — clamp p/ tab em 2º plano
      e.lastT = t

      if (e.lastLoading !== loading) {
        e.transFrom = e.load
        e.transStart = t
        e.lastLoading = loading
      }
      const dur = loading ? ACCEL_MS : DECEL_MS
      const raw = dur > 0 ? Math.min(1, (t - e.transStart) / dur) : 1
      e.load = e.transFrom + ((loading ? 1 : 0) - e.transFrom) * ease(raw)

      // 1) velocidade angular integrada — idle/spin são só os extremos de `speed`
      const speed = idleSpeed + (spinSpeed - idleSpeed) * e.load
      e.angle = (e.angle + speed * dt) % 360

      // 2) arco: base interpolada por `load` + oscilação cuja amplitude só
      //    aparece conforme `load` → 1 (dá o ritmo "Material" indeterminate)
      const baseArc = IDLE_ARC_DEG + (SPIN_ARC_MID_DEG - IDLE_ARC_DEG) * e.load
      const osc = Math.sin((t / 1000) * ARC_OSC_HZ * Math.PI * 2)
      const feather = IDLE_FEATHER_DEG + (SPIN_FEATHER_DEG - IDLE_FEATHER_DEG) * e.load
      const arc = Math.min(340 - feather * 2, Math.max(8, baseArc + osc * SPIN_ARC_AMP_DEG * e.load))

      el.style.setProperty("--angle", `${e.angle.toFixed(2)}deg`)
      el.style.setProperty("--arc", `${arc.toFixed(2)}deg`)
      el.style.setProperty("--feather", `${feather.toFixed(2)}deg`)

      raf = requestAnimationFrame(frame)
    })
    return () => cancelAnimationFrame(raf)
  }, [loading, reduced, spinSec])

  return ringRef
}

/**
 * Orbe LexIA com anel idle↔"pensando" fundidos num único movimento contínuo.
 * Reaproveita as auroras/glow/sparkle globais (.lx-aura/.lex-icon-glow/
 * .lex-orb-grad/.lx-sparkle, já em crm-theme.css) — só o anel (.cc-ring) e o
 * motor rAF são novos. Não substitui o `Orb` estático do header (LexiaKit.tsx);
 * é a variante "com estado de carregamento" usada no chat.
 */
export function ThinkingOrb({
  size = 22,
  spin = 1.15,
  loading = false,
  glow = false,
  reduced = false,
}: {
  size?: number
  spin?: number
  loading?: boolean
  glow?: boolean
  reduced?: boolean
}) {
  const icon = Math.round(size * 0.5)
  const auraD = Math.round(size * 0.82)
  const aura3 = Math.round(size * 0.62)
  const auraBlur = Math.max(6, Math.round(size * 0.18))
  const auraBase: CSSProperties = { position: "absolute", borderRadius: "50%", pointerEvents: "none", filter: `blur(${auraBlur}px)` }
  const reduce = useLexmReduced(reduced)
  const ringRef = useOrbRing(loading, reduce, spin)
  return (
    <span
      data-loading={loading ? "1" : "0"}
      style={{
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
        boxShadow: glow ? "0 12px 30px rgba(192,161,71,0.34), inset 0 1px 0 rgba(255,255,255,0.22)" : "0 8px 22px rgba(2,13,37,0.42), inset 0 1px 0 rgba(255,255,255,0.18)",
      }}
    >
      <span
        aria-hidden="true"
        className="lx-aura"
        style={{ ...auraBase, left: 0, top: 0, width: auraD, height: auraD, background: "radial-gradient(circle, rgba(216,190,122,0.9), rgba(192,161,71,0) 70%)", animation: "lxAuroraA 8.5s ease-in-out infinite" }}
      />
      <span
        aria-hidden="true"
        className="lx-aura"
        style={{ ...auraBase, right: 0, bottom: 0, width: auraD, height: auraD, background: "radial-gradient(circle, rgba(154,127,46,0.85), rgba(154,127,46,0) 70%)", animation: "lxAuroraB 8.5s ease-in-out infinite" }}
      />
      <span
        aria-hidden="true"
        className="lx-aura"
        style={{
          ...auraBase,
          left: "50%",
          top: "50%",
          width: aura3,
          height: aura3,
          marginLeft: -aura3 / 2,
          marginTop: -aura3 / 2,
          background: "radial-gradient(circle, rgba(241,221,166,0.8), rgba(241,221,166,0) 72%)",
          animation: "lxAuroraC 11s ease-in-out infinite",
        }}
      />
      <span
        aria-hidden="true"
        className="lex-icon-glow"
        style={{ position: "absolute", inset: "22%", borderRadius: "50%", background: "radial-gradient(circle, rgba(192,161,71,0.85), rgba(192,161,71,0) 70%)", filter: "blur(5px)", pointerEvents: "none" }}
      />
      <span className="lx-sparkle" style={{ width: icon, height: icon, position: "relative", zIndex: 1 }}>
        <span className="lex-orb-grad" style={{ position: "absolute", inset: "-60%", borderRadius: "50%" }} />
      </span>
      <span aria-hidden="true" className="cc-ring" ref={ringRef} />
    </span>
  )
}

/* ============================================================================
   5 · ESTADO "PENSANDO"
   variant: 'cycle' (ícones temáticos sincronizados) · 'orb' (orbe pulsando)
            · 'glyph' (um ícone em loop contínuo)
   ============================================================================ */
export function ThinkingState({
  tone = "senior",
  variant = "cycle",
  pace = "balanced",
  reduced = false,
  glyph = "spark",
  orbSize = 22,
  hideMark = false,
}: {
  tone?: LexiaPersona
  variant?: "cycle" | "orb" | "glyph"
  pace?: LexPaceName
  reduced?: boolean
  glyph?: AnimatedIconName
  orbSize?: number
  hideMark?: boolean
}) {
  const P = LEX_PACE[pace] || LEX_PACE.balanced
  const reduce = useLexmReduced(reduced)
  const set = LEX_TONES[tone] || LEX_TONES.senior
  const [i, setI] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setI((n) => n + 1), P.word)
    return () => clearInterval(id)
  }, [reduce, P.word, tone])

  const word = set.words[i % set.words.length]
  const iconName = set.icons[i % set.icons.length]
  const shimmerVar = { "--cc-shimmer": `${P.shimmer}s` } as CSSProperties

  let mark: React.ReactNode = null
  if (!hideMark) {
    if (variant === "orb") mark = <ThinkingOrb size={orbSize} spin={P.loadSpin} loading />
    else if (variant === "glyph") mark = (
      <span className="cc-think-mark">
        <AnimatedIcon name={glyph} size={17} />
      </span>
    )
    else mark = (
      <span className="cc-think-mark" key={`m${i}`}>
        <AnimatedIcon name={iconName} size={17} keyed />
      </span>
    )
  }

  if (reduce) {
    const rmark = hideMark ? null : variant === "orb" ? (
      <ThinkingOrb size={orbSize} spin={P.loadSpin} loading />
    ) : (
      <span className="cc-think-mark">
        <AnimatedIcon name={variant === "glyph" ? glyph : iconName} size={17} />
      </span>
    )
    return (
      <span className="cc-think" aria-live="polite">
        {rmark}
        <span className="cc-word">
          {word}
          <span className="cc-word-ell">…</span>
        </span>
      </span>
    )
  }

  // órbita/glifo: só a palavra troca (marca é contínua)
  if (variant === "orb" || variant === "glyph") {
    return (
      <span className="cc-think" aria-live="polite">
        {mark}
        <span className="cc-swap" key={i}>
          <span className="cc-word cc-shimmer" style={shimmerVar}>
            {word}
          </span>
          <span className="cc-word cc-word-ell">…</span>
        </span>
      </span>
    )
  }
  // cycle: ícone + palavra entram juntos
  return (
    <span className="cc-think" aria-live="polite">
      <span className="cc-swap" key={i}>
        {mark}
        <span className="cc-word cc-shimmer" style={shimmerVar}>
          {word}
        </span>
        <span className="cc-word cc-word-ell">…</span>
      </span>
    </span>
  )
}

/* ============================================================================
   6 · REVELAÇÃO DA RESPOSTA
   mode: 'word' (palavra a palavra) · 'type' (letra a letra) · 'line' (linha)
   ============================================================================ */
function lexmSplitSentences(text: string): string[] {
  const parts = text.match(/[^.!?:;]+[.!?:;]*(\s+|$)/g)
  return parts && parts.length ? parts : [text]
}

function TypeReveal({ text, cps, onDone }: { text: string; cps: number; onDone?: () => void }) {
  const [n, setN] = useState(0)
  const doneRef = useRef(false)
  useEffect(() => {
    let raf: number
    let start = 0
    const total = text.length
    const step = (ts: number) => {
      if (!start) start = ts
      const shown = Math.min(total, Math.floor(((ts - start) / 1000) * cps))
      setN(shown)
      if (shown < total) raf = requestAnimationFrame(step)
      else if (!doneRef.current) {
        doneRef.current = true
        onDone?.()
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])
  const done = n >= text.length
  return (
    <span>
      {text.slice(0, n)}
      {!done && <span className="cc-caret" />}
    </span>
  )
}

function WordReveal({ text, stagger, onDone }: { text: string; stagger: number; onDone?: () => void }) {
  const tokens = text.split(/(\s+)/)
  useEffect(() => {
    const count = tokens.filter((t) => t.trim()).length
    const id = setTimeout(() => onDone?.(), count * stagger + 440)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])
  let w = 0
  return (
    <span>
      {tokens.map((tok, idx) =>
        tok.trim() === "" ? (
          <span key={idx}>{tok}</span>
        ) : (
          <span key={idx} className="cc-rv-word" style={{ animationDelay: `${w++ * stagger}ms` }}>
            {tok}
          </span>
        ),
      )}
    </span>
  )
}

function LineReveal({ text, stagger, onDone }: { text: string; stagger: number; onDone?: () => void }) {
  const parts = lexmSplitSentences(text)
  useEffect(() => {
    const id = setTimeout(() => onDone?.(), parts.length * stagger + 520)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])
  return (
    <span>
      {parts.map((p, idx) => (
        <span key={idx} className="cc-rv-line" style={{ animationDelay: `${idx * stagger}ms` }}>
          {p}
        </span>
      ))}
    </span>
  )
}

function InstantReveal({ text, onDone }: { text: string; onDone?: () => void }) {
  useEffect(() => {
    onDone?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <span>{text}</span>
}

export function RevealText({
  text,
  mode = "word",
  pace = "balanced",
  reduced = false,
  onDone,
}: {
  text: string
  mode?: "word" | "type" | "line" | "instant"
  pace?: LexPaceName
  reduced?: boolean
  onDone?: () => void
}) {
  const P = LEX_PACE[pace] || LEX_PACE.balanced
  const reduce = useLexmReduced(reduced)
  if (reduce || mode === "instant") return <InstantReveal text={text} onDone={onDone} />
  if (mode === "type") return <TypeReveal text={text} cps={P.type} onDone={onDone} />
  if (mode === "line") return <LineReveal text={text} stagger={P.lineStagger} onDone={onDone} />
  return <WordReveal text={text} stagger={P.wordStagger} onDone={onDone} />
}

/** Caret dourado pulsando no fim do texto em streaming (Fase 4). */
export function StreamCaret() {
  return <span className="cc-caret" style={{ marginLeft: 1 }} />
}
