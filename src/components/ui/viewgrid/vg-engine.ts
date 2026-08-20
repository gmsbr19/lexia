// LexIA · Controles de Visão — motor puro: filtro / ordenação / agrupamento / CSV / datas.
// Tudo dirigido por SCHEMA — a mesma barra e os mesmos painéis servem qualquer tabela.
import type {
  VgSchema, VgColumn, VgRule, VgNode, VgSortLevel, VgRow, VgBuiltGroup, VgColType,
} from "./vg-types";
import type { VgIconName } from "./vg-icons";

export const vgCol = (schema: VgSchema, key: string): VgColumn | undefined =>
  schema.cols.find((c) => c.key === key);

// ---------- operadores por tipo ----------
type Op = { v: string; l: string };
export const VG_OPS: Record<VgColType, Op[]> = {
  text: [{ v: "contains", l: "contém" }, { v: "ncontains", l: "não contém" }, { v: "eq", l: "é" }, { v: "ne", l: "não é" }, { v: "empty", l: "está vazio" }, { v: "nempty", l: "não está vazio" }],
  num: [{ v: "eq", l: "=" }, { v: "ne", l: "≠" }, { v: "gt", l: ">" }, { v: "gte", l: "≥" }, { v: "lt", l: "<" }, { v: "lte", l: "≤" }, { v: "between", l: "entre" }, { v: "empty", l: "vazio" }],
  money: [{ v: "eq", l: "=" }, { v: "ne", l: "≠" }, { v: "gt", l: ">" }, { v: "gte", l: "≥" }, { v: "lt", l: "<" }, { v: "lte", l: "≤" }, { v: "between", l: "entre" }, { v: "empty", l: "vazio" }],
  date: [{ v: "eq", l: "é" }, { v: "lt", l: "antes de" }, { v: "gt", l: "depois de" }, { v: "between", l: "entre" }, { v: "empty", l: "está vazio" }, { v: "nempty", l: "não está vazio" }],
  enum: [{ v: "in", l: "é um de" }, { v: "nin", l: "não é" }, { v: "empty", l: "está vazio" }],
  stage: [{ v: "in", l: "é um de" }, { v: "nin", l: "diferente de" }],
  person: [{ v: "in", l: "é um de" }, { v: "empty", l: "sem responsável" }],
};
export const vgOpsFor = (col: VgColumn): Op[] => VG_OPS[col.type] || VG_OPS.text;
export const vgOpLabel = (col: VgColumn, op: string): string =>
  (vgOpsFor(col).find((o) => o.v === op) || { l: op }).l;
export const vgNeedsValue = (op: string): boolean => !(op === "empty" || op === "nempty");

export const VG_TYPE_ICON: Record<VgColType, VgIconName> = {
  text: "braces", enum: "list", stage: "funnel", person: "user", num: "percent", money: "banknote", date: "calendar",
};
export const vgColOptions = (schema: VgSchema) =>
  schema.cols.map((c) => ({ v: c.key, label: c.label, typeIcon: VG_TYPE_ICON[c.type] || "braces" }));

export type VgOption = { v: string; label: string; color?: string; icon?: VgIconName; person?: string };
// valores possíveis de um enum/pessoa
export function vgOptionsFor(schema: VgSchema, col: VgColumn): VgOption[] {
  if (col.type === "person") return schema.people.map((p) => ({ v: p.id, label: p.nome, person: p.id }));
  if (col.enumList) return col.enumList.map((v) => ({ v, label: v }));
  const e = (col.enum && schema.enums[col.enum]) || {};
  const order = (col.enum && schema.enumOrder[col.enum]) || Object.keys(e);
  return order.map((k) => ({ v: k, label: k, color: e[k]?.c, icon: e[k]?.icon }));
}

const vgRaw = (row: VgRow, key: string): unknown => row[key];

