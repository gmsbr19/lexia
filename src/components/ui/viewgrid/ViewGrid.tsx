// LexIA · Controles de Visão — orquestrador de UMA grade (barra, painéis, visões, tabela/quadro).
"use client";
import React from "react";
import { Icon } from "./vg-icons";
import type { VgSchema, VgRow, VgState, VgSavedView, VgGridStore, VgGroup } from "./vg-types";
import {
  vgCol, vgOpsFor, vgApplyFilter, vgApplySort, vgCountActive, vgToCSV,
} from "./vg-engine";
import { VgBtn, VgIconBtn, VgSeg, VgPopover } from "./vg-atoms";
import { VgFiltersPanel, vgEmptyRoot, vgRemoveNode, vgUid } from "./vg-filters";
import { VgSortPanel, VgGroupPanel, VgColumnsPanel } from "./vg-controls";
import { VgViewsBar, VgActiveChips } from "./vg-views";
import { VgTable } from "./vg-table";
import { VgBulkBar, type VgBulkField } from "./vg-bulk";

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function makeDefaultState(schema: Pick<VgSchema, "cols">): VgState {
  return {
    filters: { type: "group", id: "root", combinator: "E", children: [] },
    sort: [], groupCols: [], collapseDefault: false,
    hidden: schema.cols.filter((c) => c.def === false).map((c) => c.key),
    order: schema.cols.map((c) => c.key),
    frozen: false, density: "comfortable", mode: "tabela",
  };
}
function ruleNode(col: string, op: string) {
  return { type: "rule" as const, id: vgUid(), col, op, value: "", value2: "", values: [] as string[] };
}

export type ViewGridProps = {
  schema: VgSchema;
  rows: VgRow[];
  searchKeys: string[];
  initialStore: VgGridStore | null;
  seedViews: VgSavedView[];
  onStoreChange: (store: VgGridStore) => void;
  onRowClick?: (row: VgRow) => void;
  rowActions?: (row: VgRow) => React.ReactNode;
  selectable?: boolean;
  bulkFields?: VgBulkField[];
  onBulkApply?: (ids: (string | number)[], field: string, value: string | null) => void;
  onBulkDelete?: (ids: (string | number)[]) => void;
  toolbarExtra?: React.ReactNode;
  csvName: () => string;
  kanbanRender?: (rows: VgRow[]) => React.ReactNode;
  loading?: boolean;
  // injeção externa de filtro (navegação cruzada entre abas) — aplicada durante o render
  inject?: { nonce: number; filters: VgGroup } | null;
};

