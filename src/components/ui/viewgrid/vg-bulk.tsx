// LexIA · Controles de Visão — barra de ações em lote (seleção). Estilo vc glass.
import React from "react";
import { Icon, type VgIconName } from "./vg-icons";
import type { VgPerson } from "./vg-types";
import { VgPopover, VgDot, VgAvatar } from "./vg-atoms";

export type VgBulkOption = { value: string | null; label: string; color?: string; icon?: VgIconName; person?: string };
export type VgBulkField = { field: string; label: string; icon: VgIconName; options: VgBulkOption[] };

function VgBulkMenu({ field, onApply, peopleMap }: { field: VgBulkField; onApply: (field: string, value: string | null) => void; peopleMap: Record<string, VgPerson> }) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button ref={ref} className="vc-ctrlbtn" onClick={() => setOpen((o) => !o)}>
        <Icon name={field.icon} size={14} />{field.label}<Icon name="chevronDown" size={12} style={{ opacity: 0.6 }} />
      </button>
      <VgPopover anchorRef={ref} open={open} onClose={() => setOpen(false)} width={220} align="left">
        <div className="vc-menu-scroll" style={{ padding: 5, maxHeight: 320 }}>
          {field.options.map((o) => (
            <button key={String(o.value)} className="vc-opt" onClick={() => { onApply(field.field, o.value); setOpen(false); }}>
              {o.person ? <VgAvatar id={o.person} people={peopleMap} size={20} /> : o.icon ? <Icon name={o.icon} size={14} style={{ color: o.color }} /> : o.color ? <VgDot color={o.color} /> : null}
              <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.label}</span>
            </button>
          ))}
        </div>
      </VgPopover>
    </>
  );
}

export function VgBulkBar({ count, fields, onApply, onExport, onDelete, onClear, peopleMap }: {
  count: number; fields: VgBulkField[]; onApply: (field: string, value: string | null) => void;
  onExport?: () => void; onDelete?: () => void; onClear: () => void; peopleMap: Record<string, VgPerson>;
}) {
  if (count === 0) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0,
      margin: "0 24px 10px", padding: "8px 12px", borderRadius: "var(--r-sm)",
      background: "var(--accent-soft)", border: "1px solid var(--border-gold)",
    }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent)", whiteSpace: "nowrap" }}>{count} selecionado{count === 1 ? "" : "s"}</span>
      <span style={{ width: 1, height: 20, background: "var(--border-strong)", margin: "0 2px" }} />
      {fields.map((f) => <VgBulkMenu key={f.field} field={f} onApply={onApply} peopleMap={peopleMap} />)}
      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        {onExport && <button className="vc-ctrlbtn" onClick={onExport}><Icon name="download" size={14} />Exportar</button>}
        {onDelete && <button className="vc-ctrlbtn" style={{ color: "var(--crit)" }} onClick={onDelete}><Icon name="trash2" size={14} />Excluir</button>}
        <button className="vc-iconbtn" onClick={onClear} title="Cancelar seleção"><Icon name="x" size={15} /></button>
      </span>
    </div>
  );
}
