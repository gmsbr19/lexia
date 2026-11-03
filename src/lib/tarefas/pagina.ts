// Tarefas — carga da página do módulo (/tarefas). SERVER ONLY. Resolve quem
// está vendo (id pelo e-mail da sessão — nunca adivinhado), as permissões de
// tela, a carga única do quadro (com os casos que a pessoa pode abrir) e o que é
// dessa pessoa (visão preferida + ordem manual).
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { podeCriarProjeto, podeEditarModelo } from "@/lib/modelos/types"
import { userIdPorEmail } from "@/lib/notificacoes/recipients"
import type { PrefsQuadro } from "./filtros"
import { getOrdemManual, getPrefsQuadro } from "./preferencias"
import { getTarefasBoard } from "./queries"
import { ehGestao, type TarefasBoard } from "./types"

export interface CargaPagina {
  inicial: TarefasBoard
  meId: number | null
  gestao: boolean
  podeCriarProjeto: boolean
  podeModelo: boolean
  prefs: PrefsQuadro
  ordemManual: Record<number, number>
}

export async function carregarPagina(): Promise<CargaPagina> {
  const session = await auth()
  const role = (session?.user?.role as string | undefined) ?? "estagiario"
  const email = session?.user?.email ?? null
  const usuario = email ? { email, nome: session?.user?.name ?? email, role } : null
  const [inicial, meId] = await Promise.all([getTarefasBoard(usuario), userIdPorEmail(email)])
  const [prefs, ordemManual] = await Promise.all([getPrefsQuadro(meId), getOrdemManual(meId)])
  return {
    inicial,
    meId,
    prefs,
    ordemManual,
    gestao: ehGestao(role),
    podeCriarProjeto: podeCriarProjeto(role),
    podeModelo: podeEditarModelo(role),
  }
}

/** Query string → número positivo ou null. */
export function paramId(v: string | string[] | undefined): number | null {
  const n = Number(Array.isArray(v) ? v[0] : v)
  return Number.isInteger(n) && n > 0 ? n : null
}

/**
 * Para onde leva um id de Projeto (/projetos/<id>, ?projeto=<id>): o próprio
 * projeto interno, se vivo; o caso em que ele virou (unificação ou "vincular a um
 * cliente", registro em Projeto.casoId); ou nada (excluído/inexistente).
 */
export async function destinoDoProjeto(
  projetoId: number | null,
): Promise<{ tipo: "interno"; id: number } | { tipo: "caso"; id: number } | null> {
  if (projetoId == null) return null
  const p = await prisma.projeto.findUnique({ where: { id: projetoId }, select: { id: true, casoId: true, excluidoEm: true } })
  if (!p) return null
  if (p.casoId != null) return { tipo: "caso", id: p.casoId }
  return p.excluidoEm ? null : { tipo: "interno", id: p.id }
}
