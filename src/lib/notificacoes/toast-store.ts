"use client"

// Fila TRANSIENTE dos popups de notificação (canto superior direito). Separada do
// store principal (sino/histórico) e dos toasts genéricos (CrmToast, rodapé). Cada
// item some sozinho após o TTL; o usuário também pode marcar como lida ou dispensar.
import { create } from "zustand"
import type { NotificacaoRow } from "./types"

export interface PopupItem {
  key: string
  notif: NotificacaoRow
}

type State = {
  items: PopupItem[]
  push: (notif: NotificacaoRow) => void
  dismiss: (key: string) => void
}

let seq = 0
const TTL_MS = 6500
const MAX_VISIVEL = 4
// Handles dos timers de auto-dispensa, por key — limpos no dismiss (evita vazar e
// não re-dispensar uma key já removida).
const timers: Record<string, ReturnType<typeof setTimeout>> = {}

export const useNotificacoesToasts = create<State>((set, get) => {
  const arm = (key: string) => {
    if (timers[key]) clearTimeout(timers[key])
    timers[key] = setTimeout(() => get().dismiss(key), TTL_MS)
  }
  return {
    items: [],
    push: (notif) => {
      // Coalesce por id: uma notificação atualizada (grupoKey no servidor → evento
      // "atualizada") reaproveita o toast visível, atualizando o conteúdo e
      // reiniciando o TTL — em vez de empilhar um card novo a cada repetição.
      const existente = get().items.find((i) => i.notif.id === notif.id)
      if (existente) {
        arm(existente.key)
        set((s) => ({ items: s.items.map((i) => (i.key === existente.key ? { key: i.key, notif } : i)) }))
        return
      }
      const key = `np${++seq}`
      arm(key)
      set((s) => ({ items: [{ key, notif }, ...s.items].slice(0, MAX_VISIVEL) }))
    },
    dismiss: (key) => {
      if (timers[key]) {
        clearTimeout(timers[key])
        delete timers[key]
      }
      set((s) => ({ items: s.items.filter((i) => i.key !== key) }))
    },
  }
})
