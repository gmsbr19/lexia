import "@/components/tarefas/tf-theme.css"
import "@/components/projetos/pj-theme.css"
import { auth } from "@/lib/auth"
import type { Role } from "@/lib/auth/session"
import { getWorkspaceData } from "@/lib/projetos/workspace"
import { ProjetosWorkspace } from "@/components/projetos/ProjetosWorkspace"
import type { ModuleTab } from "@/components/projetos/pj-kit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TABS: ModuleTab[] = ["tarefas", "projetos", "dashboard", "templates"]

// Unified Projetos & Tarefas workspace. `?tab=` selects the initial module tab
// (default Tarefas); `?tarefa=<id>` still deep-opens a task (LexIA / notifications).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [session, params] = await Promise.all([auth(), searchParams])
  const role = (session?.user?.role as Role) ?? "estagiario"
  const raw = typeof params.tab === "string" ? params.tab : undefined
  const initialTab = raw && (TABS as string[]).includes(raw) ? (raw as ModuleTab) : "tarefas"
  const data = await getWorkspaceData(session?.user?.email)
  return <ProjetosWorkspace dataset={data} role={role} initialTab={initialTab} />
}
