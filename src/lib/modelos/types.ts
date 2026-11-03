// Projetos do quadro & Modelos de tarefas — RBAC (admin passa implícito no
// assertRole). Os view models vivem em src/lib/tarefas/types.ts (ProjetoQuadro,
// ModeloView): o "projeto" do quadro é o caso do cliente ou um projeto interno.
import type { Role } from "@/lib/auth/session"

// Criar/editar projeto pelo quadro (caso do cliente ou interno) e aplicar modelo
// = sócio + advogado (mesmo público de PODE_CRIAR_CASO em src/lib/casos/status.ts).
export const ROLES_PROJETO_ESCRITA: Role[] = ["socio", "advogado"]
// Criar/editar modelos (processos do escritório) = só sócio.
export const ROLES_MODELO: Role[] = ["socio"]

export const podeCriarProjeto = (role: string | null | undefined): boolean =>
  role === "admin" || role === "socio" || role === "advogado"
export const podeEditarModelo = (role: string | null | undefined): boolean => role === "admin" || role === "socio"
