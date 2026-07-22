// Zod schemas for the CRM-level (module-neutral) mutation payloads. Fase 2 do
// CRM Comercial: view-prefs is the only occupant so far.
import { z } from "zod"

const filterRuleSchema = z.object({
  id: z.string().max(60),
  columnKey: z.string().max(60),
  operator: z.enum(["eq", "neq", "contains", "notContains", "isEmpty", "isNotEmpty", "gt", "gte", "lt", "lte", "between", "in"]),
  value: z.unknown(),
})
const filterStateSchema = z.object({
  combinator: z.enum(["AND", "OR"]),
  rules: z.array(filterRuleSchema).max(20),
})
const sortStateSchema = z.object({ key: z.string().max(60), dir: z.enum(["asc", "desc"]) })
const gridViewStateSchema = z.object({
  visibleColumns: z.array(z.string().max(60)).max(50).nullable(),
  filters: filterStateSchema,
  sort: sortStateSchema.nullable(),
  groupBy: z.string().max(60).nullable(),
})

export const crmViewPrefsSchema = z
  .object({
    oportunidades: gridViewStateSchema.optional(),
    contatos: gridViewStateSchema.optional(),
  })
  .strict()
