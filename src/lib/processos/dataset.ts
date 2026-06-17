// Processos (Contencioso) module dataset — ONE server fetch of the list data the
// /processos client app needs. The processo ficha (/processos/[id]) fetches its
// own detail via getProcessoDetail. SERVER ONLY (composes the processos queries +
// the assignable-user pool + the session role). RBAC-scoped throughout.
import { requireUser, type Role } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { getCasoOptions } from "@/lib/finance/queries"
import type { IdNome } from "@/lib/finance/types"
import { getUsuariosAtivos } from "@/lib/users/queries"
import type { ListQuery } from "@/lib/list"
import { hojeISO } from "./datas"
import { listProcessos, listPrazos, listPublicacoes } from "./queries"
import { resolveUserId, scopeProcessoWhere, veTudo } from "./rbac"
import type { PrazoRow, ProcessoRow, PublicacaoRow } from "./types"

/** An audiência/perícia compromisso linked to a processo (an Evento under the hood). */
export interface AudienciaProc {
  id: number
  titulo: string
  tipo: string
  inicio: string // ISO datetime
  dia: string // ISO date (YYYY-MM-DD)
  hora: string // HH:MM
  local: string | null
  processoId: number | null
  numeroCnj: string | null
  caso: string | null
}

export interface ProcTarefa {
  id: number
  titulo: string
  status: string
  prio: number
  prazo: string | null // ISO date
  responsavelId: number | null
}

export interface UsuarioOption {
  id: number
  nome: string
  role: Role
}

export interface ProcessosDataset {
  processos: ProcessoRow[]
  prazos: PrazoRow[]
  publicacoes: PublicacaoRow[]
  audiencias: AudienciaProc[]
  tarefas: ProcTarefa[]
  responsaveis: UsuarioOption[]
  casoOptions: IdNome[]
  role: Role
  userName: string
  hoje: string
}

/** A non-paginated ListQuery — the office is small, so the client filters/sorts a
 *  generous full page in-memory (mirrors the Comercial/CRM datasets). */
function fullPage(sort: string, order: "asc" | "desc" = "asc"): ListQuery {
  return { page: 1, pageSize: 300, sort, order, skip: 0, take: 300 }
}

export async function getProcessosDataset(): Promise<ProcessosDataset> {
  const user = await requireUser()
  const hoje = hojeISO()

  const uid = veTudo(user.role) ? null : await resolveUserId(user.email)
  const procScope = await scopeProcessoWhere(user)
  const eventoScope = veTudo(user.role)
    ? {}
    : uid == null
      ? { id: -1 }
      : { OR: [{ responsavelId: uid }, { processo: { responsavelUserId: uid } }, { caso: { responsavelUserId: uid } }] }
  const tarefaScope = veTudo(user.role) ? {} : uid == null ? { id: -1 } : { responsavelId: uid }

  const [procPage, prazoPage, pubPage, usuarios, casoOptions, audRows, tarefaRows] = await Promise.all([
    listProcessos({}, fullPage("dataDistribuicao", "desc"), user),
    listPrazos({}, fullPage("dataFatal", "asc"), user),
    listPublicacoes({}, fullPage("createdAt", "desc"), user),
    getUsuariosAtivos(),
    getCasoOptions(),
    prisma.evento.findMany({
      where: { AND: [eventoScope, { tipo: { in: ["audiencia", "pericia"] }, status: "confirmado" }] },
      orderBy: { dataInicio: "asc" },
      take: 200,
      select: {
        id: true,
        titulo: true,
        tipo: true,
        dataInicio: true,
        local: true,
        processoId: true,
        processo: { select: { numeroCnj: true } },
        caso: { select: { titulo: true } },
      },
    }),
    prisma.tarefa.findMany({
      where: { AND: [{ done: false, prazo: { not: null } }, tarefaScope] },
      orderBy: { prazo: "asc" },
      take: 50,
      select: { id: true, titulo: true, status: true, prio: true, prazo: true, responsavelId: true },
    }),
  ])

  const audiencias: AudienciaProc[] = audRows.map((e) => {
    const inicio = e.dataInicio.toISOString()
    return {
      id: e.id,
      titulo: e.titulo,
      tipo: e.tipo,
      inicio,
      dia: inicio.slice(0, 10),
      hora: inicio.slice(11, 16),
      local: e.local,
      processoId: e.processoId,
      numeroCnj: e.processo?.numeroCnj ?? null,
      caso: e.caso?.titulo ?? null,
    }
  })

  const tarefas: ProcTarefa[] = tarefaRows.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    status: t.status,
    prio: t.prio,
    prazo: t.prazo ? t.prazo.toISOString().slice(0, 10) : null,
    responsavelId: t.responsavelId,
  }))

  return {
    processos: procPage.items,
    prazos: prazoPage.items,
    publicacoes: pubPage.items,
    audiencias,
    tarefas,
    responsaveis: usuarios,
    casoOptions,
    role: (user.role as Role) ?? "socio",
    userName: user.nome,
    hoje,
  }
}
