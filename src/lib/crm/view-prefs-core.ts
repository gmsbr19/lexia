// Saved-view preferences para o grid "Controles de Visão" (ViewGrid). Uma única
// coluna User.crmViewPrefs guarda um blob JSON keyed por gridId; cada grid tem
// um store com VÁRIAS visões salvas (activeId + views[]). CLIENT-SAFE (sem I/O).
// Repropósito da versão single-view do DataGrid (Fase 2) — o parser descarta
// entradas fora do novo formato (ex.: blobs antigos), caindo p/ as visões-semente.
import type { VgGridStore } from "@/components/ui/viewgrid/vg-types";

export type GridId = "oportunidades" | "contatos" | "conversoes";
export type CrmViewPrefs = Partial<Record<GridId, VgGridStore>>;

// valida (frouxamente) que um valor é um VgGridStore utilizável
function isGridStore(v: unknown): v is VgGridStore {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.activeId !== "string" || !Array.isArray(o.views)) return false;
  return o.views.every((x) => x && typeof x === "object"
    && typeof (x as Record<string, unknown>).id === "string"
    && typeof (x as Record<string, unknown>).name === "string"
    && (x as Record<string, unknown>).state != null);
}

export function parseViewPrefs(raw: string | null | undefined): CrmViewPrefs {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object") return {};
    const out: CrmViewPrefs = {};
    for (const k of ["oportunidades", "contatos", "conversoes"] as GridId[]) {
      const store = (v as Record<string, unknown>)[k];
      if (isGridStore(store)) out[k] = store;
    }
    return out;
  } catch {
    return {};
  }
}
