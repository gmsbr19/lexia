import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

// A lista de projetos (casos dos clientes + projetos internos) é a aba Projetos
// do módulo Tarefas.
export default function Page() {
  redirect("/tarefas?pagina=projetos")
}
