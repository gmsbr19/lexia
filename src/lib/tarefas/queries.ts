// Tarefas — read layer. SERVER ONLY. The assignee picker reads the active
// registered users (the delegation pool); vínculo pickers reuse the finance
// option queries for casos and clientes.
import { prisma } from "@/lib/db"
import { getCasoOptions, getClienteOptions } from "@/lib/finance/queries"
import { getUsuariosAtivos } from "@/lib/users/queries"
import { ROLE_LABEL, type UsuarioAtivo } from "@/lib/users/types"
import type {
  Criterio,
  ProjetoKey,
  SubItem,
  TarefasDataset,
  TaskPrio,
  TaskRow,
  TaskStatus,
  TeamMember,
  VinculoRef,
} from "./types"

const isoDate = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null)

function parseArr<T>(s: string | null | undefined): T[] {
  if (!s) return []
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? (v as T[]) : []
  } catch {
    return []
  }
}

// Deterministic avatar palette (no per-sócio config needed).
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

/** Single server fetch powering the Tarefas client app. */
export async function getTarefasDataset(): Promise<TarefasDataset> {
  const [rows, usuarios, casos, clientes] = await Promise.all([
    prisma.tarefa.findMany({
      select: {
        id: true,
        titulo: true,
        status: true,
        done: true,
        prio: true,
        projeto: true,
        data: true,
        hora: true,
        prazo: true,
        notes: true,
        reminder: true,
        recur: true,
        ai: true,
        subtasks: true,
        dor: true,
        dod: true,
        responsavelId: true,
        casoId: true,
        clienteId: true,
        projetoId: true,
        ordem: true,
        caso: { select: { titulo: true } },
        cliente: { select: { nome: true } },
        projetoRef: { select: { excluidoEm: true } },
      },
      orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
    }),
    getUsuariosAtivos(),
    getCasoOptions(),
    getClienteOptions(),
  ])

  const tarefas: TaskRow[] = rows.map((r) => {
    let vinculo: VinculoRef | null = null
    if (r.casoId) vinculo = { tipo: "caso", id: r.casoId, nome: r.caso?.titulo ?? `Caso #${r.casoId}` }
    else if (r.clienteId) vinculo = { tipo: "cliente", id: r.clienteId, nome: r.cliente?.nome ?? `Cliente #${r.clienteId}` }
    return {
      id: r.id,
      titulo: r.titulo,
      status: r.status as TaskStatus,
      done: r.done,
      prio: (r.prio as TaskPrio) ?? 4,
      projeto: r.projeto as ProjetoKey,
      data: isoDate(r.data),
      hora: r.hora,
      prazo: isoDate(r.prazo),
      notes: r.notes,
      reminder: r.reminder,
      recur: r.recur,
      ai: r.ai,
      subtasks: parseArr<SubItem>(r.subtasks),
      dor: parseArr<Criterio>(r.dor),
      dod: parseArr<Criterio>(r.dod),
      responsavelId: r.responsavelId,
      casoId: r.casoId,
      clienteId: r.clienteId,
      // projeto excluído (soft-delete) → trata como "sem projeto" (a tarefa nunca some).
      projetoId: r.projetoRef && !r.projetoRef.excluidoEm ? r.projetoId : null,
      vinculo,
      ordem: r.ordem,
    }
  })

  return {
    tarefas,
    socios: usuarios.map(toTeamMember),
    casos,
    clientes,
  }
}
