// Tarefas — o CASO como "projeto" do quadro (puro; servidor e cliente).
// A etiqueta do caso nos cartões é `nomeCurto` + `cor`; casos importados do
// Astrea não têm nenhum dos dois, então caem para o título e a cor da área (e,
// por fim, para a paleta do quadro). Acesso: o quadro é aberto a todos, mas abrir
// ou vincular um caso respeita o escopo de quem está vendo (`casosAcessiveis`).
import { normalizar } from "@/lib/text"
import { CORES_CASO, type CasoQuadro } from "./types"

const HEX = /^#[0-9A-Fa-f]{6}$/

/** Etiqueta e cor de um caso no quadro (próprias → título / cor da área → paleta). */
export function apresentarCaso(
  c: { id: number; titulo: string; nomeCurto: string | null; cor: string | null; area: string | null },
  corDaArea: (area: string | null) => string | null,
): { nomeCurto: string; cor: string } {
  const curto = c.nomeCurto?.trim()
  const area = corDaArea(c.area)
  return {
    nomeCurto: curto || c.titulo.trim() || `Caso ${c.id}`,
    cor: c.cor && HEX.test(c.cor) ? c.cor : area && HEX.test(area) ? area : CORES_CASO[c.id % CORES_CASO.length],
  }
}

/** A pessoa pode abrir este caso? (`acessiveis` null = vê todos) */
export function podeAbrirCaso(acessiveis: readonly number[] | null, id: number | null | undefined): boolean {
  if (id == null) return false
  return acessiveis == null || acessiveis.includes(id)
}

/** Casos que podem receber tarefas: não arquivados e acessíveis a quem está vendo. */
export function casosVinculaveis(casos: readonly CasoQuadro[], acessiveis: readonly number[] | null): CasoQuadro[] {
  return casos.filter((c) => !c.arquivado && podeAbrirCaso(acessiveis, c.id))
}

/** Ordem de exibição: pela etiqueta, em português. */
export function ordenarCasos<T extends Pick<CasoQuadro, "nomeCurto" | "id">>(casos: readonly T[]): T[] {
  return [...casos].sort((a, b) => a.nomeCurto.localeCompare(b.nomeCurto, "pt-BR") || a.id - b.id)
}

/** Casos que têm alguma tarefa na lista (filtros e raias só mostram estes). */
export function casosComTarefas<T extends { id: number }>(casos: readonly T[], tarefas: readonly { casoId: number | null }[]): T[] {
  const ids = new Set(tarefas.map((t) => t.casoId).filter((id): id is number => id != null))
  return casos.filter((c) => ids.has(c.id))
}

/** Busca sem acento por etiqueta, título e cliente; no máximo `limite` resultados. */
export function buscarCasos<T extends Pick<CasoQuadro, "nomeCurto" | "nome" | "clienteId" | "id">>(
  casos: readonly T[],
  q: string,
  nomeCliente: (id: number | null) => string | null | undefined,
  limite = 60,
): T[] {
  const termo = normalizar(q).trim()
  const base = ordenarCasos(casos)
  const achados = termo
    ? base.filter((c) => [c.nomeCurto, c.nome, nomeCliente(c.clienteId)].some((v) => v && normalizar(v).includes(termo)))
    : base
  return achados.slice(0, limite)
}
