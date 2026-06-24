// Áreas do Direito — view models e RBAC. SERVER + CLIENT (sem imports Prisma).
import type { Role } from "@/lib/auth/session"

/** Só admins escrevem áreas; leitura aberta a qualquer sessão válida. */
export const ROLES_AREA: Role[] = ["admin"]

export interface AreaView {
  id: number
  chave: string
  nome: string
  cor: string | null
  icone: string | null
  ordem: number
  ativo: boolean
}

/** Inclui contagens de uso por módulo (para o painel admin). */
export interface AreaComUso extends AreaView {
  projetos: number
  casos: number
  leads: number
  campanhas: number
}

/** Shape compacto para pickers {id=chave, label=nome, cor}. */
export interface AreaOption {
  id: string
  label: string
  cor: string | null
}
