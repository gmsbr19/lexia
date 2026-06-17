import "@/components/tarefas/tf-theme.css"
import { getTarefasDataset } from "@/lib/tarefas/queries"
import { TarefasApp } from "@/components/tarefas/TarefasApp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Server component: one fetch of the Tarefas dataset (tasks + sócios + casos +
// clientes); the client app holds local state and persists via the REST routes.
export default async function Page() {
  const dataset = await getTarefasDataset()
  return <TarefasApp dataset={dataset} />
}
