import "@/components/tarefas/tf-theme.css"
import "@/components/projetos/pj-theme.css"
import { auth } from "@/lib/auth"
import type { Role } from "@/lib/auth/session"
import { getWorkspaceData } from "@/lib/projetos/workspace"
import { ProjetosWorkspace } from "@/components/projetos/ProjetosWorkspace"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Same workspace as /tarefas, opened on the Projetos tab (LexIA "/projetos" + the
// sidebar deep-link land here).
export default async function Page() {
  const session = await auth()
  const role = (session?.user?.role as Role) ?? "estagiario"
  const data = await getWorkspaceData()
  return <ProjetosWorkspace dataset={data} role={role} initialTab="projetos" />
}
