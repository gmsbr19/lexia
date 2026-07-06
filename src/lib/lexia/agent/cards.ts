// LexIA · Chat — mapeamento determinístico tool→card (handoff, Fase 3, D1).
// Puro: dado o nome da tool + input + resultado (o MESMO JSON que o modelo já
// vê), devolve um CardPayload pronto pro chat renderizar automaticamente — sem
// gastar 1 token extra (o tool_result que o modelo lê não muda em nada). Uma
// falha aqui NUNCA derruba o turno (o loop chama isto dentro de um try/catch).
import { diasEntreISO, hojeISO } from "@/lib/processos/datas"
import type {
  CardClienteData,
  CardEventoData,
  CardHonorarioData,
  CardKind,
  CardLancamentoData,
  CardLeadData,
  CardPayload,
  CardProcessoData,
  CardTarefaData,
} from "../cards-types"

const CAP = 6

// ── Clientes ─────────────────────────────────────────────────────────────────
interface ClienteRowLike {
  id: number
  nome: string
  tipo: string
  cidade?: string | null
  uf?: string | null
  numCasos?: number
}
function clienteRow(c: ClienteRowLike): CardClienteData {
  return { id: c.id, nome: c.nome, tipo: c.tipo, cidade: c.cidade, uf: c.uf, numCasos: c.numCasos }
}

interface ClienteDetailLike {
  header: { id: number; nome: string; tipo: string; cidade: string | null; uf: string | null; emails: string[]; telefones: string[] }
  resumo: { casosTotal: number }
  cobranca?: { status: "ativo" | "pausado" | "suspenso" }
}
function clienteDetail(d: ClienteDetailLike): CardClienteData {
  const h = d.header
  return {
    id: h.id,
    nome: h.nome,
    tipo: h.tipo,
    status: d.cobranca?.status,
    cidade: h.cidade,
    uf: h.uf,
    numCasos: d.resumo?.casosTotal,
    telefone: h.telefones?.[0],
    email: h.emails?.[0],
  }
}

// ── Leads ────────────────────────────────────────────────────────────────────
interface LeadRowLike {
  id: number
  nome: string
  etapa: CardLeadData["estagio"]
  origem?: string | null
  valorContratadoCents?: number | null
  valorEstimadoCents?: number | null
}
function leadRow(l: LeadRowLike): CardLeadData {
  return { id: l.id, nome: l.nome, estagio: l.etapa, origem: l.origem, valorCents: l.valorContratadoCents ?? l.valorEstimadoCents ?? null }
}

// ── Lançamentos ──────────────────────────────────────────────────────────────
interface LancamentoRowLike {
  id: number
  desc: string
  dir: "in" | "out"
  valorCents: number
  venc?: string | null
  pago: boolean
}
function lancamentoRow(l: LancamentoRowLike): CardLancamentoData {
  return { id: l.id, desc: l.desc, dir: l.dir, valorCents: l.valorCents, venc: l.venc, pago: l.pago }
}

// ── Honorários ───────────────────────────────────────────────────────────────
interface HonorarioRowLike {
  id: number
  descricao: string
  cliente?: string | null
  valorCents: number
  status?: string | null
}
function honorarioRow(h: HonorarioRowLike): CardHonorarioData {
  return { id: h.id, descricao: h.descricao, cliente: h.cliente, valorCents: h.valorCents, status: h.status }
}

interface HonorarioDetailLike extends HonorarioRowLike {
  parcelas?: { valorCents: number; pago: boolean }[]
}
function honorarioDetail(h: HonorarioDetailLike): CardHonorarioData {
  const base = honorarioRow(h)
  // Parcelado: soma o que já foi pago nas parcelas (habilita a barra CcPayProgress
  // com progresso real). Sem parcelas (à vista): binário — pago 100% ou 0%.
  const valorPagoCents = h.parcelas && h.parcelas.length > 0 ? h.parcelas.filter((p) => p.pago).reduce((s, p) => s + p.valorCents, 0) : h.status === "recebido" ? h.valorCents : 0
  return { ...base, valorPagoCents }
}

// ── Tarefas ──────────────────────────────────────────────────────────────────
interface TaskRowLike {
  id: number
  titulo: string
  status: string
  prio?: number
  prazo?: string | null
}
function tarefaRow(t: TaskRowLike): CardTarefaData {
  return { id: t.id, titulo: t.titulo, status: t.status, prio: t.prio, prazo: t.prazo }
}

// ── Processos & Casos (mesma família de card — ver cards-types.ts) ───────────
interface ProcessoRowLike {
  id: number
  caso?: string | null
  numeroCnj?: string | null
  classe?: string | null
  status: string
  proximaDataFatal?: string | null
}
function processoRow(p: ProcessoRowLike): CardProcessoData {
  const diasPrazo = p.proximaDataFatal ? diasEntreISO(hojeISO(), p.proximaDataFatal) : null
  return { id: p.id, numeroCnj: p.numeroCnj, classe: p.classe, caso: p.caso, status: p.status, diasPrazo }
}

interface CasoRowLike {
  id: number
  titulo: string
  tipo?: string | null
  status?: string | null
  responsavel?: string | null
}
function casoRow(c: CasoRowLike): CardProcessoData {
  return { id: c.id, titulo: c.titulo, classe: c.tipo, status: c.status ?? "—" }
}

