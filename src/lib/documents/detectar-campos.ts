// AI placeholder detection — SERVER ONLY. Reads a document's plain text and
// returns the variable spans that should become merge-fields. Default model is
// Sonnet; Opus only when the caller opts in (more credits). Degrades by throwing
// the friendly "not connected" UserError when ANTHROPIC_API_KEY is missing (the
// manual "Campo" button still works). The deterministic span→node application
// lives in model/campos.ts.
import type Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { getAnthropic } from "@/lib/lexia/agent/client"
import { registrarUso } from "@/lib/consumo/registrar"
import type { CampoDetectado } from "./model/campos"

const TIPOS = ["texto", "nome", "cpf", "cnpj", "rg", "oab", "data", "valor", "endereco", "email", "processo", "numero"] as const

const campoSchema = z.object({
  exactText: z.string().min(1).max(400),
  name: z.string().min(1).max(60),
  dataType: z.enum(TIPOS).optional(),
  label: z.string().max(120).optional(),
})
const outputSchema = z.object({ campos: z.array(campoSchema).max(80) })

const SYSTEM = `Você analisa documentos jurídicos em PT-BR e identifica os trechos VARIÁVEIS que devem virar campos preenchíveis (placeholders) de um modelo reutilizável: nomes das partes, CPF/CNPJ, RG, OAB, datas, valores em reais, endereços, e-mails, números de processo e demais dados específicos do caso.
REGRAS:
- NÃO marque texto jurídico fixo (cláusulas, fundamentos, citações de lei).
- Para cada campo devolva o "exactText" EXATAMENTE como aparece no documento (uma única ocorrência, copiada ao pé da letra).
- "name" em snake_case e descritivo (ex.: outorgante_nome, outorgante_cpf, valor_honorarios).
- "dataType" entre: ${TIPOS.join(", ")}.
- "label" curto em PT-BR (ex.: "Nome do outorgante").
Se o documento não tiver dados variáveis, devolva uma lista vazia.`

const TOOL: Anthropic.Tool = {
  name: "registrar_campos",
  description: "Registra os campos variáveis (placeholders) detectados no documento.",
  input_schema: {
    type: "object",
    properties: {
      campos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            exactText: { type: "string", description: "trecho exato, copiado do documento" },
            name: { type: "string", description: "chave em snake_case" },
            dataType: { type: "string", enum: [...TIPOS] },
            label: { type: "string", description: "rótulo curto em PT-BR" },
          },
          required: ["exactText", "name"],
        },
      },
    },
    required: ["campos"],
  },
}

export async function detectarCampos(
  texto: string,
  opts: { opus?: boolean; userEmail?: string | null } = {},
): Promise<CampoDetectado[]> {
  const trimmed = texto.trim()
  if (!trimmed) return []

  const anthropic = getAnthropic() // throws the friendly UserError without a key
  const modelo = opts.opus ? "claude-opus-4-8" : "claude-sonnet-4-6"

  const msg = await anthropic.messages.create({
    model: modelo,
    max_tokens: 4096,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "registrar_campos" },
    messages: [{ role: "user", content: `Documento:\n\n${trimmed.slice(0, 24000)}` }],
  })
  void registrarUso({ userEmail: opts.userEmail, recurso: "doc-campos", modelo, usage: msg.usage })

  const block = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
  if (!block) return []
  const parsed = outputSchema.safeParse(block.input)
  if (!parsed.success) return []

  // De-dupe by name (keep the first).
  const seen = new Set<string>()
  const campos: CampoDetectado[] = []
  for (const c of parsed.data.campos) {
    if (seen.has(c.name)) continue
    seen.add(c.name)
    campos.push(c)
  }
  return campos
}
