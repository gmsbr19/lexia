// Triagem de andamento por IA (apoio à decisão, sob demanda). SERVER ONLY.
// Ao ABRIR um movimento na fila de revisão, classifica relevância + motivo e sugere
// o prazo (peça, dias, contagem) para o humano CONFIRMAR. Degrada graciosamente sem
// ANTHROPIC_API_KEY (cai na heurística de palavra-chave já gravada em `relevante`).
// Importa só prisma/zod/getAnthropic/UserError — NUNCA next-auth (test-safe).
import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import type { SessionUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { getAnthropic } from "@/lib/lexia/agent/client"
import { registrarUso } from "@/lib/consumo/registrar"
import { gerarPrazoDeAndamento } from "./mutations"
import { scopeProcessoWhere } from "./rbac"
import { limparTextoPublicacao } from "./texto"

export interface TriagemSugestao {
  relevante: boolean
  motivo: string
  prazoSugerido: { descricao: string; quantidadeDias: number; tipoContagem: "uteis" | "corridos" } | null
  fonte: "ia" | "heuristica"
}

const Schema = z.object({
  relevante: z.boolean(),
  motivo: z.string(),
  prazoSugerido: z
    .object({
      descricao: z.string(),
      quantidadeDias: z.number().int().min(1).max(365),
      tipoContagem: z.enum(["uteis", "corridos"]),
    })
    .nullable(),
})

const SYSTEM = `Você triа andamentos (movimentos processuais) de um processo judicial brasileiro, como APOIO À DECISÃO de um advogado. Responda em PT-BR.
- "relevante": true se o movimento exige providência/ação do escritório (sentença, acórdão, decisão, despacho que abre prazo, intimação, designação de audiência, citação). false para movimentos cartorários/rotina (juntada, conclusão, remessa, mero expediente, publicação de pauta sem prazo).
- "motivo": 1 frase curta explicando a classificação.
- "prazoSugerido": se o movimento aparenta abrir um prazo processual, sugira a peça (ex.: "Contestação", "Recurso de Apelação", "Embargos de Declaração", "Manifestação", "Contrarrazões", "Cumprimento de sentença"), a quantidade de dias e a contagem ("uteis" no padrão CPC). Se NÃO houver prazo claro, retorne null. NUNCA invente: na dúvida, prazoSugerido = null e o advogado define. O prazo calculado é apoio — exige conferência humana.`

export async function sugerirTriagemAndamento(andamentoId: number): Promise<TriagemSugestao> {
  const and = await prisma.andamento.findFirst({
    where: { id: andamentoId, excluidoEm: null },
    select: {
      descricao: true,
      tipo: true,
      relevante: true,
      processo: { select: { classe: true, tribunal: true, uf: true } },
    },
  })
  if (!and) throw new UserError("Andamento não encontrado")
  const heuristica: TriagemSugestao = { relevante: and.relevante, motivo: "", prazoSugerido: null, fonte: "heuristica" }
  try {
    const client = getAnthropic()
    const ctx =
      `Classe: ${and.processo?.classe ?? "—"} · Foro: ${and.processo?.tribunal ?? and.processo?.uf ?? "—"}\n` +
      `Tipo: ${and.tipo ?? "—"}\nMovimento:\n${limparTextoPublicacao(and.descricao).slice(0, 2000)}`
    const msg = await client.messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      system: SYSTEM,
      messages: [{ role: "user", content: ctx }],
      output_config: { format: zodOutputFormat(Schema) },
    })
    void registrarUso({ recurso: "triagem", modelo: "claude-haiku-4-5", usage: msg.usage })
    const out = msg.parsed_output
    if (!out) return heuristica
    return { relevante: out.relevante, motivo: out.motivo?.trim() ?? "", prazoSugerido: out.prazoSugerido, fonte: "ia" }
  } catch {
    return heuristica // sem ANTHROPIC_API_KEY ou erro → heurística
  }
}

export interface PropostaResultado {
  arquivados: number // movimentos de rotina marcados revisados
  propostos: number // prazos rascunho criados pela IA
  relevantesSemProposta: number // relevantes que ficaram para revisão manual
}

/**
 * Motor de auto-proposta (pós-captura ou sob demanda). Processa os movimentos
 * 'novo' do escopo: ARQUIVA os de rotina (relevante=false) e, nos RELEVANTES, pede à
 * IA um prazo — se vier com confiança, cria um Prazo RASCUNHO (status 'proposto',
 * sem Evento) ligado ao movimento. Relevantes sem proposta confiável ficam 'novo'
 * (fila Movimentos = revisão manual). Best-effort por item; sem ANTHROPIC_API_KEY,
 * a rotina ainda arquiva e os relevantes ficam manuais. SERVER ONLY (sem next-auth).
 */
export async function proporPrazosDeAndamentos(
  opts: { processoIds?: number[]; user?: SessionUser; max?: number } = {},
): Promise<PropostaResultado> {
  let escopoProcesso: Prisma.ProcessoWhereInput = { excluidoEm: null }
  if (opts.processoIds?.length) {
    escopoProcesso = { excluidoEm: null, id: { in: opts.processoIds } }
  } else if (opts.user) {
    escopoProcesso = { AND: [await scopeProcessoWhere(opts.user), { excluidoEm: null }] }
  }

  // 1) rotina (não-relevante) sem prazo → arquiva (revisado), sem IA
  const arq = await prisma.andamento.updateMany({
    where: { statusRevisao: "novo", relevante: false, prazoId: null, processo: escopoProcesso },
    data: { statusRevisao: "revisado", revisadoEm: new Date() },
  })

  // 2) relevantes sem prazo → IA propõe (cap p/ limitar chamadas por rodada)
  const relevantes = await prisma.andamento.findMany({
    where: { statusRevisao: "novo", relevante: true, prazoId: null, processo: escopoProcesso },
    select: { id: true },
    orderBy: { data: "desc" },
    take: opts.max ?? 40,
  })
  let propostos = 0
  let relevantesSemProposta = 0
  for (const a of relevantes) {
    try {
      const sug = await sugerirTriagemAndamento(a.id)
      if (sug.prazoSugerido) {
        await gerarPrazoDeAndamento(a.id, {
          descricao: sug.prazoSugerido.descricao,
          quantidadeDias: sug.prazoSugerido.quantidadeDias,
          tipoContagem: sug.prazoSugerido.tipoContagem,
          usarDataDoAndamento: true,
          status: "proposto",
          criarEvento: false,
        })
        propostos++
      } else {
        relevantesSemProposta++ // fica 'novo' → revisão manual na fila Movimentos
      }
    } catch {
      relevantesSemProposta++ // erro/sem chave → deixa manual
    }
  }
  return { arquivados: arq.count, propostos, relevantesSemProposta }
}
