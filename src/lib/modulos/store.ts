"use client"

// Estado client dos módulos (kill-switches admin) — carregado uma vez no
// UnifiedShell e recarregado após alterar o toggle no painel admin. Consumido
// pela sidebar e pelas abas do CRM para ocultar um módulo desativado.
import { create } from "zustand"
import { apiSend } from "@/lib/client/api"
import type { ModulosConfig } from "@/lib/settings"

type State = {
  modulos: ModulosConfig
  loaded: boolean
  load: () => Promise<void>
  reload: () => Promise<void>
}

export const useModulosStore = create<State>((set, get) => ({
  modulos: {},
  loaded: false,
  load: async () => {
    if (get().loaded) return
    try {
      const modulos = await apiSend<ModulosConfig>("/api/settings/modulos", "GET")
      set({ modulos, loaded: true })
    } catch {
      // silently ignore — app funciona com os módulos padrão (todos habilitados)
    }
  },
  reload: async () => {
    try {
      const modulos = await apiSend<ModulosConfig>("/api/settings/modulos", "GET")
      set({ modulos, loaded: true })
    } catch {}
  },
}))

/** Módulo "Casos & Processos" habilitado (default true — só desliga com false explícito). */
export function processosHabilitado(modulos: ModulosConfig): boolean {
  return modulos.processos !== false
}