// ---------- avaliação de regra ----------
export function vgEvalRule(row: VgRow, rule: VgRule, schema: VgSchema): boolean {
  const col = vgCol(schema, rule.col);
  if (!col) return true;
  const raw = vgRaw(row, rule.col);
  const empty = raw === "" || raw == null;
  const t = col.type;
  if (rule.op === "empty") return empty;
  if (rule.op === "nempty") return !empty;
  if (t === "text") {
    const s = String(raw || "").toLowerCase(), q = String(rule.value || "").toLowerCase();
    if (rule.op === "contains") return s.includes(q);
    if (rule.op === "ncontains") return !s.includes(q);
    if (rule.op === "eq") return s === q;
    if (rule.op === "ne") return s !== q;
  }
  if (t === "num" || t === "money") {
    const n = Number(raw), a = Number(rule.value), b = Number(rule.value2);
    if (isNaN(n)) return false;
    if (rule.op === "eq") return n === a;
    if (rule.op === "ne") return n !== a;
    if (rule.op === "gt") return n > a;
    if (rule.op === "gte") return n >= a;
    if (rule.op === "lt") return n < a;
    if (rule.op === "lte") return n <= a;
    if (rule.op === "between") return n >= Math.min(a, b) && n <= Math.max(a, b);
  }
  if (t === "date") {
    const s = String(raw || "");
    if (empty) return false;
    if (rule.op === "eq") return s === rule.value;
    if (rule.op === "lt") return s < (rule.value || "9999");
    if (rule.op === "gt") return s > (rule.value || "");
    if (rule.op === "between") return s >= (rule.value || "") && s <= (rule.value2 || "9999");
  }
  if (t === "enum" || t === "stage" || t === "person") {
    const vals = rule.values || [];
    if (!vals.length) return true; // regra incompleta não filtra
    if (rule.op === "in") return vals.includes(String(raw));
    if (rule.op === "nin") return !vals.includes(String(raw));
  }
  return true;
}

// regra "completa" o bastante para filtrar?
export function vgRuleActive(rule: VgRule, schema: VgSchema): boolean {
  if (!rule.col || !rule.op) return false;
  if (!vgNeedsValue(rule.op)) return true;
  const col = vgCol(schema, rule.col);
  if (!col) return false;
  if (col.type === "enum" || col.type === "stage" || col.type === "person") return (rule.values || []).length > 0;
  if (rule.op === "between") return rule.value != null && rule.value !== "" && rule.value2 != null && rule.value2 !== "";
  return rule.value != null && rule.value !== "";
}

export function vgEvalNode(row: VgRow, node: VgNode, schema: VgSchema): boolean | null {
  if (node.type === "rule") return vgRuleActive(node, schema) ? vgEvalRule(row, node, schema) : null;
  const results = node.children.map((c) => vgEvalNode(row, c, schema)).filter((r): r is boolean => r !== null);
  if (!results.length) return null;
  return node.combinator === "OU" ? results.some(Boolean) : results.every(Boolean);
}
export function vgCountRules(node: VgNode): number {
  if (node.type === "rule") return 1;
  return node.children.reduce((s, c) => s + vgCountRules(c), 0);
}
export function vgCountActive(node: VgNode, schema: VgSchema): number {
  if (node.type === "rule") return vgRuleActive(node, schema) ? 1 : 0;
  return node.children.reduce((s, c) => s + vgCountActive(c, schema), 0);
}
export function vgApplyFilter(rows: VgRow[], root: VgNode, schema: VgSchema, search: string, searchKeys: string[]): VgRow[] {
  let out = rows;
  const q = (search || "").trim().toLowerCase();
  if (q) out = out.filter((r) => searchKeys.some((k) => String(r[k] == null ? "" : r[k]).toLowerCase().includes(q)));
  if (root && root.type === "group" && root.children.length)
    out = out.filter((r) => { const v = vgEvalNode(r, root, schema); return v === null ? true : v; });
  return out;
}

// ---------- ordenação (multinível, vazios sempre por último) ----------
function vgCompare(a: unknown, b: unknown, col: VgColumn, schema: VgSchema): number {
  const ea = a === "" || a == null, eb = b === "" || b == null;
  if (ea && eb) return 0;
  if (ea) return 1;
  if (eb) return -1; // vazios por último (independe da direção)
  if (col.type === "num" || col.type === "money") return Number(a) - Number(b);
  if (col.type === "stage") {
    const e = (col.enum && schema.enums[col.enum]) || {};
    return (e[String(a)]?.i ?? 99) - (e[String(b)]?.i ?? 99);
  }
  if (col.type === "person") return String(schema.peopleMap[String(a)]?.nome || "").localeCompare(String(schema.peopleMap[String(b)]?.nome || ""), "pt");
  return String(a).localeCompare(String(b), "pt");
}
export function vgApplySort(rows: VgRow[], levels: VgSortLevel[], schema: VgSchema): VgRow[] {
  if (!levels.length) return rows;
  const arr = rows.map((r, i) => [r, i] as [VgRow, number]);
  arr.sort(([a, ia], [b, ib]) => {
    for (const lv of levels) {
      const col = vgCol(schema, lv.col);
      if (!col) continue;
      let c = vgCompare(vgRaw(a, lv.col), vgRaw(b, lv.col), col, schema);
      if (c !== 0) {
        const av = vgRaw(a, lv.col) == null || vgRaw(a, lv.col) === "";
        const bv = vgRaw(b, lv.col) == null || vgRaw(b, lv.col) === "";
        if (!av && !bv && lv.dir === "desc") c = -c; // vazios ignoram direção
        return c;
      }
    }
    return ia - ib; // estável
  });
  return arr.map(([r]) => r);
}

