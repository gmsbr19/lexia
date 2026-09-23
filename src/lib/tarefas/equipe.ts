// Tarefas — painel da Equipe (só gestão). Puro: o cliente calcula na hora a
// partir do quadro; GET /api/tarefas/equipe devolve o MESMO cálculo.
import { addDays, compareISO } from "@/lib/datas/util"
import { dataCurta, diasEntre, indexar, motivosRisco, rotuloPrazo, vencida } from "./regras"
import type { ProjetoRow, TaskRow, TeamMember } from "./types"

export type TipoAtencao = "late" | "risk" | "fatal"

export interface ItemAtencao {
  tarefaId: number
  tipo: TipoAtencao
  texto: string
}

export interface CargaPessoa {
  pessoaId: number
  abertas: number
  vencidas: number
}

export interface PainelEquipe {
  vencidas: number
  noPrazo: { feitas: number; total: number; pct: number | null } // concluídas nos últimos 30 dias
  projetosAtivos: number
  atencao: ItemAtencao[]
  carga: CargaPessoa[]
}

export function painelEquipe(
  tarefas: TaskRow[],
  projetos: ProjetoRow[],
  pessoas: TeamMember[],
  hoje: string,
): PainelEquipe {
  const abertas = tarefas.filter((t) => t.status !== "done")
  const atrasadas = abertas.filter((t) => vencida(t, hoje))
  const desde = addDays(hoje, -30)
  const feitas30 = tarefas.filter((t) => t.status === "done" && t.concluidaEm && compareISO(t.concluidaEm, desde) >= 0)
  const noPrazo = feitas30.filter((t) => compareISO(t.concluidaEm!, t.prazo) <= 0)

  const ativos = new Set(projetos.filter((p) => !p.arquivadoEm).map((p) => p.id))
  const projetosAtivos = new Set(abertas.map((t) => t.projetoId).filter((id): id is number => id != null && ativos.has(id))).size

  const map = indexar(tarefas)
  const itens: (ItemAtencao & { ordem: number; prazo: string })[] = []
  for (const t of atrasadas) {
    itens.push({ tarefaId: t.id, tipo: "late", texto: `Vencida desde ${dataCurta(t.prazo)}`, ordem: 0, prazo: t.prazo })
  }
  for (const t of abertas) {
    if (vencida(t, hoje)) continue
    if (t.prazoFatal && diasEntre(hoje, t.prazo) <= 5) {
      itens.push({ tarefaId: t.id, tipo: "fatal", texto: `Prazo fatal · ${rotuloPrazo(t.prazo, hoje)}`, ordem: 1, prazo: t.prazo })
    }
    const risco = motivosRisco(t, map, hoje)
    if (risco.length) {
      const r = risco[0]
      itens.push({ tarefaId: t.id, tipo: "risk", texto: `Em risco: ${r.titulo} venceu ${dataCurta(r.prazo)}`, ordem: 2, prazo: t.prazo })
    }
  }
  itens.sort((a, b) => a.ordem - b.ordem || compareISO(a.prazo, b.prazo) || a.tarefaId - b.tarefaId)

  const carga = pessoas.map((p) => ({
    pessoaId: p.id,
    abertas: abertas.filter((t) => t.responsavelId === p.id).length,
    vencidas: atrasadas.filter((t) => t.responsavelId === p.id).length,
  }))

  return {
    vencidas: atrasadas.length,
    noPrazo: {
      feitas: noPrazo.length,
      total: feitas30.length,
      pct: feitas30.length ? Math.round((noPrazo.length / feitas30.length) * 100) : null,
    },
    projetosAtivos,
    atencao: itens.map(({ tarefaId, tipo, texto }) => ({ tarefaId, tipo, texto })),
    carga,
  }
}
