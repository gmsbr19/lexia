"use client"

// Generic optimistic-update hook for a row-list — extracted from
// ProjetosWorkspace.tsx's applyLocal/commit/liveEdit/flushPending (Tarefas),
// parameterized by entity instead of hardcoded to /api/tarefas. Each grid
// (Oportunidades, Contatos) instantiates its own. Unlike ProjetosWorkspace's
// mergeTask, this hook does NOT reconcile cross-field derived state (e.g.
// status↔done sync) — DataGrid cells emit single-field patches, so a shallow
// merge is enough; a caller needing entity-specific derivation should
// pre-compute it before calling commit/liveEdit.
import { useCallback, useRef, useState } from "react"
import { apiSend } from "./api"
import { toast } from "./toast"

export interface OptimisticRowsConfig<T> {
  initialRows: T[]
  getId: (row: T) => number
  patchUrl: (id: number) => string
  bulkUrl?: string
  onError?: (msg: string) => void
  /** Default 600ms — matches ProjetosWorkspace's liveEdit debounce. */
  debounceMs?: number
}

export interface OptimisticRowsApi<T> {
  rows: T[]
  setRows: React.Dispatch<React.SetStateAction<T[]>>
  applyLocal: (id: number, patch: Partial<T>) => void
  /** applyLocal + immediate fire-and-forget PATCH (discrete single-value picks). */
  commit: (id: number, patch: Partial<T>) => void
  /** applyLocal + a single shared 600ms-debounced coalesced PATCH (keystroke streams). */
  liveEdit: (id: number, patch: Partial<T>) => void
  flushPending: () => Promise<void>
  /** Optimistic bulk field-set across many rows, with rollback on failure —
   *  a failed bulk touches rows the user isn't looking at, so unlike
   *  commit/liveEdit this DOES roll back (see CLAUDE.md §11 Fase 2). */
  bulkApply: (ids: number[], field: string, value: unknown) => Promise<void>
  bulkDelete: (ids: number[]) => Promise<void>
}

export function useOptimisticRows<T>(config: OptimisticRowsConfig<T>): OptimisticRowsApi<T> {
  const { initialRows, getId, patchUrl, bulkUrl, onError, debounceMs = 600 } = config
  const [rows, setRows] = useState<T[]>(initialRows)
  // Re-sync when the server-fetched initialRows array changes (e.g. after
  // router.refresh()) — the React-documented "adjust state during render"
  // technique (https://react.dev/learn/you-might-not-need-an-effect), not an
  // effect, so the sync commits in the same render instead of one tick later.
  const [syncedRows, setSyncedRows] = useState(initialRows)
  if (initialRows !== syncedRows) {
    setSyncedRows(initialRows)
    setRows(initialRows)
  }

  const fail = useCallback((msg: string) => (onError ? onError(msg) : toast(msg, { kind: "error" })), [onError])

  const applyLocal = useCallback(
    (id: number, patch: Partial<T>) => setRows((rs) => rs.map((r) => (getId(r) === id ? { ...r, ...patch } : r))),
    [getId],
  )

  const sendPatch = useCallback(
    async (id: number, patch: Partial<T>) => {
      try {
        await apiSend(patchUrl(id), "PATCH", patch)
      } catch {
        fail("Erro ao salvar")
      }
    },
    [patchUrl, fail],
  )

  const pending = useRef(new Map<number, Partial<T>>())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushPending = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const entries = [...pending.current.entries()]
    pending.current.clear()
    for (const [id, patch] of entries) await sendPatch(id, patch)
  }, [sendPatch])

  const commit = useCallback(
    (id: number, patch: Partial<T>) => {
      applyLocal(id, patch)
      void sendPatch(id, patch)
    },
    [applyLocal, sendPatch],
  )

  const liveEdit = useCallback(
    (id: number, patch: Partial<T>) => {
      applyLocal(id, patch)
      pending.current.set(id, { ...(pending.current.get(id) ?? {}), ...patch })
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flushPending(), debounceMs)
    },
    [applyLocal, flushPending, debounceMs],
  )

  const bulkApply = useCallback(
    async (ids: number[], field: string, value: unknown) => {
      if (!bulkUrl || !ids.length) return
      const snapshot = rows
      setRows((rs) => rs.map((r) => (ids.includes(getId(r)) ? { ...r, [field]: value } : r)))
      try {
        await apiSend(bulkUrl, "PATCH", { ids, [field]: value })
      } catch {
        setRows(snapshot)
        fail("Erro ao atualizar em lote")
      }
    },
    [bulkUrl, rows, getId, fail],
  )

  const bulkDelete = useCallback(
    async (ids: number[]) => {
      if (!bulkUrl || !ids.length) return
      const snapshot = rows
      setRows((rs) => rs.filter((r) => !ids.includes(getId(r))))
      try {
        await apiSend(bulkUrl, "PATCH", { ids, excluir: true })
      } catch {
        setRows(snapshot)
        fail("Erro ao excluir em lote")
      }
    },
    [bulkUrl, rows, getId, fail],
  )

  return { rows, setRows, applyLocal, commit, liveEdit, flushPending, bulkApply, bulkDelete }
}
