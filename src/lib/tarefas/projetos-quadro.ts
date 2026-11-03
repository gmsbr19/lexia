// Tarefas — o "projeto" do quadro (puro; servidor e cliente). Projeto = o CASO de
// um cliente ou um projeto INTERNO do escritório (Manutenção do Lexia, Marketing…).
// Identidade no quadro: a chave `c<id>` (caso) / `p<id>` (interno).
// A etiqueta nos cartões é `nomeCurto` + `cor`; casos importados do Astrea não têm
// nenhum dos dois, então caem para o título e a cor da área (e, por fim, para a
// paleta do quadro). Acesso: o quadro é aberto a todos; abrir ou vincular um CASO
// respeita o escopo de quem está vendo (`casosAcessiveis`); internos são do
// escritório inteiro.
import { compareISO, isoOf, lastDayOfMonth, parseISO } from "@/lib/datas/util"
import { normalizar } from "@/lib/text"
import { domingoDaSemana, vencida } from "./regras"
import { CORES_PROJETO, type ChaveProjeto, type ProjetoQuadro, type TaskRow, type TipoProjeto } from "./types"

const HEX = /^#[0-9A-Fa-f]{6}$/

// ── chave ────────────────────────────────────────────────────────────────────
export const chaveCaso = (id: number): ChaveProjeto => `c${id}`
export const chaveInterno = (id: number): ChaveProjeto => `p${id}`
export const chaveDe = (tipo: TipoProjeto, id: number): ChaveProjeto => (tipo === "caso" ? chaveCaso(id) : chaveInterno(id))

/** "c12" → { tipo: "caso", id: 12 }; "p5" → { tipo: "interno", id: 5 }; inválida → null. */
export function lerChave(k: unknown): { tipo: TipoProjeto; id: number } | null {
  if (typeof k !== "string") return null
  const m = /^([cp])([1-9]\d{0,9})$/.exec(k)
  if (!m) return null
  const id = Number(m[2])
  if (!Number.isSafeInteger(id) || id > 2_147_483_647) return null
  return { tipo: m[1] === "c" ? "caso" : "interno", id }
}

export const ehChaveProjeto = (k: unknown): k is ChaveProjeto => lerChave(k) != null

// ── apresentação ─────────────────────────────────────────────────────────────
/** Etiqueta e cor de um caso no quadro (próprias → título / cor da área → paleta). */
export function apresentarCaso(
  c: { id: number; titulo: string; nomeCurto: string | null; cor: string | null; area: string | null },
  corDaArea: (area: string | null) => string | null,
): { nomeCurto: string; cor: string } {
  const curto = c.nomeCurto?.trim()
  const area = corDaArea(c.area)
  return {
    nomeCurto: curto || c.titulo.trim() || `Caso ${c.id}`,
    cor: c.cor && HEX.test(c.cor) ? c.cor : area && HEX.test(area) ? area : CORES_PROJETO[c.id % CORES_PROJETO.length],
  }
}

/** Etiqueta e cor de um projeto interno (próprias → nome → paleta). */
export function apresentarInterno(p: { id: number; nome: string; nomeCurto: string | null; cor: string | null }): {
  nomeCurto: string
  cor: string
} {
  return {
    nomeCurto: p.nomeCurto?.trim() || p.nome.trim() || `Projeto ${p.id}`,
    cor: p.cor && HEX.test(p.cor) ? p.cor : CORES_PROJETO[p.id % CORES_PROJETO.length],
  }
}

export const ROTULO_INTERNO = "Projeto interno"

/** Linha secundária nas listas de escolha: o cliente (caso) ou "Projeto interno". */
export function subtituloProjeto(
  p: Pick<ProjetoQuadro, "tipo" | "clienteId">,
  nomeCliente: (id: number | null) => string | null | undefined,
): string {
  if (p.tipo === "interno") return ROTULO_INTERNO
  return nomeCliente(p.clienteId) ?? "Sem cliente"
}

