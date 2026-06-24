"use client"

// Store do chrome global compartilhado com a shell. O redesign da LexIA tem TRÊS
// superfícies (o handoff "Assistente"): o Spotlight (⌘K) — paleta de comando —, o
// Chat IA flutuante (orbe → abre/minimiza) e as Configurações. A busca da sidebar
// abre o Spotlight; o orbe abre o Chat; escolher uma sugestão/Perguntar no
// Spotlight FECHA o spotlight e ABRE o chat enviando o prompt (askChat). `chatAsk`
// (seq incremental) é o gatilho que o chat observa para enviar/abrir uma conversa.
import { create } from "zustand"

export type ChatAsk = { text: string | null; conversaId: number | null; seq: number }

type ChromeState = {
  spotlight: boolean
  spotlightSeed: string
  chat: boolean
  chatAsk: ChatAsk
  settings: boolean
  openSpotlight: (seed?: string) => void
  toggleSpotlight: () => void
  closeSpotlight: () => void
  /** abre o chat sem enviar nada (mostra a conversa atual / boas-vindas) */
  openChat: () => void
  /** abre o chat já enviando um prompt (sugestão de IA / "Perguntar") */
  askChat: (text: string) => void
  /** abre o chat carregando uma conversa existente (histórico / notificação) */
  openConversa: (id: number) => void
  closeChat: () => void
  openSettings: () => void
  close: (k: "spotlight" | "chat" | "settings") => void
}

export const useCrmChrome = create<ChromeState>((set) => ({
  spotlight: false,
  spotlightSeed: "",
  chat: false,
  chatAsk: { text: null, conversaId: null, seq: 0 },
  settings: false,
  openSpotlight: (seed = "") => set({ spotlight: true, spotlightSeed: seed }),
  toggleSpotlight: () => set((s) => (s.spotlight ? { spotlight: false } : { spotlight: true, spotlightSeed: "" })),
  closeSpotlight: () => set({ spotlight: false }),
  openChat: () => set({ chat: true, spotlight: false }),
  askChat: (text) => set((s) => ({ chat: true, spotlight: false, chatAsk: { text, conversaId: null, seq: s.chatAsk.seq + 1 } })),
  openConversa: (id) => set((s) => ({ chat: true, spotlight: false, chatAsk: { text: null, conversaId: id, seq: s.chatAsk.seq + 1 } })),
  closeChat: () => set({ chat: false }),
  openSettings: () => set({ settings: true }),
  close: (k) => set({ [k]: false } as Partial<ChromeState>),
}))
