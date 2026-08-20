// LexIA · Controles de Visão — seletores e editores de valor por tipo de dado.
import React from "react";
import { Icon, type VgIconName } from "./vg-icons";
import type { VgSchema, VgColumn, VgRule } from "./vg-types";
import { vgOptionsFor, vgNeedsValue, vgParseNaturalDate, VG_TYPE_ICON } from "./vg-engine";
import { VgPopover, VgSearchRow, VgDot, VgAvatar, VgCheck } from "./vg-atoms";

export type SelOption = { v: string; label: string; icon?: VgIconName; color?: string; typeIcon?: VgIconName; person?: string };

// ---------- select genérico (abre menu de vidro) ----------
export function VgSelectMenu({
  value, options, onChange, placeholder = "Selecionar", width, menuWidth, searchable, renderValue, align = "left", tone,
}: {
  value: string;
  options: SelOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  width?: number | string;
  menuWidth?: number;
  searchable?: boolean;
  renderValue?: (o: SelOption) => React.ReactNode;
  align?: "left" | "right";
  tone?: string;
}) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const sel = options.find((o) => o.v === value);
  const list = searchable && q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <>
      <button ref={ref} onClick={() => setOpen((o) => !o)} className={"vc-field-btn" + (open ? " open" : "")} style={{ width, color: tone }}>
        <span className="vc-field-val" style={{ color: sel ? undefined : "var(--text-subtle)" }}>
          {sel ? (renderValue ? renderValue(sel) : (<>{sel.icon && <Icon name={sel.icon} size={13} style={{ color: sel.color }} />}{sel.color && !sel.icon && <VgDot color={sel.color} />}{sel.label}</>)) : placeholder}
        </span>
        <Icon name="chevronDown" size={13} style={{ opacity: 0.55, flexShrink: 0 }} />
      </button>
      <VgPopover anchorRef={ref} open={open} onClose={() => { setOpen(false); setQ(""); }} align={align} width={menuWidth || 240}>
        {searchable && <div style={{ padding: 8, borderBottom: "1px solid var(--border)" }}><VgSearchRow value={q} onChange={setQ} placeholder="Buscar…" autoFocus /></div>}
        <div className="vc-menu-scroll">
          {list.length === 0 && <div style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--text-subtle)" }}>Nada encontrado</div>}
          {list.map((o) => (
            <button key={o.v} className={"vc-opt" + (o.v === value ? " on" : "")} onClick={() => { onChange(o.v); setOpen(false); setQ(""); }}>
              {o.typeIcon && <Icon name={o.typeIcon} size={14} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />}
              {o.icon && <Icon name={o.icon} size={14} style={{ color: o.color, flexShrink: 0 }} />}
              {o.color && !o.icon && !o.typeIcon && <VgDot color={o.color} />}
              <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.label}</span>
              {o.v === value && <Icon name="check" size={14} style={{ color: "var(--accent)" }} />}
            </button>
          ))}
        </div>
      </VgPopover>
    </>
  );
}

export const vgColOptionsFull = (schema: VgSchema) =>
  schema.cols.map((c) => ({ v: c.key, label: c.label, typeIcon: VG_TYPE_ICON[c.type] }));

