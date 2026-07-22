// Projetos & Tarefas — server loader for the unified workspace. Composes the
// tarefas dataset (tasks + sócios + casos + clientes) and the projetos dataset
// (dynamic project entities with derived progresso/saúde) in parallel, plus the
// CURRENT session user's id (for "Minhas tarefas" / "Só minhas" filters and the
// quick-add default assignee) — resolved from the session e-mail, never
// guessed from the sócios list. SERVER ONLY.
import { userIdPorEmail } from "@/lib/notificacoes/recipients"
import { getTarefasDataset } from "@/lib/tarefas/queries"
import type { IdNome, TaskRow, TeamMember } from "@/lib/tarefas/types"
import { getProjetosDataset } from "./queries"
import type { ProjetoView, SecaoView } from "./types"

export interface WorkspaceData {
  tarefas: TaskRow[]
  projetos: ProjetoView[]
  secoes: SecaoView[]
  socios: TeamMember[]
  casos: IdNome[]
  clientes: IdNome[]
  meId: number | null
}

export async function getWorkspaceData(sessionEmail?: string | null): Promise<WorkspaceData> {
  const [t, p, meId] = await Promise.all([getTarefasDataset(), getProjetosDataset(), userIdPorEmail(sessionEmail)])
  return { tarefas: t.tarefas, projetos: p.projetos, secoes: p.secoes, socios: t.socios, casos: t.casos, clientes: t.clientes, meId }
}
