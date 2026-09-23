import "@/components/tarefas/tk.css"
import { TarefasApp } from "@/components/tarefas/TarefasApp"
import { carregarPagina } from "@/lib/tarefas/pagina"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Projetos (parte do módulo Tarefas): Ativos · Arquivados · Modelos.
export default async function Page() {
  const carga = await carregarPagina()
  return <TarefasApp {...carga} pagina="projects" />
}