// ── acesso e listas ──────────────────────────────────────────────────────────
/** A pessoa pode abrir este projeto? Interno: sempre; caso: `acessiveis` (null = vê todos). */
export function podeAbrirProjeto(
  acessiveis: readonly number[] | null,
  p: Pick<ProjetoQuadro, "tipo" | "id"> | null | undefined,
): boolean {
  if (!p) return false
  if (p.tipo === "interno") return true
  return acessiveis == null || acessiveis.includes(p.id)
}

/** Projetos que podem receber tarefas: não arquivados e acessíveis a quem está vendo. */
export function projetosVinculaveis(projetos: readonly ProjetoQuadro[], acessiveis: readonly number[] | null): ProjetoQuadro[] {
  return projetos.filter((p) => !p.arquivado && podeAbrirProjeto(acessiveis, p))
}

/** Ordem de exibição: pela etiqueta, em português. */
export function ordenarProjetos<T extends Pick<ProjetoQuadro, "nomeCurto" | "chave">>(lista: readonly T[]): T[] {
  return [...lista].sort((a, b) => a.nomeCurto.localeCompare(b.nomeCurto, "pt-BR") || a.chave.localeCompare(b.chave))
}

/** Projetos que têm alguma tarefa na lista (filtros e raias só mostram estes). */
export function projetosComTarefas<T extends { chave: ChaveProjeto }>(
  projetos: readonly T[],
  tarefas: readonly { projeto: ChaveProjeto | null }[],
): T[] {
  const chaves = new Set(tarefas.map((t) => t.projeto).filter((k): k is ChaveProjeto => k != null))
  return projetos.filter((p) => chaves.has(p.chave))
}

/** Busca sem acento por etiqueta, título e cliente; no máximo `limite` resultados. */
export function buscarProjetos<T extends Pick<ProjetoQuadro, "nomeCurto" | "nome" | "clienteId" | "chave">>(
  lista: readonly T[],
  q: string,
  nomeCliente: (id: number | null) => string | null | undefined,
  limite = 60,
): T[] {
  const termo = normalizar(q).trim()
  const base = ordenarProjetos(lista)
  const achados = termo
    ? base.filter((p) => [p.nomeCurto, p.nome, nomeCliente(p.clienteId)].some((v) => v && normalizar(v).includes(termo)))
    : base
  return achados.slice(0, limite)
}

// ── aba Projetos: números, filtro e ordem ────────────────────────────────────
export interface EstatProjeto {
  total: number
  feitas: number
  abertas: number
  vencidas: number
}
export const ESTAT_VAZIA: EstatProjeto = { total: 0, feitas: 0, abertas: 0, vencidas: 0 }

/** Andamento de cada projeto a partir das tarefas do quadro. */
export function estatisticasProjetos(
  tarefas: readonly Pick<TaskRow, "projeto" | "status" | "prazo">[],
  hoje: string,
): Map<ChaveProjeto, EstatProjeto> {
  const m = new Map<ChaveProjeto, EstatProjeto>()
  for (const t of tarefas) {
    if (t.projeto == null) continue
    const s = m.get(t.projeto) ?? { ...ESTAT_VAZIA }
    s.total++
    if (t.status === "done") s.feitas++
    else s.abertas++
    if (vencida(t, hoje)) s.vencidas++
    m.set(t.projeto, s)
  }
  return m
}

export type FiltroTipo = "todos" | "caso" | "interno"
export type FiltroAndamento = "qualquer" | "abertas" | "vencidas" | "sem"
export type FiltroPrazoFinal = "qualquer" | "vencido" | "semana" | "mes" | "sem"
export type OrdemProjetos = "nome" | "prazo" | "progresso" | "vencidas"

export interface FiltroProjetos {
  texto: string
  arquivados: boolean // false = Ativos, true = Arquivados
  tipo: FiltroTipo
  responsavel: number | null
  andamento: FiltroAndamento
  prazoFinal: FiltroPrazoFinal
}

