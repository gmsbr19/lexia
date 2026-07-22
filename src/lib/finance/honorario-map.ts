// A "honorário" is just a Lancamento entrada with subTipo='honorario'. This pure
// (no-prisma, client-safe) mapper projects such a fee-lançamento onto the legacy
// HonorarioRow view-model, so every honorário read now sources from the ledger.
// NOTE: the resulting `id` IS the lançamento id (deep links / modals resolve
// against lançamentos post-cutover).
import type { ComposicaoBucket, ContratoRow, HonorarioRow, HonorarioStatus } from "./types"

/** Shape of a fee-lançamento row (with its denormalized cliente/caso/conta names). */
export interface FeeLancamento {
  id: number
  descricao: string | null
  valorCents: number // signed; entradas are positive
  status: string // 'feito' | 'aberto'
  tipoHonorario: string | null // 'recorrente'|'parcelado'|'exito'|'avista'
  dataVencimento: Date | null
  dataPagamento: Date | null
  contaId: number | null
  clienteId: number | null
  casoId: number | null
  clienteNome: string | null
  casoTitulo: string | null
  contaNome: string | null
}

const BUCKETS = new Set<ComposicaoBucket>(["recorrente", "parcelado", "exito", "avista"])
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null)

/** Aggregate a caso's fee-lançamentos into the contrato commercial totals. */
export function aggFeeTotals(fees: { valorCents: number; status: string }[]): {
  contratadoCents: number
  recebidoCents: number
  count: number
} {
  const contratadoCents = fees.reduce((a, f) => a + Math.abs(f.valorCents), 0)
  const recebidoCents = fees
    .filter((f) => f.status === "feito")
    .reduce((a, f) => a + Math.abs(f.valorCents), 0)
  return { contratadoCents, recebidoCents, count: fees.length }
}

// ── Contrato (documento assinado; agrupa 1+ casos) ────────────────────────────
/** A caso as seen by contratoToRow: its own fees + the leads that converted into it. */
export interface ContratoCasoInput {
  id: number
  titulo: string
  tipo: string | null
  status: string | null
  area: string | null
  lancamentos: { valorCents: number; status: string }[] // já filtrados pela cláusula FEE
  leads: { origem: string | null; dataConversao: Date | null }[]
}
export interface ContratoInput {
  id: number
  titulo: string | null
  dataFechamento: Date | null
  clienteId: number | null
  clienteNome: string | null
  clienteOrigem: string | null
  casos: ContratoCasoInput[]
}

/** Projects a Contrato + its linked casos onto the /contratos row view-model.
 *  Totais somam os fee-lançamentos de TODOS os casos vinculados; área/tipo/status
 *  só aparecem quando há exatamente 1 caso (senão a lente comercial é ambígua). */
export function contratoToRow(c: ContratoInput): ContratoRow {
  const allFees = c.casos.flatMap((k) => k.lancamentos)
  const { contratadoCents: valorContratadoCents, recebidoCents } = aggFeeTotals(allFees)
  const unicoCaso = c.casos.length === 1 ? c.casos[0] : null
  const origemLead =
    c.casos
      .flatMap((k) => k.leads)
      .filter((l): l is { origem: string; dataConversao: Date | null } => !!l.origem)
      .sort((a, b) => (b.dataConversao?.getTime() ?? 0) - (a.dataConversao?.getTime() ?? 0))[0]?.origem ?? null
  return {
    id: c.id,
    titulo: c.titulo ?? unicoCaso?.titulo ?? c.clienteNome ?? `Contrato #${c.id}`,
    cliente: c.clienteNome,
    clienteId: c.clienteId,
    area: unicoCaso?.area ?? null,
    origem: c.clienteOrigem ?? origemLead,
    tipo: unicoCaso?.tipo ?? null,
    statusCaso: unicoCaso?.status ?? null,
    dataFechamento: c.dataFechamento ? c.dataFechamento.toISOString() : null,
    valorContratadoCents,
    recebidoCents,
    honorariosCount: allFees.length,
    casosCount: c.casos.length,
    unicoCasoId: unicoCaso?.id ?? null,
  }
}

export function lancamentoToHonorarioRow(l: FeeLancamento): HonorarioRow {
  const bucket = l.tipoHonorario && BUCKETS.has(l.tipoHonorario as ComposicaoBucket)
    ? (l.tipoHonorario as ComposicaoBucket)
    : null
  return {
    id: l.id,
    descricao: l.descricao ?? "Honorário",
    cliente: l.clienteNome ?? null,
    clienteId: l.clienteId,
    caso: l.casoTitulo ?? null,
    casoId: l.casoId,
    vencimento: iso(l.dataVencimento),
    valorCents: Math.abs(l.valorCents),
    status: (l.status === "feito" ? "recebido" : "lancado") as HonorarioStatus,
    tipo: bucket,
    dataPagamento: iso(l.dataPagamento),
    contaId: l.contaId,
    conta: l.contaNome ?? null,
    lancamentoId: l.id,
  }
}
