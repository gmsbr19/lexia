// Projetos — RBAC do módulo (admin passa implícito no assertRole). Os view models
// vivem em src/lib/tarefas/types.ts (ProjetoRow, ModeloView): projeto é um
// FILTRO do quadro único de Tarefas, não um módulo à parte.
import type { Role } from "@/lib/auth/session"

// Criar/editar/arquivar projeto e criar a partir de modelo = sócio + advogado.
export const ROLES_PROJETO_ESCRITA: Role[] = ["socio", "advogado"]
// Criar/editar modelos (processos do escritório) = só sócio.
export const ROLES_MODELO: Role[] = ["socio"]

export const podeEscreverProjeto = (role: string | null | undefined): boolean =>
  role === "admin" || role === "socio" || role === "advogado"
export const podeEditarModelo = (role: string | null | undefined): boolean => role === "admin" || role === "socio"
