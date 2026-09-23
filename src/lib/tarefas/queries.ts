// Tarefas — camada de leitura. SERVER ONLY. Uma carga única alimenta o módulo
// inteiro (quadro, lista, fluxo, projetos, equipe): o quadro é ÚNICO para o
// escritório, e as regras derivadas (risco, cadeia…) dependem das tarefas de
// todos. Os derivados saem de ./regras.ts no cliente e no servidor.
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { getClienteOptions } from "@/lib/finance/queries"
import { getUsuariosAtivos } from "@/lib/users/queries"
import { ROLE_LABEL, type UsuarioAtivo } from "@/lib/users/types"
import { fromDate, parseArr } from "./_input"
import { dataSP, hojeSP } from "./regras"
import type {
  AnexoRow,
  ChecklistItem,
  HistoricoRow,
  ModeloView,
  PapelModelo,
  PassoModelo,
  ProjetoRow,
  TarefaDetalhe,
  TarefasBoard,
  TaskRow,
  TaskStatus,
  TeamMember,
} from "./types"
import { CORES_PROJETO, isStatus } from "./types"

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
  projetoRef: { select: { excluidoEm: true } },
  anteriores: { select: { anteriorId: true } },
  _count: { select: { comentarios: { where: { excluidoEm: null } }, anexos: true } },
} satisfies Prisma.TarefaSelect

type TarefaSel = Prisma.TarefaGetPayload<{ select: typeof TAREFA_SELECT }>

function checklistDe(raw: string): ChecklistItem[] {
  return parseArr<Partial<ChecklistItem>>(raw)
    .filter((c) => typeof c?.texto === "string" && c.texto.trim())
    .map((c, i) => ({ id: String(c.id ?? `c${i}`), texto: String(c.texto), marcado: !!c.marcado }))
}

export function toTaskRow(r: TarefaSel): TaskRow {
  // projeto excluído (soft-delete) → "Sem projeto" (a tarefa nunca some).
  const projetoVivo = r.projetoId != null && r.projetoRef != null && !r.projetoRef.excluidoEm
  return {
    id: r.id,
    titulo: r.titulo,
    status: (isStatus(r.status) ? r.status : "todo") as TaskStatus,
    prazo: fromDate(r.prazo)!,
    prazoFatal: r.prazoFatal,
    projetoId: projetoVivo ? r.projetoId : null,
    grupo: projetoVivo ? r.grupo : null,
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

export const PROJETO_SELECT = {
  id: true,
  nomeCurto: true,
  nome: true,
  cor: true,
  clienteId: true,
  area: true,
  responsavelId: true,
  prazo: true,
  descricao: true,
  arquivadoEm: true,
  modeloOrigemId: true,
} satisfies Prisma.ProjetoSelect

export function toProjetoRow(p: Prisma.ProjetoGetPayload<{ select: typeof PROJETO_SELECT }>): ProjetoRow {
  return {
    id: p.id,
    nomeCurto: p.nomeCurto,
    nome: p.nome,
    cor: p.cor ?? CORES_PROJETO[p.id % CORES_PROJETO.length],
    clienteId: p.clienteId,
    area: p.area,
    responsavelId: p.responsavelId,
    prazo: fromDate(p.prazo),
    descricao: p.descricao,
    arquivadoEm: dataSP(p.arquivadoEm),
    modeloOrigemId: p.modeloOrigemId,
  }
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

export async function getProjetos(): Promise<ProjetoRow[]> {
  const rows = await prisma.projeto.findMany({
    where: { excluidoEm: null },
    select: PROJETO_SELECT,
    orderBy: [{ arquivadoEm: "desc" }, { createdAt: "asc" }],
  })
  return rows.map(toProjetoRow)
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

/** Carga única do módulo. */
export async function getTarefasBoard(): Promise<TarefasBoard> {
  const [tarefas, projetos, usuarios, clientes, modelos] = await Promise.all([
    getTarefas(),
    getProjetos(),
    getUsuariosAtivos(),
    getClienteOptions(),
    getModelos(),
  ])
  return { tarefas, projetos, pessoas: usuarios.map(toTeamMember), clientes, modelos, hoje: hojeSP() }
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
