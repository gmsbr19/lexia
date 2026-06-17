// AI daily briefing — a once-a-day Claude synthesis over the office's real
// operational context (ledger + agenda + tarefas), cached in AppSetting and
// regenerable on demand. Falls back to a deterministic sentence when the model
// is unavailable (no ANTHROPIC_API_KEY) so the Início page never breaks.
// SERVER ONLY.
import { z } from "zod"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { getAnthropic } from "@/lib/lexia/agent/client"
import { registrarUso } from "@/lib/consumo/registrar"
import { addDiasISO, hojeISO } from "@/lib/lexia/agent/datas"
import { log } from "@/lib/log"
import { getSetting, setSetting } from "@/lib/settings"
import { getCobrancaResumo, getDevedoresDashboard } from "@/lib/clientes/cobranca"
import { listEventos } from "@/lib/agenda/queries"
import { getTarefasDataset } from "@/lib/tarefas/queries"
import { getBriefing } from "./briefing"
import { formatBRL, formatBRLCompact } from "./money"
import type { BriefingData, BriefingDestaque, BriefingDiario } from "./types"

const CACHE_KEY = "briefing-diario"

const AREA = ["prazos", "inadimplencia", "casos-sem-fee", "agenda", "tarefas", "caixa", "comercial", "none"] as const
const TOM = ["pos", "neg", "neutro", "gold"] as const

const BriefingSchema = z.object({
  foco: z.string().describe("1–2 frases com o foco do dia, em PT-BR, sem markdown e sem saudação"),
  destaques: z
    .array(
      z.object({
        texto: z.string().describe("uma frase curta e acionável sobre um ponto de atenção ou oportunidade"),
        tom: z.enum(TOM),
        area: z.enum(AREA),
      }),
    )
    .max(4),
})

const SYSTEM = `Você é a LexIA, assistente de um escritório de advocacia. Escreva o BRIEFING DIÁRIO para um sócio: o que realmente merece atenção hoje, com base EXCLUSIVAMENTE nos dados fornecidos.

Regras:
- Português do Brasil, tom profissional e direto. NÃO inclua saudação ("bom dia") nem markdown.
- Valores chegam em CENTAVOS — ao mencionar, converta para reais (ex.: 1234500 → R$ 12.345,00). Nunca invente números, nomes, datas ou fatos fora do contexto.
- PRAZOS PROCESSUAIS SÃO A PRIORIDADE MÁXIMA: um prazo fatal perdido é irreversível e gera responsabilidade. Se houver prazos vencidos ou vencendo hoje, eles DEVEM abrir o "foco" e ter um destaque, antes de qualquer assunto financeiro.
- "foco": 1–2 frases com o ponto mais importante do dia. Priorize, nesta ordem: prazos fatais (vencidos ou de hoje) > dinheiro a recuperar (vencidos) > compromissos de hoje > receita não capturada (casos sem honorário) > tarefas atrasadas.
- "destaques": até 4 itens curtos e acionáveis. Cada item tem uma "area" (prazos, inadimplencia, casos-sem-fee, agenda, tarefas, caixa, comercial ou none) e um "tom" (pos = positivo, neg = alerta/risco, neutro, gold = oportunidade). Quando citar um prazo, mencione o responsável se houver.
- COBRANÇA — RESPEITE A MEMÓRIA DO ESCRITÓRIO: NÃO sugira cobrar nenhum cliente listado em "financeiro.naoCobrar" (pausados, marcados como "não cobrar" ou que pagaram recentemente). "financeiro.maioresDevedores" já traz só quem ainda pode ser cobrado — use essa lista ao falar de inadimplência.
- Não encha de itens irrelevantes. Se o dia está tranquilo, seja breve e honesto (ex.: caixa estável, sem pendências críticas).`

