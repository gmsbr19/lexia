"use client"

// Pages with a fixed bottom bar (e.g. the financeiro totals footer) report its
// height here so the floating LexIA pill can float *above* it instead of over
// it. Keyed so several could register; the shell uses the largest. The page is
// responsible for also padding its own scroll area so its last rows clear the
// floating pill (the inset only moves the pill, not the page content).
import { useEffect, type RefObject } from "react"
import { create } from "zustand"

type State = {
  insets: Record<string, number>
  set: (key: string, px: number) => void
  clear: (key: string) => void
}

const useStore = create<State>((set) => ({
  insets: {},
  set: (key, px) =>
    set((s) => (s.insets[key] === px ? s : { insets: { ...s.insets, [key]: px } })),
  clear: (key) =>
    set((s) => {
      if (!(key in s.insets)) return s
      const next = { ...s.insets }
      delete next[key]
      return { insets: next }
    }),
}))

/** The tallest reported bottom bar (0 if none). Subscribes to changes. */
export function useBottomInset(): number {
  return useStore((s) => {
    const vals = Object.values(s.insets)
    return vals.length ? Math.max(...vals) : 0
  })
}

/** Report a fixed bottom bar's live height (via a ref) for as long as mounted. */
export function useReportBottomBar(ref: RefObject<HTMLElement | null>, key: string): void {
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === "undefined") return
    // store actions are stable, read them once inside the effect (not deps)
    const { set, clear } = useStore.getState()
    const update = () => set(key, el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      ro.disconnect()
      clear(key)
    }
  }, [ref, key])
}
