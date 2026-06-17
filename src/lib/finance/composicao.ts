import type { ComposicaoBucket } from "./types"

// Client-safe presentation metadata for the composição buckets (no prisma /
// browser deps) so both the server query layer and the client donut can import
// it. Colors are brand-aligned literals (Recharts needs concrete color strings).
export const BUCKET_META: Record<ComposicaoBucket, { label: string; color: string }> = {
  recorrente: { label: "Recorrente", color: "#1F3A6E" }, // navy
  parcelado: { label: "Parcelado", color: "#C0A147" }, // gold
  exito: { label: "Êxito", color: "#2E9E5B" }, // green
  avista: { label: "À vista", color: "#7C8AA8" }, // slate
}

export const BUCKET_ORDER: ComposicaoBucket[] = ["recorrente", "parcelado", "exito", "avista"]