// ---------- multi-seleção (enum / etapa / pessoa) ----------
export function VgMultiSelect({ schema, col, values, onChange, placeholder = "Selecionar…" }: {
  schema: VgSchema; col: VgColumn; values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const opts = vgOptionsFor(schema, col);
  const list = q ? opts.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : opts;
  const vals = values || [];
  const toggle = (v: string) => onChange(vals.includes(v) ? vals.filter((x) => x !== v) : [...vals, v]);
  return (
    <>
      <button ref={ref} onClick={() => setOpen((o) => !o)} className={"vc-field-btn" + (open ? " open" : "")} style={{ minWidth: 150 }}>
        <span className="vc-field-val" style={{ gap: 5, flexWrap: "nowrap", overflow: "hidden" }}>
          {vals.length === 0 && <span style={{ color: "var(--text-subtle)" }}>{placeholder}</span>}
          {vals.slice(0, 3).map((v) => {
            const o = opts.find((x) => x.v === v) || { label: v, person: undefined, color: undefined };
            return <span key={v} className="vc-token">{o.person ? <VgAvatar id={o.person} people={schema.peopleMap} size={14} /> : o.color ? <VgDot color={o.color} size={7} /> : null}{o.label}</span>;
          })}
          {vals.length > 3 && <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>+{vals.length - 3}</span>}
        </span>
        <Icon name="chevronDown" size={13} style={{ opacity: 0.55, flexShrink: 0 }} />
      </button>
      <VgPopover anchorRef={ref} open={open} onClose={() => { setOpen(false); setQ(""); }} width={250}>
        <div style={{ padding: 8, borderBottom: "1px solid var(--border)" }}><VgSearchRow value={q} onChange={setQ} placeholder="Buscar…" autoFocus /></div>
        <div className="vc-menu-scroll">
          {list.map((o) => {
            const on = vals.includes(o.v);
            return (
              <button key={o.v} className={"vc-opt" + (on ? " on" : "")} onClick={() => toggle(o.v)}>
                <VgCheck checked={on} onChange={() => toggle(o.v)} />
                {o.person ? <VgAvatar id={o.person} people={schema.peopleMap} size={20} /> : o.icon ? <Icon name={o.icon} size={14} style={{ color: o.color }} /> : o.color ? <VgDot color={o.color} /> : null}
                <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.label}</span>
              </button>
            );
          })}
        </div>
        {vals.length > 0 && <div style={{ padding: 7, borderTop: "1px solid var(--border)" }}><button className="vc-textbtn" onClick={() => onChange([])}>Limpar seleção</button></div>}
      </VgPopover>
    </>
  );
}

// ---------- inputs simples ----------
export const VgTextInput = ({ value, onChange, placeholder = "valor", autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }) => {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);
  return <input ref={ref} className="vc-inp" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
};
const VgNumberInput = ({ value, onChange, placeholder = "0" }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <input className="vc-inp" inputMode="decimal" style={{ fontFamily: "var(--font-mono)", width: 96 }} value={value ?? ""} onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ""))} placeholder={placeholder} />
);
const VgMoneyInput = ({ value, onChange, placeholder = "0" }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <span style={{ position: "relative", display: "inline-flex" }}>
    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-subtle)", fontFamily: "var(--font-mono)", pointerEvents: "none" }}>R$</span>
    <input className="vc-inp" inputMode="decimal" style={{ fontFamily: "var(--font-mono)", width: 120, paddingLeft: 32 }} value={value ?? ""} onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))} placeholder={placeholder} />
  </span>
);

// ---------- editor de data (linguagem natural + atalhos + calendário) ----------
export function VgDateEditor({ value, onChange, today, placeholder = "ex.: próxima semana" }: { value: string; onChange: (v: string) => void; today: string; placeholder?: string }) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);
  const [txt, setTxt] = React.useState("");
  const preview = txt ? vgParseNaturalDate(txt, today) : null;
  const shortcuts: [string, string][] = [["Hoje", "hoje"], ["Amanhã", "amanhã"], ["Em 7 dias", "próxima semana"], ["Dia 1", "dia 1"], ["Dia 15", "dia 15"]];
  const commit = (iso: string | null) => { if (iso) { onChange(iso); setOpen(false); setTxt(""); } };
  return (
    <>
      <button ref={ref} onClick={() => setOpen((o) => !o)} className={"vc-field-btn" + (open ? " open" : "")} style={{ minWidth: 130 }}>
        <span className="vc-field-val"><Icon name="calendar" size={13} style={{ color: "var(--text-subtle)" }} />{value ? <span style={{ fontVariantNumeric: "tabular-nums" }}>{new Date(value + "T12:00").toLocaleDateString("pt-BR")}</span> : <span style={{ color: "var(--text-subtle)" }}>Data</span>}</span>
        <Icon name="chevronDown" size={13} style={{ opacity: 0.55, flexShrink: 0 }} />
      </button>
      <VgPopover anchorRef={ref} open={open} onClose={() => { setOpen(false); setTxt(""); }} width={272}>
        <div style={{ padding: 10 }}>
          <div className="vc-searchrow" style={{ marginBottom: 8 }}>
            <Icon name="wand" size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <input autoFocus value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") commit(preview); }} placeholder={placeholder} />
          </div>
          {txt && <div style={{ fontSize: 11.5, color: preview ? "var(--accent)" : "var(--text-subtle)", padding: "0 2px 8px" }}>{preview ? "→ " + new Date(preview + "T12:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long" }) : 'Não reconhecido — tente "dia 15" ou 15/08'}</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
            {shortcuts.map(([lab, exp]) => <button key={lab} className="vc-chip-sm" onClick={() => commit(vgParseNaturalDate(exp, today))}>{lab}</button>)}
          </div>
          <VgMiniCalendar value={value} today={today} onPick={commit} />
        </div>
      </VgPopover>
    </>
  );
}

