// Pure mapping for the /contratos commercial view. A Contrato groups the
// honorários (contracted value + the 'recebido' subset) and CAN span several
// casos. Kept side-effect-free so it's unit-testable without a database; the
// query layer (getContratos) feeds it normalized rows.
import type { ContratoRow } from "./types"

export interface ContratoAggInput {
  id: number // contrato id
  titulo: string
  tipo: string | null // 'consultivo' | 'litigio' | 'misto'
  status: string | null // contrato status
  area: string | null // AreaDireito chave
  origem: string | null // Contrato.origem snapshot (null p/ contratos do backfill)
  dataFechamento: Date | null
  clienteId: number | null
  clienteNome: string | null
  clienteOrigem: string | null
  honorarios: { valorCents: number; status: string | null }[]
  casosIds: number[] // ids dos casos NÃO-excluídos sob o contrato
  leads: { origem: string | null; dataConversao: Date | null }[]
}

/** Aggregate a Contrato into its commercial row. Values are the SUM of the
 *  contract's honorários (contracted) and the subset already 'recebido'. Origem
 *  precedence: the contract's own snapshot → the cliente's origem → the origem of
 *  the most recently converted won-Lead; none of these → null ("Direto"). */
export function montarContratoRow(r: ContratoAggInput): ContratoRow {
  const valorContratadoCents = r.honorarios.reduce((a, h) => a + h.valorCents, 0)
  const recebidoCents = r.honorarios
    .filter((h) => h.status === "recebido")
    .reduce((a, h) => a + h.valorCents, 0)
  const origemLead =
    r.leads
      .slice()
      .sort((a, b) => (b.dataConversao?.getTime() ?? 0) - (a.dataConversao?.getTime() ?? 0))
      .find((l) => l.origem)?.origem ?? null
  const origem = r.origem ?? r.clienteOrigem ?? origemLead
  return {
    id: r.id,
    titulo: r.titulo,
    cliente: r.clienteNome,
    clienteId: r.clienteId,
    area: r.area,
    origem,
    tipo: r.tipo,
    statusCaso: r.status,
    dataFechamento: r.dataFechamento ? r.dataFechamento.toISOString() : null,
    valorContratadoCents,
    recebidoCents,
    honorariosCount: r.honorarios.length,
    casosCount: r.casosIds.length,
    unicoCasoId: r.casosIds.length === 1 ? r.casosIds[0] : null,
  }
}
