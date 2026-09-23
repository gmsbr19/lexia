import "@/components/tarefas/tk.css"
import { TarefasApp } from "@/components/tarefas/TarefasApp"
import { carregarPagina, paramId } from "@/lib/tarefas/pagina"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Link direto de um projeto (LexIA "/projetos/<id>"): não existe quadro por
// projeto — abre o Quadro único filtrado por ele.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [carga, { id }] = await Promise.all([carregarPagina(), params])
  const projetoId = paramId(id)
  const existe = projetoId != null && carga.inicial.projetos.some((p) => p.id === projetoId)
  return <TarefasApp {...carga} pagina="board" projetoId={existe ? projetoId : null} />
}
