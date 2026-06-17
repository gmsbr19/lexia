"use client"

// Global "is any modal open?" signal. Each modal shell (FxModal, CmModal,
// NovoLancamentoModal, TaskModal, CrmSettings, …) registers itself while it is
// mounted so global chrome — namely the floating LexIA bar — can step out of the
// way (the pill floats above modals and otherwise covers them). A counter (not a
// boolean) so stacked modals behave: the bar reappears only after the last one
// closes.
import { useEffect } from "react"
import { create } from "zustand"

type ModalGuardState = {
  count: number
  push: () => void
  pop: () => void
}

const useModalGuardStore = create<ModalGuardState>((set) => ({
  count: 0,
  push: () => set((s) => ({ count: s.count + 1 })),
  pop: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}))

/** Subscribe to whether at least one modal is currently open. */
export function useAnyModalOpen(): boolean {
  return useModalGuardStore((s) => s.count > 0)
}

/**
 * Mark a modal as open for as long as the calling component stays mounted.
 * Called once from each modal shell. Pass `active=false` to no-op (e.g. a shell
 * that conditionally renders nothing).
 */
export function useModalGuard(active = true): void {
  useEffect(() => {
    if (!active) return
    const { push, pop } = useModalGuardStore.getState()
    push()
    return () => pop()
  }, [active])
}
