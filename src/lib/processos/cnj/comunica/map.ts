// Comunicação Comunica/DJEN → PublicacaoExterna (a DTO da porta `ingerir`). Entra
// como Publicacao PENDENTE de triagem — NUNCA vira prazo automaticamente (o
// advogado escolhe a peça/dias na triagem). `data_disponibilizacao` é a
// DISPONIBILIZAÇÃO (não a publicação) → o motor aplica os 2 hops (art. 224 §§2-3).
// Dedup por `hash` (estável). PURE — testado em tests/comunica-map.test.ts.
import { limparTextoPublicacao } from "../../texto"
import type { PublicacaoExterna } from "../../types"
import type { ComunicaItem } from "./types"

const digits = (s: string | undefined | null): string => (s ?? "").replace(/\D/g, "")

/** A OAB do escritório que casou com a comunicação (para `oabBruto`/auditoria). */
function oabDaComunicacao(item: ComunicaItem, numeroOab: string, ufOab: string): string {
  const alvo = digits(numeroOab)
  const uf = ufOab.toUpperCase()
  const adv = (item.destinatarioadvogados ?? [])
    .map((d) => d.advogado)
    .find((a) => a && digits(a.numero_oab) === alvo && (a.uf_oab ?? "").toUpperCase() === uf)
  if (adv) return `${digits(adv.numero_oab)}/${(adv.uf_oab ?? "").toUpperCase()}`
  return `${alvo}/${uf}`
}

/**
 * Mapeia uma comunicação → PublicacaoExterna, ou null quando falta a chave de
 * dedup (`hash`/`id`) ou o inteiro teor (`texto`).
 */
export function comunicacaoParaPublicacao(item: ComunicaItem, numeroOab: string, ufOab: string): PublicacaoExterna | null {
  const externalId = item.hash ?? (item.id != null ? `comunica-${item.id}` : null)
  const conteudo = limparTextoPublicacao(item.texto) // DJe vem como HTML → texto legível
  if (!externalId || !conteudo) return null
  const numeroCnj = digits(item.numero_processo ?? item.numeroprocessocommascara) || null
  return {
    numeroCnj,
    oab: oabDaComunicacao(item, numeroOab, ufOab),
    dataDisponibilizacao: item.data_disponibilizacao ?? null,
    dataPublicacao: null, // o DJEN só fornece a disponibilização
    diario: item.meiocompleto ?? item.siglaTribunal ?? null,
    conteudo,
    externalId,
  }
}
