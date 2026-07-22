"use client"

// Notion-style column filter builder: coluna → operador → valor, N regras
// combinadas por UM combinador AND/OR no topo (sem grupos aninhados — ver
// CLAUDE.md §11 Fase 2). Reaproveita Menu/MenuItem (tf-kit) para os pickers e
// as classes facet* (faceted checklist) para o operador "in".
import { Menu, MenuItem } from "@/components/tarefas/tf-kit"
import { Icon } from "@/components/tarefas/tf-icons"
import * as c from "./datagrid.css"
import { OPERATORS_BY_TYPE } from "./filter-logic"
import type { FilterRule, FilterState, GridColumn } from "./types"

function ValueEditor<T>({ column, rule, onChange }: { column: GridColumn<T>; rule: FilterRule; onChange: (value: unknown) => void }) {
  if (rule.operator === "isEmpty" || rule.operator === "isNotEmpty") return null

  if (rule.operator === "in") {
    const selected = Array.isArray(rule.value) ? (rule.value as string[]) : []
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 180, overflowY: "auto" }}>
        {(column.options ?? []).map((o) => {
          const on = selected.includes(o.value)
          return (
            <button
              key={o.value}
              className={c.facetMenuItem}
              onClick={() => onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {o.color && <span className={c.facetDot} style={{ background: o.color }} />}
                {o.label}
              </span>
              {on && (
                <span className={c.facetCheck}>
                  <Icon name="check" size={13} />
                </span>
              )}
            </button>
          )
        })}
        {!(column.options ?? []).length && <span style={{ fontSize: 12, color: "var(--text-subtle)", padding: "6px 10px" }}>Sem opções</span>}
      </div>
    )
  }

  if (rule.operator === "between") {
    const [lo, hi] = Array.isArray(rule.value) ? (rule.value as [unknown, unknown]) : [null, null]
    const type = column.type === "date" ? "date" : "text"
    return (
      <div style={{ display: "flex", gap: 6 }}>
        <input className={c.input} type={type} value={typeof lo === "string" || typeof lo === "number" ? String(lo) : ""} onChange={(e) => onChange([e.target.value || null, hi])} placeholder="De" />
        <input className={c.input} type={type} value={typeof hi === "string" || typeof hi === "number" ? String(hi) : ""} onChange={(e) => onChange([lo, e.target.value || null])} placeholder="Até" />
      </div>
    )
  }

  if (column.type === "date") {
    return <input className={c.input} type="date" value={typeof rule.value === "string" ? rule.value : ""} onChange={(e) => onChange(e.target.value || null)} />
  }

  return (
    <input
      className={c.input}
      value={typeof rule.value === "string" || typeof rule.value === "number" ? String(rule.value) : ""}
      onChange={(e) => onChange(column.type === "number" || column.type === "money" ? Number(e.target.value) : e.target.value)}
      placeholder="Valor"
    />
  )
}

export function FilterBuilder<T>({ columns, state, onChange }: { columns: GridColumn<T>[]; state: FilterState; onChange: (s: FilterState) => void }) {
  const filterable = columns.filter((col) => col.filterable !== false)

  const addRule = () => {
    const first = filterable[0]
    if (!first) return
    onChange({
      ...state,
      rules: [...state.rules, { id: crypto.randomUUID(), columnKey: first.key, operator: OPERATORS_BY_TYPE[first.type]?.[0]?.value ?? "eq", value: null }],
    })
  }
  const updateRule = (id: string, patch: Partial<FilterRule>) =>
    onChange({ ...state, rules: state.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) })
  const removeRule = (id: string) => onChange({ ...state, rules: state.rules.filter((r) => r.id !== id) })
  const clear = () => onChange({ combinator: "AND", rules: [] })

  return (
    <Menu
      align="left"
      width={380}
      trigger={
        <span className={c.facetBtn({ active: state.rules.length > 0 })}>
          <Icon name="funnel" size={13} />
          Filtros
          {state.rules.length > 0 && <span className={c.facetValue}>{state.rules.length}</span>}
        </span>
      }
    >
      {() => (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 4, minWidth: 340 }}>
          {state.rules.length >= 2 && (
            <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunken)", borderRadius: 8, padding: 3, alignSelf: "flex-start" }}>
              {(["AND", "OR"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => onChange({ ...state, combinator: v })}
                  style={{ height: 24, padding: "0 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, background: state.combinator === v ? "var(--surface)" : "transparent", color: state.combinator === v ? "var(--text)" : "var(--text-muted)" }}
                >
                  {v === "AND" ? "E" : "OU"}
                </button>
              ))}
            </div>
          )}
          {state.rules.map((rule) => {
            const column = columns.find((col) => col.key === rule.columnKey)
            const ops = column ? (OPERATORS_BY_TYPE[column.type] ?? []) : []
            return (
              <div key={rule.id} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 8, border: "1px solid var(--border)", borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Menu align="left" width={200} trigger={<span className={c.thBtn}>{column?.label ?? "Coluna"}<Icon name="chevronDown" size={12} /></span>}>
                    {(closeInner) =>
                      filterable.map((col) => (
                        <MenuItem
                          key={col.key}
                          label={col.label}
                          active={col.key === rule.columnKey}
                          onClick={() => {
                            updateRule(rule.id, { columnKey: col.key, operator: OPERATORS_BY_TYPE[col.type]?.[0]?.value ?? "eq", value: null })
                            closeInner()
                          }}
                        />
                      ))
                    }
                  </Menu>
                  <Menu align="left" width={170} trigger={<span className={c.thBtn}>{ops.find((o) => o.value === rule.operator)?.label ?? rule.operator}<Icon name="chevronDown" size={12} /></span>}>
                    {(closeInner) =>
                      ops.map((o) => (
                        <MenuItem key={o.value} label={o.label} active={o.value === rule.operator} onClick={() => { updateRule(rule.id, { operator: o.value, value: null }); closeInner() }} />
                      ))
                    }
                  </Menu>
                  <button onClick={() => removeRule(rule.id)} style={{ marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", color: "var(--text-subtle)", display: "inline-flex" }}>
                    <Icon name="x" size={13} />
                  </button>
                </div>
                {column && <ValueEditor column={column} rule={rule} onChange={(v) => updateRule(rule.id, { value: v })} />}
              </div>
            )
          })}
          <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
            <button onClick={addRule} className="btn btn-ghost" style={{ height: 30, fontSize: 12 }}>
              <Icon name="plus" size={13} />
              Adicionar filtro
            </button>
            {state.rules.length > 0 && (
              <button onClick={clear} className="btn btn-ghost" style={{ height: 30, fontSize: 12 }}>
                Limpar
              </button>
            )}
          </div>
        </div>
      )}
    </Menu>
  )
}
