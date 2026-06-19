// Projetos & Tarefas — server loader for the unified workspace. Composes the
// tarefas dataset (tasks + sócios + casos + clientes) and the projetos dataset
// (dynamic project entities with derived progresso/saúde) in parallel. SERVER ONLY.
import { getTarefasDataset } from "@/lib/tarefas/queries"
import type { IdNome, TaskRow, TeamMember } from "@/lib/tarefas/types"
import { getProjetosDataset } from "./queries"
import type { ProjetoView } from "./types"

export interface WorkspaceData {
  tarefas: TaskRow[]
  projetos: ProjetoView[]
  socios: TeamMember[]
  casos: IdNome[]
  clientes: IdNome[]
}

export async function getWorkspaceData(): Promise<WorkspaceData> {
  const [t, p] = await Promise.all([getTarefasDataset(), getProjetosDataset()])
  return { tarefas: t.tarefas, projetos: p.projetos, socios: t.socios, casos: t.casos, clientes: t.clientes }
}
