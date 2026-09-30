"use client"

// LexIA · CRM — rateio dos honorários de um caso entre os 2 sócios. Slider com
// pontos de atração em 0/50/100% (arrastar, setas do teclado ou atalhos), com o
// reflexo em R$ sobre o total do caso. Extraído do antigo modal do caso; usado
// pela página do caso (/casos/[id]).
import { useCallback, useEffect, useRef, useState } from "react"
import { crmMoney } from "../crm-fmt"

// ───────────────────────── rateio slider ─────────────────────────
export function CrmRateioSlider({
  value,
  onChange,
  total,
  nomeA,
  nomeB,
}: {
  value: number // sócio A (ordem 0) %
  onChange: (v: number) => void
  total: number // centavos
  nomeA: string
  nomeB: string
}) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [drag, setDrag] = useState(false)
  const snap = (v: number) => {
    for (const s of [0, 50, 100]) if (Math.abs(v - s) <= 6) return s
    return v
  }
  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      let pct = Math.round(((clientX - r.left) / r.width) * 100)
      pct = Math.max(0, Math.min(100, pct))
      onChange(snap(pct))
    },
    [onChange],
  )
  useEffect(() => {
    if (!drag) return
    const mv = (e: MouseEvent) => setFromClientX(e.clientX)
    const up = () => setDrag(false)
    window.addEventListener("mousemove", mv)
    window.addEventListener("mouseup", up)
    return () => {
      window.removeEventListener("mousemove", mv)
      window.removeEventListener("mouseup", up)
    }
  }, [drag, setFromClientX])
  const a = value
  const b = 100 - value
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") onChange(Math.max(0, value - 5))
    if (e.key === "ArrowRight") onChange(Math.min(100, value + 5))
  }
  const presets = [
    { l: `100% ${nomeA.split(/\s+/)[0]}`, v: 100 },
    { l: "50 / 50", v: 50 },
    { l: `100% ${nomeB.split(/\s+/)[0]}`, v: 0 },
  ]
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-subtle)", fontWeight: 500 }}>{nomeA}</div>
          <div
            style={{
              fontSize: 25, fontWeight: 500, letterSpacing: "-0.03em", color: "var(--text)", fontVariantNumeric: "tabular-nums",
            }}
          >
            {a}
            <span style={{ fontSize: 16, color: "var(--text-subtle)" }}>%</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
            {crmMoney(Math.round((total * a) / 100))}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "var(--text-subtle)", fontWeight: 500 }}>{nomeB}</div>
          <div
            style={{
              fontSize: 25, fontWeight: 500, letterSpacing: "-0.03em", color: "var(--text)", fontVariantNumeric: "tabular-nums",
            }}
          >
            {b}
            <span style={{ fontSize: 16, color: "var(--text-subtle)" }}>%</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
            {crmMoney(Math.round((total * b) / 100))}
          </div>
        </div>
      </div>
      <div
        ref={trackRef}
        onMouseDown={(e) => {
          setDrag(true)
          setFromClientX(e.clientX)
        }}
        style={{ position: "relative", height: 38, cursor: "pointer", userSelect: "none", padding: "14px 0" }}
      >
        <div style={{ position: "relative", height: 10, borderRadius: 999, overflow: "hidden", background: "var(--bg-sunken)" }}>
          <div style={{ position: "absolute", inset: 0, width: `${a}%`, background: "var(--brand-gold)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: `${b}%`, background: "var(--brand-navy)", opacity: 0.85 }} />
        </div>
        {[0, 50, 100].map((s) => (
          <div
            key={s}
            style={{
              position: "absolute", top: 9, left: `${s}%`, transform: "translateX(-50%)", width: 2, height: 20,
              background: "var(--border-strong)", borderRadius: 1, pointerEvents: "none",
            }}
          />
        ))}
        <div
          role="slider"
          aria-valuenow={a}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          onKeyDown={onKey}
          style={{
            position: "absolute", top: "50%", left: `${a}%`, transform: "translate(-50%,-50%)", width: 24, height: 24,
            borderRadius: "50%", background: "var(--surface)", border: "2px solid var(--accent)",
            boxShadow: "0 2px 8px rgba(2,13,37,0.2)", cursor: "grab", outline: "none",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        {presets.map((p) => (
          <button
            key={p.v}
            onClick={() => onChange(p.v)}
            style={{
              flex: 1, height: 30, borderRadius: 8, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
              border: `1px solid ${value === p.v ? "var(--accent)" : "var(--border-strong)"}`,
              background: value === p.v ? "var(--accent-soft)" : "var(--surface)",
              color: value === p.v ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {p.l}
          </button>
        ))}
      </div>
    </div>
  )
}
