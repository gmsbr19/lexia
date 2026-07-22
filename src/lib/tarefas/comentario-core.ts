// Núcleo PURO dos comentários de tarefa (sem Prisma/env; client-safe — usado
// pela UI, pelos triggers no servidor e pelos testes). As menções vivem inline
// no `conteudo` como tokens `@[<userId>]` / `@[todos]`: fonte única da verdade,
// de onde derivam tanto os destinatários (no disparo) quanto o destaque (no render).

/** View model de um comentário (servidor → cliente). */
export interface ComentarioRow {
  id: number
  autorId: number
  conteudo: string
  editado: boolean
  createdAt: string // ISO
}

/** Ids mencionados (distintos) + se `@[todos]` aparece. Ignora tokens malformados. */
export function parseMencoes(conteudo: string): { ids: number[]; todos: boolean } {
  const ids = new Set<number>()
  let todos = false
  for (const m of conteudo.matchAll(/@\[(\d+|todos)\]/g)) {
    const raw = m[1]
    if (raw === "todos") todos = true
    else {
      const n = Number(raw)
      if (Number.isInteger(n) && n > 0) ids.add(n)
    }
  }
  return { ids: [...ids], todos }
}

export type Segmento =
  | { t: "texto"; v: string }
  | { t: "mencao"; id: number }
  | { t: "todos" }

/** Quebra o corpo em segmentos p/ renderizar em React (NUNCA emite HTML). */
export function segmentosComentario(conteudo: string): Segmento[] {
  const segs: Segmento[] = []
  let last = 0
  const re = /@\[(\d+|todos)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(conteudo))) {
    if (m.index > last) segs.push({ t: "texto", v: conteudo.slice(last, m.index) })
    const raw = m[1]
    if (raw === "todos") segs.push({ t: "todos" })
    else {
      const n = Number(raw)
      if (Number.isInteger(n) && n > 0) segs.push({ t: "mencao", id: n })
      else segs.push({ t: "texto", v: m[0] }) // token malformado → texto cru
    }
    last = m.index + m[0].length
  }
  if (last < conteudo.length) segs.push({ t: "texto", v: conteudo.slice(last) })
  return segs
}

/** Uma escolha de menção feita no composer (o autocomplete registra estas). */
export interface MencaoPick {
  label: string // nome exibido, ex.: "Ana Souza" ou "todos"
  id: number | "todos"
}

/** Escapa os metacaracteres de regex num literal. */
function escRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Converte o rascunho do composer (que contém `@<label>` literais) nos tokens
 * canônicos. Para cada pick, substitui a 1ª ocorrência de `@<label>` por
 * `@[id]`/`@[todos]`, exigindo que NÃO seja seguido de outro caractere de palavra
 * (evita casar "@Ana" dentro de "@Anabelle"). Processa os labels mais LONGOS
 * primeiro (evita colisão de prefixo "Ana" × "Ana Souza"). Um pick cujo texto
 * foi apagado do rascunho é simplesmente ignorado (replace não casa → no-op).
 */
export function serializeMencoes(texto: string, picks: MencaoPick[]): string {
  let out = texto
  const ordenados = [...picks].sort((a, b) => b.label.length - a.label.length)
  for (const p of ordenados) {
    const re = new RegExp(`${escRe(`@${p.label}`)}(?![\\p{L}\\p{N}_])`, "u")
    out = out.replace(re, p.id === "todos" ? "@[todos]" : `@[${p.id}]`)
  }
  return out
}

/** Entrada do builder de destinatários (ids de User; `null`/≤0 são ignorados). */
export interface DestinatariosInput {
  responsavelId: number | null
  criadoPorId: number | null
  comentaristasAnteriores: number[]
  mencaoIds: number[]
  mencionouTodos: boolean
  autorId: number
}

/**
 * Conjunto de ids a notificar num novo comentário: os participantes (responsável
 * + criador + quem já comentou) SEMPRE + os mencionados; `@todos` expande p/ os
 * participantes (que já entram — hoje não adiciona ninguém, mas mantém-se correto
 * se a regra mudar). O AUTOR nunca é notificado. Dedup inerente (Set).
 */
export function destinatariosComentario(i: DestinatariosInput): number[] {
  const participantes = [i.responsavelId, i.criadoPorId, ...i.comentaristasAnteriores].filter(
    (x): x is number => typeof x === "number" && x > 0,
  )
  const set = new Set<number>(participantes)
  for (const id of i.mencaoIds) if (Number.isInteger(id) && id > 0) set.add(id)
  if (i.mencionouTodos) for (const p of participantes) set.add(p)
  set.delete(i.autorId)
  return [...set]
}
