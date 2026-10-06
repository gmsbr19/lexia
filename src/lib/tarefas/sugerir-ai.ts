// "Sugerir com IA" da Nova tarefa: a partir do TÍTULO, o modelo sugere caso,
// responsável, prazo fatal e prazo — com o contexto dos casos em andamento, grupos,
// equipe e do histórico recente do escritório. Uma chamada estruturada (Haiku).
// Degrada: sem ANTHROPIC_API_KEY / falha do modelo → `{ disponivel:false }` e a
// tela mostra "Sem sugestão". Nada é gravado aqui. SERVER ONLY.
import { z } from "zod"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { prisma } from "@/lib/db"
import { casoStatusBucket } from "@/lib/casos/status"
import { getAnthropic } from "@/lib/lexia/agent/client"
import { registrarUso } from "@/lib/consumo/registrar"
import { log } from "@/lib/log"
import { isValidISO } from "@/lib/datas/util"
import { hojeSP } from "./regras"

export interface SugestaoTarefa {
  disponivel: boolean
  casoId: number | null
  responsavelId: number | null
  prazoFatal: boolean | null
  prazo: string | null
}

const Saida = z.object({
  casoId: z.number().int().nullable(),
  responsavelId: z.number().int().nullable(),
  prazoFatal: z.boolean().nullable(),
  prazo: z.string().nullable(),
})

const MODELO = "claude-haiku-4-5"

const SYSTEM = `Você sugere os campos de uma NOVA TAREFA de um escritório de advocacia a partir do título.

Você recebe um JSON com "hoje", "titulo", "casos" (casos em andamento, com cliente, grupos e áreas), "equipe" e "historico" (tarefas recentes: título → caso e responsável).

Devolva:
- "casoId": o caso ao qual a tarefa claramente pertence (pelo assunto, cliente, área ou por tarefas parecidas no histórico). null se não houver indício claro.
- "responsavelId": quem costuma fazer esse tipo de tarefa (pelo histórico). null se não houver indício.
- "prazoFatal": true só para atos processuais com prazo legal (contestação, recurso, apelação, embargos, manifestação em prazo). null se não for o caso.
- "prazo": "YYYY-MM-DD" só se o título citar uma data. Senão null.
Nunca invente ids fora das listas. Na dúvida, null.`

export async function sugerirCampos(titulo: string): Promise<SugestaoTarefa> {
  const vazio: SugestaoTarefa = { disponivel: false, casoId: null, responsavelId: null, prazoFatal: null, prazo: null }
  try {
    const client = getAnthropic()
    const [comTarefas, equipe, recentes] = await Promise.all([
      // casos com tarefa aberta (os candidatos realistas), no máximo 40
      prisma.caso.findMany({
        where: { excluidoEm: null, tarefas: { some: { done: false } } },
        orderBy: { id: "desc" },
        take: 60,
        select: {
          id: true,
          titulo: true,
          nomeCurto: true,
          status: true,
          area: true,
          clientePrincipal: { select: { nome: true } },
          tarefas: { select: { grupo: true }, distinct: ["grupo"], take: 12 },
        },
      }),
      prisma.user.findMany({ where: { ativo: true }, select: { id: true, nome: true, role: true } }),
      prisma.tarefa.findMany({
        orderBy: { createdAt: "desc" },
        take: 60,
        select: { titulo: true, casoId: true, responsavelId: true, prazoFatal: true },
      }),
    ])
    const casos = comTarefas.filter((c) => casoStatusBucket(c.status) !== "arquivado").slice(0, 40)
    const ctx = {
      hoje: hojeSP(),
      titulo,
      casos: casos.map((c) => ({
        id: c.id,
        nome: c.nomeCurto ? `${c.nomeCurto} — ${c.titulo}` : c.titulo,
        cliente: c.clientePrincipal?.nome ?? null,
        area: c.area,
        grupos: c.tarefas.map((t) => t.grupo).filter(Boolean),
      })),
      equipe,
      historico: recentes,
    }
    const msg = await client.messages.parse({
      model: MODELO,
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(ctx) }],
      output_config: { format: zodOutputFormat(Saida) },
    })
    void registrarUso({ recurso: "tarefa-sugestao", modelo: MODELO, usage: msg.usage })
    const out = msg.parsed_output
    if (!out) return vazio
    const casoIds = new Set(casos.map((c) => c.id))
    const userIds = new Set(equipe.map((u) => u.id))
    const prazo = out.prazo && isValidISO(out.prazo) ? out.prazo : null
    return {
      disponivel: true,
      casoId: out.casoId != null && casoIds.has(out.casoId) ? out.casoId : null,
      responsavelId: out.responsavelId != null && userIds.has(out.responsavelId) ? out.responsavelId : null,
      prazoFatal: out.prazoFatal === true ? true : null,
      prazo: prazo && prazo >= hojeSP() ? prazo : null,
    }
  } catch (e) {
    log.warn({ err: e instanceof Error ? e.message : String(e) }, "sugestão de tarefa indisponível")
    return vazio
  }
}