function VgMiniCalendar({ value, today, onPick }: { value: string; today: string; onPick: (iso: string) => void }) {
  const base = value ? new Date(value + "T12:00") : new Date(today + "T12:00");
  const [cur, setCur] = React.useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const y = cur.getFullYear(), m = cur.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const iso = (d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const todayISO = today;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <button className="vc-iconbtn" style={{ width: 24, height: 24 }} onClick={() => setCur(new Date(y, m - 1, 1))}><Icon name="chevronLeft" size={14} /></button>
        <span style={{ fontSize: 12.5, fontWeight: 600, textTransform: "capitalize" }}>{cur.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
        <button className="vc-iconbtn" style={{ width: 24, height: 24 }} onClick={() => setCur(new Date(y, m + 1, 1))}><Icon name="chevronRight" size={14} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <span key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: "var(--text-subtle)", padding: "2px 0" }}>{d}</span>)}
        {cells.map((d, i) => d == null ? <span key={i} /> : (
          <button key={i} onClick={() => onPick(iso(d))} className={"vc-calday" + (iso(d) === value ? " sel" : "") + (iso(d) === todayISO ? " today" : "")}>{d}</button>
        ))}
      </div>
    </div>
  );
}

// ---------- despachante: editor conforme regra ----------
export function VgValueEditor({ schema, col, rule, onChange }: { schema: VgSchema; col: VgColumn; rule: VgRule; onChange: (r: VgRule) => void }) {
  const set = (patch: Partial<VgRule>) => onChange({ ...rule, ...patch });
  const t = col.type;
  if (!vgNeedsValue(rule.op)) return null;
  if (t === "enum" || t === "stage" || t === "person") return <VgMultiSelect schema={schema} col={col} values={rule.values} onChange={(values) => set({ values })} />;
  if (t === "date") {
    if (rule.op === "between") return <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><VgDateEditor value={rule.value} today={schema.today} onChange={(v) => set({ value: v })} /><span style={{ fontSize: 12, color: "var(--text-subtle)" }}>e</span><VgDateEditor value={rule.value2} today={schema.today} onChange={(v) => set({ value2: v })} /></span>;
    return <VgDateEditor value={rule.value} today={schema.today} onChange={(v) => set({ value: v })} />;
  }
  const NumField = t === "money" ? VgMoneyInput : VgNumberInput;
  if (t === "num" || t === "money") {
    if (rule.op === "between") return <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><NumField value={rule.value} onChange={(v) => set({ value: v })} /><span style={{ fontSize: 12, color: "var(--text-subtle)" }}>e</span><NumField value={rule.value2} onChange={(v) => set({ value2: v })} /></span>;
    return <NumField value={rule.value} onChange={(v) => set({ value: v })} />;
  }
  return <VgTextInput value={rule.value} onChange={(v) => set({ value: v })} autoFocus />;
}
