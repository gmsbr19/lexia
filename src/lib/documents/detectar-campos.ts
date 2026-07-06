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
  section: z.string().max(40).optional(),
  options: z.array(z.string().min(1).max(80)).max(20).optional(),
  multiline: z.boolean().optional(),
})
const outputSchema = z.object({ campos: z.array(campoSchema).max(80) })

const SYSTEM = `Você analisa documentos jurídicos em PT-BR e identifica os trechos VARIÁVEIS que devem virar campos preenchíveis (placeholders) de um modelo reutilizável: nomes das partes, CPF/CNPJ, RG, OAB, datas, valores em reais, endereços, e-mails, números de processo e demais dados específicos do caso. Você também MONTA um formulário: agrupa os campos em SEÇÕES e escolhe o CONTROLE de cada um.
REGRAS:
- NÃO marque texto jurídico fixo (cláusulas, fundamentos, citações de lei).
- Para cada campo devolva o "exactText" EXATAMENTE como aparece no documento (uma única ocorrência, copiada ao pé da letra).
- "name" em snake_case e descritivo (ex.: outorgante_nome, outorgante_cpf, valor_honorarios).
- "dataType" entre: ${TIPOS.join(", ")}.
- "label" curto em PT-BR (ex.: "Nome do outorgante").
- "section": rótulo CURTO da seção do formulário a que o campo pertence, agrupando campos relacionados na ORDEM em que aparecem (ex.: "Contratante", "Contratado", "Honorários", "Foro e data", "Outorgante", "Poderes"). Use as MESMAS palavras para campos da mesma seção.
- "options": SOMENTE quando o campo tem um conjunto FIXO e pequeno de escolhas (ex.: estado civil → ["solteiro(a)","casado(a)","divorciado(a)","viúvo(a)","união estável"]; tipo → ["À vista","Parcelado"]). Vira um dropdown. NÃO use options para nomes/valores/datas livres.
- "multiline": true apenas para textos LONGOS/livres (ex.: objeto do contrato, descrição de poderes) que pedem uma caixa de texto.
Seja econômico: só inclua section/options/multiline quando agregarem; o essencial é exactText/name/dataType/label. Se o documento não tiver dados variáveis, devolva uma lista vazia.`

const TOOL: Anthropic.Tool = {
  name: "registrar_campos",
  description: "Registra os campos variáveis (placeholders) detectados no documento, agrupados em seções de formulário.",
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
            section: { type: "string", description: "rótulo curto da seção do formulário (ex.: Contratante, Honorários, Foro)" },
            options: { type: "array", items: { type: "string" }, description: "escolhas fixas → dropdown (só p/ enums pequenos, ex.: estado civil)" },
            multiline: { type: "boolean", description: "true p/ texto longo/livre (caixa de texto)" },
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
