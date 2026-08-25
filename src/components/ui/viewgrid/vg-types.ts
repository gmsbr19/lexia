// LexIA · Controles de Visão — contratos de tipo (schema, colunas, filtro, estado, visões).
import type { VgIconName } from "./vg-icons";

export type VgColType = "text" | "enum" | "stage" | "person" | "num" | "money" | "date";

// metadados de um valor de enum (cor + ícone/ordem opcionais)
export type VgEnumMeta = {
  c: string; // cor (oklch / var(--...) / hex)
  icon?: VgIconName;
  i?: number; // ordem (etapa/funil)
  d?: string; // tooltip (ex.: qualificação A/B/C/D)
};
export type VgEnumRegistry = Record<string, Record<string, VgEnumMeta>>;
export type VgEnumOrder = Record<string, string[]>;

export type VgPerson = { id: string; nome: string; ini: string; cor: string };

export type VgColumn = {
  key: string;
  label: string;
  type: VgColType;
  fixed?: boolean; // não ocultável (1ª coluna)
  def?: boolean; // visível por padrão
  w: number; // largura inicial
  align?: "right";
  group?: boolean; // agrupável
  agg?: "sum"; // soma no grupo (money)
  meter?: "gold" | "blue"; // num → medidor 0-100
  enum?: string; // chave no registry de enums
  enumList?: string[]; // enum sem cor (valores livres, ex.: campanhas)
  personType?: boolean; // text fixo com "contact mark" PF/PJ (Contatos)
  /** Chave da linha com o texto do tooltip da célula (hover) — útil quando a
   *  célula mostra um resumo ("Sim"/"Não") e o valor bruto interessa. */
  titleKey?: string;
  /** Chave da linha usada NO CSV no lugar de `key` — exporta o valor bruto
   *  (ex.: o gclid completo) onde a tela mostra o resumo. */
  csvKey?: string;
};

export type VgSchema = {
  id: string;
  label: string;
  primaryLabel: string;
  icon?: VgIconName;
  cols: VgColumn[];
  enums: VgEnumRegistry;
  enumOrder: VgEnumOrder;
  people: VgPerson[];
  peopleMap: Record<string, VgPerson>;
  today: string; // ISO 'YYYY-MM-DD' (injetado — nunca lê o relógio ambiente)
};

// ---------- árvore de filtro ----------
export type VgCombinator = "E" | "OU";
export type VgRule = {
  type: "rule";
  id: string;
  col: string;
  op: string;
  value: string;
  value2: string;
  values: string[];
};
export type VgGroup = {
  type: "group";
  id: string;
  combinator: VgCombinator;
  children: VgNode[];
};
export type VgNode = VgRule | VgGroup;

export type VgSortDir = "asc" | "desc";
export type VgSortLevel = { col: string; dir: VgSortDir };
export type VgDensity = "comfortable" | "compact";
export type VgMode = "tabela" | "quadro";

export type VgState = {
  filters: VgGroup;
  sort: VgSortLevel[];
  groupCols: string[];
  collapseDefault: boolean;
  hidden: string[];
  order: string[];
  frozen: boolean;
  density: VgDensity;
  mode: VgMode;
};

export type VgSavedView = {
  id: string;
  name: string;
  icon: VgIconName;
  isDefault?: boolean;
  state: VgState;
};
export type VgGridStore = { activeId: string; views: VgSavedView[] };

// linha genérica: chaves do schema + id da entidade original (p/ ações)
export type VgRow = Record<string, unknown> & { id: string | number };

// grupo montado (motor de agrupamento)
export type VgBuiltGroup = {
  key: string;
  col: VgColumn;
  value: string;
  count: number;
  sums: Record<string, number>;
  rows: VgRow[] | null;
  sub: VgBuiltGroup[] | null;
  _all: VgRow[];
};
