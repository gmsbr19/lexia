// Tool registry. The list is name-sorted so the tool block sent to the API is
// byte-identical across requests (prompt-cache stability). SERVER ONLY.
import type Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import type { AgentTool } from "./types"
import { agendaTools } from "./tools/agenda"
import { buscaTools } from "./tools/busca"
import { casosTools } from "./tools/casos"
import { clientesTools } from "./tools/clientes"
import { comercialTools } from "./tools/comercial"
import { documentosTools } from "./tools/documentos"
import { financeiroTools } from "./tools/financeiro"
import { navegacaoTools } from "./tools/navegacao"
import { processosTools } from "./tools/processos"
import { tarefasTools } from "./tools/tarefas"

export const TOOLS: AgentTool[] = [
  ...buscaTools,
  ...financeiroTools,
  ...clientesTools,
  ...casosTools,
  ...tarefasTools,
  ...agendaTools,
  ...comercialTools,
  ...processosTools,
  ...documentosTools,
  ...navegacaoTools,
].sort((a, b) => a.name.localeCompare(b.name))

export const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]))

export function getTool(name: string): AgentTool | undefined {
  return TOOLS_BY_NAME.get(name)
}

/** Build the API `tools` array (deterministic order ⇒ cache-stable). */
export function toApiTools(): Anthropic.Tool[] {
  return TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: z.toJSONSchema(t.schema) as unknown as Anthropic.Tool.InputSchema,
  }))
}
