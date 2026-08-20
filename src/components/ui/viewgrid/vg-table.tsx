// LexIA · Controles de Visão — a tabela: cabeçalho, linhas, grupos, densidade, seleção e estados.
import React from "react";
import { Icon } from "./vg-icons";
import type { VgSchema, VgColumn, VgRow, VgSortLevel, VgDensity, VgBuiltGroup } from "./vg-types";
import { vgBuildGroups, vgFmtMoney } from "./vg-engine";
import { VgPopover, VgCheck, VgAvatar, VgEnumChip, vgRenderCell } from "./vg-atoms";

export const VG_DENS: Record<VgDensity, { h: number; pad: string; fs: number }> = {
  comfortable: { h: 46, pad: "0 14px", fs: 13 },
  compact: { h: 33, pad: "0 12px", fs: 12.5 },
};

type MenuActions = { sortAsc: () => void; sortDesc: () => void; groupBy: () => void; filterBy: () => void; hide: () => void };

function VgHeaderCell({ col, width, sortDir, onSort, onResize, menuActions, density, first, frozen, selW }: {
  col: VgColumn; width: number; sortDir?: "asc" | "desc"; onSort: (shift: boolean) => void; onResize: (w: number) => void;
  menuActions: MenuActions; density: { h: number }; first: boolean; frozen: boolean; selW: number;
}) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = React.useState(false);
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX, w0 = width;
    const move = (ev: PointerEvent) => onResize(Math.max(64, w0 + (ev.clientX - x0)));
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); document.body.style.cursor = ""; };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); document.body.style.cursor = "col-resize";
  };
  return (
    <div className={"vc-th" + (col.align === "right" ? " r" : "") + (first && frozen ? " frozen" : "")} style={{ width, minWidth: width, height: density.h, left: first && frozen ? selW : undefined }}>
      <button ref={ref} className="vc-th-btn" onClick={(e) => onSort(e.shiftKey)}>
        <span className="vc-th-lbl">{col.label}</span>
        {sortDir && <Icon name="chevronDown" size={12} style={{ transform: sortDir === "asc" ? "rotate(180deg)" : "none", color: "var(--accent)", flexShrink: 0 }} />}
      </button>
      <button className="vc-th-more" onClick={(e) => { e.stopPropagation(); setMenu((m) => !m); }}><Icon name="chevronDown" size={13} /></button>
      <span className="vc-th-resize" onPointerDown={startResize} />
      <VgPopover anchorRef={ref} open={menu} onClose={() => setMenu(false)} width={196} align="left">
        <div className="vc-menu-scroll" style={{ padding: 5 }}>
          <button className="vc-menuitem" onClick={() => { menuActions.sortAsc(); setMenu(false); }}><Icon name="chevronDown" size={14} style={{ transform: "rotate(180deg)" }} />Ordem crescente</button>
          <button className="vc-menuitem" onClick={() => { menuActions.sortDesc(); setMenu(false); }}><Icon name="chevronDown" size={14} />Ordem decrescente</button>
          {col.group && <button className="vc-menuitem" onClick={() => { menuActions.groupBy(); setMenu(false); }}><Icon name="layoutGrid" size={14} />Agrupar por esta</button>}
          <button className="vc-menuitem" onClick={() => { menuActions.filterBy(); setMenu(false); }}><Icon name="filter" size={14} />Filtrar por esta</button>
          {!col.fixed && <><div className="vc-menu-sep" /><button className="vc-menuitem" onClick={() => { menuActions.hide(); setMenu(false); }}><Icon name="eye" size={14} />Ocultar coluna</button></>}
        </div>
      </VgPopover>
    </div>
  );
}

const ACT_W = 46;

