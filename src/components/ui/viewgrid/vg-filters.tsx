// LexIA · Controles de Visão — construtor de filtros com grupos aninhados (E/OU dentro de E/OU).
import React from "react";
import { Icon } from "./vg-icons";
import type { VgSchema, VgRule, VgGroup, VgCombinator } from "./vg-types";
import { vgCol, vgOpsFor, vgCountActive, vgCountRules, vgColOptions, VG_TYPE_ICON } from "./vg-engine";
import { VgSelectMenu, VgValueEditor } from "./vg-editors";

let _vgId = 0;
export const vgUid = () => "r" + (++_vgId) + Math.random().toString(36).slice(2, 7);
export function vgNewRule(schema: VgSchema): VgRule {
  const col = schema.cols.find((c) => !c.fixed) || schema.cols[0];
  return { type: "rule", id: vgUid(), col: col.key, op: vgOpsFor(col)[0].v, value: "", value2: "", values: [] };
}
export const vgNewGroup = (schema: VgSchema): VgGroup => ({ type: "group", id: vgUid(), combinator: "E", children: [vgNewRule(schema)] });
export const vgEmptyRoot = (): VgGroup => ({ type: "group", id: "root", combinator: "E", children: [] });

// coluna do combinador à esquerda de cada filho
function VgCombiCol({ index, combinator, onChange }: { index: number; combinator: VgCombinator; onChange: (v: VgCombinator) => void }) {
  if (index === 0) return <span className="vc-combi label">Onde</span>;
  if (index === 1) return (
    <VgSelectMenu value={combinator} onChange={(v) => onChange(v as VgCombinator)} menuWidth={120}
      options={[{ v: "E", label: "E" }, { v: "OU", label: "OU" }]} tone="var(--accent)" />
  );
  return <span className="vc-combi static">{combinator === "E" ? "E" : "OU"}</span>;
}

function VgFilterRule({ rule, schema, onChange, onRemove }: { rule: VgRule; schema: VgSchema; onChange: (r: VgRule) => void; onRemove: () => void }) {
  const col = vgCol(schema, rule.col);
  if (!col) return null;
  const changeCol = (key: string) => {
    const nc = vgCol(schema, key);
    if (!nc) return;
    onChange({ ...rule, col: key, op: vgOpsFor(nc)[0].v, value: "", value2: "", values: [] });
  };
  return (
    <div className="vc-rule">
      <VgSelectMenu value={rule.col} onChange={changeCol} options={vgColOptions(schema)} searchable menuWidth={230}
        renderValue={(o) => <>{o.typeIcon && <Icon name={o.typeIcon} size={13} style={{ color: "var(--text-subtle)" }} />}{o.label}</>} width={158} />
      <VgSelectMenu value={rule.op} onChange={(op) => onChange({ ...rule, op })} options={vgOpsFor(col).map((o) => ({ v: o.v, label: o.l }))} menuWidth={170} width={rule.op === "between" ? 78 : 118} />
      <div style={{ flex: 1, minWidth: 0 }}><VgValueEditor schema={schema} col={col} rule={rule} onChange={onChange} /></div>
      <button className="vc-iconbtn vc-rule-x" onClick={onRemove} title="Remover regra"><Icon name="x" size={14} /></button>
    </div>
  );
}

