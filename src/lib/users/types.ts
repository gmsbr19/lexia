// Users — view-model shapes for the Configurações "Usuários & permissões"
// section. Roles: admin | socio | advogado | estagiario | financeiro | staff.
import type { Role } from "@/lib/auth/session"

export const ROLES = ["admin", "socio", "advogado", "estagiario", "financeiro", "staff"] as const

/** Human label for a role (used as the sub-label in assignee pickers). */
export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  socio: "Sócio",
  advogado: "Advogado(a)",
  estagiario: "Estagiário(a)",
  financeiro: "Financeiro",
  staff: "Equipe",
}

/** An active, registered user offered as a task/event assignee. */
export interface UsuarioAtivo {
  id: number
  nome: string
  role: Role
}

export interface UserRow {
  id: number
  email: string
  nome: string
  role: Role
  ativo: boolean
  /** true = conta criada por convite, ainda sem senha definida. */
  pendente: boolean
  criadoEm: string // ISO
}
