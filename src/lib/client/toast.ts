"use client"

// Global toast store (zustand) — one toast at a time, app-wide. Components call
// `toast("…")`; the <Toaster /> in the root layout renders it. An optional
// `retry` callback renders a "Tentar novamente" action (used by apiSend on
// network failure).
import { create } from "zustand"

export type ToastKind = "info" | "error"

type ToastOpts = { kind?: ToastKind; retry?: (() => void) | null }

type ToastState = {
  msg: string | null
  kind: ToastKind
  retry: (() => void) | null
  seq: number // bumps on every show so equal messages still reset the timer
  show: (msg: string, opts?: ToastOpts) => void
  clear: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  msg: null,
  kind: "info",
  retry: null,
  seq: 0,
  show: (msg, opts) =>
    set((s) => ({ msg, kind: opts?.kind ?? "info", retry: opts?.retry ?? null, seq: s.seq + 1 })),
  clear: () => set({ msg: null, retry: null }),
}))

export function toast(msg: string, opts?: ToastOpts): void {
  useToastStore.getState().show(msg, opts)
}
