import { redirect } from "next/navigation"

// Formulário manual migrado para o editor unificado em /documents/editor/[templateId].
export default function ManualFormPage() {
  redirect("/documents/editor/contrato-honorarios")
}
