// Tool registry. The list is name-sorted so the tool block sent to the API is
// byte-identical across requests (prompt-cache stability). SERVER ONLY.
import type Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import type { Role } from "@/lib/auth/session"
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
import { projetosTools } from "./tools/projetos"
import { tarefasTools } from "./tools/tarefas"

export const TOOLS: AgentTool[] = [
  ...buscaTools,
  ...financeiroTools,
  ...clientesTools,
  ...casosTools,
  ...tarefasTools,
  ...projetosTools,
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

/** Mirror of assertRole: admin passes; senão o papel precisa constar em tool.roles. */
function podeUsar(role: string, tool: AgentTool): boolean {
  if (!tool.roles) return true
  if (role === "admin") return true
  return tool.roles.includes(role as Role)
}

// Ferramentas que SÓ existem quando um documento está aberto no editor flexível
// (ctx.doc setado). Fora do editor elas são removidas (sem sentido); dentro do
// editor o agente fica FOCADO no documento — leitura (para preencher campos com
// dados reais) + estas duas, sem mutações de CRM.
const DOC_TOOLS = new Set(["editar_documento_aberto", "detectar_campos_documento"])

/**
 * Build the API `tools` array for this user's role. Tools the role can't use
 * (e.g. as financeiras para a "Equipe") são removidas para que o modelo nem as
 * enxergue — o assertRole no loop permanece como defesa em profundidade. A ordem
 * determinística por papel mantém o prefixo cacheável (cache estável por papel).
 *
 * No modo "pergunta" (somente leitura) as ferramentas de MUTAÇÃO são removidas:
 * o modelo só enxerga consultas/navegação e não tem como propor alterações.
 *
 * `docMode` (chat embutido no editor): expõe APENAS leitura + as ferramentas de
 * documento (DOC_TOOLS) — mutações de CRM e navegação saem para manter o foco em
 * editar o documento aberto. Fora do editor, DOC_TOOLS são removidas. Resultam
 * dois formatos estáveis de tool-surface (global vs doc) → cache previsível.
 */
export function toApiTools(role: string, mode?: "agente" | "pergunta" | "plano", docMode?: boolean): Anthropic.Tool[] {
  return TOOLS.filter((t) => podeUsar(role, t))
    .filter((t) => (mode === "pergunta" ? t.kind !== "mutation" : true))
    .filter((t) => {
      // As ferramentas de documento exigem um doc aberto E um modo que permita editar
      // (no modo "pergunta" o agente só responde/consulta, não propõe alterações).
      if (DOC_TOOLS.has(t.name)) return !!docMode && mode !== "pergunta"
      // Dentro do editor, o resto fica restrito a leitura (foco no documento).
      if (docMode) return t.kind === "readonly"
      return true
    })
    .map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: z.toJSONSchema(t.schema) as unknown as Anthropic.Tool.InputSchema,
    }))
}
