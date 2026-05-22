import { useState } from "react"
import { DOCUMENTS } from "../documents-page.data"

const LIBRARY_FILTER_TO_TYPE: Record<string, string | null> = {
  Todos: null,
  Contratos: "Contrato",
  Procurações: "Procuração",
  Propostas: "Proposta",
  Pareceres: "Parecer Jurídico",
}

export function useDocumentFilter() {
  const [filterType, setFilterType] = useState<string>("Todos")
  const [query, setQuery] = useState("")

  const visibleDocuments = DOCUMENTS.filter((document) => {
    const typeFilter = LIBRARY_FILTER_TO_TYPE[filterType]
    const matchesType = typeFilter === null || document.type === typeFilter
    const normalizedQuery = query.trim().toLowerCase()
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [document.name, document.client, document.author, document.type].join(" ").toLowerCase().includes(normalizedQuery)

    return matchesType && matchesQuery
  })

  return { filterType, setFilterType, query, setQuery, visibleDocuments }
}
