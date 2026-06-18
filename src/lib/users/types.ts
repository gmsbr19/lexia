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

/**
 * Pode ver informações financeiras? Apenas Sócio, Administrador e o papel
 * Financeiro. Todos os demais ("Equipe": advogado, estagiário, staff) NÃO veem
 * nada do financeiro em nenhum lugar do app (exceto honorários pago/pendente na
 * página do cliente). Helper puro — use no client e no server. NÃO confundir com
 * `podeVerFinanceiro` de lib/processos/rbac.ts (escopo de processo, outra semântica).
 */
export function verFinanceiro(role: string): boolean {
  return role === "admin" || role === "socio" || role === "financeiro"
}

/** Papéis aceitos em gates de mutation financeira (admin passa implícito no assertRole). */
export const ROLES_FINANCEIRO: Role[] = ["socio", "financeiro"]

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
