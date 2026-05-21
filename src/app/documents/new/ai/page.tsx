import { redirect } from "next/navigation"

// Chat IA separado removido — painel IA agora vive dentro do editor unificado.
export default function AIChatPage() {
  redirect("/documents/editor/contrato-honorarios")
}
