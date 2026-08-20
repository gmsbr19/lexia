// LexIA · Controles de Visão — API pública do módulo.
export { ViewGrid, makeDefaultState, type ViewGridProps } from "./ViewGrid";
export { Icon, type VgIconName } from "./vg-icons";
export type {
  VgSchema, VgColumn, VgColType, VgEnumMeta, VgEnumRegistry, VgEnumOrder, VgPerson,
  VgRow, VgState, VgSavedView, VgGridStore, VgSortLevel, VgDensity, VgMode,
  VgGroup, VgRule, VgNode,
} from "./vg-types";
export { type VgBulkField, type VgBulkOption } from "./vg-bulk";
export { vgToCSV, vgFmtMoney, vgFmtDate } from "./vg-engine";
