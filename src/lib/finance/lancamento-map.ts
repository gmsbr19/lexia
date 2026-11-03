// Mapeamento Lancamento (Prisma) → LancamentoRow (view-model), compartilhado
// pelo ledger interativo (getLancamentos) e pelo relatório por período, que
// consultam as MESMAS colunas com `where` diferentes. O mapper é puro: recebe
// uma linha estrutural, não um tipo gerado do Prisma.
import type { LancamentoRow } from "./types"

/** `select` canônico de uma linha do ledger — use junto com `toLancamentoRow`. */
export const LANC_SELECT = {
  id: true,
  tipo: true,
  status: true,
  descricao: true,
  valorCents: true,
  dataVencimento: true,
  dataLancamento: true,
  dataPagamento: true,
  pagoPara: true,
  recorrenteParentId: true,
  contaId: true,
  cliente: { select: { nome: true } },
  caso: { select: { titulo: true } },
  categoria: { select: { nome: true } },
  conta: { select: { nome: true } },
  _count: { select: { recorrenteFilhos: true } },
} as const

export interface LancRaw {
  id: number
  tipo: string
  status: string
  descricao: string | null
  valorCents: number
  dataVencimento: Date | null
  dataLancamento: Date | null
  dataPagamento: Date | null
  pagoPara: string | null
  recorrenteParentId: number | null
  contaId: number | null
  cliente: { nome: string } | null
  caso: { titulo: string } | null
  categoria: { nome: string } | null
  conta: { nome: string } | null
  _count: { recorrenteFilhos: number }
}

export function toLancamentoRow(r: LancRaw): LancamentoRow {
  const vencDate = r.dataVencimento ?? r.dataLancamento
  const recorrente = r.recorrenteParentId != null || r._count.recorrenteFilhos > 0
  return {
    id: r.id,
    dir: r.tipo === "saida" ? "out" : "in",
    desc: r.descricao ?? "—",
    party: r.cliente?.nome ?? r.pagoPara ?? null,
    caso: r.caso?.titulo ?? null,
    cat: r.categoria?.nome ?? null,
    venc: vencDate ? vencDate.toISOString() : null,
    valorCents: Math.abs(r.valorCents),
    pago: r.status === "feito",
    pagoData: r.dataPagamento ? r.dataPagamento.toISOString() : null,
    contaId: r.contaId,
    conta: r.conta?.nome ?? null,
    recorrente,
    grupo: recorrente ? "Recorrente" : null,
  }
}
