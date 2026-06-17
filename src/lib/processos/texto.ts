// Limpeza do inteiro teor de publicações para EXIBIÇÃO e busca. O DJe/Comunica
// costuma entregar o teor como HTML (tags + entidades + tabelas). Esta função
// remove as tags, decodifica as entidades comuns e normaliza os espaços, virando
// texto legível. PURE, sem deps — usada no servidor (ingestão) e no cliente
// (render). Idempotente: texto já limpo passa inalterado.

const ENTIDADES: Readonly<Record<string, string>> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&nbsp;": " ",
  "&ordm;": "º", "&ordf;": "ª", "&deg;": "°", "&middot;": "·", "&hellip;": "…",
  "&ndash;": "–", "&mdash;": "—", "&laquo;": "«", "&raquo;": "»",
  "&aacute;": "á", "&eacute;": "é", "&iacute;": "í", "&oacute;": "ó", "&uacute;": "ú",
  "&acirc;": "â", "&ecirc;": "ê", "&ocirc;": "ô", "&atilde;": "ã", "&otilde;": "õ",
  "&agrave;": "à", "&ccedil;": "ç", "&uuml;": "ü",
  "&Aacute;": "Á", "&Eacute;": "É", "&Iacute;": "Í", "&Oacute;": "Ó", "&Uacute;": "Ú",
  "&Acirc;": "Â", "&Ecirc;": "Ê", "&Ocirc;": "Ô", "&Atilde;": "Ã", "&Otilde;": "Õ",
  "&Agrave;": "À", "&Ccedil;": "Ç",
}

function fromCodePoint(n: number): string {
  return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ""
}

export function decodeEntidades(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h: string) => fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, n: string) => fromCodePoint(Number(n)))
    .replace(/&[a-zA-Z][a-zA-Z0-9]+;/g, (m) => ENTIDADES[m] ?? m)
}

export function limparTextoPublicacao(input: string | null | undefined): string {
  if (!input) return ""
  let s = input
  // remove blocos cujo CONTEÚDO não é texto (style/script) e comentários
  s = s.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
  s = s.replace(/<!--[\s\S]*?-->/g, " ")
  // quebras de bloco/linha viram espaço antes de remover o restante das tags
  s = s.replace(/<\s*\/?\s*(br|p|div|tr|td|th|li|h[1-6]|section|article|header)\b[^>]*>/gi, " ")
  s = s.replace(/<[^>]*>/g, " ") // remove as demais tags
  s = decodeEntidades(s)
  s = s.replace(/\s+/g, " ").trim()
  return s
}
