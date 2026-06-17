// AI generation of a task's DoR (Definition of Ready) and DoD (Definition of
// Done) — a single structured-output Claude call tailored to the task's title,
// practice area, vínculo, prazo and notes. Falls back to the static generic
// lists when the model is unavailable, so the modal's "Gerar" button always
// produces something. SERVER ONLY.
import { z } from "zod"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { getAnthropic } from "@/lib/lexia/agent/client"
import { registrarUso } from "@/lib/consumo/registrar"
import { log } from "@/lib/log"
import { DOD_GENERIC, DOR_GENERIC, PROJECTS } from "./types"

export type CriterioTipo = "dor" | "dod" | "both"

export interface CriteriosInput {
  titulo: string
  projeto?: string | null
  notes?: string | null
  prazo?: string | null
  vinculo?: { tipo: "caso" | "cliente"; nome: string } | null
  tipo?: CriterioTipo
}

export interface CriteriosResult {
  dor: string[]
  dod: string[]
}

const CriteriosSchema = z.object({
  dor: z.array(z.string()).max(6),
  dod: z.array(z.string()).max(6),
})

const SYSTEM = `Você é a LexIA, assistente de um escritório de advocacia, ajudando a definir os critérios de qualidade de uma TAREFA jurídica.
- "dor" (Definition of Ready): condições objetivas que precisam estar satisfeitas para a tarefa PODER COMEÇAR (insumos, confirmações, documentos, prazo validado).
- "dod" (Definition of Done): condições para considerá-la CONCLUÍDA com qualidade (revisão, protocolo/comprovante, cliente informado, próximos passos agendados).

Regras:
- Português do Brasil. De 3 a 5 itens por lista, curtos e checáveis, no particípio/infinitivo (ex.: "Procuração assinada anexada", "Peça revisada por outro advogado"). Concretos e verificáveis, sem floreio.
- Adapte ao tipo da tarefa, à área de atuação e ao vínculo informado. NÃO invente fatos específicos do caso; mantenha os itens aplicáveis e genéricos o suficiente para serem verdadeiros.
- Respeite o campo "gerar": se for "dor", preencha apenas "dor" e deixe "dod" vazio; se "dod", apenas "dod"; se "both", preencha ambos.`

function limpar(arr: string[]): string[] {
  return arr
    .map((s) => s.trim().replace(/^[-•\d.)\s]+/, "").slice(0, 160))
    .filter(Boolean)
    .slice(0, 5)
}

export async function gerarCriterios(input: CriteriosInput): Promise<CriteriosResult> {
  const tipo = input.tipo ?? "both"
  const generic: CriteriosResult = {
    dor: tipo === "dod" ? [] : [...DOR_GENERIC],
    dod: tipo === "dor" ? [] : [...DOD_GENERIC],
  }

  try {
    const client = getAnthropic()
    const ctx = {
      titulo: input.titulo,
      area: PROJECTS.find((p) => p.id === input.projeto)?.name ?? "Não definida",
      vinculo: input.vinculo ? `${input.vinculo.tipo}: ${input.vinculo.nome}` : null,
      prazo: input.prazo ?? null,
      descricao: input.notes?.trim() || null,
      gerar: tipo,
    }
    const msg = await client.messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 800,
      system: SYSTEM,
      messages: [{ role: "user", content: `Tarefa (JSON):\n${JSON.stringify(ctx)}\n\nGere os critérios.` }],
      output_config: { format: zodOutputFormat(CriteriosSchema) },
    })
    void registrarUso({ recurso: "criterios", modelo: "claude-haiku-4-5", usage: msg.usage })
    const out = msg.parsed_output
    if (!out) throw new Error("critérios sem saída estruturada")
    const dor = tipo === "dod" ? [] : limpar(out.dor)
    const dod = tipo === "dor" ? [] : limpar(out.dod)
    // If the model returned nothing usable for the requested list, fall back.
    if ((tipo !== "dod" && dor.length === 0) || (tipo !== "dor" && dod.length === 0)) return generic
    return { dor, dod }
  } catch (e) {
    log.warn({ err: e instanceof Error ? e.message : String(e) }, "geração de DoR/DoD indisponível — usando lista padrão")
    return generic
  }
}
