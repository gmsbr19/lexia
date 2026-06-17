// Global search tool — the agent's entry point for resolving a name to ids.
import { z } from "zod"
import { searchAll } from "@/lib/search"
import { defineTool } from "../types"

export const buscaTools = [
  defineTool({
    name: "buscar",
    kind: "readonly",
    description:
      "Busca global por clientes, casos, contratos (honorários), tarefas e lançamentos a partir de um texto. " +
      "Chame PRIMEIRO sempre que o usuário citar uma pessoa, empresa, caso ou contrato pelo nome — retorna os ids " +
      "que as ferramentas de detalhe (detalhe_cliente, detalhe_caso, detalhe_honorario) precisam.",
    schema: z.object({
      q: z.string().min(2).max(120).describe("Texto a buscar (nome, descrição, número do processo…)"),
    }),
    run: async (_ctx, { q }) => searchAll(q),
  }),
]
