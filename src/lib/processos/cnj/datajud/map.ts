// DataJud `_source` → AndamentoExterno[] (DTO da porta `ingerir`). Entram como
// Andamento (metadados/timeline). NÃO geram prazo — DataJud é defasado e não traz o
// teor das publicações. externalId determinístico para idempotência. PURE — testado
// em tests/datajud-map.test.ts.
import type { AndamentoExterno } from "../../types"
import type { DataJudSource } from "./types"

// Heurística simples p/ destacar movimentos que normalmente exigem atenção
// (NÃO cria prazo — só marca `relevante` para destaque no app).
const PALAVRAS_RELEVANTES = ["senten", "acórd", "acord", "pauta", "intima", "audiênc", "audienc", "decis", "despacho"]

function ehRelevante(nome: string): boolean {
  const n = nome.toLowerCase()
  return PALAVRAS_RELEVANTES.some((p) => n.includes(p))
}

/** ISO-Z (UTC) → "YYYY-MM-DD" (andamentos são date-only a jusante). */
function diaDe(dataHora: string | undefined): string | null {
  if (!dataHora) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataHora)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

export function movimentosParaAndamentos(source: DataJudSource): AndamentoExterno[] {
  const numeroCnj = (source.numeroProcesso ?? "").replace(/\D/g, "") || null
  const baseId = source.id ?? source.numeroProcesso ?? "datajud"
  const movs = source.movimentos ?? []
  const out: AndamentoExterno[] = []
  for (let i = 0; i < movs.length; i++) {
    const mov = movs[i]
    const data = diaDe(mov.dataHora)
    const descricao = (mov.nome ?? "").trim()
    if (!data || !descricao) continue
    out.push({
      numeroCnj,
      data,
      tipo: descricao,
      descricao,
      fonte: "datajud",
      relevante: ehRelevante(descricao),
      // inclui o índice: movimentos distintos podem compartilhar codigo+dataHora
      // (mesmo segundo) — sem o índice colapsariam no mesmo externalId e o `ingerir`
      // descartaria os demais. A ordem do DataJud é estável → idempotente entre rodadas.
      externalId: `${baseId}-mov-${i}-${mov.codigo ?? "x"}-${mov.dataHora ?? "x"}`,
    })
  }
  return out
}

/** Capa do DataJud → patch opcional do Processo (só campos não-vazios). */
export function capaParaPatch(source: DataJudSource): { classe?: string; assunto?: string; vara?: string } {
  const patch: { classe?: string; assunto?: string; vara?: string } = {}
  if (source.classe?.nome) patch.classe = source.classe.nome
  const assunto = source.assuntos?.find((a) => a.nome)?.nome
  if (assunto) patch.assunto = assunto
  if (source.orgaoJulgador?.nome) patch.vara = source.orgaoJulgador.nome
  return patch
}
