// Resumo do processo por IA (apoio à decisão, sob demanda + cacheado). SERVER ONLY.
// Olha o estado atual do processo (classe/assunto/fase, últimos andamentos, prazos
// pendentes/propostos, últimas publicações) e devolve um resumo curto + um PRÓXIMO
// PASSO concreto + a situação (em_dia/atencao/critico/parado). Degrada graciosamente
// sem ANTHROPIC_API_KEY ou em qualquer erro (cai num resumo determinístico) — NUNCA
// lança por falta de chave. Cacheado em AppSetting por hash do estado, regenerando
// só quando o processo muda (ou via force).
// Importa só prisma/zod/getAnthropic/UserError/settings — NUNCA next-auth (test-safe).
// A checagem de acesso por id fica na ROTA (assertAcessoProcesso), não aqui.
import { z } from "zod"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { getAnthropic } from "@/lib/lexia/agent/client"
import { registrarUso } from "@/lib/consumo/registrar"
import { getSetting, setSetting } from "@/lib/settings"
import { limparTextoPublicacao } from "./texto"

export type SituacaoProcesso = "em_dia" | "atencao" | "critico" | "parado"

export interface ResumoProcesso {
  resumo: string
  proximoPasso: string
  situacao: SituacaoProcesso
  fonte: "ia" | "deterministico"
  geradoEm: string // ISO timestamp
}

// Cached envelope = the resumo plus a hash of the inputs that should invalidate it.
interface ResumoCache extends ResumoProcesso {
  hash: string
}

const Schema = z.object({
  resumo: z.string(),
  proximoPasso: z.string(),
  situacao: z.enum(["em_dia", "atencao", "critico", "parado"]),
})

const SYSTEM = `Você resume o ESTADO ATUAL de um processo judicial brasileiro para um advogado, como APOIO À DECISÃO. Responda em PT-BR.
- "resumo": 2 a 4 frases descrevendo onde o processo está hoje (fase, último andamento relevante, o que se aguarda). Seja objetivo. NUNCA invente fatos: use apenas o que está no contexto; se faltar dado, diga que falta.
- "proximoPasso": UMA ação concreta e imediata que o escritório deveria tomar (ex.: "Protocolar contestação até a data fatal", "Aguardar decisão do juiz", "Definir o advogado responsável", "Verificar andamento — processo parado há semanas"). Seja específico.
- "situacao": classifique em "critico" (prazo vencido/vencendo ou risco grave), "atencao" (prazo próximo, pendência relevante), "em_dia" (andamento normal, nada urgente) ou "parado" (sem movimentação recente / aguardando terceiro sem ação do escritório).
Lembre: prazos calculados são apoio — sempre exigem conferência humana.`

const CACHE_PREFIX = "proc-resumo-"

function nowISO(): string {
  return new Date().toISOString()
}

interface Contexto {
  hash: string
  texto: string
  // dados crus p/ o fallback determinístico
  classe: string | null
  status: string
  faseAtual: string | null
  ultimoAndamento: { descricao: string; data: string } | null
  prazos: { descricao: string; dataFatal: string; status: string }[]
}

