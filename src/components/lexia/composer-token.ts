// LexIA · Chat — detecção do token "@"/"/" no FIM do valor do composer (Fase 7,
// D10). Puro: olha só o sufixo da string (mesma regra do handoff) — não depende
// da posição real do cursor (o usuário sempre digita @/… no ponto de inserção).
export interface TokenAtivo {
  trigger: "@" | "/"
  query: string
  /** Início do token dentro do valor (para recortar/substituir). */
  from: number
}

const TOKEN_RE = /(^|\s)([@/])([^\s]*)$/

export function detectarToken(value: string): TokenAtivo | null {
  const m = TOKEN_RE.exec(value)
  if (!m) return null
  const trigger = m[2] as "@" | "/"
  const query = m[3]
  const from = value.length - (trigger.length + query.length)
  return { trigger, query, from }
}

/** Troca o token ativo (do fim do valor) por um texto — "" remove (menção
 * resolvida vira chip fora do texto); um template de comando insere no lugar. */
export function substituirToken(value: string, token: TokenAtivo, texto = ""): string {
  return value.slice(0, token.from) + texto
}
