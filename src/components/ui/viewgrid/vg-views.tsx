// LexIA · Controles de Visão — visões salvas (abas estilo Notion) + chips de estado ativo.
import React from "react";
import { Icon } from "./vg-icons";
import type { VgSchema, VgGroup, VgRule, VgSortLevel, VgSavedView } from "./vg-types";
import { vgCol, vgOpLabel, vgNeedsValue, vgOptionsFor, vgFmtMoney, vgCountActive, vgRuleActive } from "./vg-engine";
import { VgPopover } from "./vg-atoms";

// resumo textual de uma regra (para chips)
export function vgRuleSummary(rule: VgRule, schema: VgSchema): string {
  const col = vgCol(schema, rule.col);
  if (!col) return "";
  const op = vgOpLabel(col, rule.op);
  if (!vgNeedsValue(rule.op)) return `${col.label} · ${op}`;
  let val = "";
  if (col.type === "enum" || col.type === "stage" || col.type === "person") {
    const opts = vgOptionsFor(schema, col);
    const names = (rule.values || []).map((v) => (opts.find((o) => o.v === v) || { label: v }).label);
    val = names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  } else if (col.type === "money") {
    val = rule.op === "between" ? `${vgFmtMoney(+rule.value)}–${vgFmtMoney(+rule.value2)}` : vgFmtMoney(+rule.value);
  } else if (col.type === "date") {
    const f = (d: string) => d ? new Date(d + "T12:00").toLocaleDateString("pt-BR") : "?";
    val = rule.op === "between" ? `${f(rule.value)}–${f(rule.value2)}` : f(rule.value);
  } else {
    val = rule.op === "between" ? `${rule.value}–${rule.value2}` : rule.value;
  }
  return `${col.label} ${op} ${val}`;
}

// ---------- chips de estado ativo ----------
export function VgActiveChips({ schema, root, sort, group, onOpenFilters, onRemoveFilter, onOpenSort, onRemoveSort, onOpenGroup, onClearGroup, onClearAll }: {
  schema: VgSchema; root: VgGroup; sort: VgSortLevel[]; group: string[];
  onOpenFilters: () => void; onRemoveFilter: (id: string) => void;
  onOpenSort: () => void; onRemoveSort: (col: string) => void;
  onOpenGroup: () => void; onClearGroup: (gk: string) => void; onClearAll: () => void;
}) {
  const filterChips = root.children.map((child) => {
    if (child.type === "group") {
      const n = vgCountActive(child, schema);
      if (!n) return null;
      return { id: child.id, icon: "braces" as const, label: `Grupo · ${n} regra${n === 1 ? "" : "s"} (${child.combinator})`, group: true };
    }
    if (!vgRuleActive(child, schema)) return null;
    return { id: child.id, icon: "filter" as const, label: vgRuleSummary(child, schema), group: false };
  }).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const hasAny = filterChips.length || sort.length || group.length;
  if (!hasAny) return null;
  return (
    <div className="vc-chips">
      {filterChips.map((c, i) => (
        <React.Fragment key={c.id}>
          {i > 0 && <span className="vc-chip-join">{root.combinator}</span>}
          <span className="vc-chip" onClick={onOpenFilters}>
            <Icon name={c.icon} size={12} style={{ color: c.group ? "var(--accent)" : "var(--text-muted)" }} />
            <span className="vc-chip-tx">{c.label}</span>
            <button className="vc-chip-x" onClick={(e) => { e.stopPropagation(); onRemoveFilter(c.id); }}><Icon name="x" size={12} /></button>
          </span>
        </React.Fragment>
      ))}
      {sort.map((lv) => {
        const col = vgCol(schema, lv.col);
        if (!col) return null;
        return (
          <span key={"s" + lv.col} className="vc-chip sort" onClick={onOpenSort}>
            <Icon name="sliders" size={12} style={{ color: "var(--text-muted)" }} />
            <span className="vc-chip-tx">{col.label}</span>
            <Icon name="chevronDown" size={12} style={{ transform: lv.dir === "asc" ? "rotate(180deg)" : "none", color: "var(--accent)" }} />
            <button className="vc-chip-x" onClick={(e) => { e.stopPropagation(); onRemoveSort(lv.col); }}><Icon name="x" size={12} /></button>
          </span>
        );
      })}
      {group.map((gk) => {
        const col = vgCol(schema, gk);
        if (!col) return null;
        return (
          <span key={"g" + gk} className="vc-chip group" onClick={onOpenGroup}>
            <Icon name="layoutGrid" size={12} style={{ color: "var(--text-muted)" }} />
            <span className="vc-chip-tx">Agrupado por {col.label}</span>
            <button className="vc-chip-x" onClick={(e) => { e.stopPropagation(); onClearGroup(gk); }}><Icon name="x" size={12} /></button>
          </span>
        );
      })}
      <button className="vc-textbtn danger" style={{ marginLeft: 2 }} onClick={onClearAll}>Limpar tudo</button>
    </div>
  );
}

