"use client"

// Shared context so the kit/views/modal read REAL data (active users, casos,
// clientes) instead of the design's mock TEAM/PROJECTS/LINKS. `socios` is the
// assignee pool (active registered users); `meId` = the first of them.
import { createContext, useContext, useMemo } from "react"
import { PROJECTS, type IdNome, type ProjetoDef, type TeamMember } from "@/lib/tarefas/types"

export interface TarefasCtxValue {
  socios: TeamMember[]
  casos: IdNome[]
  clientes: IdNome[]
  meId: number | null
  projects: ProjetoDef[]
  member: (id: number | null | undefined) => TeamMember | null
  project: (key: string) => ProjetoDef
}

const Ctx = createContext<TarefasCtxValue | null>(null)

export function TarefasProvider({
  socios,
  casos,
  clientes,
  children,
}: {
  socios: TeamMember[]
  casos: IdNome[]
  clientes: IdNome[]
  children: React.ReactNode
}) {
  const value = useMemo<TarefasCtxValue>(() => {
    const byId = new Map(socios.map((m) => [m.id, m]))
    return {
      socios,
      casos,
      clientes,
      meId: socios[0]?.id ?? null,
      projects: PROJECTS,
      member: (id) => (id == null ? null : byId.get(id) ?? null),
      project: (key) => PROJECTS.find((p) => p.id === key) ?? PROJECTS[0],
    }
  }, [socios, casos, clientes])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTarefasCtx(): TarefasCtxValue {
  const v = useContext(Ctx)
  if (!v) throw new Error("useTarefasCtx must be used within <TarefasProvider>")
  return v
}
