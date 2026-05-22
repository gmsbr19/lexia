import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { DocumentsTab } from "../tabs/TabStrip"
import type { DocCategory } from "@/lib/documents/registry"

function normalizeTab(value: string | null): DocumentsTab {
  if (value === "meus-documentos" || value === "modelos") return value
  return "criar"
}

export function useTabRouting() {
  const params = useSearchParams()
  const router = useRouter()

  const initialTab = normalizeTab(params.get("tab"))
  const initialFilter = params.get("filter") ?? ""

  const [activeTab, setActiveTab] = useState<DocumentsTab>(initialTab)
  const [modelosFilter, setModelosFilter] = useState(initialFilter)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    setModelosFilter(initialFilter)
  }, [initialFilter])

  function handleTabChange(nextTab: DocumentsTab) {
    setActiveTab(nextTab)
    if (nextTab === "modelos" && modelosFilter) {
      router.replace(`/documents?tab=modelos&filter=${encodeURIComponent(modelosFilter)}`, { scroll: false })
      return
    }
    router.replace(`/documents?tab=${nextTab}`, { scroll: false })
  }

  function handleNavigateToModelos(filter?: DocCategory) {
    const nextFilter = filter ?? ""
    setModelosFilter(nextFilter)
    setActiveTab("modelos")
    router.replace(`/documents?tab=modelos${nextFilter ? `&filter=${encodeURIComponent(nextFilter)}` : ""}`, { scroll: false })
  }

  function handleOpenDocuments() {
    setActiveTab("meus-documentos")
    router.replace("/documents?tab=meus-documentos", { scroll: false })
  }

  return { activeTab, modelosFilter, handleTabChange, handleNavigateToModelos, handleOpenDocuments }
}
