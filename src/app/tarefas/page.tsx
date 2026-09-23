import "@/components/tarefas/tk.css"
import { TarefasApp } from "@/components/tarefas/TarefasApp"
import { carregarPagina, paramId } from "@/lib/tarefas/pagina"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Quadro único de Tarefas. `?pagina=equipe` abre a Equipe (só gestão);
// `?projeto=<id>` filtra por um projeto; `?visao=lista|fluxo`; `?tarefa=<id>`
// abre o detalhe (links da LexIA e das notificações).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [carga, params] = await Promise.all([carregarPagina(), searchParams])
  const visao = params.visao === "lista" ? "list" : params.visao === "fluxo" ? "flow" : null
  return (
    <TarefasApp
      {...carga}
      pagina={params.pagina === "equipe" ? "team" : "board"}
      projetoId={paramId(params.projeto)}
      tarefaId={paramId(params.tarefa)}
      visao={visao}
    />
  )
}