// ---------- agrupamento (até 2 níveis) ----------
export function vgGroupLabel(row: VgRow, key: string): string {
  const v = vgRaw(row, key);
  if (v === "" || v == null) return "—";
  return String(v);
}
function sumMoney(rows: VgRow[], schema: VgSchema): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of schema.cols) if (c.agg === "sum") out[c.key] = rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0);
  return out;
}
export function vgBuildGroups(rows: VgRow[], groupCols: string[], schema: VgSchema): VgBuiltGroup[] | null {
  if (!groupCols.length) return null;
  const [key, ...rest] = groupCols;
  const col = vgCol(schema, key);
  if (!col) return null;
  const map = new Map<string, VgRow[]>();
  for (const r of rows) {
    const gk = vgGroupLabel(r, key);
    if (!map.has(gk)) map.set(gk, []);
    map.get(gk)!.push(r);
  }
  const entries = [...map.entries()];
  entries.sort((a, b) => {
    if (a[0] === "—") return 1;
    if (b[0] === "—") return -1;
    if (col.type === "stage") {
      const e = (col.enum && schema.enums[col.enum]) || {};
      return (e[a[0]]?.i ?? 99) - (e[b[0]]?.i ?? 99);
    }
    if (col.type === "num" || col.type === "money") return Number(a[0]) - Number(b[0]);
    return String(a[0]).localeCompare(String(b[0]), "pt");
  });
  return entries.map(([gk, gr]) => ({
    key, col, value: gk, count: gr.length,
    sums: sumMoney(gr, schema),
    rows: rest.length ? null : gr,
    sub: rest.length ? vgBuildGroups(gr, rest, schema) : null,
    _all: gr,
  }));
}

// ---------- formatadores ----------
export const vgFmtMoney = (n: unknown): string =>
  n == null ? "—" : "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function vgFmtDate(iso: string | null | undefined, todayISO: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00:00");
  const today = new Date(todayISO + "T12:00:00");
  const days = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days === -1) return "ontem";
  if (days > 1 && days <= 7) return `em ${days} dias`;
  if (days < -1 && days >= -7) return `há ${-days} dias`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

// entrada em linguagem natural -> ISO
export function vgParseNaturalDate(txt: string, todayISO: string): string | null {
  const s = (txt || "").trim().toLowerCase();
  if (!s) return null;
  const today = new Date(todayISO + "T12:00:00");
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const add = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };
  if (/^hoje$/.test(s)) return iso(today);
  if (/^amanh/.test(s)) return iso(add(1));
  if (/^ontem$/.test(s)) return iso(add(-1));
  if (/pr[oó]xima semana/.test(s)) return iso(add(7));
  if (/semana passada/.test(s)) return iso(add(-7));
  if (/pr[oó]ximo m[eê]s/.test(s)) { const d = new Date(today); d.setMonth(d.getMonth() + 1); return iso(d); }
  const dia = s.match(/dia\s+(\d{1,2})/);
  if (dia) { const d = new Date(today); d.setDate(Number(dia[1])); return iso(d); }
  const br = s.match(/^(\d{1,2})[/\-](\d{1,2})(?:[/\-](\d{2,4}))?$/);
  if (br) {
    const dd = br[1]; const mm = br[2];
    let yy = br[3];
    yy = yy ? (yy.length === 2 ? "20" + yy : yy) : String(today.getFullYear());
    return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

// ---------- CSV (com guarda anti-injeção de fórmula) ----------
function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // neutraliza fórmula no Excel/Sheets
  return `"${s.replace(/"/g, '""')}"`;
}
export function vgToCSV(rows: VgRow[], cols: VgColumn[], schema: VgSchema): string {
  const head = cols.map((c) => `"${c.label}"`).join(";");
  const line = (r: VgRow) => cols.map((c) => {
    let v: unknown = r[c.key];
    if (c.type === "person") v = schema.peopleMap[String(v)]?.nome || "";
    return csvCell(v);
  }).join(";");
  return [head, ...rows.map(line)].join("\n");
}

// mistura de cor p/ fundo de chip (aceita oklch, hex e var(--...))
export function vgColorMix(c: string, a: number): string {
  if (c.startsWith("oklch(")) return c.replace(/\)$/, ` / ${a})`);
  if (c.startsWith("#")) {
    const h = c.slice(1);
    const n = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
    const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `color-mix(in oklab, ${c} ${Math.round(a * 100)}%, transparent)`;
}
