// Tarefas — carga das páginas do módulo (/tarefas, /projetos, /projetos/[id]).
// SERVER ONLY. Resolve quem está vendo (id pelo e-mail da sessão — nunca
// adivinhado), as permissões de tela, a carga única do quadro e o que é dessa
// pessoa (visão preferida + ordem manual).
import { auth } from "@/lib/auth"
import { userIdPorEmail } from "@/lib/notificacoes/recipients"
import { podeEditarModelo, podeEscreverProjeto } from "@/lib/projetos/types"
import type { PrefsQuadro } from "./filtros"
import { getOrdemManual, getPrefsQuadro } from "./preferencias"
import { getTarefasBoard } from "./queries"
import { ehGestao, type TarefasBoard } from "./types"

export interface CargaPagina {
  inicial: TarefasBoard
  meId: number | null
  gestao: boolean
  podeProjeto: boolean
  podeModelo: boolean
  prefs: PrefsQuadro
  ordemManual: Record<number, number>
}

export async function carregarPagina(): Promise<CargaPagina> {
  const session = await auth()
  const role = (session?.user?.role as string | undefined) ?? "estagiario"
  const [inicial, meId] = await Promise.all([getTarefasBoard(), userIdPorEmail(session?.user?.email)])
  const [prefs, ordemManual] = await Promise.all([getPrefsQuadro(meId), getOrdemManual(meId)])
  return {
    inicial,
    meId,
    prefs,
    ordemManual,
    gestao: ehGestao(role),
    podeProjeto: podeEscreverProjeto(role),
    podeModelo: podeEditarModelo(role),
  }
}

/** Query string → número positivo ou null. */
export function paramId(v: string | string[] | undefined): number | null {
  const n = Number(Array.isArray(v) ? v[0] : v)
  return Number.isInteger(n) && n > 0 ? n : null
}
