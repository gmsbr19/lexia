"use client"

// Client-side revalidation layer for the Comercial dataset. The page is a
// force-dynamic server component, so after a mutation the old code called
// router.refresh(), which re-runs EVERY server query and unmounts the whole
// client tree (table blanks, scroll/filters/selection reset). This hook
// instead revalidates via a single JSON GET and pushes the new dataset into
// the mounted component IN PLACE — the table stays put, only changed rows
// update. Seeded from the server prop on mount, so the first paint is SSR-fresh
// with zero client fetch. Concurrent revalidations are coalesced into one
// round-trip.
import { useEffect, useState } from "react"
import { apiSend } from "./api"
import type { CmDataset } from "@/lib/comercial/types"

const subscribers = new Set<(d: CmDataset) => void>()

let inFlight: Promise<void> | null = null
function revalidateShared(): Promise<void> {
  if (inFlight) return inFlight
  inFlight = apiSend<CmDataset>("/api/comercial/dataset", "GET")
    .then((d) => { if (d) for (const fn of subscribers) fn(d) })
    .catch(() => {})
    .finally(() => { inFlight = null })
  return inFlight
}

export interface ComercialData {
  dataset: CmDataset
  revalidate: () => Promise<void>
}

export function useComercialData(serverData: CmDataset): ComercialData {
  const [dataset, setDataset] = useState<CmDataset>(serverData)
  useEffect(() => {
    subscribers.add(setDataset)
    return () => { subscribers.delete(setDataset) }
  }, [])
  return { dataset, revalidate: revalidateShared }
}
