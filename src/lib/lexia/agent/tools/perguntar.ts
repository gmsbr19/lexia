// Ferramenta especial "perguntar_usuario" (Fase 6, D3): pausa o turno para uma
// pergunta de múltipla escolha (ChoiceCard) quando a intenção do usuário é
// ambígua ou falta uma decisão para prosseguir — resolve com 1 clique, sem
// digitar. Sem `run`: não executa nada; o loop pausa (igual a uma proposta de
// mutação) e a RESPOSTA do usuário vira o tool_result no resume. Disponível em
// TODOS os modos, inclusive "pergunta" (kind !== "mutation" sobrevive ao
// filtro de toApiTools) — perguntar não é uma mutação de dados.
import { z } from "zod"
import { defineTool } from "../types"

export const perguntarSchema = z.object({
  pergunta: z.string().min(1).max(300).describe("A pergunta, em português, curta e direta"),
  opcoes: z.array(z.string().min(1).max(120)).min(2).max(6).describe("2 a 6 opções curtas"),
  multipla: z.boolean().optional().describe("Permite marcar mais de uma opção (default: só uma)"),
  permitirOutro: z.boolean().optional().describe("Mostra uma opção 'Outro' com texto livre"),
})

export const perguntarTools = [
  defineTool({
    name: "perguntar_usuario",
    kind: "pergunta",
    description:
      "Faça uma pergunta de múltipla escolha ao usuário quando precisar de uma decisão ou informação para prosseguir " +
      "(ex.: qual cliente entre homônimos, qual variante de um documento, confirmar uma escolha ambígua). O turno " +
      "pausa até o usuário escolher — não pergunte por texto livre quando opções fechadas resolvem mais rápido. " +
      "Use SOMENTE quando realmente precisar; não para perguntas retóricas ou quando um valor padrão razoável existe.",
    schema: perguntarSchema,
  }),
]