// ---------- aba de visão ----------
type ViewActions = {
  rename: (id: string, name: string) => void;
  duplicate: (id: string) => void;
  setDefault: (id: string) => void;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
function VgViewTab({ view, active, dirty, onSelect, actions, canDelete }: {
  view: VgSavedView; active: boolean; dirty: boolean; onSelect: () => void; actions: ViewActions; canDelete: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [menu, setMenu] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(view.name);
  // sincroniza o campo com a mudança externa do nome — DURANTE o render (sem efeito)
  const [lastName, setLastName] = React.useState(view.name);
  if (view.name !== lastName) { setLastName(view.name); setName(view.name); }
  const commit = () => { setEditing(false); if (name.trim()) actions.rename(view.id, name.trim()); else setName(view.name); };
  return (
    <>
      <div ref={ref} className={"vc-viewtab" + (active ? " on" : "")} onClick={() => !editing && onSelect()} onDoubleClick={() => active && setEditing(true)}>
        <Icon name={view.icon} size={13} strokeWidth={active ? 2 : 1.75} />
        {editing
          ? <input autoFocus className="vc-viewtab-inp" value={name} onChange={(e) => setName(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setName(view.name); setEditing(false); } }} onClick={(e) => e.stopPropagation()} />
          : <span className="vc-viewtab-name">{view.name}</span>}
        {view.isDefault && !editing && <Icon name="star" size={11} style={{ color: "var(--accent)", fill: "var(--accent)" }} />}
        {active && dirty && <span className="vc-dirty" title="Alterações não salvas" />}
        {active && !editing && <button className="vc-viewtab-menu" onClick={(e) => { e.stopPropagation(); setMenu((m) => !m); }}><Icon name="chevronDown" size={12} /></button>}
      </div>
      <VgPopover anchorRef={ref} open={menu} onClose={() => setMenu(false)} width={210} align="left">
        <div className="vc-menu-scroll" style={{ padding: 5 }}>
          {dirty && <><button className="vc-menuitem" onClick={() => { actions.reset(view.id); setMenu(false); }}><Icon name="refreshCw" size={14} />Restaurar visão salva</button><div className="vc-menu-sep" /></>}
          <button className="vc-menuitem" onClick={() => { setEditing(true); setMenu(false); }}><Icon name="edit" size={14} />Renomear</button>
          <button className="vc-menuitem" onClick={() => { actions.duplicate(view.id); setMenu(false); }}><Icon name="copy" size={14} />Duplicar</button>
          <button className="vc-menuitem" onClick={() => { actions.setDefault(view.id); setMenu(false); }}><Icon name="star" size={14} />Definir como padrão</button>
          <div className="vc-menu-sep" />
          <button className="vc-menuitem danger" disabled={!canDelete} onClick={() => { if (canDelete) { actions.remove(view.id); setMenu(false); } }}><Icon name="trash2" size={14} />Excluir visão</button>
        </div>
      </VgPopover>
    </>
  );
}

export function VgViewsBar({ views, activeId, dirty, onSelect, onAdd, onSave, actions }: {
  views: VgSavedView[]; activeId: string; dirty: boolean; onSelect: (id: string) => void; onAdd: () => void; onSave: () => void; actions: ViewActions;
}) {
  return (
    <div className="vc-viewsbar">
      <div className="vc-viewtabs">
        {views.map((v) => (
          <VgViewTab key={v.id} view={v} active={v.id === activeId} dirty={dirty}
            onSelect={() => onSelect(v.id)} canDelete={views.length > 1} actions={actions} />
        ))}
        <button className="vc-viewadd" onClick={onAdd} title="Nova visão"><Icon name="plus" size={15} /></button>
      </div>
      {dirty && (
        <div className="vc-viewsave">
          <button className="vc-textbtn" onClick={() => actions.reset(activeId)}>Descartar</button>
          <button className="vc-solidbtn" style={{ height: 28 }} onClick={onSave}><Icon name="check" size={13} />Salvar visão</button>
        </div>
      )}
    </div>
  );
}
