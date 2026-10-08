import "@/components/tarefas/tk.css"
import { redirect } from "next/navigation"
import { TarefasApp } from "@/components/tarefas/TarefasApp"
import { carregarPagina, destinoDoProjeto, paramId } from "@/lib/tarefas/pagina"
import { chaveCaso, chaveInterno } from "@/lib/tarefas/projetos-quadro"
import type { Pagina } from "@/components/tarefas/tk-mobile"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PAGINAS: Record<string, Pagina> = { equipe: "team", modelos: "modelos", projetos: "projetos" }

// Quadro único de Tarefas. `?pagina=projetos|modelos|equipe` abre as outras
// páginas do módulo (Equipe só gestão); `?caso=<id>` filtra por um caso e
// `?projeto=<id>` por um projeto interno (se ele virou caso, redireciona para o
// caso); `?visao=lista|fluxo`; `?tarefa=<id>` abre o detalhe (links da LexIA e
// das notificações).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const projetoId = paramId(params.projeto)
  const destino = projetoId != null ? await destinoDoProjeto(projetoId) : null
  if (projetoId != null && destino?.tipo !== "interno") {
    const q = new URLSearchParams()
    if (destino?.tipo === "caso") q.set("caso", String(destino.id))
    for (const k of ["visao", "tarefa", "pagina"]) {
      const v = params[k]
      if (typeof v === "string") q.set(k, v)
    }
    redirect(`/tarefas${q.size ? `?${q}` : ""}`)
  }
  const carga = await carregarPagina()
  const visao = params.visao === "lista" ? "list" : params.visao === "fluxo" ? "flow" : null
  const casoId = paramId(params.caso)
  const projeto = destino?.tipo === "interno" ? chaveInterno(destino.id) : casoId != null ? chaveCaso(casoId) : null
  return (
    <TarefasApp
      {...carga}
      pagina={(typeof params.pagina === "string" && PAGINAS[params.pagina]) || "board"}
      projeto={projeto}
      tarefaId={paramId(params.tarefa)}
      visao={visao}
    />
  )
}
