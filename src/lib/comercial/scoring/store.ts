"use client"

// Client state for the configurable Lead Scoring (Fit/Engajamento) + Follow-up
// (cadência/pesos/regras de perda) settings — loaded once in UnifiedShell,
// reloaded after an admin/sócio edits them in Configurações. Mirrors
// usePipelineStore (src/lib/comercial/pipeline/store.ts). Types come from
// settings.ts via `import type` (erased at build time).
import { create } from "zustand"
import { apiSend } from "@/lib/client/api"
// Valores dos defaults vêm de score.ts (núcleo PURO, sem prisma) — NUNCA de
// settings.ts (SERVER ONLY, importa prisma → arrastaria env.ts/Prisma para o
// bundle do navegador e quebraria toda página, já que DATABASE_URL/AUTH_SECRET
// não existem no cliente). Os TIPOS de settings.ts são seguros (erased em build).
import { DEFAULT_FOLLOWUP_CONFIG, DEFAULT_SCORING_CONFIG } from "@/lib/comercial/score"
import type { FollowupConfig, ScoringConfig } from "@/lib/settings"

type State = {
  scoring: ScoringConfig
  followup: FollowupConfig
  loaded: boolean
  load: () => Promise<void>
  reload: () => Promise<void>
}

async function fetchBoth(): Promise<{ scoring: ScoringConfig; followup: FollowupConfig }> {
  const [scoring, followup] = await Promise.all([
    apiSend<ScoringConfig>("/api/comercial/scoring", "GET"),
    apiSend<FollowupConfig>("/api/comercial/followup", "GET"),
  ])
  return { scoring, followup }
}

export const useScoringStore = create<State>((set, get) => ({
  scoring: DEFAULT_SCORING_CONFIG,
  followup: DEFAULT_FOLLOWUP_CONFIG,
  loaded: false,
  load: async () => {
    if (get().loaded) return
    try {
      const { scoring, followup } = await fetchBoth()
      set({ scoring, followup, loaded: true })
    } catch {
      // silently ignore — app funciona com os defaults estáticos
    }
  },
  reload: async () => {
    try {
      const { scoring, followup } = await fetchBoth()
      set({ scoring, followup, loaded: true })
    } catch {
      /* mantém o estado anterior */
    }
  },
}))
