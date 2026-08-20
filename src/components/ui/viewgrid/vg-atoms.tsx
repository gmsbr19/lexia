// LexIA · Controles de Visão — superfícies de vidro, átomos e renderização de célula.
import React from "react";
import ReactDOM from "react-dom";
import { Icon, type VgIconName } from "./vg-icons";
import type { VgSchema, VgColumn, VgRow, VgPerson, VgEnumMeta } from "./vg-types";
import { vgFmtMoney, vgFmtDate, vgColorMix } from "./vg-engine";

// ---------- posicionamento ancorado ----------
type Pos = { left: number; top: number; width: number; maxH: number; container: Element };
export function useAnchoredPos(
  anchorRef: React.RefObject<HTMLElement | null>,
  open: boolean,
  { align = "left", gap = 6, width }: { align?: "left" | "right"; gap?: number; width?: number } = {},
): Pos | null {
  const [pos, setPos] = React.useState<Pos | null>(null);
  React.useLayoutEffect(() => {
    if (!open) return;
    const calc = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      const w = width || Math.max(r.width, 260);
      let left = align === "right" ? r.right - w : r.left;
      left = Math.min(Math.max(8, left), vw - w - 8);
      const top = r.bottom + gap;
      const maxH = vh - top - 12;
      const container = el.closest(".vc-root") ?? document.body;
      setPos({ left, top, width: w, maxH, container });
    };
    calc();
    window.addEventListener("resize", calc);
    window.addEventListener("scroll", calc, true);
    return () => { window.removeEventListener("resize", calc); window.removeEventListener("scroll", calc, true); };
  }, [open, align, gap, width, anchorRef]);
  return pos;
}

// ---------- superfície de vidro ----------
export const VgGlass = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function VgGlass({ style, children, className, ...rest }, ref) {
    return <div ref={ref} className={"vc-glass" + (className ? " " + className : "")} style={style} {...rest}>{children}</div>;
  },
);

// ---------- pilha de popovers (fecha do topo p/ baixo; suporta aninhamento) ----------
type PopEntry = { getEl: () => HTMLElement | null; getAnchor: () => HTMLElement | null; close: () => void };
const VG_POPS: PopEntry[] = [];
let _vgPopInit = false;
function vgInitPopListeners() {
  if (_vgPopInit || typeof window === "undefined") return;
  _vgPopInit = true;
  window.addEventListener("mousedown", (e) => {
    for (let i = VG_POPS.length - 1; i >= 0; i--) {
      const p = VG_POPS[i], el = p.getEl(), an = p.getAnchor();
      if ((el && el.contains(e.target as Node)) || (an && an.contains(e.target as Node))) break;
      p.close();
    }
  }, true);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && VG_POPS.length) { e.stopPropagation(); VG_POPS[VG_POPS.length - 1].close(); }
  }, true);
}

export function VgPopover({
  anchorRef, open, onClose, align = "left", width, children, maxHeight, label,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  align?: "left" | "right";
  width?: number | "fit";
  children: React.ReactNode;
  maxHeight?: number;
  label?: string;
}) {
  const fit = width === "fit";
  const pos = useAnchoredPos(anchorRef, open, { align, width: fit ? undefined : (width as number | undefined) });
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(onClose);
  React.useEffect(() => { closeRef.current = onClose; });
  const [fitLeft, setFitLeft] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!open) return;
    vgInitPopListeners();
    const entry: PopEntry = { getEl: () => panelRef.current, getAnchor: () => anchorRef.current, close: () => closeRef.current() };
    VG_POPS.push(entry);
    return () => { const i = VG_POPS.indexOf(entry); if (i >= 0) VG_POPS.splice(i, 1); };
  }, [open, anchorRef]);
  React.useLayoutEffect(() => {
    if (!open || !fit || !pos || !panelRef.current) return;
    const w = panelRef.current.offsetWidth, vw = window.innerWidth;
    const l = pos.left + w > vw - 8 ? Math.max(8, vw - 8 - w) : pos.left;
    setFitLeft(l);
  }, [open, fit, pos]);
  if (!open || !pos) return null;
  return ReactDOM.createPortal(
    <VgGlass ref={panelRef} data-vc-pop="1" role="dialog" aria-label={label} className="vc-pop-in" style={{
      position: "fixed", top: pos.top, left: fit && fitLeft != null ? fitLeft : pos.left,
      width: fit ? "max-content" : pos.width, maxWidth: fit ? "calc(100vw - 16px)" : undefined, zIndex: 1400,
      maxHeight: maxHeight || pos.maxH, display: "flex", flexDirection: "column",
    }}>{children}</VgGlass>,
    pos.container,
  );
}