export function VgFilterGroup({ node, schema, onChange, onRemove, depth = 0 }: {
  node: VgGroup; schema: VgSchema; onChange: (n: VgGroup) => void; onRemove?: () => void; depth?: number;
}) {
  const setChild = (i: number, child: VgGroup["children"][number]) => onChange({ ...node, children: node.children.map((c, j) => j === i ? child : c) });
  const removeChild = (i: number) => onChange({ ...node, children: node.children.filter((_, j) => j !== i) });
  const setCombinator = (combinator: VgCombinator) => onChange({ ...node, combinator });
  const addRule = () => onChange({ ...node, children: [...node.children, vgNewRule(schema)] });
  const addGroup = () => onChange({ ...node, children: [...node.children, vgNewGroup(schema)] });

  return (
    <div className={depth > 0 ? "vc-subgroup" : ""}>
      {depth > 0 && (
        <div className="vc-subgroup-head">
          <Icon name="cornerDownRight" size={13} style={{ color: "var(--text-subtle)" }} />
          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Grupo · corresponder <b style={{ color: "var(--accent)", fontWeight: 600 }}>{node.combinator === "E" ? "todas" : "qualquer"}</b> as condições</span>
          <span style={{ flex: 1 }} />
          {onRemove && <button className="vc-iconbtn" style={{ width: 24, height: 24 }} onClick={onRemove} title="Remover grupo"><Icon name="trash2" size={13} /></button>}
        </div>
      )}
      <div className="vc-group-rows">
        {node.children.map((child, i) => (
          <div key={child.id} className="vc-node-row">
            <div className="vc-combi-cell"><VgCombiCol index={i} combinator={node.combinator} onChange={setCombinator} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {child.type === "group"
                ? <VgFilterGroup node={child} schema={schema} depth={depth + 1} onChange={(n) => setChild(i, n)} onRemove={() => removeChild(i)} />
                : <VgFilterRule rule={child} schema={schema} onChange={(n) => setChild(i, n)} onRemove={() => removeChild(i)} />}
            </div>
          </div>
        ))}
      </div>
      <div className="vc-group-add">
        <button className="vc-textbtn" onClick={addRule}><Icon name="plus" size={13} />Adicionar filtro</button>
        {depth < 2 && <button className="vc-textbtn" onClick={addGroup}><Icon name="braces" size={13} />Adicionar grupo</button>}
      </div>
    </div>
  );
}

export function VgFiltersPanel({ schema, root, onChange }: { schema: VgSchema; root: VgGroup; onChange: (r: VgGroup) => void }) {
  const empty = root.children.length === 0;
  const active = vgCountActive(root, schema);
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 380 }}>
      <div className="vc-panel-head">
        <span className="vc-panel-title"><Icon name="filter" size={14} />Filtros</span>
        {!empty && <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>{active} ativo{active === 1 ? "" : "s"} · {vgCountRules(root)} regra{vgCountRules(root) === 1 ? "" : "s"}</span>}
      </div>
      {empty ? (
        <div style={{ padding: "22px 18px 20px", textAlign: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, margin: "0 auto 12px", background: "var(--bg-sunken)", color: "var(--text-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="filter" size={20} strokeWidth={1.6} /></div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Nenhum filtro ainda</div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", maxWidth: 260, margin: "0 auto 14px", lineHeight: 1.5 }}>Crie regras para refinar a visão. Combine com E/OU e agrupe condições aninhadas.</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="vc-solidbtn" onClick={() => onChange({ ...root, children: [vgNewRule(schema)] })}><Icon name="plus" size={14} />Adicionar filtro</button>
            <button className="vc-ghostbtn" onClick={() => onChange({ ...root, children: [vgNewGroup(schema)] })}><Icon name="braces" size={14} />Grupo</button>
          </div>
        </div>
      ) : (
        <div className="vc-panel-body">
          <VgFilterGroup node={root} schema={schema} onChange={onChange} />
        </div>
      )}
      {!empty && (
        <div className="vc-panel-foot">
          <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>Regras sem valor não afetam a tabela</span>
          <button className="vc-textbtn danger" onClick={() => onChange(vgEmptyRoot())}><Icon name="trash2" size={13} />Limpar tudo</button>
        </div>
      )}
    </div>
  );
}

// remove um nó por id (usado pelos chips)
export function vgRemoveNode(node: VgGroup, id: string): VgGroup {
  return { ...node, children: node.children.filter((c) => c.id !== id).map((c) => c.type === "group" ? vgRemoveNode(c, id) : c) };
}

// VG_TYPE_ICON re-export p/ conveniência
export { VG_TYPE_ICON };
