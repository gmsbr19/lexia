// LexIA · Controles de Visão — painéis de Ordenação, Agrupamento e Colunas.
import React from "react";
import { Icon } from "./vg-icons";
import type { VgSchema, VgColType, VgSortLevel } from "./vg-types";
import { vgCol, VG_TYPE_ICON } from "./vg-engine";
import { VgSelectMenu } from "./vg-editors";
import { VgSeg, VgSwitch, VgSearchRow } from "./vg-atoms";

// reordenação por arraste (HTML5 DnD) — genérica sobre lista de chaves
export function useReorder(list: string[], onReorder: (next: string[]) => void) {
  const [drag, setDrag] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<string | null>(null);
  return (id: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => { setDrag(id); e.dataTransfer.effectAllowed = "move"; },
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); if (over !== id) setOver(id); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (drag != null && drag !== id) {
        const from = list.indexOf(drag), to = list.indexOf(id);
        const next = [...list]; next.splice(from, 1); next.splice(to, 0, drag);
        onReorder(next);
      }
      setDrag(null); setOver(null);
    },
    onDragEnd: () => { setDrag(null); setOver(null); },
    "data-over": over === id && drag !== id ? "1" : undefined,
    "data-dragging": drag === id ? "1" : undefined,
  });
}

// ---------- ORDENAÇÃO ----------
const VG_DIR_LABEL: Record<VgColType, [string, string]> = {
  text: ["A → Z", "Z → A"], enum: ["A → Z", "Z → A"], person: ["A → Z", "Z → A"],
  stage: ["Funil ↑", "Funil ↓"], num: ["0 → 9", "9 → 0"], money: ["Menor", "Maior"], date: ["Antiga", "Recente"],
};
export function VgSortPanel({ schema, levels, onChange }: { schema: VgSchema; levels: VgSortLevel[]; onChange: (s: VgSortLevel[]) => void }) {
  const used = levels.map((l) => l.col);
  const avail = schema.cols.filter((c) => !used.includes(c.key));
  const setLevel = (i: number, patch: Partial<VgSortLevel>) => onChange(levels.map((l, j) => j === i ? { ...l, ...patch } : l));
  const remove = (i: number) => onChange(levels.filter((_, j) => j !== i));
  const add = () => { const c = avail[0]; if (c) onChange([...levels, { col: c.key, dir: "asc" }]); };
  const handlers = useReorder(levels.map((l) => l.col), (order) => onChange(order.map((k) => levels.find((l) => l.col === k)!).filter(Boolean)));
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div className="vc-panel-head"><span className="vc-panel-title"><Icon name="sliders" size={14} />Ordenação</span>{levels.length > 1 && <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>arraste p/ priorizar</span>}</div>
      {levels.length === 0 ? (
        <div style={{ padding: "20px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>Sem ordenação. As linhas seguem a ordem padrão.</div>
          <button className="vc-solidbtn" onClick={add}><Icon name="plus" size={14} />Adicionar ordenação</button>
        </div>
      ) : (
        <div className="vc-panel-body">
          {levels.map((lv, i) => {
            const col = vgCol(schema, lv.col);
            if (!col) return null;
            const dl = VG_DIR_LABEL[col.type] || VG_DIR_LABEL.text;
            return (
              <div key={lv.col} className="vc-sort-row" {...handlers(lv.col)}>
                <span className="vc-grip"><Icon name="gripVertical" size={15} /></span>
                <span className="vc-prio">{i + 1}</span>
                <VgSelectMenu value={lv.col} onChange={(key) => setLevel(i, { col: key })} searchable width={150} menuWidth={220}
                  options={schema.cols.filter((c) => c.key === lv.col || !used.includes(c.key)).map((c) => ({ v: c.key, label: c.label + (c.def === false ? " · oculta" : ""), typeIcon: VG_TYPE_ICON[c.type] }))}
                  renderValue={() => <><Icon name={VG_TYPE_ICON[col.type]} size={13} style={{ color: "var(--text-subtle)" }} />{col.label}</>} />
                <VgSeg size="sm" value={lv.dir} onChange={(dir) => setLevel(i, { dir: dir as "asc" | "desc" })} options={[{ value: "asc", label: dl[0] }, { value: "desc", label: dl[1] }]} />
                <button className="vc-iconbtn" style={{ width: 26, height: 26, marginLeft: "auto" }} onClick={() => remove(i)} title="Remover"><Icon name="x" size={14} /></button>
              </div>
            );
          })}
          {avail.length > 0 && <button className="vc-textbtn" style={{ marginTop: 4 }} onClick={add}><Icon name="plus" size={13} />Adicionar nível</button>}
        </div>
      )}
      <div className="vc-panel-foot">
        <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>Valores vazios sempre por último</span>
        {levels.length > 0 && <button className="vc-textbtn danger" onClick={() => onChange([])}><Icon name="trash2" size={13} />Limpar</button>}
      </div>
    </div>
  );
}

// ---------- AGRUPAMENTO ----------
export function VgGroupPanel({ schema, groupCols, onChange, collapseDefault, setCollapseDefault }: {
  schema: VgSchema; groupCols: string[]; onChange: (g: string[]) => void; collapseDefault: boolean; setCollapseDefault: (v: boolean) => void;
}) {
  const groupable = schema.cols.filter((c) => c.group);
  const opts = (exclude: string[]) => [{ v: "", label: "Nenhum" }, ...groupable.filter((c) => !exclude.includes(c.key)).map((c) => ({ v: c.key, label: c.label, typeIcon: VG_TYPE_ICON[c.type] }))];
  const g0 = groupCols[0] || "", g1 = groupCols[1] || "";
  const setG0 = (v: string) => onChange(v ? (g1 && g1 !== v ? [v, g1] : [v]) : []);
  const setG1 = (v: string) => onChange(v ? [g0, v] : [g0]);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div className="vc-panel-head"><span className="vc-panel-title"><Icon name="layoutGrid" size={14} />Agrupamento</span></div>
      <div className="vc-panel-body" style={{ gap: 14 }}>
        <div>
          <div className="vc-mini-label">Agrupar por</div>
          <VgSelectMenu value={g0} onChange={setG0} options={opts(g1 ? [g1] : [])} searchable width={"100%"} menuWidth={248}
            renderValue={(o) => <><Icon name={o.typeIcon || "layoutGrid"} size={13} style={{ color: "var(--text-subtle)" }} />{o.label}</>} />
        </div>
        {g0 && (
          <div>
            <div className="vc-mini-label">Depois por <span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>(2º nível)</span></div>
            <VgSelectMenu value={g1} onChange={setG1} options={opts([g0])} searchable width={"100%"} menuWidth={248}
              renderValue={(o) => <><Icon name={o.typeIcon || "layoutGrid"} size={13} style={{ color: "var(--text-subtle)" }} />{o.label}</>} />
          </div>
        )}
        {g0 && (
          <label className="vc-toggle-row">
            <span>Recolher grupos ao abrir</span>
            <VgSwitch size="sm" on={collapseDefault} onChange={setCollapseDefault} />
          </label>
        )}
        <div className="vc-note"><Icon name="alertCircle" size={13} style={{ flexShrink: 0, marginTop: 1 }} />Grupos &quot;Sem valor&quot; aparecem por último. Colunas de dinheiro somam por grupo.</div>
      </div>
      {g0 && <div className="vc-panel-foot"><span /><button className="vc-textbtn danger" onClick={() => onChange([])}><Icon name="x" size={13} />Remover agrupamento</button></div>}
    </div>
  );
}