/** Reúne o estado do processo (andamentos/prazos/publicações) + um hash de invalidação. */
async function montarContexto(processoId: number): Promise<Contexto> {
  const proc = await prisma.processo.findFirst({
    where: { id: processoId, excluidoEm: null },
    select: { id: true, classe: true, assunto: true, status: true, faseAtual: true, tribunal: true, uf: true, instancia: true },
  })
  if (!proc) throw new UserError("Processo não encontrado")

  const [andamentos, prazos, publicacoes] = await Promise.all([
    prisma.andamento.findMany({
      where: { processoId, excluidoEm: null },
      select: { id: true, descricao: true, data: true, tipo: true },
      orderBy: { data: "desc" },
      take: 8,
    }),
    prisma.prazo.findMany({
      where: { processoId, excluidoEm: null, status: { in: ["pendente", "proposto"] } },
      select: { id: true, descricao: true, dataFatal: true, status: true },
      orderBy: { dataFatal: "asc" },
      take: 10,
    }),
    prisma.publicacao.findMany({
      where: { processoId, excluidoEm: null },
      select: { id: true, conteudo: true, dataPublicacao: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ])

  // Hash de invalidação: id do andamento mais recente + assinatura dos prazos
  // pendentes/propostos (id:status:dataFatal de cada um) + status do processo.
  // Cobre criação, edição de data fatal e confirmação proposto→pendente.
  const prazoSig = prazos
    .map((p) => `${p.id}:${p.status}:${p.dataFatal.toISOString().slice(0, 10)}`)
    .join(",")
  const hash = `a${andamentos[0]?.id ?? 0}-[${prazoSig}]-s${proc.status}`

  const linhasAnd = andamentos
    .map((a) => `- ${a.data.toISOString().slice(0, 10)} ${a.tipo ? `[${a.tipo}] ` : ""}${limparTextoPublicacao(a.descricao).slice(0, 280)}`)
    .join("\n")
  const linhasPrazo = prazos
    .map((p) => `- ${p.descricao} · data fatal ${p.dataFatal.toISOString().slice(0, 10)}${p.status === "proposto" ? " (proposto, a confirmar)" : ""}`)
    .join("\n")
  const linhasPub = publicacoes
    .map((pub) => `- ${pub.dataPublicacao ? pub.dataPublicacao.toISOString().slice(0, 10) + " " : ""}${limparTextoPublicacao(pub.conteudo).slice(0, 280)}`)
    .join("\n")

  const texto =
    `Classe: ${proc.classe ?? "—"} · Assunto: ${proc.assunto ?? "—"}\n` +
    `Fase: ${proc.faseAtual ?? "—"} · Instância: ${proc.instancia ?? "—"} · Status: ${proc.status}\n` +
    `Foro: ${proc.tribunal ?? proc.uf ?? "—"}\n\n` +
    `Últimos andamentos:\n${linhasAnd || "(nenhum)"}\n\n` +
    `Prazos pendentes/propostos:\n${linhasPrazo || "(nenhum)"}\n\n` +
    `Últimas publicações:\n${linhasPub || "(nenhuma)"}`

  return {
    hash,
    texto,
    classe: proc.classe,
    status: proc.status,
    faseAtual: proc.faseAtual,
    ultimoAndamento: andamentos[0]
      ? { descricao: limparTextoPublicacao(andamentos[0].descricao), data: andamentos[0].data.toISOString().slice(0, 10) }
      : null,
    prazos: prazos.map((p) => ({ descricao: p.descricao, dataFatal: p.dataFatal.toISOString().slice(0, 10), status: p.status })),
  }
}

/** Resumo determinístico (sem IA): monta a partir do último andamento + próximo prazo + status. */
function resumoDeterministico(ctx: Contexto): ResumoProcesso {
  const hoje = new Date().toISOString().slice(0, 10)
  const proximoPrazo = ctx.prazos[0] ?? null
  const prazoVencido = proximoPrazo && proximoPrazo.dataFatal < hoje

  // situação
  let situacao: SituacaoProcesso
  if (prazoVencido) {
    situacao = "critico"
  } else if (proximoPrazo) {
    situacao = "atencao"
  } else if (ctx.status === "ativo" && (!ctx.ultimoAndamento || ctx.ultimoAndamento.data < addDias(hoje, -60))) {
    situacao = "parado"
  } else {
    situacao = "em_dia"
  }

  // resumo
  const partes: string[] = []
  partes.push(ctx.classe ? `Processo de ${ctx.classe.toLowerCase()}.` : "Processo.")
  if (ctx.faseAtual) partes.push(`Fase: ${ctx.faseAtual}.`)
  if (ctx.ultimoAndamento) {
    partes.push(`Último andamento (${ctx.ultimoAndamento.data}): ${ctx.ultimoAndamento.descricao.slice(0, 160)}.`)
  } else {
    partes.push("Sem andamentos registrados.")
  }
  if (proximoPrazo) {
    partes.push(`Próximo prazo: ${proximoPrazo.descricao} (data fatal ${proximoPrazo.dataFatal}).`)
  }

  // próximo passo
  let proximoPasso: string
  if (prazoVencido && proximoPrazo) {
    proximoPasso = `Verificar com urgência o prazo "${proximoPrazo.descricao}" (data fatal ${proximoPrazo.dataFatal} já passou).`
  } else if (proximoPrazo) {
    proximoPasso = `Cumprir "${proximoPrazo.descricao}" até a data fatal ${proximoPrazo.dataFatal}.`
  } else if (situacao === "parado") {
    proximoPasso = "Verificar o andamento — processo sem movimentação recente."
  } else {
    proximoPasso = "Acompanhar o andamento do processo."
  }

  return { resumo: partes.join(" "), proximoPasso, situacao, fonte: "deterministico", geradoEm: nowISO() }
}

// pequeno helper local p/ comparação de data-only (evita import circular com datas.ts)
function addDias(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** Gera o resumo (IA → fallback determinístico). NÃO toca no cache. */
async function gerarResumo(ctx: Contexto): Promise<ResumoProcesso> {
  try {
    const client = getAnthropic()
    const msg = await client.messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      system: SYSTEM,
      messages: [{ role: "user", content: ctx.texto }],
      output_config: { format: zodOutputFormat(Schema) },
    })
    void registrarUso({ recurso: "resumo", modelo: "claude-haiku-4-5", usage: msg.usage })
    const out = msg.parsed_output
    if (!out) return resumoDeterministico(ctx)
    return {
      resumo: out.resumo.trim(),
      proximoPasso: out.proximoPasso.trim(),
      situacao: out.situacao,
      fonte: "ia",
      geradoEm: nowISO(),
    }
  } catch {
    return resumoDeterministico(ctx) // sem ANTHROPIC_API_KEY ou erro → determinístico
  }
}

/**
 * Resumo do processo, cacheado em AppSetting (`proc-resumo-${id}`).
 * - Sem `force`: devolve o cache se o hash do estado bater; senão regenera e grava.
 * - Com `force: true`: ignora o cache, regenera e grava.
 * NUNCA lança por falta de chave (cai no determinístico). Lança UserError só se o
 * processo não existe / está excluído.
 * Faça a checagem de acesso (assertAcessoProcesso) na ROTA antes de chamar.
 */
export async function getResumoProcesso(processoId: number, opts: { force?: boolean } = {}): Promise<ResumoProcesso> {
  const ctx = await montarContexto(processoId)
  const key = `${CACHE_PREFIX}${processoId}`

  if (!opts.force) {
    const cached = await getSetting<ResumoCache>(key)
    if (cached && cached.hash === ctx.hash) {
      const { hash: _hash, ...resumo } = cached
      return resumo
    }
  }

  const resumo = await gerarResumo(ctx)
  // Só persiste o resultado da IA: um fallback determinístico NÃO deve ficar no
  // cache (senão seguiria sendo servido mesmo depois de configurar ANTHROPIC_API_KEY).
  if (resumo.fonte === "ia") {
    await setSetting(key, { ...resumo, hash: ctx.hash } satisfies ResumoCache)
  }
  return resumo
}

/** Força a regeneração do resumo, ignorando o cache. */
export async function regenerarResumoProcesso(processoId: number): Promise<ResumoProcesso> {
  return getResumoProcesso(processoId, { force: true })
}
