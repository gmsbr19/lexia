"use client"

// Shared context so the kit/views/modals read REAL data (active users, casos,
// clientes, dynamic projetos) instead of the design's mock TEAM/PROJECTS/LINKS.
// `socios` is the assignee pool (active registered users); `meId` = the first of
// them. `projetos` are the DYNAMIC work containers (Projeto entity) — the v2 UI
// groups/labels tasks by `projetoId` (null = Entrada); the legacy static
// practice-area `PROJECTS` list is kept only for backend compat.
import { createContext, useContext, useMemo } from "react"
import { PROJECTS, type IdNome, type ProjetoDef, type TeamMember } from "@/lib/tarefas/types"
import type { ProjetoView } from "@/lib/projetos/types"

export interface TarefasCtxValue {
  socios: TeamMember[]
  casos: IdNome[]
  clientes: IdNome[]
  meId: number | null
  projects: ProjetoDef[]
  projetos: ProjetoView[]
  member: (id: number | null | undefined) => TeamMember | null
  project: (key: string) => ProjetoDef
  projetoById: (id: number | null | undefined) => ProjetoView | null
}

const Ctx = createContext<TarefasCtxValue | null>(null)

export function TarefasProvider({
  socios,
  casos,
  clientes,
  projetos = [],
  children,
}: {
  socios: TeamMember[]
  casos: IdNome[]
  clientes: IdNome[]
  projetos?: ProjetoView[]
  children: React.ReactNode
}) {
  const value = useMemo<TarefasCtxValue>(() => {
    const byId = new Map(socios.map((m) => [m.id, m]))
    const projById = new Map(projetos.map((p) => [p.id, p]))
    return {
      socios,
      casos,
      clientes,
      meId: socios[0]?.id ?? null,
      projects: PROJECTS,
      projetos,
      member: (id) => (id == null ? null : byId.get(id) ?? null),
      project: (key) => PROJECTS.find((p) => p.id === key) ?? PROJECTS[0],
      projetoById: (id) => (id == null ? null : projById.get(id) ?? null),
    }
  }, [socios, casos, clientes, projetos])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTarefasCtx(): TarefasCtxValue {
  const v = useContext(Ctx)
  if (!v) throw new Error("useTarefasCtx must be used within <TarefasProvider>")
  return v
}