/** Assemble a compact, bounded JSON of today's operational context for the model. */
async function coletarContexto(): Promise<{ dados: BriefingData; contexto: unknown }> {
  const hoje = hojeISO()
  const [dados, devedores, tarefasDs, eventos, cobranca] = await Promise.all([
    getBriefing(),
    getDevedoresDashboard(6),
    getTarefasDataset(),
    listEventos({ de: hoje, ate: addDiasISO(hoje, 7) }),
    getCobrancaResumo(),
  ])

  const tarefasAtrasadas = tarefasDs.tarefas.filter((t) => !t.done && t.prazo && t.prazo < hoje)
  const tarefasHoje = tarefasDs.tarefas.filter((t) => !t.done && (t.prazo === hoje || t.data === hoje))

  const contexto = {
    hoje,
    // Prazos first — they are the highest-priority signal for a law office.
    prazos: {
      vencidos: dados.prazosVencidos,
      vencemHoje: dados.prazosHoje,
      vencem7Dias: dados.prazos7Dias,
      exemplos: dados.prazosExemplos.map((p) => ({
        descricao: p.descricao,
        processo: p.numeroCnj,
        dataFatal: p.dataFatal,
        responsavel: p.responsavel,
        vencido: p.vencido,
      })),
    },
    financeiro: {
      recebidoMesCents: dados.recebidoMesCents,
      variacaoMesPct: dados.recebidoDeltaPct,
      totalVencidoCents: dados.vencidoCents,
      vencidoMais60Cents: dados.vencido60Cents,
      clientesComVencidos: dados.vencido60Clientes,
      // Apenas devedores AINDA cobráveis (exclui pausados/suspensos/que pagaram).
      maioresDevedores: devedores.ativos.map((o) => ({ cliente: o.nome, valorCents: o.valorCents })),
      casosSemHonorario: dados.casosSemFee,
      potencialNaoFaturadoCents: dados.potencialCents,
      // NÃO sugerir cobrança destes — cobrança pausada/suspensa ou pagamento recente.
      naoCobrar: {
        pausados: cobranca.pausados.map((c) => ({ cliente: c.nome, ate: c.ate, motivo: c.motivo })),
        suspensos: cobranca.suspensos.map((c) => ({ cliente: c.nome, motivo: c.motivo })),
        pagaramRecentemente: devedores.emEspera.filter((e) => e.razao === "pagou").map((e) => e.nome),
      },
    },
    agenda: {
      proximos7Dias: eventos.length,
      eventos: eventos
        .slice(0, 8)
        .map((e) => ({ titulo: e.titulo, tipo: e.tipo, quando: e.inicio, cliente: e.cliente })),
    },
    tarefas: {
      atrasadas: tarefasAtrasadas.length,
      paraHoje: tarefasHoje.length,
      exemplosAtrasadas: tarefasAtrasadas.slice(0, 5).map((t) => t.titulo),
    },
  }
  return { dados, contexto }
}

