import { redirect } from "next/navigation"
import { destinoDoProjeto, paramId } from "@/lib/tarefas/pagina"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Link de um projeto (ex.: LexIA "/projetos/<id>"): projeto interno → o quadro
// filtrado por ele; projeto que virou caso → o quadro filtrado pelo caso.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const destino = await destinoDoProjeto(paramId(id))
  if (destino?.tipo === "interno") redirect(`/tarefas?projeto=${destino.id}`)
  redirect(destino ? `/tarefas?caso=${destino.id}` : "/tarefas?pagina=projetos")
}
