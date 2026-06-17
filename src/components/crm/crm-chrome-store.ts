"use client"

// Tiny store the global app chrome shares with the shell. The unified LexIA bar
// (search + actions + AI in one acrylic command surface) replaced the separate
// Spotlight (⌘K) and the floating LexIA orb/popup, so there is a single `bar`
// flag (with an optional seed query) plus `settings`. The sidebar "Buscar" field
// and "Configurações" button open these from any module.
import { create } from "zustand"

type ChromeState = {
  bar: boolean
  barSeed: string
  settings: boolean
  openBar: (seed?: string) => void
  toggleBar: () => void
  openSettings: () => void
  close: (k: "bar" | "settings") => void
}

export const useCrmChrome = create<ChromeState>((set) => ({
  bar: false,
  barSeed: "",
  settings: false,
  openBar: (seed = "") => set({ bar: true, barSeed: seed }),
  toggleBar: () => set((s) => (s.bar ? { bar: false } : { bar: true, barSeed: "" })),
  openSettings: () => set({ settings: true }),
  close: (k) => set({ [k]: false } as Partial<ChromeState>),
}))