// ---------- botões da barra ----------
export const VgBtn = React.forwardRef<HTMLButtonElement, {
  icon?: VgIconName; children?: React.ReactNode; active?: boolean; count?: number;
  onClick?: () => void; chevron?: boolean; title?: string; danger?: boolean;
}>(function VgBtn({ icon, children, active, count, onClick, chevron, title, danger }, ref) {
  return (
    <button ref={ref} onClick={onClick} title={title} className={"vc-ctrlbtn" + (active ? " on" : "")} style={danger ? { color: "var(--crit)" } : undefined}>
      {icon && <Icon name={icon} size={15} strokeWidth={1.9} />}
      {children && <span>{children}</span>}
      {count != null && count > 0 && <span className="vc-count">{count}</span>}
      {chevron && <Icon name="chevronDown" size={13} style={{ opacity: 0.6, marginLeft: -2 }} />}
    </button>
  );
});

export const VgIconBtn = React.forwardRef<HTMLButtonElement, {
  icon: VgIconName; onClick?: () => void; active?: boolean; title?: string; size?: number;
}>(function VgIconBtn({ icon, onClick, active, title, size = 15 }, ref) {
  return <button ref={ref} onClick={onClick} title={title} className={"vc-iconbtn" + (active ? " on" : "")}><Icon name={icon} size={size} strokeWidth={1.9} /></button>;
});

// ---------- segmented ----------
export type SegOption = { value: string; label: string; icon?: VgIconName };
export function VgSeg({ options, value, onChange, size = "md" }: {
  options: SegOption[]; value: string; onChange: (v: string) => void; size?: "sm" | "md";
}) {
  return (
    <div className="vc-seg" style={{ height: size === "sm" ? 30 : 34 }}>
      {options.map((o) => {
        const on = o.value === value;
        return <button key={o.value} onClick={() => onChange(o.value)} className={on ? "on" : ""}>{o.icon && <Icon name={o.icon} size={14} />}{o.label}</button>;
      })}
    </div>
  );
}

// ---------- switch ----------
export function VgSwitch({ on, onChange, size = "md" }: { on: boolean; onChange: (v: boolean) => void; size?: "sm" | "md" }) {
  const w = size === "sm" ? 30 : 36, h = size === "sm" ? 17 : 20, k = h - 6;
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} style={{ width: w, height: h, borderRadius: 999, border: "none", cursor: "pointer", padding: 0, position: "relative", flexShrink: 0, background: on ? "var(--accent-strong)" : "var(--border-strong)", transition: "background .16s" }}>
      <span style={{ position: "absolute", top: 3, left: on ? w - k - 3 : 3, width: k, height: k, borderRadius: "50%", background: "#fff", transition: "left .16s var(--ease)", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
    </button>
  );
}

// ---------- checkbox quadrado ----------
export function VgCheck({ checked, onChange, indeterminate }: { checked: boolean; onChange?: (v: boolean) => void; indeterminate?: boolean }) {
  return (
    <span onClick={(e) => { e.stopPropagation(); onChange?.(!checked); }} className={"vc-check" + (checked || indeterminate ? " on" : "")} role="checkbox" aria-checked={checked}>
      {checked && <Icon name="check" size={11} strokeWidth={3} />}
      {!checked && indeterminate && <span style={{ width: 8, height: 2, borderRadius: 1, background: "var(--brand-navy)" }} />}
    </span>
  );
}

// ---------- campo de busca dentro de painel ----------
export function VgSearchRow({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);
  return (
    <div className="vc-searchrow">
      <Icon name="search" size={14} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
      <input ref={ref} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && <button className="vc-iconbtn" style={{ width: 22, height: 22 }} onClick={() => onChange("")}><Icon name="x" size={13} /></button>}
    </div>
  );
}

// ---------- átomos de cor / avatar ----------
export const VgDot = ({ color, size = 8 }: { color: string; size?: number }) =>
  <span style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />;

export function VgAvatar({ id, people, size = 24 }: { id: string | null | undefined; people: Record<string, VgPerson>; size?: number }) {
  const p = id ? people[id] : null;
  if (!p) return <span title="Sem responsável" style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, border: "1.5px dashed var(--border-strong)", color: "var(--text-subtle)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="user" size={size * 0.5} /></span>;
  return <span title={p.nome} style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: p.cor, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 600, letterSpacing: "-0.02em" }}>{p.ini}</span>;
}

