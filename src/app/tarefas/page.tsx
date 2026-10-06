import "@/components/tarefas/tk.css"
import { redirect } from "next/navigation"
import { TarefasApp } from "@/components/tarefas/TarefasApp"
import { carregarPagina, casoDoProjetoAntigo, paramId } from "@/lib/tarefas/pagina"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Quadro único de Tarefas. `?pagina=equipe` abre a Equipe (só gestão) e
// `?pagina=modelos` os Modelos; `?caso=<id>` filtra por um caso; `?visao=lista|fluxo`;
// `?tarefa=<id>` abre o detalhe (links da LexIA e das notificações). O antigo
// `?projeto=<id>` (antes da unificação Projeto → Caso) redireciona para o caso.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const projetoAntigo = paramId(params.projeto)
  if (projetoAntigo != null) {
    const caso = await casoDoProjetoAntigo(projetoAntigo)
    const q = new URLSearchParams()
    if (caso != null) q.set("caso", String(caso))
    for (const k of ["visao", "tarefa", "pagina"]) {
      const v = params[k]
      if (typeof v === "string") q.set(k, v)
    }
    redirect(`/tarefas${q.size ? `?${q}` : ""}`)
  }
  const carga = await carregarPagina()
  const visao = params.visao === "lista" ? "list" : params.visao === "fluxo" ? "flow" : null
  return (
    <TarefasApp
      {...carga}
      pagina={params.pagina === "equipe" ? "team" : params.pagina === "modelos" ? "modelos" : "board"}
      casoId={paramId(params.caso)}
      tarefaId={paramId(params.tarefa)}
      visao={visao}
    />
  )
}
