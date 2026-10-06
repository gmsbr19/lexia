import { redirect } from "next/navigation"
import { casoDoProjetoAntigo, paramId } from "@/lib/tarefas/pagina"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Link antigo de um projeto (ex.: LexIA "/projetos/<id>"): projetos foram
// unificados aos Casos — abre o quadro filtrado pelo caso em que ele virou.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const caso = await casoDoProjetoAntigo(paramId(id))
  redirect(caso != null ? `/tarefas?caso=${caso}` : "/tarefas")
}
