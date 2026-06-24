"use client"

// Estado client das áreas do direito — carregado uma vez no UnifiedShell e
// recarregado após mutações no painel admin. Fornece seletores para resolução
// de rótulo/cor usados em todos os módulos (Projetos, Casos, Comercial).
import { create } from "zustand"
import { apiSend } from "@/lib/client/api"
import type { AreaOption, AreaView } from "./types"

type State = {
  areas: AreaView[]
  loaded: boolean
  load: () => Promise<void>
  reload: () => Promise<void>
}

export const useAreasStore = create<State>((set, get) => ({
  areas: [],
  loaded: false,
  load: async () => {
    if (get().loaded) return
    try {
      const areas = await apiSend<AreaView[]>("/api/areas", "GET")
      set({ areas, loaded: true })
    } catch {
      // silently ignore — app funciona sem áreas carregadas (fallback ao valor cru)
    }
  },
  reload: async () => {
    try {
      const areas = await apiSend<AreaView[]>("/api/areas", "GET")
      set({ areas, loaded: true })
    } catch {}
  },
}))

// ── seletores puros (não acoplados ao React) ──────────────────────────────────

/** Rótulo de exibição: nome da área ou fallback ao valor cru (área removida). */
export function resolveAreaLabel(areas: AreaView[], chave: string | null | undefined): string {
  if (!chave) return ""
  return areas.find((a) => a.chave === chave)?.nome ?? chave
}

/** Cor hex da área ou null. */
export function resolveAreaColor(areas: AreaView[], chave: string | null | undefined): string | null {
  if (!chave) return null
  return areas.find((a) => a.chave === chave)?.cor ?? null
}

/** Lista de pickers {id=chave, label=nome, cor} — só áreas ativas. */
export function toAreaOptions(areas: AreaView[]): AreaOption[] {
  return areas.filter((a) => a.ativo).map((a) => ({ id: a.chave, label: a.nome, cor: a.cor }))
}