// ── Agenda ───────────────────────────────────────────────────────────────────
interface EventoRowLike {
  id: number
  titulo: string
  inicio: string
  local?: string | null
}
function eventoRow(e: EventoRowLike): CardEventoData {
  return { id: e.id, titulo: e.titulo, data: e.inicio, local: e.local }
}

/**
 * Mapeia o resultado de uma tool de leitura para um card automático. `null` =
 * sem card (nada a mostrar além do texto/tool-chip — a maioria das tools).
 */
export function cardParaTool(toolName: string, input: unknown, resultado: unknown): CardPayload | null {
  try {
    return dispatch(toolName, input, resultado)
  } catch {
    return null
  }
}

function dispatch(toolName: string, _input: unknown, out: unknown): CardPayload | null {
  if (out == null || typeof out !== "object") return null
  const o = out as Record<string, unknown>

  switch (toolName) {
    case "detalhe_cliente":
      return { type: "entity", kind: "cliente", variant: "detail", rota: `/contatos/${(o.header as { id: number }).id}`, data: clienteDetail(o as unknown as ClienteDetailLike) }
    case "listar_clientes":
      return listCard("cliente", out as ClienteRowLike[], clienteRow, "/contatos")

    case "detalhe_caso": {
      const c = o as { id: number; clienteId?: number | null }
      return { type: "entity", kind: "processo", variant: "detail", rota: c.clienteId ? `/contatos/${c.clienteId}` : "/casos", data: casoRow(o as unknown as CasoRowLike) }
    }
    case "listar_casos":
      return listCard("processo", out as CasoRowLike[], casoRow, "/casos")

    case "detalhe_processo": {
      const p = o as { id: number }
      return { type: "entity", kind: "processo", variant: "detail", rota: `/processos/${p.id}`, data: processoRow(o as unknown as ProcessoRowLike) }
    }
    case "listar_processos":
      return listCard("processo", (o.itens as ProcessoRowLike[]) ?? [], processoRow, "/processos")
    case "listar_prazos":
      return listCard("processo", (o.itens as { id: number; processoId: number; numeroCnj?: string; caso?: string; status: string; dataFatal: string }[]) ?? [], (p) => ({
        id: p.processoId,
        numeroCnj: p.numeroCnj,
        caso: p.caso,
        status: p.status,
        diasPrazo: diasEntreISO(hojeISO(), p.dataFatal),
      }), "/processos")

    case "detalhe_honorario":
      return { type: "entity", kind: "honorario", variant: "detail", rota: "/financeiro", data: honorarioDetail(o as unknown as HonorarioDetailLike) }
    case "listar_honorarios":
      return listCard("honorario", (o.itens as HonorarioRowLike[]) ?? [], honorarioRow, "/financeiro")

    case "listar_lancamentos":
      return listCard("lancamento", out as LancamentoRowLike[], lancamentoRow, "/financeiro")

    case "listar_leads":
      return listCard("lead", out as LeadRowLike[], leadRow, "/comercial")

    case "listar_tarefas":
      return listCard("tarefa", (o.tarefas as TaskRowLike[]) ?? [], tarefaRow, "/tarefas")

    case "agenda":
      return listCard("evento", out as EventoRowLike[], eventoRow, "/agenda")

    case "buscar":
      return searchCard(o)

    case "financeiro_resumo": {
      const mes = o.mes as { recebidoCents?: number; aReceberCents?: number } | undefined
      if (!mes || mes.recebidoCents == null || mes.aReceberCents == null) return null
      return { type: "insight", titulo: "Financeiro do mês", icone: "wallet", series: { variant: "progress-compare", a: mes.recebidoCents, b: mes.aReceberCents, aLabel: "Recebido", bLabel: "A receber" } }
    }

    default:
      return null
  }
}

function listCard<T>(kind: CardKind, itens: T[], toRow: (item: T) => unknown, rota: string): CardPayload | null {
  if (!Array.isArray(itens) || itens.length === 0) return null
  const truncado = itens.length > CAP
  return { type: "entity-list", kind, itens: itens.slice(0, CAP).map(toRow) as never, rota: truncado ? rota : undefined, truncado }
}

interface SearchGroup {
  label: string
  kind: CardKind
  itens: unknown[]
}
function mkGroup<H>(label: string, kind: CardKind, hits: H[] | undefined, toRow: (h: H) => unknown): SearchGroup | null {
  if (!hits || hits.length === 0) return null
  return { label, kind, itens: hits.map(toRow) }
}
function searchCard(o: Record<string, unknown>): CardPayload | null {
  const q = typeof o.q === "string" ? o.q : ""
  const groups = [
    mkGroup("Clientes", "cliente", o.clientes as ClienteRowLike[] | undefined, clienteRow),
    mkGroup("Casos", "processo", o.casos as { id: number; titulo: string; status: string | null }[] | undefined, (h) => casoRow({ id: h.id, titulo: h.titulo, status: h.status })),
    mkGroup("Processos", "processo", o.processos as ProcessoRowLike[] | undefined, processoRow),
    mkGroup("Contratos", "honorario", o.contratos as { id: number; descricao: string; cliente: string | null; valorCents: number; status: string | null }[] | undefined, (h) => honorarioRow(h)),
    mkGroup("Tarefas", "tarefa", o.tarefas as TaskRowLike[] | undefined, tarefaRow),
    mkGroup("Lançamentos", "lancamento", o.lancamentos as LancamentoRowLike[] | undefined, lancamentoRow),
  ].filter((g): g is SearchGroup => g != null)
  if (groups.length === 0) return null
  return { type: "search", query: q, grupos: groups as never }
}
