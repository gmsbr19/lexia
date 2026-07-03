import "@/components/tarefas/tf-theme.css"
import "@/components/projetos/pj-theme.css"
import { auth } from "@/lib/auth"
import type { Role } from "@/lib/auth/session"
import { getWorkspaceData } from "@/lib/projetos/workspace"
import { ProjetosWorkspace } from "@/components/projetos/ProjetosWorkspace"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Deep-link to a specific project (LexIA "/projetos/<id>"). Opens the Projetos
// tab with that project pre-selected (falls back to the first if it 404s).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([auth(), params])
  const role = (session?.user?.role as Role) ?? "estagiario"
  const projetoId = Number(id)
  const data = await getWorkspaceData(session?.user?.email)
  return <ProjetosWorkspace dataset={data} role={role} initialTab="projetos" initialProjetoId={Number.isInteger(projetoId) ? projetoId : null} />
}
