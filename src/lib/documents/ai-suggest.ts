// Contract field dictionary + the LexIA document-edit context. PURE / SERVER-SAFE.
// `field` is a DOTTED PATH into ContratoHonorariosData; the editor applies it
// generically (see EditorPage.applySuggestion). Shared by the LexIA agent's
// `editar_documento_aberto` tool (the suggestion schema) and the chat route (the
// <documento_aberto> context block the model reads to edit the OPEN contract).
import { z } from "zod"
import type { ContratoHonorariosData } from "@/lib/types/contrato-honorarios"
import { CLAUSULAS_EDITAVEIS, resolveClausula } from "@/lib/documents/generators/contrato-honorarios/clausulas"

// Dotted paths the editor can patch. Top-level free-text + the honorários keys
// (only applied when present on the current tipo) + contratante.* → contratantes[0] PF.
const FIELD_PATHS = [
  "objeto",
  "foro",
  "data",
  "honorarios.valorTotal",
  "honorarios.dataPagamento",
  "honorarios.qtParcelas",
  "honorarios.valorParcelas",
  "honorarios.dataPrimeiraParcela",
  "honorarios.percentual",
  "honorarios.baseCalculo",
  "contratante.nome",
  "contratante.cpf",
  "contratante.rg",
  "contratante.endereco",
  "contratante.email",
  "contratante.nacionalidade",
  "contratante.estadoCivil",
  "contratante.profissao",
] as const

// clausula.<id> — rewrite the full prose of a standard clause (chapters IV/V).
const CLAUSULA_PATHS = CLAUSULAS_EDITAVEIS.map((c) => `clausula.${c.id}`)

/** Every dotted path the AI may target (form fields + clause rewrites). */
export const SUGGEST_FIELDS: readonly string[] = [...FIELD_PATHS, ...CLAUSULA_PATHS]

/** One proposed edit: a dotted-path field + a human label + the new value. The
 *  agent's `editar_documento_aberto` tool validates against this exact shape. */
export const sugestaoCampoSchema = z.object({
  field: z.enum([...FIELD_PATHS, ...CLAUSULA_PATHS] as [string, ...string[]]),
  label: z.string(),
  value: z.string(),
})
export type SugestaoCampo = z.infer<typeof sugestaoCampoSchema>

export const FIELD_DICT = `Campos que você pode sugerir (apenas estes caminhos, em "field"):
TOPO
- objeto: cláusula de objeto do contrato (o que será prestado/patrocinado). Texto corrido, formal, PT-BR.
- foro: comarca/foro de eleição (ex.: "São Paulo").
- data: data de assinatura, por extenso (ex.: "12 de junho de 2026").
HONORÁRIOS (sugira SOMENTE os caminhos compatíveis com o tipo atual em honorarios.tipo):
- honorarios.valorTotal: valor total, formatado em reais (ex.: "R$ 12.000,00"). Tipos: avista, parcelado, avista_exito, parcelado_exito.
- honorarios.dataPagamento: data do pagamento à vista. Tipos: avista, avista_exito.
- honorarios.qtParcelas: número de parcelas (ex.: "3"). Tipos: parcelado, parcelado_exito.
- honorarios.valorParcelas: valor de cada parcela (ex.: "R$ 4.000,00"). Tipos: parcelado, parcelado_exito.
- honorarios.dataPrimeiraParcela: data da 1ª parcela. Tipos: parcelado, parcelado_exito.
- honorarios.percentual: percentual de êxito (ex.: "20"). Tipo: exito (puro).
- honorarios.baseCalculo: base de cálculo do êxito (ex.: "valor da condenação"). Tipo: exito (puro).
CONTRATANTE (apenas se o 1º contratante for Pessoa Física — contratante.tipo === "pf"):
- contratante.nome / contratante.cpf / contratante.rg / contratante.endereco / contratante.email / contratante.nacionalidade / contratante.estadoCivil / contratante.profissao.
CLÁUSULAS (reescrita do texto integral de uma cláusula padrão dos Capítulos IV/V):
- Use o caminho clausula.<id> (ids válidos abaixo) e, em "value", coloque o NOVO texto COMPLETO da cláusula, já revisado.
- Escreva APENAS o corpo da cláusula (sem o título "CLÁUSULA ..."), em PT-BR jurídico, mantendo o estilo e a terminologia (CONTRATANTE/CONTRATADO) do contrato.
- Só reescreva a cláusula que o pedido exige; preserve o sentido das demais. Não crie cláusulas novas nem ids fora da lista.
${CLAUSULAS_EDITAVEIS.map((c) => `  · clausula.${c.id} (${c.titulo}): ${c.assunto}`).join("\n")}`

/**
 * Build the <documento_aberto> context the model reads to edit the OPEN contract:
 * the field dictionary + the current contract JSON + the effective clause prose
 * (so clause rewrites are precise). Used by /api/lexia/chat when the editor sends
 * a document snapshot with the turn.
 */
export function documentoContextoLexia(data: ContratoHonorariosData): string {
  const clausulasAtuais = CLAUSULAS_EDITAVEIS.map(
    (c) => `- clausula.${c.id} (${c.titulo}): ${resolveClausula(data, c)}`,
  ).join("\n")
  return `${FIELD_DICT}

Dados atuais do contrato (JSON):
${JSON.stringify(data)}

Texto vigente das cláusulas padrão:
${clausulasAtuais}`
}
