// Zod schemas for the caso create/patch payloads, enforced at the route boundary.
//
// Caso ≠ processo: os dados do processo (nº, tribunal, vara, instância, valor da
// causa, distribuição) moram no Processo (módulo Processos). As colunas antigas
// do Caso ficaram dormentes após a conversão (lib/casos/legado.ts) e NÃO são
// mais aceitas aqui — chaves desconhecidas são descartadas pelo zod.
import { z } from "zod"
import { idOpt } from "@/lib/validation"

export const casoPatchSchema = z.object({
  titulo: z.string().min(1).max(400).optional(),
  tipo: z.enum(["consultivo", "litigio"]).optional(),
  area: z.string().max(120).nullish(),
  status: z.string().max(60).nullish(),
  responsavel: z.string().max(200).nullish(),
  responsavelUserId: idOpt,
  clientePrincipalId: idOpt,
  /** Contrato (documento assinado) do MESMO cliente; null = sem contrato. */
  contratoId: idOpt,
  // Etiqueta do caso no quadro de Tarefas
  nomeCurto: z.string().max(24).nullish(),
  cor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullish(),
  prazo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  descricao: z.string().max(4000).nullish(),
})

export const casoCreateSchema = casoPatchSchema.extend({
  titulo: z.string().min(1).max(400),
})

/** Edição em lote na lista de casos (sem exclusão — excluir é caso a caso). */
export const casosLoteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
  tipo: z.enum(["consultivo", "litigio"]).optional(),
  area: z.string().max(120).nullish(),
  status: z.string().max(60).optional(),
  responsavelUserId: idOpt,
})
