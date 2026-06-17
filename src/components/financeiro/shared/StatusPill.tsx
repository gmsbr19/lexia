import {
  documentStatusPill,
  documentStatusDot,
} from "@/components/documents/page/tabs/LibraryTab/LibraryTab.css"

export type PillTone = "neutral" | "gold" | "green" | "amber" | "red"

const TONE: Record<PillTone, { bg: string; color: string }> = {
  neutral: { bg: "var(--bg-sunken)", color: "var(--text-muted)" },
  gold: { bg: "var(--accent-soft)", color: "var(--accent)" },
  green: { bg: "rgba(46,158,91,0.10)", color: "var(--fin-pos,#2E9E5B)" },
  amber: { bg: "rgba(217,138,43,0.12)", color: "#D98A2B" },
  red: { bg: "rgba(192,73,47,0.10)", color: "var(--fin-neg,#C0492F)" },
}

/** Generalized status pill (built from the LibraryTab pill atoms). */
export function StatusPill({
  label,
  tone = "neutral",
  dot = true,
}: {
  label: string
  tone?: PillTone
  dot?: boolean
}) {
  const t = TONE[tone]
  return (
    <span className={documentStatusPill} style={{ background: t.bg, color: t.color }}>
      {dot && <span className={documentStatusDot} />}
      {label}
    </span>
  )
}
