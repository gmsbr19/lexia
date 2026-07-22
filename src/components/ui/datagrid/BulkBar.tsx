"use client"

// Floating acrylic bulk-action bar — a generic, config-driven fork of
// src/components/projetos/pj-kit.tsx's BulkBar (which Tarefas/Projetos already
// ships with a hardcoded field union; forking is lower-risk than genericizing
// in place). Driven by BulkFieldConfig[] so each grid instance (Oportunidades,
// Contatos) supplies its own fields/editors — the bar never assumes a field is
// safe to bulk-edit, that's the caller's job (see mutations.ts server-side
// allowlists, the real source of truth).
import { Menu } from "@/components/tarefas/tf-kit"
import { Icon, type TfIconName } from "@/components/tarefas/tf-icons"
import { lexGlassStrong } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"
import type { BulkFieldConfig } from "./types"

export function BulkBar({
  count,
  fields,
  onClear,
  onApply,
  onDelete,
}: {
  count: number
  fields: BulkFieldConfig[]
  onClear: () => void
  onApply: (field: string, value: unknown) => void
  onDelete?: () => void
}) {
  return (
    <div
      className={lexGlassStrong}
      style={{
        position: "fixed",
        bottom: 22,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 150,
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "8px 10px 8px 14px",
        borderRadius: 14,
        maxWidth: "calc(100% - 32px)",
        flexWrap: "wrap",
        ...glassElevation("0 12px 32px rgba(2,13,37,0.18)"),
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "var(--text)", paddingRight: 6 }}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 22, height: 22, padding: "0 6px", borderRadius: 6, background: "var(--accent)", color: "var(--brand-navy)", fontSize: 12, fontWeight: 600, fontFeatureSettings: '"tnum"' }}>{count}</span>
        selecionada{count > 1 ? "s" : ""}
      </span>
      <span style={{ width: 1, height: 22, background: "var(--border)" }} />
      {fields.map((f) => (
        <Menu
          key={f.field}
          align="left"
          width={220}
          placement="up"
          trigger={
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 30,
                padding: "0 10px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <Icon name={f.icon as TfIconName} size={14} strokeWidth={1.85} />
              {f.label}
              <Icon name="chevronDown" size={12} />
            </span>
          }
        >
          {(close) => f.render((value) => onApply(f.field, value), close)}
        </Menu>
      ))}
      {onDelete && (
        <button
          onClick={onDelete}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderRadius: 8, border: "none", background: "transparent", fontSize: 12, fontWeight: 500, color: "var(--crit,#C0492F)", cursor: "pointer" }}
        >
          <Icon name="trash2" size={14} strokeWidth={1.85} />
          Excluir
        </button>
      )}
      <span style={{ width: 1, height: 22, background: "var(--border)" }} />
      <button onClick={onClear} style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>
        <Icon name="x" size={15} />
      </button>
    </div>
  )
}
