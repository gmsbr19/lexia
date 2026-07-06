// LexIA · Chat — sentinela de follow-ups (Fase 6, D2). O modelo termina
// respostas ÚTEIS com uma linha `<sugestoes>a | b | c</sugestoes>` (instrução no
// CORE cacheado) — muito mais barato que uma tool dedicada (~30-60 tokens vs.
// uma rodada inteira de API). Duas metades: (1) filtro de streaming que segura
// um SUFIXO que ainda pode virar a tag (evita "<sugest" piscando na tela antes
// de sabermos se é mesmo o sentinela); (2) extração no texto FINAL (autoritativo,
// vindo de stream.finalMessage() — não dos deltas acumulados) que separa o
// texto limpo dos itens. SERVER ONLY (chamado só em loop.ts).
const TAG_OPEN = "<sugestoes>"
const TAG_CLOSE = "</sugestoes>"

/** Suprime ao vivo qualquer fragmento que possa ser o início da tag — chamar
 * `feed()` a cada delta bruto do stream; devolve só a parte segura de emitir
 * AGORA. Uma vez dentro da tag, nada mais é emitido até o fim da mensagem
 * (o sentinela só aparece no fim de uma resposta útil). */
export class FollowupsFilter {
  private held = ""
  private dentro = false

  feed(delta: string): string {
    if (this.dentro) {
      this.held += delta
      return ""
    }
    const combinado = this.held + delta
    const abre = combinado.indexOf(TAG_OPEN)
    if (abre >= 0) {
      this.dentro = true
      this.held = combinado.slice(abre)
      return combinado.slice(0, abre)
    }
    // segura só o maior SUFIXO de `combinado` que é um prefixo de TAG_OPEN
    // (ex.: "...texto<sug" segura "<sug"); o resto já é seguro de emitir.
    let corte = combinado.length
    for (let n = Math.min(TAG_OPEN.length - 1, combinado.length); n > 0; n--) {
      if (combinado.endsWith(TAG_OPEN.slice(0, n))) {
        corte = combinado.length - n
        break
      }
    }
    this.held = combinado.slice(corte)
    return combinado.slice(0, corte)
  }
}

/** Extrai os follow-ups do texto FINAL (autoritativo — msg.content, não os
 * deltas) de uma iteração: devolve o texto limpo (sentinela removida, `trimEnd`)
 * + até 4 itens PT-BR não vazios. Sem sentinela → texto intacto, itens vazio. */
export function extrairFollowups(texto: string): { texto: string; itens: string[] } {
  const abre = texto.indexOf(TAG_OPEN)
  const fecha = texto.indexOf(TAG_CLOSE)
  if (abre < 0 || fecha < abre) return { texto, itens: [] }
  const miolo = texto.slice(abre + TAG_OPEN.length, fecha)
  const itens = miolo
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4)
  const limpo = (texto.slice(0, abre) + texto.slice(fecha + TAG_CLOSE.length)).trimEnd()
  return { texto: limpo, itens }
}
