import { useMemo, useState } from "react"
import type { DocumentoRow } from "@/lib/documentos/types"
import { DOCUMENTO_STATUS_LABEL } from "@/lib/documentos/types"
import { categoriaDoTemplate } from "../documents-page.data"

const LIBRARY_FILTER_TO_CATEGORY: Record<string, string | null> = {
  Todos: null,
  Contratos: "Contrato",
  Procurações: "Procuração",
  Propostas: "Proposta",
  Pareceres: "Parecer Jurídico",
}

export function useDocumentFilter(documentos: DocumentoRow[]) {
  const [filterType, setFilterType] = useState<string>("Todos")
  const [query, setQuery] = useState("")

  const visibleDocuments = useMemo(() => {
    const categoryFilter = LIBRARY_FILTER_TO_CATEGORY[filterType]
    const normalizedQuery = query.trim().toLowerCase()

    return documentos.filter((doc) => {
      const matchesType = categoryFilter === null || categoriaDoTemplate(doc.template) === categoryFilter
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [doc.nome, doc.cliente ?? "", doc.criadoPor ?? "", DOCUMENTO_STATUS_LABEL[doc.status]]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      return matchesType && matchesQuery
    })
  }, [documentos, filterType, query])

  return { filterType, setFilterType, query, setQuery, visibleDocuments }
}
