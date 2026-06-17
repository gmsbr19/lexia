// Processos (Contencioso) — shared client types: the sub-tab union + the nav
// contract the pages use (router-backed in ProcessosApp).
import type { ProcessosDataset } from "@/lib/processos/dataset"

export type ProcView = "painel" | "processos" | "prazos" | "andamentos" | "captura" | "saude"

export interface ProcNav {
  /** Open the consolidated ficha at /processos/[id]. */
  openProcesso: (id: number) => void
  /** Open a cliente cadastro at /clientes/[id]. */
  openCliente: (id: number) => void
  /** Switch the active sub-tab (synced to ?view=). */
  setView: (v: ProcView) => void
  /** router.refresh() after a mutation. */
  refresh: () => void
}

export type { ProcessosDataset }
