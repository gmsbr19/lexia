"use client"

// Per-user saved-view wiring for a DataGrid instance (Fase 2 do CRM Comercial)
// — GET-on-mount + a 600ms-debounced PATCH-on-change, following the same
// idiom as useOptimisticRows' liveEdit. The PATCH always sends the FULL
// CrmViewPrefs object (server convention: full-object replace, mirrors
// notificacoes/preferencias.ts setPrefs) so editing one grid's view never
// clobbers the other gridId's key in the shared JSON blob.
import { useEffect, useRef, useState } from "react"
import { apiSend } from "./api"
import type { CrmViewPrefs, GridId } from "@/lib/crm/view-prefs-core"
import type { GridViewState } from "@/components/ui/datagrid/types"

export interface CrmSavedView {
  initial: GridViewState | null
  onChange: (v: GridViewState) => void
  ready: boolean
}

// Process-level cache of the fetched prefs — the GET gates the grid render, so
// caching it makes tab revisits instant (no skeleton flash) while a background
// refetch keeps it fresh. Persisted-on-change writes update the cache too, so
// two grids on different routes stay consistent within a session.
let prefsCache: CrmViewPrefs | null = null

export function useCrmSavedView(gridId: GridId): CrmSavedView {
  const [initial, setInitial] = useState<GridViewState | null>(() => prefsCache?.[gridId] ?? null)
  const [ready, setReady] = useState(prefsCache !== null)
  const fullPrefs = useRef<CrmViewPrefs>(prefsCache ?? {})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let alive = true
    apiSend<CrmViewPrefs>("/api/crm/view-prefs", "GET")
      .then((prefs) => {
        if (!alive) return
        prefsCache = prefs ?? {}
        fullPrefs.current = prefsCache
        setInitial(prefsCache[gridId] ?? null)
        setReady(true)
      })
      .catch(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [gridId])

  const onChange = (view: GridViewState) => {
    fullPrefs.current = { ...fullPrefs.current, [gridId]: view }
    prefsCache = fullPrefs.current
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void apiSend("/api/crm/view-prefs", "PATCH", fullPrefs.current).catch(() => {})
    }, 600)
  }

  return { initial, onChange, ready }
}
