"use client"

// Estado client ÚNICO das notificações — fonte compartilhada pelo sino, pelo
// stream SSE (push ao vivo), pelos toasts e pela página /notificacoes. O badge de
// não-lidas é mantido por DELTAS (e ancorado pelo `setUnread` do frame "init" do
// SSE, que carrega a contagem real do servidor — pode ser > itens carregados).
import { create } from "zustand"
import type { NotificacaoRow } from "@/lib/notificacoes/types"

const MAX = 100 // o sino guarda só as 100 mais recentes (a página /notificacoes pagina o resto)

type State = {
  items: NotificacaoRow[]
  naoLidas: number
  hidratado: boolean
  setAll: (items: NotificacaoRow[], total?: number) => void
  prepend: (n: NotificacaoRow) => void
  replace: (n: NotificacaoRow) => void
  markRead: (id: number) => void
  markAllRead: () => void
  setUnread: (n: number) => void
}

export const useNotificacoes = create<State>((set) => ({
  items: [],
  naoLidas: 0,
  hidratado: false,
  // setAll NÃO recalcula o badge a partir dos itens carregados (≤100): a contagem
  // de não-lidas é ancorada pelo frame "init" do SSE (setUnread, sem teto) e
  // mantida por deltas. Só sobrescreve naoLidas quando o caller passa `total`.
  setAll: (items, total) =>
    set((s) => ({ items: items.slice(0, MAX), hidratado: true, naoLidas: total ?? s.naoLidas })),
  prepend: (n) =>
    set((s) => {
      if (s.items.some((i) => i.id === n.id)) return s // dedupe (já chegou por outra via)
      return { items: [n, ...s.items].slice(0, MAX), naoLidas: n.lida ? s.naoLidas : s.naoLidas + 1 }
    }),
  replace: (n) =>
    set((s) => {
      const existe = s.items.some((i) => i.id === n.id)
      if (existe) {
        // coalesce: a linha já contava como não-lida; só atualiza o conteúdo.
        return { items: s.items.map((i) => (i.id === n.id ? n : i)) }
      }
      // coalesce de uma linha fora da janela: ela JÁ estava na contagem do servidor
      // (init), então NÃO incrementa o badge — só insere a versão atualizada.
      return { items: [n, ...s.items].slice(0, MAX) }
    }),
  markRead: (id) =>
    set((s) => {
      const alvo = s.items.find((i) => i.id === id)
      const erraNaoLida = alvo && !alvo.lida
      return {
        items: s.items.map((i) => (i.id === id ? { ...i, lida: true } : i)),
        naoLidas: erraNaoLida ? Math.max(0, s.naoLidas - 1) : s.naoLidas,
      }
    }),
  markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, lida: true })), naoLidas: 0 })),
  setUnread: (n) => set({ naoLidas: Math.max(0, n) }),
}))
