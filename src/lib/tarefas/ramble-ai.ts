// Ramble — turns a running dictation transcript into a structured task draft
// list. One structured-output Claude call per utterance batch: receives the
// NEW transcript segment + the CURRENT draft list and returns the UPDATED full
// list (so the user can add, edit and remove tasks by voice mid-session).
// Degrades: when the model is unavailable the route reports `disponivel:false`
// and the client falls back to the local parseQuickAdd heuristics. SERVER ONLY.
import { z } from "zod"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { prisma } from "@/lib/db"
import { getAnthropic } from "@/lib/lexia/agent/client"
import { registrarUso } from "@/lib/consumo/registrar"
import { log } from "@/lib/log"

export interface RambleDraft {
  titulo: string
  notes: string | null
  data: string | null // "YYYY-MM-DD"
  hora: string | null // "HH:MM"
  prazo: string | null // "YYYY-MM-DD"
  prio: number // 1-4
  responsavelId: number | null
  projetoId: number | null
}

export interface RambleInput {
  transcricao: string
  rascunho: RambleDraft[]
}

export interface RambleResult {
  disponivel: boolean
  encerrar: boolean
  tarefas: RambleDraft[]
}

const DraftSchema = z.object({
  titulo: z.string(),
  notes: z.string().nullable(),
  data: z.string().nullable(),
  hora: z.string().nullable(),
  prazo: z.string().nullable(),
  prio: z.number().int().min(1).max(4),
  responsavelId: z.number().int().nullable(),
  projetoId: z.number().int().nullable(),
})
const RambleSchema = z.object({
  tarefas: z.array(DraftSchema).max(25),
  encerrar: z.boolean(),
})

const WD_PT = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"]

const SYSTEM = `Você é a LexIA operando o RAMBLE: o usuário DITA tarefas em voz alta e você mantém a lista de rascunhos estruturada de um escritório de advocacia.

Você recebe um JSON com:
- "hoje" (data ISO) e "diaSemana" — use-os para resolver datas relativas ("amanhã", "sexta", "semana que vem").
- "equipe" e "projetos" — as ÚNICAS pessoas/projetos válidos (use os ids; null quando não citado).
- "rascunho" — a lista ATUAL de tarefas capturadas na sessão.
- "fala" — o novo trecho ditado (transcrição automática: pode ter erros leves de pontuação/ortografia; interprete pelo sentido).

Devolva a lista COMPLETA e atualizada em "tarefas":
- Cada tarefa nova do trecho vira um item (título curto e imperativo; detalhes adicionais vão em "notes").
- Pedidos de EDIÇÃO ("muda o prazo da primeira para sexta", "a do recurso é urgente") alteram o item correspondente do rascunho.
- Pedidos de REMOÇÃO ("apaga a última", "esquece a do contrato") removem o item.
- "data"/"hora" = quando fazer (agendamento); "prazo" = limite/deadline. Só preencha o que foi dito — NUNCA invente datas, valores, números de processo ou responsáveis.
- "prio": 1 urgente, 2 alta, 3 média, 4 normal (padrão 4).
- Se a fala for só ruído/comando sem conteúdo, devolva o rascunho inalterado.
- "encerrar" = true APENAS se o usuário sinalizar o fim da sessão ("é isso", "acabou", "pode encerrar", "só isso") — e nesse caso não crie uma tarefa com essa frase.

Português do Brasil. Datas sempre "YYYY-MM-DD" e horas "HH:MM".`

function clampDraft(d: z.infer<typeof DraftSchema>, socios: Set<number>, projetos: Set<number>): RambleDraft | null {
  const titulo = d.titulo.trim().slice(0, 300)
  if (!titulo) return null
  const dateOk = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null)
  const horaOk = (s: string | null) => (s && /^\d{2}:\d{2}$/.test(s) ? s : null)
  return {
    titulo,
    notes: d.notes?.trim().slice(0, 2000) || null,
    data: dateOk(d.data),
    hora: horaOk(d.hora),
    prazo: dateOk(d.prazo),
    prio: Math.min(4, Math.max(1, Math.round(d.prio || 4))),
    responsavelId: d.responsavelId != null && socios.has(d.responsavelId) ? d.responsavelId : null,
    projetoId: d.projetoId != null && projetos.has(d.projetoId) ? d.projetoId : null,
  }
}

export async function interpretarRamble(input: RambleInput): Promise<RambleResult> {
  const fallback: RambleResult = { disponivel: false, encerrar: false, tarefas: input.rascunho }
  try {
    const client = getAnthropic()
    const [usuarios, projetos] = await Promise.all([
      prisma.user.findMany({ where: { ativo: true }, select: { id: true, nome: true } }),
      prisma.projeto.findMany({ where: { excluidoEm: null, status: { not: "arquivado" } }, select: { id: true, nome: true } }),
    ])
    const hoje = new Date()
    const ctx = {
      hoje: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`,
      diaSemana: WD_PT[hoje.getDay()],
      equipe: usuarios,
      projetos,
      rascunho: input.rascunho,
      fala: input.transcricao,
    }
    const msg = await client.messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: "user", content: `Sessão de ditado (JSON):\n${JSON.stringify(ctx)}\n\nAtualize a lista.` }],
      output_config: { format: zodOutputFormat(RambleSchema) },
    })
    void registrarUso({ recurso: "ramble", modelo: "claude-haiku-4-5", usage: msg.usage })
    const out = msg.parsed_output
    if (!out) throw new Error("ramble sem saída estruturada")
    const socioIds = new Set(usuarios.map((u) => u.id))
    const projIds = new Set(projetos.map((p) => p.id))
    const tarefas = out.tarefas.map((d) => clampDraft(d, socioIds, projIds)).filter((d): d is RambleDraft => d != null)
    return { disponivel: true, encerrar: out.encerrar, tarefas }
  } catch (e) {
    log.warn({ err: e instanceof Error ? e.message : String(e) }, "ramble indisponível — cliente usa o parser local")
    return fallback
  }
}
