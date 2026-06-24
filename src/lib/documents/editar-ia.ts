// AI document editing — SERVER ONLY. Turns a natural-language instruction into a
// list of high-level ops over the OPEN flexible document (fill a field, replace
// exact text, append a paragraph). Same model policy as the rest of the docs AI:
// Sonnet by default, Opus only on opt-in. Degrades (throws the friendly UserError)
// without ANTHROPIC_API_KEY. The deterministic apply lives in model/ops.ts.
import type Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { getAnthropic } from "@/lib/lexia/agent/client"
import { registrarUso } from "@/lib/consumo/registrar"
import type { DocOp } from "./model/ops"

const opSchema = z.object({
  tipo: z.enum(["preencher_campo", "substituir_texto", "inserir_paragrafo"]),
  name: z.string().max(60).optional(),
  valor: z.string().max(2000).optional(),
  de: z.string().max(2000).optional(),
  para: z.string().max(4000).optional(),
  texto: z.string().max(4000).optional(),
})
const outputSchema = z.object({ ops: z.array(opSchema).max(40) })

export interface CampoInfo {
  name: string
  label: string
}

const SYSTEM = `Você é a LexIA editando um documento jurídico aberto (PT-BR). Traduza a instrução do usuário em uma lista de OPERAÇÕES sobre o documento:
- "preencher_campo": preenche um placeholder existente — use um "name" EXATAMENTE da lista CAMPOS DISPONÍVEIS + o "valor".
- "substituir_texto": troca um trecho — "de" deve ser o texto EXATO como está no documento e "para" o novo texto (mantém o estilo jurídico).
- "inserir_paragrafo": adiciona um parágrafo novo ao FIM, no campo "texto".
REGRAS: só devolva as operações realmente necessárias para atender o pedido; não invente campos fora da lista; preserve a terminologia do documento. Se o pedido não for aplicável, devolva uma lista vazia.`

const TOOL: Anthropic.Tool = {
  name: "editar_documento",
  description: "Aplica edições ao documento aberto.",
  input_schema: {
    type: "object",
    properties: {
      ops: {
        type: "array",
        items: {
          type: "object",
          properties: {
            tipo: { type: "string", enum: ["preencher_campo", "substituir_texto", "inserir_paragrafo"] },
            name: { type: "string", description: "preencher_campo: nome do campo (da lista)" },
            valor: { type: "string", description: "preencher_campo: valor" },
            de: { type: "string", description: "substituir_texto: trecho exato atual" },
            para: { type: "string", description: "substituir_texto: novo trecho" },
            texto: { type: "string", description: "inserir_paragrafo: texto do parágrafo" },
          },
          required: ["tipo"],
        },
      },
    },
    required: ["ops"],
  },
}

export async function editarDocIA(args: {
  instrucao: string
  texto: string
  campos: CampoInfo[]
  valores: Record<string, string>
  opus?: boolean
  userEmail?: string | null
}): Promise<DocOp[]> {
  const instrucao = args.instrucao.trim()
  if (!instrucao) return []

  const anthropic = getAnthropic() // throws the friendly UserError without a key
  const modelo = args.opus ? "claude-opus-4-8" : "claude-sonnet-4-6"

  const camposList = args.campos.length ? args.campos.map((c) => `- ${c.name} (${c.label})`).join("\n") : "(nenhum campo)"
  const valoresList = Object.entries(args.valores).map(([k, v]) => `- ${k} = ${v}`).join("\n") || "(vazio)"
  const userMsg = `INSTRUÇÃO DO USUÁRIO:\n${instrucao}\n\nCAMPOS DISPONÍVEIS:\n${camposList}\n\nVALORES ATUAIS:\n${valoresList}\n\nTEXTO DO DOCUMENTO:\n${args.texto.slice(0, 20000)}`

  const msg = await anthropic.messages.create({
    model: modelo,
    max_tokens: 4096,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "editar_documento" },
    messages: [{ role: "user", content: userMsg }],
  })
  void registrarUso({ userEmail: args.userEmail, recurso: "doc-suggest", modelo, usage: msg.usage })

  const block = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
  if (!block) return []
  const parsed = outputSchema.safeParse(block.input)
  if (!parsed.success) return []
  return parsed.data.ops
}
