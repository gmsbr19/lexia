"use client"

// Glass letterhead picker for the editor's left panel — replaces the raw
// <select> with a frosted dropdown (thumbnail swatch + name + "Padrão do
// escritório"). Only the currently-selected letterhead's real image is loaded
// (the trigger's swatch); the rest show a stylised gold-bar swatch to avoid
// pulling every letterhead's base64 into the picker.
import { useEffect, useRef, useState } from "react"
import { ChevronDown, ExternalLink } from "lucide-react"
import { lexGlassStrong } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"
import { tokens } from "@/styles/tokens.css"
import type { TimbradoRow } from "@/lib/documentos/types"

function Swatch({ image, size = 30 }: { image?: string | null; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        flexShrink: 0,
        overflow: "hidden",
        border: `1px solid ${tokens.color.border}`,
        background: "#fff",
        position: "relative",
        display: "block",
      }}
    >
      {image ? (
        <span style={{ position: "absolute", inset: 0, backgroundImage: `url("${image}")`, backgroundSize: "cover", backgroundPosition: "top center" }} />
      ) : (
        <span style={{ position: "absolute", left: 0, right: 0, top: 0, height: Math.max(4, Math.round(size * 0.16)), background: tokens.color.accentStrong }} />
      )}
    </span>
  )
}

function MenuItem({ active, onClick, swatch, title, subtitle }: { active: boolean; onClick: () => void; swatch: React.ReactNode; title: string; subtitle: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        textAlign: "left",
        padding: "7px 8px",
        borderRadius: 9,
        border: "none",
        background: active ? tokens.color.accentSoft : "transparent",
        cursor: "pointer",
        fontFamily: tokens.font.sans,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = tokens.color.surfaceHover
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent"
      }}
    >
      {swatch}
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: active ? tokens.color.accent : tokens.color.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
        <span style={{ display: "block", fontSize: 11, color: tokens.color.textSubtle }}>{subtitle}</span>
      </span>
    </button>
  )
}

export function TimbradoPicker({
  timbrados,
  value,
  onChange,
  selectedImage,
}: {
  timbrados: TimbradoRow[]
  value: number | null
  onChange: (id: number | null) => void
  selectedImage?: string | null
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("pointerdown", onDown, true)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("pointerdown", onDown, true)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const selected = timbrados.find((t) => t.id === value) || null
  const subtitle = selected ? (selected.padrao ? "Padrão do escritório" : "Papel timbrado") : "Folha em branco"

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          height: 48,
          padding: "0 10px",
          borderRadius: 10,
          border: `1px solid ${tokens.color.border}`,
          background: tokens.color.surface,
          cursor: "pointer",
          fontFamily: tokens.font.sans,
        }}
      >
        <Swatch image={selected ? selectedImage : null} />
        <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: tokens.color.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selected ? selected.nome : "Sem timbrado"}</span>
          <span style={{ display: "block", fontSize: 11, color: tokens.color.textSubtle }}>{subtitle}</span>
        </span>
        <ChevronDown size={16} style={{ color: tokens.color.textMuted, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>

      {open && (
        <div
          className={lexGlassStrong}
          style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 40, borderRadius: 12, padding: 6, ...glassElevation("0 18px 50px rgba(2,13,37,0.28)") }}
        >
          <MenuItem active={value == null} onClick={() => { onChange(null); setOpen(false) }} swatch={<Swatch image={null} />} title="Sem timbrado" subtitle="Folha em branco" />
          {timbrados.map((t) => (
            <MenuItem
              key={t.id}
              active={t.id === value}
              onClick={() => { onChange(t.id); setOpen(false) }}
              swatch={<Swatch image={t.id === value ? selectedImage : null} />}
              title={t.nome}
              subtitle={t.padrao ? "Padrão do escritório" : "Papel timbrado"}
            />
          ))}
          <div style={{ height: 1, background: tokens.color.border, margin: "6px 4px" }} />
          <a
            href="/documents/timbrados"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px", borderRadius: 9, fontSize: 12.5, fontWeight: 500, color: tokens.color.accent, textDecoration: "none" }}
          >
            <ExternalLink size={14} /> Gerenciar papéis timbrados
          </a>
        </div>
      )}
    </div>
  )
}
