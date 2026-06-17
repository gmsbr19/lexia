// Vinculação de publicações a um processo/caso/cliente. SERVER ONLY.
// `sugerirVinculo` é APOIO À DECISÃO: extrai classe/partes do teor (com IA, se houver
// ANTHROPIC_API_KEY; senão heurística) e usa o motor `associacao.ts` para achar o
// caso/cliente/honorário correspondentes (forte por CNJ; sugestões por nome). NADA é
// criado aqui — quem grava é o usuário, via `vincularPublicacao`/`createProcesso`.
import { z } from "zod"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { getAnthropic } from "@/lib/lexia/agent/client"
import { registrarUso } from "@/lib/consumo/registrar"
import {
  associarProcesso,
  type CasoSugerido,
  type ClienteSugerido,
  type Confianca,
  type HonorarioSugerido,
  type ProcessoExistente,
} from "./associacao"
import { dadosTribunalCnj } from "./cnj-tribunal"
import { limparTextoPublicacao } from "./texto"

export type { CasoSugerido, ClienteSugerido, HonorarioSugerido, ProcessoExistente }

export interface PartePrevista {
  nome: string
  papel: string
}
export interface SugestaoVinculo {
  numeroCnj: string | null
  prefill: { tribunal: string | null; uf: string | null; classe: string | null; partes: PartePrevista[] }
  processoExistente: ProcessoExistente | null
  casosSugeridos: CasoSugerido[]
  clientesSugeridos: ClienteSugerido[]
  honorariosSugeridos: HonorarioSugerido[]
  confianca: Confianca
  fonte: "ia" | "heuristica"
}

/** Classe processual pelo início do teor ("Procedimento Comum Cível Nº …"). PURE. */
export function extrairClasseHeuristica(texto: string): string | null {
  const t = limparTextoPublicacao(texto)
  // classe = texto inicial (letras/espacos) até "Nº"/"N°"/"N." ou um nº de 7 dígitos
  const m = /^([A-Za-zÀ-ú][A-Za-zÀ-ú/ ]{3,58}?)\s+(?:n[ºo°.]|\d{7})/i.exec(t)
  return m ? m[1].trim() : null
}

const ExtraiSchema = z.object({
  classe: z.string(), // "" se não identificar
  partes: z.array(z.object({ nome: z.string(), papel: z.string() })).max(12),
  clienteProvavel: z.string(), // nome da parte representada pela OAB intimada; "" se incerto
})

/** Extração de metadados via IA (Haiku). Devolve `null` sem chave / em erro → heurística. */
export async function extrairComIA(
  conteudo: string,
  oab: string | null,
): Promise<{ classe: string; partes: PartePrevista[]; cliente: string } | null> {
  try {
    const client = getAnthropic()
    const msg = await client.messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 800,
      system:
        "Você extrai metadados de uma intimação/publicação judicial brasileira (PT-BR). Identifique a classe processual, as partes (nome + papel: autor/réu/exequente/executado/embargante/etc.) e qual parte é PROVAVELMENTE o cliente do escritório (a representada pelo advogado da OAB informada). Não invente nada: use \"\" quando a informação não estiver no texto.",
      messages: [
        {
          role: "user",
          content: `OAB do escritório intimada: ${oab ?? "desconhecida"}\n\nTeor da publicação:\n${conteudo.slice(0, 6000)}`,
        },
      ],
      output_config: { format: zodOutputFormat(ExtraiSchema) },
    })
    void registrarUso({ recurso: "vinculo", modelo: "claude-haiku-4-5", usage: msg.usage })
    const out = msg.parsed_output
    if (!out) return null
    return {
      classe: out.classe?.trim() ?? "",
      partes: out.partes.map((p) => ({ nome: p.nome.trim(), papel: p.papel.trim() })).filter((p) => p.nome),
      cliente: out.clienteProvavel?.trim() ?? "",
    }
  } catch {
    return null // sem ANTHROPIC_API_KEY ou erro → cai na heurística
  }
}

export async function sugerirVinculo(pubId: number): Promise<SugestaoVinculo> {
  const pub = await prisma.publicacao.findFirst({
    where: { id: pubId, excluidoEm: null },
    select: { id: true, numeroProcessoBruto: true, conteudo: true, oabBruto: true },
  })
  if (!pub) throw new UserError("Publicação não encontrada")

  const numeroCnj = pub.numeroProcessoBruto ?? null
  const conteudo = limparTextoPublicacao(pub.conteudo)
  const { tribunal, uf } = numeroCnj ? dadosTribunalCnj(numeroCnj) : { tribunal: null, uf: null }

  const ia = await extrairComIA(conteudo, pub.oabBruto)
  const fonte: "ia" | "heuristica" = ia ? "ia" : "heuristica"
  const classe = ia?.classe || extrairClasseHeuristica(pub.conteudo) || null
  const partes = ia?.partes ?? []

  const assoc = await associarProcesso({
    numeroCnj,
    partesNomes: partes.map((p) => p.nome),
    clienteProvavel: ia?.cliente ?? null,
  })

  return {
    numeroCnj,
    prefill: { tribunal, uf, classe, partes },
    processoExistente: assoc.processoExistente,
    casosSugeridos: assoc.casosSugeridos,
    clientesSugeridos: assoc.clientesSugeridos,
    honorariosSugeridos: assoc.honorariosSugeridos,
    confianca: assoc.confianca,
    fonte,
  }
}
