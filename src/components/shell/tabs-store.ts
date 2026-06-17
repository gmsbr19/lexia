"use client"

// Global tab strip state (Notion-style). Tabs are SLOTS with a stable id whose
// route (href) changes as you navigate: a normal navigation REUSES the active
// tab (replaces its href); only ⌘/Ctrl+click (markPendingNew) opens a NEW tab.
// The shell calls reconcile(pathname) on every navigation; it decides reuse vs
// new based on `pendingNew`. Persisted to localStorage; SSR-safe (hydrate after
// mount).
import { create } from "zustand"
import type { CrmIconName } from "@/components/crm/crm-icons"

export interface TabItem {
  id: string
  href: string // current pathname shown in this slot
  label: string
  icon: CrmIconName
}

const LS_KEY = "lexia-tabs-v2"
const genId = () => "tab" + Math.random().toString(36).slice(2, 9)

type Persisted = { tabs: TabItem[]; activeId: string | null }

type TabsState = {
  tabs: TabItem[]
  activeId: string | null
  pendingNew: boolean
  started: boolean // first reconcile (page load) adds a tab; later ones reuse the active slot
  hydrated: boolean
  hydrate: () => void
  markPendingNew: () => void
  /** Called by the shell on every pathname change. */
  reconcile: (href: string, label: string, icon: CrmIconName) => void
  setActive: (id: string) => void
  setLabel: (href: string, label: string, icon?: CrmIconName) => void
  /** Close a tab; returns the href to navigate to if the ACTIVE tab was closed, else null. */
  close: (id: string) => string | null
}

function save(s: Persisted) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export const useTabs = create<TabsState>((set, get) => ({
  tabs: [],
  activeId: null,
  pendingNew: false,
  started: false,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return
    let tabs: TabItem[] = []
    let activeId: string | null = null
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const p = JSON.parse(raw) as Persisted
        if (p && Array.isArray(p.tabs)) {
          tabs = p.tabs.filter((t) => t && typeof t.href === "string" && typeof t.id === "string")
          activeId = typeof p.activeId === "string" ? p.activeId : null
        }
      }
    } catch {
      /* ignore */
    }
    set({ tabs, activeId, hydrated: true })
  },
  markPendingNew: () => set({ pendingNew: true }),
  reconcile: (href, label, icon) =>
    set((s) => {
      const existing = s.tabs.find((t) => t.href === href)
      if (existing) {
        save({ tabs: s.tabs, activeId: existing.id })
        return { activeId: existing.id, pendingNew: false, started: true }
      }
      const activeValid = s.activeId != null && s.tabs.some((t) => t.id === s.activeId)
      // first reconcile (page load), explicit new tab, or no active slot → ADD a tab
      if (!s.started || s.pendingNew || !activeValid) {
        const id = genId()
        const tabs = [...s.tabs, { id, href, label, icon }]
        save({ tabs, activeId: id })
        return { tabs, activeId: id, pendingNew: false, started: true }
      }
      // in-app navigation → reuse the active tab: replace its route in place
      const tabs = s.tabs.map((t) => (t.id === s.activeId ? { ...t, href, label, icon } : t))
      save({ tabs, activeId: s.activeId })
      return { tabs, pendingNew: false, started: true }
    }),
  setActive: (id) => set({ activeId: id }),
  setLabel: (href, label, icon) =>
    set((s) => {
      const tabs = s.tabs.map((t) => (t.href === href ? { ...t, label, icon: icon ?? t.icon } : t))
      save({ tabs, activeId: s.activeId })
      return { tabs }
    }),
  close: (id) => {
    const s = get()
    const idx = s.tabs.findIndex((t) => t.id === id)
    if (idx < 0) return null
    const tabs = s.tabs.filter((t) => t.id !== id)
    let activeId = s.activeId
    let nextHref: string | null = null
    if (s.activeId === id) {
      const neighbor = tabs[Math.min(idx, tabs.length - 1)] ?? null
      activeId = neighbor?.id ?? null
      nextHref = neighbor?.href ?? "/"
    }
    save({ tabs, activeId })
    set({ tabs, activeId })
    return nextHref
  },
}))
