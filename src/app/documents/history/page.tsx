import { redirect } from "next/navigation"

// Histórico migrado para a tab "Meus documentos" em /documents.
export default function HistoryPage() {
  redirect("/documents?tab=meus-documentos")
}
