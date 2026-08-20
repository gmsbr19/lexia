// Zod schemas para os payloads CRM (module-neutro). "Controles de Visão"
// (ViewGrid): store com várias visões salvas por grid (activeId + views[]).
import { z } from "zod";

const ruleSchema = z.object({
  type: z.literal("rule"),
  id: z.string().max(80),
  col: z.string().max(60),
  op: z.string().max(20),
  value: z.string().max(200),
  value2: z.string().max(200),
  values: z.array(z.string().max(120)).max(60),
});

type NodeShape = z.infer<typeof ruleSchema> | { type: "group"; id: string; combinator: "E" | "OU"; children: NodeShape[] };
const nodeSchema: z.ZodType<NodeShape> = z.lazy(() =>
  z.union([
    ruleSchema,
    z.object({
      type: z.literal("group"),
      id: z.string().max(80),
      combinator: z.enum(["E", "OU"]),
      children: z.array(nodeSchema).max(40),
    }),
  ]),
);

const groupSchema = z.object({
  type: z.literal("group"),
  id: z.string().max(80),
  combinator: z.enum(["E", "OU"]),
  children: z.array(nodeSchema).max(40),
});

const stateSchema = z.object({
  filters: groupSchema,
  sort: z.array(z.object({ col: z.string().max(60), dir: z.enum(["asc", "desc"]) })).max(20),
  groupCols: z.array(z.string().max(60)).max(2),
  collapseDefault: z.boolean(),
  hidden: z.array(z.string().max(60)).max(80),
  order: z.array(z.string().max(60)).max(80),
  frozen: z.boolean(),
  density: z.enum(["comfortable", "compact"]),
  mode: z.enum(["tabela", "quadro"]),
});

const viewSchema = z.object({
  id: z.string().max(60),
  name: z.string().max(80),
  icon: z.string().max(40),
  isDefault: z.boolean().optional(),
  state: stateSchema,
});

const gridStoreSchema = z.object({
  activeId: z.string().max(60),
  views: z.array(viewSchema).min(1).max(40),
});

export const crmViewPrefsSchema = z
  .object({
    oportunidades: gridStoreSchema.optional(),
    contatos: gridStoreSchema.optional(),
    conversoes: gridStoreSchema.optional(),
  })
  .strict();
