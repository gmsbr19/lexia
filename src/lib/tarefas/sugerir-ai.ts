// "Sugerir com IA" da Nova tarefa: a partir do TÍTULO, o modelo sugere projeto,
// responsável, prazo fatal e prazo — com o contexto dos projetos ativos, grupos,
// equipe e do histórico recente do escritório. Uma chamada estruturada (Haiku).
// Degrada: sem ANTHROPIC_API_KEY / falha do modelo → `{ disponivel:false }` e a
// tela mostra "Sem sugestão". Nada é gravado aqui. SERVER ONLY.
import { z } from "zod"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { prisma } from "@/lib/db"
import { getAnthropic } from "@/lib/lexia/agent/client"
import { registrarUso } from "@/lib/consumo/registrar"
import { log } from "@/lib/log"
import { isValidISO } from "@/lib/datas/util"
import { hojeSP } from "./regras"

export interface SugestaoTarefa {
  disponivel: boolean
  projetoId: number | null
  responsavelId: number | null
  prazoFatal: boolean | null
  prazo: string | null
}

const Saida = z.object({
  projetoId: z.number().int().nullable(),
  responsavelId: z.number().int().nullable(),
  prazoFatal: z.boolean().nullable(),
  prazo: z.string().nullable(),
})

const MODELO = "claude-haiku-4-5"

const SYSTEM = `Você sugere os campos de uma NOVA TAREFA de um escritório de advocacia a partir do título.

Você recebe um JSON com "hoje", "titulo", "projetos" (ativos, com grupos e áreas), "equipe" e "historico" (tarefas recentes: título → projeto e responsável).

Devolva:
- "projetoId": o projeto ao qual a tarefa claramente pertence (pelo assunto, cliente, área ou por tarefas parecidas no histórico). null se não houver indício claro.
- "responsavelId": quem costuma fazer esse tipo de tarefa (pelo histórico). null se não houver indício.
- "prazoFatal": true só para atos processuais com prazo legal (contestação, recurso, apelação, embargos, manifestação em prazo). null se não for o caso.
- "prazo": "YYYY-MM-DD" só se o título citar uma data. Senão null.
Nunca invente ids fora das listas. Na dúvida, null.`

export async function sugerirCampos(titulo: string): Promise<SugestaoTarefa> {
  const vazio: SugestaoTarefa = { disponivel: false, projetoId: null, responsavelId: null, prazoFatal: null, prazo: null }
  try {
    const client = getAnthropic()
    const [projetos, equipe, recentes] = await Promise.all([
      prisma.projeto.findMany({
        where: { excluidoEm: null, arquivadoEm: null },
        select: { id: true, nomeCurto: true, nome: true, area: true, tarefas: { select: { grupo: true }, distinct: ["grupo"], take: 12 } },
      }),
      prisma.user.findMany({ where: { ativo: true }, select: { id: true, nome: true, role: true } }),
      prisma.tarefa.findMany({
        orderBy: { createdAt: "desc" },
        take: 60,
        select: { titulo: true, projetoId: true, responsavelId: true, prazoFatal: true },
      }),
    ])
    const ctx = {
      hoje: hojeSP(),
      titulo,
      projetos: projetos.map((p) => ({
        id: p.id,
        nome: `${p.nomeCurto} — ${p.nome}`,
        area: p.area,
        grupos: p.tarefas.map((t) => t.grupo).filter(Boolean),
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
    const projIds = new Set(projetos.map((p) => p.id))
    const userIds = new Set(equipe.map((u) => u.id))
    const prazo = out.prazo && isValidISO(out.prazo) ? out.prazo : null
    return {
      disponivel: true,
      projetoId: out.projetoId != null && projIds.has(out.projetoId) ? out.projetoId : null,
      responsavelId: out.responsavelId != null && userIds.has(out.responsavelId) ? out.responsavelId : null,
      prazoFatal: out.prazoFatal === true ? true : null,
      prazo: prazo && prazo >= hojeSP() ? prazo : null,
    }
  } catch (e) {
    log.warn({ err: e instanceof Error ? e.message : String(e) }, "sugestão de tarefa indisponível")
    return vazio
  }
}
