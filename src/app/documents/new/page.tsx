import { redirect } from "next/navigation"

// Tela de seleção Manual vs IA removida — editor unificado substitui o fluxo.
export default function ModeSelectPage() {
  redirect("/documents")
}