async function gerarIA(contexto: unknown): Promise<{ foco: string; destaques: BriefingDestaque[] }> {
  const client = getAnthropic()
  const msg = await client.messages.parse({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Contexto do escritório hoje (JSON):\n${JSON.stringify(contexto)}\n\nGere o briefing do dia.`,
      },
    ],
    output_config: { format: zodOutputFormat(BriefingSchema) },
  })
  void registrarUso({ recurso: "briefing", modelo: "claude-sonnet-4-6", usage: msg.usage })
  if (!msg.parsed_output) throw new Error("briefing sem saída estruturada")
  return msg.parsed_output as { foco: string; destaques: BriefingDestaque[] }
}

/** Deterministic stand-in mirroring the AI shape, so the card renders identically. */
function fallback(dados: BriefingData): { foco: string; destaques: BriefingDestaque[] } {
  const destaques: BriefingDestaque[] = []

  // Prazos lead the focus — a missed legal deadline is irreversible.
  let foco = ""
  if (dados.prazosVencidos > 0 || dados.prazosHoje > 0) {
    const bits: string[] = []
    if (dados.prazosVencidos > 0) bits.push(`${dados.prazosVencidos} prazo${dados.prazosVencidos === 1 ? "" : "s"} vencido${dados.prazosVencidos === 1 ? "" : "s"}`)
    if (dados.prazosHoje > 0) bits.push(`${dados.prazosHoje} com prazo fatal hoje`)
    foco = `Atenção aos prazos: ${bits.join(" e ")}. `
    destaques.push({
      texto: `${bits.join(" e ")} — verifique os processos e responsáveis.`,
      tom: "neg",
      area: "prazos",
    })
  } else if (dados.prazos7Dias > 0) {
    destaques.push({
      texto: `${dados.prazos7Dias} prazo${dados.prazos7Dias === 1 ? "" : "s"} vence${dados.prazos7Dias === 1 ? "" : "m"} nos próximos 7 dias.`,
      tom: "neutro",
      area: "prazos",
    })
  }

  foco += `Recebido do mês em ${formatBRL(dados.recebidoMesCents)}`
  if (dados.recebidoDeltaPct != null) {
    foco += ` (${dados.recebidoDeltaPct < 0 ? "queda" : "alta"} de ${Math.abs(dados.recebidoDeltaPct).toFixed(0)}% vs. mês anterior)`
  }
  foco += "."

  if (dados.vencido60Cents > 0) {
    destaques.push({
      texto: `${formatBRL(dados.vencido60Cents)} vencidos há mais de 60 dias em ${dados.vencido60Clientes} cliente${dados.vencido60Clientes === 1 ? "" : "s"}.`,
      tom: "neg",
      area: "inadimplencia",
    })
  } else if (dados.vencidoCents > 0) {
    destaques.push({ texto: `${formatBRL(dados.vencidoCents)} em recebíveis vencidos a cobrar.`, tom: "neg", area: "inadimplencia" })
  }
  if (dados.casosSemFee > 0) {
    destaques.push({
      texto: `${dados.casosSemFee} caso${dados.casosSemFee === 1 ? " ativo" : "s ativos"} sem honorário — potencial estimado de ${formatBRLCompact(dados.potencialCents)}.`,
      tom: "gold",
      area: "casos-sem-fee",
    })
  }
  if (destaques.length === 0) foco += " Caixa estável — sem alertas relevantes hoje."
  return { foco, destaques }
}

function montar(
  gen: { foco: string; destaques: BriefingDestaque[] },
  dados: BriefingData,
  fonte: BriefingDiario["fonte"],
): BriefingDiario {
  return { fonte, foco: gen.foco, destaques: gen.destaques.slice(0, 4), geradoEm: new Date().toISOString(), data: hojeISO(), dados }
}

async function gerarEArmazenar(): Promise<BriefingDiario> {
  const { dados, contexto } = await coletarContexto()
  let resultado: BriefingDiario
  try {
    resultado = montar(await gerarIA(contexto), dados, "ia")
  } catch (e) {
    log.warn({ err: e instanceof Error ? e.message : String(e) }, "briefing IA indisponível — usando fallback determinístico")
    resultado = montar(fallback(dados), dados, "deterministico")
  }
  await setSetting(CACHE_KEY, resultado).catch(() => {})
  return resultado
}

/** Today's cached briefing (generates once per day, per office). Never throws. */
export async function getBriefingDiario(): Promise<BriefingDiario> {
  try {
    const cached = await getSetting<BriefingDiario>(CACHE_KEY)
    if (cached && cached.data === hojeISO()) return cached
    return await gerarEArmazenar()
  } catch (e) {
    log.error({ err: e instanceof Error ? e.message : String(e) }, "briefing diário falhou")
    const dados = await getBriefing()
    return montar(fallback(dados), dados, "deterministico")
  }
}

/** Force a fresh briefing (overwrites today's cache) — backs the "Regenerar" button. */
export async function regenerarBriefingDiario(): Promise<BriefingDiario> {
  return gerarEArmazenar()
}