export const FILTRO_PROJETOS_PADRAO: FiltroProjetos = {
  texto: "",
  arquivados: false,
  tipo: "todos",
  responsavel: null,
  andamento: "qualquer",
  prazoFinal: "qualquer",
}

/** Prazo final do projeto: vencido · até domingo · até o fim do mês · sem prazo. */
export function casaPrazoFinal(prazo: string | null, f: FiltroPrazoFinal, hoje: string): boolean {
  if (f === "qualquer") return true
  if (f === "sem") return prazo == null
  if (prazo == null) return false
  if (f === "vencido") return compareISO(prazo, hoje) < 0
  if (compareISO(prazo, hoje) < 0) return false
  if (f === "semana") return compareISO(prazo, domingoDaSemana(hoje)) <= 0
  const d = parseISO(hoje)
  const fimDoMes = isoOf(d.getFullYear(), d.getMonth(), lastDayOfMonth(d.getFullYear(), d.getMonth()))
  return compareISO(prazo, fimDoMes) <= 0
}

export function casaAndamento(e: EstatProjeto, f: FiltroAndamento): boolean {
  if (f === "abertas") return e.abertas > 0
  if (f === "vencidas") return e.vencidas > 0
  if (f === "sem") return e.total === 0
  return true
}

/** Lista da aba Projetos: Ativos/Arquivados + texto + tipo + responsável + andamento + prazo final. */
export function filtrarProjetos<T extends ProjetoQuadro>(
  lista: readonly T[],
  f: FiltroProjetos,
  est: (chave: ChaveProjeto) => EstatProjeto,
  nomeCliente: (id: number | null) => string | null | undefined,
  hoje: string,
): T[] {
  const termo = normalizar(f.texto).trim()
  return lista.filter(
    (p) =>
      p.arquivado === f.arquivados &&
      (f.tipo === "todos" || p.tipo === f.tipo) &&
      (f.responsavel == null || p.responsavelId === f.responsavel) &&
      casaAndamento(est(p.chave), f.andamento) &&
      casaPrazoFinal(p.prazo, f.prazoFinal, hoje) &&
      (!termo || [p.nomeCurto, p.nome, nomeCliente(p.clienteId)].some((v) => v && normalizar(v).includes(termo))),
  )
}

/**
 * Ordem da aba Projetos. Nome: A→Z. Prazo final: mais próximo primeiro (sem prazo
 * no fim). Progresso: menos avançado primeiro (sem tarefas no fim). Vencidas: mais
 * vencidas primeiro. Empate: nome.
 */
export function ordenarListaProjetos<T extends ProjetoQuadro>(
  lista: readonly T[],
  por: OrdemProjetos,
  est: (chave: ChaveProjeto) => EstatProjeto,
): T[] {
  const nome = (a: T, b: T) => a.nomeCurto.localeCompare(b.nomeCurto, "pt-BR") || a.chave.localeCompare(b.chave)
  const cmp: Record<OrdemProjetos, (a: T, b: T) => number> = {
    nome,
    prazo: (a, b) => {
      if ((a.prazo == null) !== (b.prazo == null)) return a.prazo == null ? 1 : -1
      return (a.prazo && b.prazo ? compareISO(a.prazo, b.prazo) : 0) || nome(a, b)
    },
    progresso: (a, b) => {
      const ea = est(a.chave)
      const eb = est(b.chave)
      if ((ea.total === 0) !== (eb.total === 0)) return ea.total === 0 ? 1 : -1
      const pa = ea.total ? ea.feitas / ea.total : 0
      const pb = eb.total ? eb.feitas / eb.total : 0
      return pa - pb || nome(a, b)
    },
    vencidas: (a, b) => est(b.chave).vencidas - est(a.chave).vencidas || nome(a, b),
  }
  return [...lista].sort(cmp[por])
}
