// GET /api/tarefas/equipe — painel da Equipe (só gestão: sócio/admin):
// vencidas, concluídas no prazo (30 dias), projetos ativos, "precisa de atenção"
// e carga por pessoa. Mesmo cálculo puro que a tela usa (equipe.ts).
import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { painelEquipe } from "@/lib/tarefas/equipe"
import { getTarefasBoard } from "@/lib/tarefas/queries"
import { ROLES_GESTAO } from "@/lib/tarefas/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest(ROLES_GESTAO)
  if (denied) return denied
  const b = await getTarefasBoard()
  return NextResponse.json(painelEquipe(b.tarefas, b.projetos, b.pessoas, b.hoje))
}
