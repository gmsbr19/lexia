// Global search powering the Spotlight-style ⌘K modal — grouped, live results
// over clientes / casos / contratos (honorários) / tarefas / lançamentos.
// SQLite `contains` maps to LIKE (ASCII case-insensitive), which matches the
// dataset (~hundreds of rows per entity) without an index strategy. Static
// page/action results live client-side in the modal. SERVER ONLY.
import { prisma } from "@/lib/db"
import { contemNormalizado, normalizar } from "@/lib/text"

const PER_GROUP = 8
const MIN_QUERY = 2

export interface SearchClienteHit {
  id: number
  nome: string
  tipo: string
  cidade: string | null
  uf: string | null
  numCasos: number
}
export interface SearchCasoHit {
  id: number
  titulo: string
  cliente: string | null
  status: string | null
  numeroProcesso: string | null
}
export interface SearchContratoHit {
  id: number
  descricao: string
  cliente: string | null
  valorCents: number
  status: string | null
}
export interface SearchTarefaHit {
  id: number
  titulo: string
  status: string
  prio: number
  prazo: string | null // ISO date
}
export interface SearchLancamentoHit {
  id: number
  desc: string
  dir: "in" | "out"
  valorCents: number
  venc: string | null // ISO
  pago: boolean
}
export interface SearchProcessoHit {
  id: number
  numeroCnj: string | null
  classe: string | null
  caso: string | null
  status: string
}
export interface SearchParteHit {
  id: number
  nome: string
  documento: string | null
  tipo: string
}

export interface SearchResults {
  q: string
  clientes: SearchClienteHit[]
  casos: SearchCasoHit[]
  processos: SearchProcessoHit[]
  partes: SearchParteHit[]
  contratos: SearchContratoHit[]
  tarefas: SearchTarefaHit[]
  lancamentos: SearchLancamentoHit[]
}

const EMPTY = (q: string): SearchResults => ({
  q,
  clientes: [],
  casos: [],
  processos: [],
  partes: [],
  contratos: [],
  tarefas: [],
  lancamentos: [],
})

// Per-entity fetch ceiling. The dataset is a single office's records (hundreds
// per entity), so we pull the candidate rows applying only the hard filters and
// match accent-insensitively in JS (see src/lib/text.ts). The cap only guards
// the unbounded-over-time ledger; everything else stays well under it.
const SCAN_CAP = 5000

export async function searchAll(qRaw: string): Promise<SearchResults> {
  const q = qRaw.trim()
  if (q.length < MIN_QUERY) return EMPTY(q)
  const nq = normalizar(q)

  const [clientes, casos, processos, partes, contratos, tarefas, lancamentos] = await Promise.all([
    prisma.cliente.findMany({
      select: {
        id: true,
        nome: true,
        apelido: true,
        cpfCnpj: true,
        tipo: true,
        cidade: true,
        uf: true,
        _count: { select: { casos: true } },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.caso.findMany({
      where: { excluidoEm: null },
      select: {
        id: true,
        titulo: true,
        status: true,
        numeroProcesso: true,
        clientePrincipal: { select: { nome: true } },
      },
      orderBy: { titulo: "asc" },
    }),
    prisma.processo.findMany({
      where: { excluidoEm: null },
      select: { id: true, numeroCnj: true, classe: true, assunto: true, status: true, caso: { select: { titulo: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.parte.findMany({
      where: { excluidoEm: null },
      select: { id: true, nome: true, documento: true, tipo: true },
      orderBy: { nome: "asc" },
    }),
    prisma.lancamento.findMany({
      where: { tipo: "entrada", subTipo: "honorario", isAnomalia: false },
      select: {
        id: true,
        descricao: true,
        valorCents: true,
        status: true,
        cliente: { select: { nome: true } },
      },
      orderBy: { dataVencimento: "desc" },
    }),
    prisma.tarefa.findMany({
      select: { id: true, titulo: true, status: true, prio: true, prazo: true },
      orderBy: [{ done: "asc" }, { prazo: "asc" }],
    }),
    prisma.lancamento.findMany({
      where: { isAnomalia: false },
      select: {
        id: true,
        descricao: true,
        pagoPara: true,
        tipo: true,
        valorCents: true,
        status: true,
        dataVencimento: true,
        dataLancamento: true,
      },
      orderBy: { dataVencimento: "desc" },
      take: SCAN_CAP,
    }),
  ])

  return {
    q,
    clientes: clientes
      .filter((r) => contemNormalizado(nq, r.nome, r.apelido, r.cpfCnpj))
      .slice(0, PER_GROUP)
      .map((r) => ({
        id: r.id,
        nome: r.nome,
        tipo: r.tipo,
        cidade: r.cidade,
        uf: r.uf,
        numCasos: r._count.casos,
      })),
    casos: casos
      .filter((r) => contemNormalizado(nq, r.titulo, r.numeroProcesso))
      .slice(0, PER_GROUP)
      .map((r) => ({
        id: r.id,
        titulo: r.titulo,
        cliente: r.clientePrincipal?.nome ?? null,
        status: r.status,
        numeroProcesso: r.numeroProcesso,
      })),
    processos: processos
      .filter((r) => contemNormalizado(nq, r.numeroCnj, r.classe, r.assunto))
      .slice(0, PER_GROUP)
      .map((r) => ({
        id: r.id,
        numeroCnj: r.numeroCnj,
        classe: r.classe,
        caso: r.caso?.titulo ?? null,
        status: r.status,
      })),
    partes: partes
      .filter((r) => contemNormalizado(nq, r.nome, r.documento))
      .slice(0, PER_GROUP)
      .map((r) => ({
        id: r.id,
        nome: r.nome,
        documento: r.documento,
        tipo: r.tipo,
      })),
    contratos: contratos
      .filter((r) => contemNormalizado(nq, r.descricao, r.cliente?.nome))
      .slice(0, PER_GROUP)
      .map((r) => ({
        id: r.id,
        descricao: r.descricao ?? "Honorário",
        cliente: r.cliente?.nome ?? null,
        valorCents: Math.abs(r.valorCents),
        status: r.status === "feito" ? "recebido" : "lancado",
      })),
    tarefas: tarefas
      .filter((r) => contemNormalizado(nq, r.titulo))
      .slice(0, PER_GROUP)
      .map((r) => ({
        id: r.id,
        titulo: r.titulo,
        status: r.status,
        prio: r.prio,
        prazo: r.prazo ? r.prazo.toISOString().slice(0, 10) : null,
      })),
    lancamentos: lancamentos
      .filter((r) => contemNormalizado(nq, r.descricao, r.pagoPara))
      .slice(0, PER_GROUP)
      .map((r) => {
        const venc = r.dataVencimento ?? r.dataLancamento
        return {
          id: r.id,
          desc: r.descricao ?? "—",
          dir: r.tipo === "saida" ? ("out" as const) : ("in" as const),
          valorCents: Math.abs(r.valorCents),
          venc: venc ? venc.toISOString() : null,
          pago: r.status === "feito",
        }
      }),
  }
}
