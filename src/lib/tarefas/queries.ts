// Tarefas — camada de leitura. SERVER ONLY. Uma carga única alimenta o módulo
// inteiro (quadro, lista, fluxo, modelos, equipe): o quadro é ÚNICO para o
// escritório, e as regras derivadas (risco, cadeia…) dependem das tarefas de
// todos. Os derivados saem de ./regras.ts no cliente e no servidor. O "projeto"
// do quadro é o CASO do cliente (Tarefa.casoId) ou um projeto INTERNO
// (Tarefa.projetoId) — no cliente, a chave `c<id>` / `p<id>`.
import type { Prisma } from "@prisma/client"
import type { SessionUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { casoStatusBucket } from "@/lib/casos/status"
import { getClienteOptions } from "@/lib/finance/queries"
import { scopeCasoWhere, veTudo } from "@/lib/processos/rbac"
import { getUsuariosAtivos } from "@/lib/users/queries"
import { ROLE_LABEL, type UsuarioAtivo } from "@/lib/users/types"
import { fromDate, parseArr } from "./_input"
import { apresentarCaso, apresentarInterno, chaveCaso, chaveInterno } from "./projetos-quadro"
import { dataSP, hojeSP } from "./regras"
import type {
  AnexoRow,
  ChecklistItem,
  HistoricoRow,
  ModeloView,
  PapelModelo,
  PassoModelo,
  ProjetoQuadro,
  TarefaDetalhe,
  TarefasBoard,
  TaskRow,
  TaskStatus,
  TeamMember,
} from "./types"
import { isStatus } from "./types"

// Paleta determinística de avatar (sem config por pessoa).
const AVATAR_COLORS = ["#1F3A6E", "#2E7D6B", "#9A6B2E", "#5A4F9A", "#9A2E5A", "#2A6FDB"]

function deriveInitials(nome: string): string {
  const words = nome.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  const w = words[0] ?? "?"
  return (w.slice(0, 2) || "?").toUpperCase()
}

export function toTeamMember(u: UsuarioAtivo): TeamMember {
  return {
    id: u.id,
    nome: u.nome,
    first: u.nome.trim().split(/\s+/)[0] ?? u.nome,
    initials: deriveInitials(u.nome),
    color: AVATAR_COLORS[u.id % AVATAR_COLORS.length],
    role: ROLE_LABEL[u.role],
  }
}

export const TAREFA_SELECT = {
  id: true,
  titulo: true,
  status: true,
  prazo: true,
  prazoFatal: true,
  casoId: true,
  projetoId: true,
  grupo: true,
  clienteId: true,
  responsavelId: true,
  aguardandoTexto: true,
  notes: true,
  checklist: true,
  recur: true,
  concluidoEm: true,
  createdAt: true,
  caso: { select: { excluidoEm: true } },
  projetoRef: { select: { excluidoEm: true, casoId: true } },
  anteriores: { select: { anteriorId: true } },
  _count: { select: { comentarios: { where: { excluidoEm: null } }, anexos: true } },
} satisfies Prisma.TarefaSelect

type TarefaSel = Prisma.TarefaGetPayload<{ select: typeof TAREFA_SELECT }>

function checklistDe(raw: string): ChecklistItem[] {
  return parseArr<Partial<ChecklistItem>>(raw)
    .filter((c) => typeof c?.texto === "string" && c.texto.trim())
    .map((c, i) => ({ id: String(c.id ?? `c${i}`), texto: String(c.texto), marcado: !!c.marcado }))
}

/** Projeto interno vivo = não excluído e não convertido em caso. */
export const internoVivo = (p: { excluidoEm: Date | null; casoId: number | null } | null | undefined): boolean =>
  !!p && !p.excluidoEm && p.casoId == null

/** Chave do projeto da tarefa; projeto excluído → null ("Sem projeto"; a tarefa nunca some). */
export function projetoDaLinha(r: Pick<TarefaSel, "casoId" | "caso" | "projetoId" | "projetoRef">): TaskRow["projeto"] {
  if (r.casoId != null) return r.caso && !r.caso.excluidoEm ? chaveCaso(r.casoId) : null
  if (r.projetoId != null) return internoVivo(r.projetoRef) ? chaveInterno(r.projetoId) : null
  return null
}

export function toTaskRow(r: TarefaSel): TaskRow {
  const projeto = projetoDaLinha(r)
  return {
    id: r.id,
    titulo: r.titulo,
    status: (isStatus(r.status) ? r.status : "todo") as TaskStatus,
    prazo: fromDate(r.prazo)!,
    prazoFatal: r.prazoFatal,
    projeto,
    grupo: projeto ? r.grupo : null,
    clienteId: r.clienteId,
    responsavelId: r.responsavelId,
    aguardandoTexto: r.status === "wait" ? r.aguardandoTexto : null,
    descricao: r.notes,
    checklist: checklistDe(r.checklist),
    recur: r.recur,
    anteriores: r.anteriores.map((a) => a.anteriorId),
    concluidaEm: r.status === "done" ? dataSP(r.concluidoEm) : null,
    criadaEm: r.createdAt.toISOString(),
    nComentarios: r._count.comentarios,
    nAnexos: r._count.anexos,
  }
}

export const CASO_QUADRO_SELECT = {
  id: true,
  titulo: true,
  nomeCurto: true,
  cor: true,
  clientePrincipalId: true,
  area: true,
  responsavelUserId: true,
  prazo: true,
  descricao: true,
  status: true,
  modeloOrigemId: true,
} satisfies Prisma.CasoSelect

export type CasoQuadroSel = Prisma.CasoGetPayload<{ select: typeof CASO_QUADRO_SELECT }>

export function toProjetoDeCaso(c: CasoQuadroSel, corDaArea: (area: string | null) => string | null): ProjetoQuadro {
  const { nomeCurto, cor } = apresentarCaso(c, corDaArea)
  return {
    chave: chaveCaso(c.id),
    tipo: "caso",
    id: c.id,
    nomeCurto,
    nome: c.titulo,
    cor,
    clienteId: c.clientePrincipalId,
    area: c.area,
    responsavelId: c.responsavelUserId,
    prazo: fromDate(c.prazo),
    descricao: c.descricao,
    arquivado: casoStatusBucket(c.status) === "arquivado",
    modeloOrigemId: c.modeloOrigemId,
  }
}

export const INTERNO_QUADRO_SELECT = {
  id: true,
  nome: true,
  nomeCurto: true,
  cor: true,
  responsavelId: true,
  prazo: true,
  descricao: true,
  arquivadoEm: true,
  modeloOrigemId: true,
} satisfies Prisma.ProjetoSelect

export type InternoQuadroSel = Prisma.ProjetoGetPayload<{ select: typeof INTERNO_QUADRO_SELECT }>

export function toProjetoInterno(p: InternoQuadroSel): ProjetoQuadro {
  const { nomeCurto, cor } = apresentarInterno(p)
  return {
    chave: chaveInterno(p.id),
    tipo: "interno",
    id: p.id,
    nomeCurto,
    nome: p.nome,
    cor,
    clienteId: null,
    area: null,
    responsavelId: p.responsavelId,
    prazo: fromDate(p.prazo),
    descricao: p.descricao,
    arquivado: p.arquivadoEm != null,
    modeloOrigemId: p.modeloOrigemId,
  }
}

/** Filtro Prisma do projeto interno vivo (não excluído, não convertido em caso). */
export const WHERE_INTERNO_VIVO = { excluidoEm: null, casoId: null } satisfies Prisma.ProjetoWhereInput

/** Cor de cada área (chave → hex) para a etiqueta dos casos sem cor própria. */
export async function coresDasAreas(): Promise<(area: string | null) => string | null> {
  const areas = await prisma.areaDireito.findMany({ select: { chave: true, cor: true } })
  const m = new Map(areas.map((a) => [a.chave, a.cor]))
  return (area) => (area ? (m.get(area) ?? null) : null)
}

/**
 * Projetos do quadro: casos vivos e projetos internos vivos — os não arquivados +
 * os arquivados que ainda têm alguma tarefa (a etiqueta delas precisa resolver).
 * Excluídos nunca vêm.
 */
export async function getProjetosQuadro(): Promise<ProjetoQuadro[]> {
  const [casos, internos, casosCitados, internosCitados, corDaArea] = await Promise.all([
    prisma.caso.findMany({ where: { excluidoEm: null }, select: CASO_QUADRO_SELECT }),
    prisma.projeto.findMany({ where: WHERE_INTERNO_VIVO, select: INTERNO_QUADRO_SELECT }),
    prisma.tarefa.findMany({ where: { casoId: { not: null } }, select: { casoId: true }, distinct: ["casoId"] }),
    prisma.tarefa.findMany({ where: { projetoId: { not: null } }, select: { projetoId: true }, distinct: ["projetoId"] }),
    coresDasAreas(),
  ])
  const casoComTarefa = new Set(casosCitados.map((t) => t.casoId))
  const internoComTarefa = new Set(internosCitados.map((t) => t.projetoId))
  return [
    ...casos.map((r) => toProjetoDeCaso(r, corDaArea)).filter((c) => !c.arquivado || casoComTarefa.has(c.id)),
    ...internos.map(toProjetoInterno).filter((p) => !p.arquivado || internoComTarefa.has(p.id)),
  ]
}

/** Ids dos casos que a pessoa pode abrir/vincular; null = todos (papéis que veem tudo). */
export async function getCasosAcessiveis(user: SessionUser | null | undefined): Promise<number[] | null> {
  if (!user) return []
  if (veTudo(user.role)) return null
  const scope = await scopeCasoWhere(user)
  const rows = await prisma.caso.findMany({ where: { AND: [{ excluidoEm: null }, scope] }, select: { id: true } })
  return rows.map((r) => r.id)
}

export async function getTarefas(where?: Prisma.TarefaWhereInput): Promise<TaskRow[]> {
  const rows = await prisma.tarefa.findMany({
    where,
    select: TAREFA_SELECT,
    orderBy: [{ prazo: "asc" }, { id: "asc" }],
  })
  return rows.map(toTaskRow)
}

export async function getTarefa(id: number): Promise<TaskRow | null> {
  const r = await prisma.tarefa.findUnique({ where: { id }, select: TAREFA_SELECT })
  return r ? toTaskRow(r) : null
}

export async function getModelos(): Promise<ModeloView[]> {
  const rows = await prisma.projetoModelo.findMany({
    where: { excluidoEm: null },
    orderBy: [{ ordem: "asc" }, { id: "asc" }],
    include: { passos: { orderBy: [{ ordem: "asc" }, { id: "asc" }] } },
  })
  return rows.map((m) => ({
    id: m.id,
    nome: m.nome,
    area: m.area,
    palavraGrupo: m.palavraGrupo,
    sufixoGrupo: m.sufixoGrupo,
    papeis: parseArr<PapelModelo>(m.papeis).filter((p) => p && typeof p.id === "string"),
    passos: m.passos.map<PassoModelo>((p) => ({
      chave: p.chave,
      titulo: p.titulo,
      papelId: p.papelId,
      diasAntes: p.diasAntes,
      prazoFatal: p.prazoFatal,
      anteriores: parseArr<string>(p.anteriores).filter((a) => typeof a === "string"),
      checklist: parseArr<string>(p.checklist).filter((c) => typeof c === "string"),
    })),
  }))
}

/** Carga única do módulo. `user` define quais casos a pessoa pode abrir/vincular. */
export async function getTarefasBoard(user: SessionUser | null | undefined): Promise<TarefasBoard> {
  const [tarefas, projetos, casosAcessiveis, usuarios, clientes, modelos] = await Promise.all([
    getTarefas(),
    getProjetosQuadro(),
    getCasosAcessiveis(user),
    getUsuariosAtivos(),
    getClienteOptions(),
    getModelos(),
  ])
  return { tarefas, projetos, casosAcessiveis, pessoas: usuarios.map(toTeamMember), clientes, modelos, hoje: hojeSP() }
}

/** Histórico + anexos (carregados ao abrir a tarefa). */
export async function getTarefaDetalhe(id: number): Promise<TarefaDetalhe> {
  const [historico, anexos] = await Promise.all([
    prisma.tarefaHistorico.findMany({
      where: { tarefaId: id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 200,
      select: { id: true, texto: true, autorId: true, createdAt: true },
    }),
    prisma.tarefaAnexo.findMany({
      where: { tarefaId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, tipo: true, nome: true, url: true, tamanho: true, createdAt: true },
    }),
  ])
  return {
    historico: historico.map<HistoricoRow>((h) => ({
      id: h.id,
      texto: h.texto,
      autorId: h.autorId,
      criadoEm: h.createdAt.toISOString(),
    })),
    anexos: anexos.map<AnexoRow>((a) => ({
      id: a.id,
      tipo: a.tipo === "link" ? "link" : "arquivo",
      nome: a.nome,
      url: a.tipo === "link" ? a.url : `/api/tarefas/${id}/anexos/${a.id}`,
      tamanho: a.tamanho,
      criadoEm: a.createdAt.toISOString(),
    })),
  }
}