// ---------- COLUNAS ----------
export function VgColumnsPanel({ schema, order, hidden, onOrder, onToggle, frozen, setFrozen, onShowAll, onHideAll }: {
  schema: VgSchema; order: string[]; hidden: string[]; onOrder: (o: string[]) => void; onToggle: (k: string) => void;
  frozen: boolean; setFrozen: (v: boolean) => void; onShowAll: () => void; onHideAll: () => void;
}) {
  const [q, setQ] = React.useState("");
  const cols = order.map((k) => vgCol(schema, k)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const shown = cols.filter((c) => !q || c.label.toLowerCase().includes(q.toLowerCase()));
  const handlers = useReorder(order, onOrder);
  const visCount = cols.filter((c) => !hidden.includes(c.key)).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div className="vc-panel-head"><span className="vc-panel-title"><Icon name="sidebar" size={14} />Colunas</span><span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>{visCount}/{cols.length} visíveis</span></div>
      <div style={{ padding: 8, borderBottom: "1px solid var(--border)" }}><VgSearchRow value={q} onChange={setQ} placeholder="Buscar coluna…" /></div>
      <div className="vc-panel-body" style={{ paddingTop: 6, paddingBottom: 6, gap: 0 }}>
        {shown.map((c) => {
          const off = hidden.includes(c.key);
          return (
            <div key={c.key} className="vc-col-row" {...(q ? {} : handlers(c.key))}>
              <span className="vc-grip" style={{ opacity: q ? 0.25 : 1, cursor: q ? "default" : "grab" }}><Icon name="gripVertical" size={15} /></span>
              <Icon name={VG_TYPE_ICON[c.type]} size={14} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: off ? "var(--text-subtle)" : "var(--text)" }}>{c.label}</span>
              {c.fixed
                ? <span title="Coluna fixa" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Fixa</span>
                : <button className={"vc-eye" + (off ? "" : " on")} onClick={() => onToggle(c.key)} title={off ? "Mostrar" : "Ocultar"}><Icon name="eye" size={15} style={{ opacity: off ? 0.4 : 1 }} /></button>}
            </div>
          );
        })}
      </div>
      <div className="vc-panel-foot" style={{ gap: 8 }}>
        <label className="vc-toggle-row" style={{ padding: 0, flex: 1 }}><span style={{ fontSize: 12 }}>Congelar 1ª coluna</span><VgSwitch size="sm" on={frozen} onChange={setFrozen} /></label>
        <button className="vc-textbtn" onClick={onShowAll}>Mostrar tudo</button>
        <button className="vc-textbtn" onClick={onHideAll}>Ocultar</button>
      </div>
    </div>
  );
}