// mini avatar quadrado-arredondado p/ PJ, redondo p/ PF (Contatos)
export function VgContactMark({ nome, pj, size = 30 }: { nome: string; pj: boolean; size?: number }) {
  const ini = (nome || "?").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return <span style={{ width: size, height: size, borderRadius: pj ? size * 0.28 : "50%", flexShrink: 0, background: "var(--bg-sunken)", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 600 }}>{ini}</span>;
}

// ---------- chip de enum ----------
export function VgEnumChip({ schema, col, value, size = "md" }: { schema: VgSchema; col: VgColumn; value: unknown; size?: "sm" | "md" }) {
  if (value == null || value === "") return <span style={{ color: "var(--text-subtle)" }}>—</span>;
  const meta: Partial<VgEnumMeta> = (col.enum ? schema.enums[col.enum]?.[String(value)] : undefined) ?? {};
  const color = meta.c || "var(--text-muted)";
  const sm = size === "sm";
  if (col.type === "stage") {
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: sm ? 11 : 11.5, fontWeight: 500, padding: sm ? "2px 8px" : "3px 9px", borderRadius: 6, color, background: vgColorMix(color, sm ? 0.16 : 0.18), whiteSpace: "nowrap" }}><VgDot color={color} size={6} />{String(value)}</span>;
  }
  if (col.enum === "qualState") {
    return <span title={meta.d} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: sm ? 20 : 22, height: sm ? 20 : 22, borderRadius: 6, fontSize: sm ? 11.5 : 12.5, fontWeight: 700, color, background: vgColorMix(color, 0.18) }}>{String(value)}</span>;
  }
  if (meta.icon) {
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: sm ? 11.5 : 12.5, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap" }}><Icon name={meta.icon} size={sm ? 12 : 13} style={{ color }} strokeWidth={2} />{String(value)}</span>;
  }
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: sm ? 11.5 : 12.5, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap" }}><VgDot color={color} />{String(value)}</span>;
}

// ---------- medidor 0-100 ----------
export function VgMeter({ value, tone }: { value: number; tone?: "gold" | "blue" }) {
  const col = tone === "blue" ? "oklch(0.68 0.12 230)" : "var(--accent-strong)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
      <span style={{ width: 34, height: 4, borderRadius: 3, background: "var(--bg-sunken)", overflow: "hidden", flexShrink: 0 }}><span style={{ display: "block", width: `${value}%`, height: "100%", background: col, borderRadius: 3 }} /></span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--text)", width: 18, textAlign: "right", fontFeatureSettings: '"tnum"' }}>{value}</span>
    </span>
  );
}

// ---------- renderização de célula (compartilhada tabela + kanban) ----------
export function vgRenderCell(row: VgRow, col: VgColumn, schema: VgSchema): React.ReactNode {
  const v = row[col.key];
  switch (col.type) {
    case "text":
      if (col.personType) {
        const pj = String(row.tipo) === "pj" || String(row.tipo) === "Pessoa jurídica";
        return <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}><VgContactMark nome={String(v ?? "")} pj={pj} /><span style={{ fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{String(v ?? "")}</span></span>;
      }
      if (col.fixed) return <span style={{ fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{String(v ?? "")}</span>;
      return <span style={{ color: v ? "var(--text-muted)" : "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{v ? String(v) : "—"}</span>;
    case "enum":
    case "stage":
      return <VgEnumChip schema={schema} col={col} value={v} />;
    case "person":
      return <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}><VgAvatar id={v ? String(v) : null} people={schema.peopleMap} size={22} /><span style={{ fontSize: 12.5, color: v ? "var(--text)" : "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v ? (schema.peopleMap[String(v)]?.nome ?? "—") : "Sem resp."}</span></span>;
    case "num":
      if (col.meter) return <VgMeter value={Number(v) || 0} tone={col.meter} />;
      return <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600, fontFeatureSettings: '"tnum"', color: v ? "var(--text)" : "var(--text-subtle)" }}>{v == null || v === "" ? "—" : String(v)}</span>;
    case "money":
      return <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600, fontFeatureSettings: '"tnum"', color: v == null ? "var(--text-subtle)" : "var(--text)" }}>{vgFmtMoney(v)}</span>;
    case "date":
      return <span style={{ fontSize: 12.5, color: v ? "var(--text-muted)" : "var(--text-subtle)", whiteSpace: "nowrap" }}>{vgFmtDate(v as string, schema.today)}</span>;
    default:
      return String(v ?? "—");
  }
}
