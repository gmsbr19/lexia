"use client"

// Client state for the configurable Comercial pipeline (etapas abertas) +
// motivos de perda — loaded once in UnifiedShell, reloaded after an admin/
// sócio edits them in Configurações. Mirrors useAreasStore
// (src/lib/areas/store.ts). Types come from settings.ts via `import type`
// (erased at build time — no server code is bundled into the client).
import { create } from "zustand"
import { apiSend } from "@/lib/client/api"
import type { MotivoPerda, MotivosPerdaConfig, PipelineConfig, PipelineStage } from "@/lib/settings"

type State = {
  stages: PipelineStage[]
  motivos: MotivoPerda[]
  loaded: boolean
  load: () => Promise<void>
  reload: () => Promise<void>
}

async function fetchBoth(): Promise<{ stages: PipelineStage[]; motivos: MotivoPerda[] }> {
  const [pipeline, motivosCfg] = await Promise.all([
    apiSend<PipelineConfig>("/api/comercial/pipeline", "GET"),
    apiSend<MotivosPerdaConfig>("/api/comercial/motivos", "GET"),
  ])
  return { stages: pipeline.stages, motivos: motivosCfg.motivos }
}

export const usePipelineStore = create<State>((set, get) => ({
  stages: [],
  motivos: [],
  loaded: false,
  load: async () => {
    if (get().loaded) return
    try {
      const { stages, motivos } = await fetchBoth()
      set({ stages, motivos, loaded: true })
    } catch {
      // silently ignore — app funciona com o fallback estático (cm-meta.ts CM_STAGES/MOTIVOS)
    }
  },
  reload: async () => {
    try {
      const { stages, motivos } = await fetchBoth()
      set({ stages, motivos, loaded: true })
    } catch {
      /* mantém o estado anterior */
    }
  },
}))

// ── seletores puros (não acoplados ao React) ──────────────────────────────────
const ETAPA_FIXA_LABEL: Record<string, string> = { ganho: "Ganho", perdido: "Perdido" }
const ETAPA_FIXA_COR: Record<string, string> = { ganho: "#2E9E5B", perdido: "#C0492F" }

/** Rótulo de exibição: nome configurado, os 2 terminais fixos, ou o valor cru
 *  (etapa removida da config mas ainda presente em oportunidades antigas). */
export function resolveEtapaLabel(stages: PipelineStage[], etapa: string): string {
  return ETAPA_FIXA_LABEL[etapa] ?? stages.find((s) => s.key === etapa)?.nome ?? etapa
}

/** Cor hex da etapa, os 2 terminais fixos, ou null. */
export function resolveEtapaColor(stages: PipelineStage[], etapa: string): string | null {
  return ETAPA_FIXA_COR[etapa] ?? stages.find((s) => s.key === etapa)?.cor ?? null
}

/** Etapas ABERTAS na ordem configurada (sem ganho/perdido) — p/ pickers "mover para". */
export function toStageOptions(stages: PipelineStage[]): PipelineStage[] {
  return [...stages].sort((a, b) => a.ordem - b.ordem)
}
