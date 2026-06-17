// CNJ unified number (Res. CNJ 65/2008: NNNNNNN-DD.AAAA.J.TR.OOOO) → DataJud
// index alias (api_publica_<alias>). PURE, no deps — unit-tested in
// tests/cnj-tribunal.test.ts.
//
// Segmento (J):
//  1 STF, 2 CNJ            → não expostos na API pública → null
//  3 STJ                  → "stj"
//  4 Justiça Federal      → "trf<N>"  (TR = região 1–6)
//  5 Justiça do Trabalho  → TR 00 = "tst"; senão "trt<N>" (1–24)
//  6 Justiça Eleitoral    → TR 00 = "tse"; senão "tre-<uf>" (DF → "tre-dft")
//  7 Justiça Militar União→ "stm"
//  8 Justiça Estadual     → "tj<uf>" (DF → "tjdft")
//  9 Justiça Militar Est. → MG/RS/SP → "tjmmg"/"tjmrs"/"tjmsp"
import { parseCnj } from "./validacao"

// TR (código do tribunal, Res. 65/2008) → UF. Estadual (J=8), eleitoral (J=6) e
// militar estadual (J=9) compartilham esta numeração de UF.
const UF_POR_CODIGO: Readonly<Record<string, string>> = {
  "01": "ac",
  "02": "al",
  "03": "ap",
  "04": "am",
  "05": "ba",
  "06": "ce",
  "07": "df",
  "08": "es",
  "09": "go",
  "10": "ma",
  "11": "mt",
  "12": "ms",
  "13": "mg",
  "14": "pa",
  "15": "pb",
  "16": "pr",
  "17": "pe",
  "18": "pi",
  "19": "rj",
  "20": "rn",
  "21": "rs",
  "22": "ro",
  "23": "rr",
  "24": "sc",
  "25": "se",
  "26": "sp",
  "27": "to",
}

/** UF (2 letras minúsculas) do código de tribunal CNJ, ou null. */
export function ufPorCodigoCnj(tr: string): string | null {
  return UF_POR_CODIGO[tr] ?? null
}

/**
 * Mapeia um número CNJ → alias do índice DataJud (sem o prefixo `api_publica_`).
 * Retorna null quando o número é inválido ou o segmento não é exposto publicamente.
 */
export function aliasDataJud(numeroCnj: string): string | null {
  const p = parseCnj(numeroCnj)
  if (!p) return null
  const tr = p.tribunal // "TR" (2 dígitos)
  const trN = Number(tr)
  switch (p.segmento) {
    case "3":
      return "stj"
    case "7":
      return "stm"
    case "4":
      return trN >= 1 && trN <= 6 ? `trf${trN}` : null
    case "5":
      return tr === "00" ? "tst" : trN >= 1 && trN <= 24 ? `trt${trN}` : null
    case "6": {
      if (tr === "00") return "tse"
      const uf = UF_POR_CODIGO[tr]
      if (!uf) return null
      return uf === "df" ? "tre-dft" : `tre-${uf}`
    }
    case "8": {
      const uf = UF_POR_CODIGO[tr]
      if (!uf) return null
      return uf === "df" ? "tjdft" : `tj${uf}`
    }
    case "9": {
      const uf = UF_POR_CODIGO[tr]
      if (uf === "mg") return "tjmmg"
      if (uf === "rs") return "tjmrs"
      if (uf === "sp") return "tjmsp"
      return null
    }
    default:
      return null // 1 (STF), 2 (CNJ) ou desconhecido
  }
}

/** Nome completo do índice DataJud, ex.: "api_publica_tjsp". */
export function indiceDataJud(numeroCnj: string): string | null {
  const alias = aliasDataJud(numeroCnj)
  return alias ? `api_publica_${alias}` : null
}

/**
 * Deriva a sigla do tribunal e a UF a partir do número CNJ — para pré-preencher
 * um Processo na vinculação (ex.: "8.26" → { tribunal: "TJSP", uf: "SP" }).
 * UF só se aplica aos segmentos estadual(8)/eleitoral(6)/militar estadual(9).
 */
export function dadosTribunalCnj(numeroCnj: string): { tribunal: string | null; uf: string | null } {
  const p = parseCnj(numeroCnj)
  if (!p) return { tribunal: null, uf: null }
  const alias = aliasDataJud(numeroCnj)
  const tribunal = alias ? alias.toUpperCase() : null // tjsp→TJSP, trf3→TRF3, tre-sp→TRE-SP
  const uf =
    p.segmento === "8" || p.segmento === "6" || p.segmento === "9"
      ? (ufPorCodigoCnj(p.tribunal)?.toUpperCase() ?? null)
      : null
  return { tribunal, uf }
}
