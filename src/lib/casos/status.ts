// Casos — status canônico. PURE (client-safe, sem prisma).
//
// O status do caso é texto livre por herança do Astrea ("Ativo", "Arquivado",
// "Encerrado"…) e o modal antigo gravava em minúsculas ("ativo"/"arquivado").
// Toda leitura passa por `casoStatusBucket` (tolerante a caixa/acento/sinônimo)
// e toda escrita nova grava o valor canônico ("Ativo" | "Suspenso" | "Arquivado")
// — o mesmo "Ativo" que o Financeiro (casos sem honorário) já procura.

export type CasoStatusBucket = "ativo" | "suspenso" | "arquivado"

export const CASO_STATUS_OPTS: { value: string; label: string; bucket: CasoStatusBucket }[] = [
  { value: "Ativo", label: "Ativo", bucket: "ativo" },
  { value: "Suspenso", label: "Suspenso", bucket: "suspenso" },
  { value: "Arquivado", label: "Arquivado / encerrado", bucket: "arquivado" },
]

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim()

/** Balde grosseiro de um status livre. Vazio/desconhecido = ativo. */
export function casoStatusBucket(status: string | null | undefined): CasoStatusBucket {
  const s = norm(status)
  if (/arquiv|encerr|baix|finaliz|conclu|extint/.test(s)) return "arquivado"
  if (s.includes("suspens")) return "suspenso"
  return "ativo"
}

/** Valor canônico a gravar para um status qualquer (entrada da UI/LexIA/lote). */
export function casoStatusCanonico(status: string | null | undefined): string {
  const b = casoStatusBucket(status)
  return CASO_STATUS_OPTS.find((o) => o.bucket === b)!.value
}

export function casoStatusLabel(status: string | null | undefined): string {
  const b = casoStatusBucket(status)
  return b === "arquivado" ? "Arquivado" : b === "suspenso" ? "Suspenso" : "Ativo"
}

export const CASO_TIPO_LABEL: Record<string, string> = { consultivo: "Consultivo", litigio: "Litígio" }

/** Papéis que podem criar/excluir casos (espelha /api/casos POST/DELETE; admin passa). */
export const PODE_CRIAR_CASO: readonly string[] = ["admin", "socio", "advogado"]

/** Abas da página do caso (/casos/[id]?tab=…). */
export type CasoTab = "honorarios" | "processos" | "tarefas" | "documentos" | "rateio" | "notas"
export const CASO_TABS: readonly CasoTab[] = ["honorarios", "processos", "tarefas", "documentos", "rateio", "notas"]
