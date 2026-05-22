import { useEffect, useState } from "react"
import { DOCUMENT_TEMPLATES } from "@/lib/documents/registry"

export function useTemplateFilter(initialFilter: string) {
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter)

  useEffect(() => {
    setActiveFilter(initialFilter)
  }, [initialFilter])

  const visibleTemplates = activeFilter
    ? DOCUMENT_TEMPLATES.filter((template) => template.category === activeFilter)
    : DOCUMENT_TEMPLATES

  return { activeFilter, setActiveFilter, visibleTemplates }
}