export function ViewGrid({
  schema, rows, searchKeys, initialStore, seedViews, onStoreChange, onRowClick, rowActions,
  selectable, bulkFields, onBulkApply, onBulkDelete, toolbarExtra, csvName, kanbanRender, loading, inject,
}: ViewGridProps) {
  const [store, setStore] = React.useState<VgGridStore>(() =>
    initialStore && initialStore.views.length ? initialStore : { activeId: seedViews[0].id, views: seedViews });

  const activeView = store.views.find((v) => v.id === store.activeId) || store.views[0];
  const [work, setWorkState] = React.useState<VgState>(() => clone(activeView.state));
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [widths, setWidths] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(schema.cols.map((c) => [c.key, c.w])));
  const [panel, setPanel] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string | number>>(() => new Set());

  const dirty = !eq(work, activeView.state);
  const setWork = (patch: Partial<VgState>) => setWorkState((w) => ({ ...w, ...patch }));
  const setWidth = (key: string, w: number) => setWidths((s) => ({ ...s, [key]: w }));

  // persiste o store (o chamador aplica o debounce); pula a montagem inicial
  const mounted = React.useRef(false);
  React.useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    onStoreChange(store);
  }, [store, onStoreChange]);

  const filtersRef = React.useRef<HTMLButtonElement>(null);
  const sortRef = React.useRef<HTMLButtonElement>(null);
  const groupRef = React.useRef<HTMLButtonElement>(null);
  const colsRef = React.useRef<HTMLButtonElement>(null);
  const densityRef = React.useRef<HTMLButtonElement>(null);
  const toggle = (name: string) => setPanel((p) => (p === name ? null : name));

  // injeção externa de filtro (navegação cruzada) — aplicada DURANTE o render
  // (mesmo padrão sancionado de "comparar último sinal", sem efeito), força
  // tabela + limpa agrupamento; NÃO altera a visão salva (só o work).
  const [lastInject, setLastInject] = React.useState(0);
  if (inject && inject.nonce !== lastInject) {
    setLastInject(inject.nonce);
    setWorkState((w) => ({ ...w, filters: inject.filters, mode: "tabela", groupCols: [] }));
    setSearch("");
  }

  // pipeline
  const filtered = vgApplyFilter(rows, work.filters, schema, deferredSearch, searchKeys);
  const sorted = vgApplySort(filtered, work.sort, schema);
  const visibleCols = work.order.map((k) => vgCol(schema, k)).filter((c): c is NonNullable<typeof c> => Boolean(c) && !work.hidden.includes(c!.key));
  const activeFilters = vgCountActive(work.filters, schema);

  // ordenação por cabeçalho (shift = multinível)
  const headerSort = (key: string, shift: boolean) => {
    const cur = work.sort;
    const idx = cur.findIndex((l) => l.col === key);
    if (shift) {
      if (idx < 0) setWork({ sort: [...cur, { col: key, dir: "asc" }] });
      else if (cur[idx].dir === "asc") setWork({ sort: cur.map((l, i) => i === idx ? { ...l, dir: "desc" as const } : l) });
      else setWork({ sort: cur.filter((_, i) => i !== idx) });
    } else {
      if (idx === 0 && cur.length === 1) setWork({ sort: cur[0].dir === "asc" ? [{ col: key, dir: "desc" }] : [] });
      else setWork({ sort: [{ col: key, dir: "asc" }] });
    }
  };
  const headerActions = {
    setSort: (key: string, dir: "asc" | "desc") => setWork({ sort: [{ col: key, dir }] }),
    groupBy: (key: string) => setWork({ groupCols: [key] }),
    filterBy: (key: string) => {
      const c = vgCol(schema, key);
      if (!c) return;
      const r = ruleNode(key, vgOpsFor(c)[0].v);
      setWork({ filters: { ...work.filters, children: [...work.filters.children, r] } });
      setPanel("filters");
    },
    hide: (key: string) => setWork({ hidden: [...work.hidden, key] }),
  };

  // ações de visão
  const mutStore = (fn: (s: VgGridStore) => void) => setStore((s) => { const sc = clone(s); fn(sc); return sc; });
  const viewActions = {
    select: (id: string) => {
      const v = store.views.find((x) => x.id === id);
      setStore((s) => ({ ...s, activeId: id }));
      if (v) setWorkState(clone(v.state));
      setSelected(new Set());
      setPanel(null);
    },
    add: () => {
      const id = "nv" + vgUid();
      const snap = clone(work);
      mutStore((sc) => { sc.views.push({ id, name: "Nova visão", icon: "star", state: snap }); sc.activeId = id; });
    },
    save: () => mutStore((sc) => { const v = sc.views.find((x) => x.id === sc.activeId); if (v) v.state = clone(work); }),
    rename: (id: string, name: string) => mutStore((sc) => { const v = sc.views.find((x) => x.id === id); if (v) v.name = name; }),
    duplicate: (id: string) => {
      const nid = "dup" + vgUid();
      const src = store.views.find((x) => x.id === id);
      mutStore((sc) => {
        const i = sc.views.findIndex((x) => x.id === id);
        const s = sc.views[i];
        sc.views.splice(i + 1, 0, { ...clone(s), id: nid, name: s.name + " (cópia)", isDefault: false });
        sc.activeId = nid;
      });
      if (src) setWorkState(clone(src.state));
    },
    setDefault: (id: string) => mutStore((sc) => sc.views.forEach((v) => { v.isDefault = v.id === id; })),
    reset: (id: string) => { const v = store.views.find((x) => x.id === id); if (v) setWorkState(clone(v.state)); },
    remove: (id: string) => {
      const cur = store.views;
      const nextActive = store.activeId === id ? (cur.find((x) => x.id !== id)?.id) : store.activeId;
      mutStore((sc) => { sc.views = sc.views.filter((x) => x.id !== id); if (sc.activeId === id && sc.views[0]) sc.activeId = sc.views[0].id; });
      if (store.activeId === id && nextActive) { const nv = cur.find((x) => x.id === nextActive); if (nv) setWorkState(clone(nv.state)); }
    },
  };

  const download = (name: string, csv: string) => {
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const exportCSV = () => download(csvName(), vgToCSV(sorted, visibleCols, schema));

  // seleção
  const doSelectable = selectable ?? Boolean(bulkFields);
  const toggleSel = (id: string | number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = (ids: (string | number)[]) => setSelected((s) => {
    const all = ids.length > 0 && ids.every((id) => s.has(id));
    return all ? new Set() : new Set(ids);
  });
  const clearSel = () => setSelected(new Set());
  const selIds = [...selected];

  const tableState: "ok" | "loading" | "empty" | "error" = loading ? "loading" : "ok";
  const isKanban = Boolean(kanbanRender) && work.mode === "quadro";

  return (
    <div className="vc-root">
      {/* visões salvas */}
      <VgViewsBar views={store.views} activeId={store.activeId} dirty={dirty}
        onSelect={viewActions.select} onAdd={viewActions.add} onSave={viewActions.save} actions={viewActions} />

      {/* barra de controles */}
      <div className="vc-controlbar">
        <div className="vc-search">
          <Icon name="search" size={15} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" />
          {search && <button className="vc-iconbtn" style={{ width: 22, height: 22 }} onClick={() => setSearch("")}><Icon name="x" size={13} /></button>}
        </div>
        <VgBtn ref={filtersRef} icon="filter" active={activeFilters > 0} count={activeFilters} onClick={() => toggle("filters")} chevron>Filtros</VgBtn>
        <VgBtn ref={sortRef} icon="sliders" active={work.sort.length > 0} count={work.sort.length} onClick={() => toggle("sort")} chevron>Ordenar</VgBtn>
        <VgBtn ref={groupRef} icon="layoutGrid" active={work.groupCols.length > 0} count={work.groupCols.length} onClick={() => toggle("group")} chevron>Agrupar</VgBtn>
        <VgBtn ref={colsRef} icon="sidebar" active={work.hidden.length > 0 || work.frozen} onClick={() => toggle("cols")} chevron>Colunas</VgBtn>
        <span className="vc-spring" />
        <VgIconBtn ref={densityRef} icon={work.density === "compact" ? "list" : "menu"} onClick={() => setWork({ density: work.density === "compact" ? "comfortable" : "compact" })} title={"Densidade: " + (work.density === "compact" ? "compacta" : "confortável")} />
        {kanbanRender && <VgSeg value={work.mode} onChange={(m) => setWork({ mode: m as VgState["mode"] })} options={[{ value: "tabela", label: "Tabela", icon: "list" }, { value: "quadro", label: "Quadro", icon: "kanban" }]} size="sm" />}
        <VgBtn icon="download" onClick={exportCSV}>Exportar CSV</VgBtn>
        {toolbarExtra}
      </div>

      {/* chips ativos */}
      <VgActiveChips schema={schema} root={work.filters} sort={work.sort} group={work.groupCols}
        onOpenFilters={() => setPanel("filters")} onRemoveFilter={(id) => setWork({ filters: vgRemoveNode(work.filters, id) })}
        onOpenSort={() => setPanel("sort")} onRemoveSort={(col) => setWork({ sort: work.sort.filter((l) => l.col !== col) })}
        onOpenGroup={() => setPanel("group")} onClearGroup={() => setWork({ groupCols: [] })}
        onClearAll={() => setWork({ filters: vgEmptyRoot(), sort: [], groupCols: [] })} />

      {/* barra de lote (inline, acima do conteúdo) */}
      {doSelectable && bulkFields && bulkFields.length > 0 && (
        <VgBulkBar count={selIds.length} fields={bulkFields} peopleMap={schema.peopleMap}
          onApply={(field, value) => { onBulkApply?.(selIds, field, value); clearSel(); }}
          onExport={() => download(csvName(), vgToCSV(sorted.filter((r) => selected.has(r.id)), visibleCols, schema))}
          onDelete={onBulkDelete ? () => { onBulkDelete(selIds); clearSel(); } : undefined}
          onClear={clearSel} />
      )}

      {/* conteúdo */}
      {isKanban
        ? <div className="vc-kanban-wrap" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{kanbanRender!(sorted)}</div>
        : <VgTable schema={schema} rows={sorted} cols={visibleCols} widths={widths} setWidth={setWidth}
            density={work.density} frozen={work.frozen} sort={work.sort} groupCols={work.groupCols}
            onHeaderSort={headerSort} headerActions={headerActions} state={tableState}
            onClearFilters={() => { setWork({ filters: vgEmptyRoot() }); setSearch(""); }} onRetry={() => { /* noop: dados reais */ }}
            selectable={doSelectable} selectedIds={selected} onToggleSel={toggleSel} onToggleAll={toggleAll} onRowClick={onRowClick} rowActions={rowActions} />}

      {/* popovers dos painéis */}
      <VgPopover anchorRef={filtersRef} open={panel === "filters"} onClose={() => setPanel(null)} width="fit" align="left">
        <VgFiltersPanel schema={schema} root={work.filters} onChange={(r) => setWork({ filters: r })} />
      </VgPopover>
      <VgPopover anchorRef={sortRef} open={panel === "sort"} onClose={() => setPanel(null)} width={420} align="left">
        <VgSortPanel schema={schema} levels={work.sort} onChange={(s) => setWork({ sort: s })} />
      </VgPopover>
      <VgPopover anchorRef={groupRef} open={panel === "group"} onClose={() => setPanel(null)} width={300} align="left">
        <VgGroupPanel schema={schema} groupCols={work.groupCols} onChange={(g) => setWork({ groupCols: g })} collapseDefault={work.collapseDefault} setCollapseDefault={(v) => setWork({ collapseDefault: v })} />
      </VgPopover>
      <VgPopover anchorRef={colsRef} open={panel === "cols"} onClose={() => setPanel(null)} width={300} align="right">
        <VgColumnsPanel schema={schema} order={work.order} hidden={work.hidden} frozen={work.frozen}
          onOrder={(o) => setWork({ order: o })} onToggle={(k) => setWork({ hidden: work.hidden.includes(k) ? work.hidden.filter((x) => x !== k) : [...work.hidden, k] })}
          setFrozen={(v) => setWork({ frozen: v })} onShowAll={() => setWork({ hidden: [] })}
          onHideAll={() => setWork({ hidden: schema.cols.filter((c) => !c.fixed).map((c) => c.key) })} />
      </VgPopover>
    </div>
  );
}
