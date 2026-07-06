// LexIA · Chat — instrução PT-BR de um "ajuste" de refazer (Fase 5, RetryMenu).
// Volátil: some função `modificadorLinha` é chamada por turno e concatenada à
// mensagem do usuário — nunca entra no CORE cacheado (não muda o prefixo
// system+tools que fica quente por 1h). SERVER ONLY (chamada só em chat/route.ts).
export type Modificador = "curta" | "formal" | "simples"

const TEXTO: Record<Modificador, string> = {
  curta: "Responda de forma BEM mais curta e direta que o normal — só o essencial, sem perder precisão.",
  formal: "Responda com um tom mais formal e técnico.",
  simples: "Responda com um tom mais simples e acessível, evitando jargão.",
}

export function modificadorLinha(modificador?: Modificador): string {
  return modificador ? `\n<ajuste>${TEXTO[modificador]}</ajuste>` : ""
}
