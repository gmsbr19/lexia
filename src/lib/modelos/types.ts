// Casos no quadro & Modelos de tarefas — RBAC (admin passa implícito no
// assertRole). Os view models vivem em src/lib/tarefas/types.ts (CasoQuadro,
// ModeloView): o caso é o "projeto" do quadro único de Tarefas.
import type { Role } from "@/lib/auth/session"

// Criar caso pelo quadro e aplicar modelo a um caso = sócio + advogado (mesmo
// público de PODE_CRIAR_CASO em src/lib/casos/status.ts).
export const ROLES_CASO_ESCRITA: Role[] = ["socio", "advogado"]
// Criar/editar modelos (processos do escritório) = só sócio.
export const ROLES_MODELO: Role[] = ["socio"]

export const podeCriarCasoQuadro = (role: string | null | undefined): boolean =>
  role === "admin" || role === "socio" || role === "advogado"
export const podeEditarModelo = (role: string | null | undefined): boolean => role === "admin" || role === "socio"
