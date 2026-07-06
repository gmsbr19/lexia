// LexIA · Motion kit — tabelas de dados puras (sem CSS/React), extraídas de
// components/lexia/cc/motion.tsx para ficarem testáveis sem puxar o
// vanilla-extract (cc.css.ts não pode ser importado fora do pipeline de build —
// ver tests/lexia-cc.test.ts). motion.tsx importa e reexporta estes símbolos.
import type { LexiaPersona } from "./preferencias-core"

export type AnimatedIconName = "pen" | "scale" | "spark" | "gavel" | "scroll" | "search" | "sigma" | "bars" | "braces" | "orbit"

export interface LexTone {
  label: string
  hint: string
  words: string[]
  icons: AnimatedIconName[]
}

/** Conjuntos de palavras "-ndo…" por persona. Advogado sênior é o padrão. */
export const LEX_TONES: Record<LexiaPersona, LexTone> = {
  senior: {
    label: "Advogado sênior",
    hint: "técnico e formal",
    words: [
      "Elaborando",
      "Fundamentando",
      "Redigindo",
      "Deliberando",
      "Analisando",
      "Interpretando",
      "Argumentando",
      "Ponderando",
      "Examinando",
      "Compulsando",
      "Minutando",
      "Sustentando",
    ],
    icons: ["scale", "pen", "scroll", "gavel", "search"],
  },
  cordial: {
    label: "Cordial",
    hint: "caloroso e próximo",
    words: [
      "Pensando",
      "Preparando",
      "Organizando",
      "Rascunhando",
      "Ajeitando",
      "Reunindo",
      "Anotando",
      "Conferindo",
      "Refletindo",
      "Caprichando",
      "Adiantando",
      "Juntando",
    ],
    icons: ["pen", "spark", "scroll", "search", "orbit"],
  },
  analista: {
    label: "Analista",
    hint: "estruturado e baseado em dados",
    words: [
      "Estruturando",
      "Processando",
      "Compilando",
      "Mapeando",
      "Calculando",
      "Cruzando",
      "Consolidando",
      "Modelando",
      "Sintetizando",
      "Correlacionando",
      "Tabulando",
      "Quantificando",
    ],
    icons: ["sigma", "bars", "braces", "orbit", "search"],
  },
  custom: {
    label: "Crie do seu jeito",
    hint: "padrão neutro",
    words: ["Trabalhando", "Elaborando", "Preparando", "Pensando", "Organizando", "Processando", "Montando", "Escrevendo", "Reunindo", "Ajustando"],
    icons: ["spark", "pen", "orbit", "scroll"],
  },
}
export const LEX_TONE_ORDER: LexiaPersona[] = ["senior", "cordial", "analista", "custom"]

/** Ritmo — "balanced" é o padrão. word/type em ms|cps; *Stagger em ms; shimmer em s. */
export type LexPaceName = "calm" | "balanced" | "snappy"

export interface LexPace {
  word: number
  shimmer: number
  type: number
  wordStagger: number
  lineStagger: number
  loadSpin: number
}

export const LEX_PACE: Record<LexPaceName, LexPace> = {
  calm: { word: 2100, shimmer: 2.9, type: 26, wordStagger: 74, lineStagger: 270, loadSpin: 1.5 },
  balanced: { word: 1500, shimmer: 2.4, type: 36, wordStagger: 52, lineStagger: 200, loadSpin: 1.15 },
  snappy: { word: 1050, shimmer: 1.9, type: 54, wordStagger: 34, lineStagger: 140, loadSpin: 0.85 },
}