function VgTableRow({ row, cols, widths, density, frozen, schema, selectable, selected, onToggleSel, onRowClick, selW, rowActions }: {
  row: VgRow; cols: VgColumn[]; widths: Record<string, number>; density: { h: number; pad: string; fs: number };
  frozen: boolean; schema: VgSchema; selectable: boolean; selected: boolean; onToggleSel?: (id: string | number) => void;
  onRowClick?: (row: VgRow) => void; selW: number; rowActions?: (row: VgRow) => React.ReactNode;
}) {
  return (
    <div className={"vc-tr" + (onRowClick ? " clickable" : "") + (selected ? " sel" : "")} style={{ height: density.h }}
      onClick={onRowClick ? () => onRowClick(row) : undefined}>
      {selectable && (
        <div className="vc-sel-cell" style={{ height: density.h }} onClick={(e) => { e.stopPropagation(); onToggleSel?.(row.id); }}>
          <VgCheck checked={selected} onChange={() => onToggleSel?.(row.id)} />
        </div>
      )}
      {cols.map((c, i) => (
        <div key={c.key} className={"vc-td" + (c.align === "right" ? " r" : "") + (i === 0 && frozen ? " frozen" : "")} style={{ width: widths[c.key], minWidth: widths[c.key], padding: density.pad, fontSize: density.fs, left: i === 0 && frozen ? selW : undefined }}>
          {vgRenderCell(row, c, schema)}
        </div>
      ))}
      {rowActions && (
        <div className="vc-td vc-act-cell" style={{ width: ACT_W, minWidth: ACT_W, padding: "0 8px", justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
          {rowActions(row)}
        </div>
      )}
    </div>
  );
}

function valueToPersonId(schema: VgSchema, label: string): string | null {
  const p = schema.people.find((t) => t.nome === label);
  return p ? p.id : null;
}

function VgGroupHeader({ g, cols, depth, collapsed, onToggle, density, schema }: {
  g: VgBuiltGroup; cols: VgColumn[]; depth: number; collapsed: boolean; onToggle: () => void; density: { h: number }; schema: VgSchema;
}) {
  const col = g.col;
  const chip = () => {
    if (g.value === "—") return <span style={{ color: "var(--text-subtle)", fontSize: 13 }}>Sem valor</span>;
    if (col.type === "person") return <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><VgAvatar id={valueToPersonId(schema, g.value)} people={schema.peopleMap} size={20} /><span style={{ fontSize: 13, fontWeight: 600 }}>{g.value}</span></span>;
    if (col.type === "enum" || col.type === "stage") return <span style={{ fontWeight: 600 }}><VgEnumChip schema={schema} col={col} value={g.value} /></span>;
    return <span style={{ fontSize: 13, fontWeight: 600 }}>{g.value}</span>;
  };
  return (
    <div className={"vc-grouphead" + (depth > 0 ? " sub" : "")} style={{ height: density.h + 2, paddingLeft: 10 + depth * 22 }} onClick={onToggle}>
      <span className="vc-group-disc" data-open={!collapsed}><Icon name="chevronRight" size={14} /></span>
      {chip()}
      <span className="vc-group-count">{g.count}</span>
      <div className="vc-group-sums">
        {cols.filter((c) => c.agg === "sum" && g.sums[c.key] != null).map((c) => (
          <span key={c.key} className="vc-group-sum"><Icon name="sigma" size={11} style={{ opacity: 0.5 }} /><span style={{ color: "var(--text-subtle)" }}>{c.label}</span> <b style={{ fontFamily: "var(--font-mono)", color: "var(--text)", fontWeight: 600 }}>{vgFmtMoney(g.sums[c.key])}</b></span>
        ))}
      </div>
    </div>
  );
}

type HeaderActions = { setSort: (key: string, dir: "asc" | "desc") => void; groupBy: (key: string) => void; filterBy: (key: string) => void; hide: (key: string) => void };

export function VgTable({
  schema, rows, cols, widths, setWidth, density, frozen, sort, groupCols, onHeaderSort, headerActions, state,
  onClearFilters, onRetry, selectable, selectedIds, onToggleSel, onToggleAll, onRowClick, rowActions,
}: {
  schema: VgSchema; rows: VgRow[]; cols: VgColumn[]; widths: Record<string, number>; setWidth: (key: string, w: number) => void;
  density: VgDensity; frozen: boolean; sort: VgSortLevel[]; groupCols: string[];
  onHeaderSort: (key: string, shift: boolean) => void; headerActions: HeaderActions;
  state: "ok" | "loading" | "empty" | "error"; onClearFilters: () => void; onRetry: () => void;
  selectable: boolean; selectedIds: Set<string | number>; onToggleSel: (id: string | number) => void;
  onToggleAll: (ids: (string | number)[]) => void; onRowClick?: (row: VgRow) => void;
  rowActions?: (row: VgRow) => React.ReactNode;
}) {
  const d = VG_DENS[density];
  const selW = selectable ? 40 : 0;
  const actW = rowActions ? ACT_W : 0;
  const totalW = cols.reduce((s, c) => s + widths[c.key], 0) + selW + actW;
  const [collapsed, setCollapsed] = React.useState<Set<string>>(() => new Set());
  // reset dos grupos recolhidos ao mudar agrupamento/schema — comparado DURANTE
  // o render (padrão sancionado, sem efeito p/ não disparar renders em cascata).
  const groupSig = groupCols.join(",") + "|" + schema.id;
  const [lastGroupSig, setLastGroupSig] = React.useState(groupSig);
  if (groupSig !== lastGroupSig) { setLastGroupSig(groupSig); setCollapsed(new Set()); }
  const sortDir = (key: string) => (sort.find((l) => l.col === key) || {}).dir;
  const groups = groupCols.length ? vgBuildGroups(rows, groupCols, schema) : null;

  const allIds = rows.map((r) => r.id);
  const selCount = allIds.filter((id) => selectedIds.has(id)).length;
  const allSel = allIds.length > 0 && selCount === allIds.length;
  const someSel = selCount > 0 && !allSel;

  const header = (
    <div className={"vc-thead" + (selectedIds.size ? " vc-anysel" : "")} style={{ minWidth: totalW }}>
      {selectable && (
        <div className="vc-sel-cell" style={{ height: d.h }} onClick={(e) => { e.stopPropagation(); onToggleAll(allIds); }}>
          <VgCheck checked={allSel} indeterminate={someSel} onChange={() => onToggleAll(allIds)} />
        </div>
      )}
      {cols.map((c, i) => (
        <VgHeaderCell key={c.key} col={c} width={widths[c.key]} density={d} first={i === 0} frozen={frozen} selW={selW}
          sortDir={sortDir(c.key)} onSort={(shift) => onHeaderSort(c.key, shift)} onResize={(w) => setWidth(c.key, w)}
          menuActions={{
            sortAsc: () => headerActions.setSort(c.key, "asc"), sortDesc: () => headerActions.setSort(c.key, "desc"),
            groupBy: () => headerActions.groupBy(c.key), filterBy: () => headerActions.filterBy(c.key), hide: () => headerActions.hide(c.key),
          }} />
      ))}
      {rowActions && <div className="vc-th" style={{ width: ACT_W, minWidth: ACT_W, height: d.h }} />}
    </div>
  );

  const rowEl = (r: VgRow) => (
    <VgTableRow key={r.id} row={r} cols={cols} widths={widths} density={d} frozen={frozen} schema={schema} selW={selW}
      selectable={selectable} selected={selectedIds.has(r.id)} onToggleSel={onToggleSel} onRowClick={onRowClick} rowActions={rowActions} />
  );

  let body: React.ReactNode;
  if (state === "loading") {
    body = <div style={{ minWidth: totalW }}>{Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className="vc-tr" style={{ height: d.h }}>
        {selectable && <div className="vc-sel-cell" style={{ height: d.h }} />}
        {cols.map((c, j) => (
          <div key={c.key} className={"vc-td" + (j === 0 && frozen ? " frozen" : "")} style={{ width: widths[c.key], minWidth: widths[c.key], padding: d.pad, left: j === 0 && frozen ? selW : undefined }}>
            <span className="skeleton" style={{ display: "block", height: 12, width: (j === 0 ? 70 : 40 + (i * 7 % 40)) + "%", borderRadius: 5 }} />
          </div>))}
      </div>
    ))}</div>;
  } else if (state === "error") {
    body = <div className="vc-state"><div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--crit-soft)", color: "var(--crit)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="wifiOff" size={24} strokeWidth={1.7} /></div><div className="vc-state-t">Não foi possível carregar</div><div className="vc-state-d">Houve uma falha ao buscar os registros. Verifique a conexão e tente novamente.</div><button className="vc-solidbtn" onClick={onRetry}><Icon name="refreshCw" size={14} />Tentar de novo</button></div>;
  } else if (rows.length === 0) {
    body = <div className="vc-state"><div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--bg-sunken)", color: "var(--text-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="search" size={24} strokeWidth={1.6} /></div><div className="vc-state-t">Nenhum resultado</div><div className="vc-state-d">Nenhum registro corresponde aos filtros atuais. Ajuste ou limpe os filtros para ver mais.</div><button className="vc-ghostbtn" onClick={onClearFilters}><Icon name="x" size={14} />Limpar filtros</button></div>;
  } else if (groups) {
    const renderGroups = (list: VgBuiltGroup[], depth: number, parentKey: string): React.ReactNode => list.map((g) => {
      const gkey = (parentKey ? parentKey + "›" : "") + g.value;
      const isCol = collapsed.has(gkey);
      return (
        <div key={gkey}>
          <VgGroupHeader g={g} cols={cols} depth={depth} collapsed={isCol} density={d} schema={schema}
            onToggle={() => setCollapsed((s) => { const n = new Set(s); if (n.has(gkey)) n.delete(gkey); else n.add(gkey); return n; })} />
          {!isCol && (g.sub ? renderGroups(g.sub, depth + 1, gkey) : (g.rows || []).map((r) => rowEl(r)))}
        </div>
      );
    });
    body = <div style={{ minWidth: totalW }}>{renderGroups(groups, 0, "")}</div>;
  } else {
    body = <div style={{ minWidth: totalW }}>{rows.map((r) => rowEl(r))}</div>;
  }

  const allKeys = groups ? collectGroupKeys(groups, "") : [];
  const allCollapsed = !!groups && allKeys.length > 0 && allKeys.every((k) => collapsed.has(k));
  return (
    <div className="vc-table-wrap">
      {groups && state === "ok" && rows.length > 0 && (
        <div className="vc-group-strip">
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{groups.length} grupos</span>
          <button className="vc-textbtn" onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(allKeys))}>
            <Icon name={allCollapsed ? "plus" : "minus"} size={13} />{allCollapsed ? "Expandir todos" : "Recolher todos"}
          </button>
        </div>
      )}
      <div className="vc-scroll">
        {header}
        {body}
      </div>
    </div>
  );
}

function collectGroupKeys(list: VgBuiltGroup[], parent: string): string[] {
  let out: string[] = [];
  for (const g of list) {
    const k = (parent ? parent + "›" : "") + g.value;
    out.push(k);
    if (g.sub) out = out.concat(collectGroupKeys(g.sub, k));
  }
  return out;
}
