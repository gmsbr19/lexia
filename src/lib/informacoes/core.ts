// Informações fixadas — núcleo PURO (sem Prisma; client-safe: servidor, quadro de
// Tarefas, páginas do CRM e testes). Uma "informação" é uma nota com dono natural:
// o CLIENTE (ClienteAnotacao), o CASO ou o projeto INTERNO (Anotacao). Fixada, ela
// aparece em toda tarefa daquele cliente/caso/projeto ("Saiba antes"); as demais
// ficam só na ficha. Quem cria, edita e fixa fica registrado.
import { segmentosComentario } from "@/lib/tarefas/comentario-core"
import { lerChave } from "@/lib/tarefas/projetos-quadro"
import { clienteEfetivo } from "@/lib/tarefas/regras"
import type { ChaveProjeto, TaskRow } from "@/lib/tarefas/types"

/** A que a informação pertence. */
export type TipoAncora = "cliente" | "caso" | "projeto"
export interface Ancora {
  tipo: TipoAncora
  id: number
}
/** Tabela de origem: ClienteAnotacao ("cliente") ou Anotacao ("anotacao": caso / projeto interno). */
export type FonteInfo = "cliente" | "anotacao"

export const CONTEUDO_MAX = 2000

export interface InformacaoRow {
  fonte: FonteInfo
  id: number
  ancora: Ancora
  conteudo: string
  autor: string // nome do usuário (ou o texto gravado, p/ notas importadas)
  autorId: number | null // User.id quando o autor é um usuário
  criadaEm: string // ISO
  editadaEm: string | null
  editadaPor: string | null // nome
  fixado: boolean
  fixadaEm: string | null
  fixadaPor: string | null // nome
  origemTarefaId: number | null // tarefa cujo comentário virou esta informação
}

export const fonteDaAncora = (tipo: TipoAncora): FonteInfo => (tipo === "cliente" ? "cliente" : "anotacao")
export const chaveAncora = (a: Ancora): string => `${a.tipo}:${a.id}`
export const chaveInfo = (r: Pick<InformacaoRow, "fonte" | "id">): string => `${r.fonte}-${r.id}`
export const ROTULO_ANCORA: Record<TipoAncora, string> = { cliente: "Cliente", caso: "Caso", projeto: "Projeto" }

/** O projeto do quadro (caso ou interno) como âncora. */
export function ancoraDoProjeto(chave: ChaveProjeto | null | undefined): Ancora | null {
  const k = lerChave(chave)
  if (!k) return null
  return { tipo: k.tipo === "caso" ? "caso" : "projeto", id: k.id }
}

/** Mais recente primeiro: quando foi fixada (ou criada). */
const recencia = (r: InformacaoRow): string => r.fixadaEm ?? r.criadaEm

/** Índice âncora → fixadas (mais recente primeiro). Ignora as não fixadas. */
export function indexarFixadas(rows: readonly InformacaoRow[]): Map<string, InformacaoRow[]> {
  const m = new Map<string, InformacaoRow[]>()
  for (const r of rows) {
    if (!r.fixado) continue
    const k = chaveAncora(r.ancora)
    const arr = m.get(k)
    if (arr) arr.push(r)
    else m.set(k, [r])
  }
  for (const arr of m.values()) arr.sort((a, b) => (recencia(a) < recencia(b) ? 1 : recencia(a) > recencia(b) ? -1 : 0))
  return m
}

/** Âncoras de uma tarefa: o projeto dela (caso ou interno) e o cliente efetivo. */
export function ancorasDaTarefa(
  t: Pick<TaskRow, "projeto" | "clienteId">,
  clienteDoProjeto: (chave: ChaveProjeto) => number | null,
): Ancora[] {
  const out: Ancora[] = []
  const p = ancoraDoProjeto(t.projeto)
  if (p) out.push(p)
  const c = clienteEfetivo(t, clienteDoProjeto)
  if (c) out.push({ tipo: "cliente", id: c.id })
  return out
}

/** Fixadas que valem para a tarefa: primeiro as do projeto, depois as do cliente. */
export function fixadasDaTarefa(indice: Map<string, InformacaoRow[]>, ancoras: readonly Ancora[]): InformacaoRow[] {
  return ancoras.flatMap((a) => indice.get(chaveAncora(a)) ?? [])
}

/** Corpo de um comentário como texto legível: `@[12]` → "@Ana", `@[todos]` → "@todos". */
export function textoDeComentario(conteudo: string, nomePorId: (id: number) => string | null | undefined): string {
  return segmentosComentario(conteudo)
    .map((s) => (s.t === "texto" ? s.v : s.t === "todos" ? "@todos" : `@${nomePorId(s.id) ?? "alguém"}`))
    .join("")
}

/** Texto limpo: quebras de linha normalizadas, no máximo uma linha em branco seguida. */
export function normalizarConteudo(s: string): string {
  return s.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
}

/** Excluir: só o autor ou a gestão (admin/sócio). Editar e fixar: qualquer pessoa. */
export function podeExcluirInformacao(info: Pick<InformacaoRow, "autorId">, quem: { id: number | null; role: string | null | undefined }): boolean {
  if (quem.role === "admin" || quem.role === "socio") return true
  return quem.id != null && info.autorId === quem.id
}

const DIA_MS = 24 * 60 * 60 * 1000

/** "hoje" · "ontem" · "há 5 dias" · "há 3 meses" · "há 2 anos". */
export function tempoDesde(iso: string, agora: Date = new Date()): string {
  const dias = Math.floor((agora.getTime() - new Date(iso).getTime()) / DIA_MS)
  if (dias <= 0) return "hoje"
  if (dias === 1) return "ontem"
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30.44)
  if (meses < 12) return meses <= 1 ? "há 1 mês" : `há ${meses} meses`
  const anos = Math.floor(dias / 365.25)
  return anos <= 1 ? "há 1 ano" : `há ${anos} anos`
}

/** Última vez que o texto mudou (edição ou criação). */
export const atualizadaEm = (r: Pick<InformacaoRow, "editadaEm" | "criadaEm">): string => r.editadaEm ?? r.criadaEm

/** Sem atualização há mais de 6 meses: pode estar velha. */
export function talvezDesatualizada(r: Pick<InformacaoRow, "editadaEm" | "criadaEm">, agora: Date = new Date()): boolean {
  return agora.getTime() - new Date(atualizadaEm(r)).getTime() > 182 * DIA_MS
}
