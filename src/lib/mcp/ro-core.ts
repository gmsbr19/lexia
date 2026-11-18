// MCP — o papel SOMENTE-LEITURA do `sql_consultar` (DATABASE_URL_RO) e os
// comandos que o tiram das tabelas sensíveis. Núcleo PURO (sem prisma, sem
// env): "qual papel" e "qual DDL é emitida" viram objetos que o teste abre.
//
// Por que existe: `PREFIXOS_BLOQUEADOS` (./sql-core.ts) barra a consulta por
// NOME, e o app conecta no Postgres como superusuário — filtro de texto não é
// fronteira. A fronteira é um papel sem superusuário cujo SELECT foi revogado
// nessas tabelas. Mas o papel nasce com
// `ALTER DEFAULT PRIVILEGES … GRANT SELECT` (docs/whatsapp-operacao.md §6),
// então toda tabela sensível NOVA nasce legível por ele: é por isso que a
// revogação é reaplicada a cada boot (./ro.ts) em vez de rodar uma vez numa
// migração, que não alcançaria as tabelas criadas pelas migrações seguintes.

/** O nome documentado, usado quando a DATABASE_URL_RO não existe ainda. */
export const PAPEL_RO_PADRAO = "lexia_ro"

/**
 * O papel a desarmar: o usuário da DATABASE_URL_RO (é esse que o
 * `sql_consultar` usa de fato) ou, na falta dela, o nome documentado — o papel
 * pode já existir no banco antes de a variável ser setada, que é exatamente o
 * estado em que a revogação mais importa.
 */
export function papelRo(urlRo: string | undefined | null): string {
  const url = urlRo?.trim()
  if (!url) return PAPEL_RO_PADRAO
  try {
    const usuario = new URL(url).username
    return usuario ? decodeURIComponent(usuario) : PAPEL_RO_PADRAO
  } catch {
    return PAPEL_RO_PADRAO // URL malformada não vale um boot quebrado
  }
}

/** `whatsapp` → `whatsapp%`, para o ILIKE do `pg_tables`. */
export function padroesBloqueados(prefixos: readonly string[]): string[] {
  return prefixos.map((p) => `${p}%`)
}

/** Identificador entre aspas — a única forma segura de interpolar nome em DDL. */
export function ident(nome: string): string {
  return `"${nome.replace(/"/g, '""')}"`
}

/** REVOKE ALL (não só SELECT): o papel não tem o que fazer nessas tabelas. */
export function comandoRevogacao(papel: string, tabela: string): string {
  return `REVOKE ALL ON public.${ident(tabela)} FROM ${ident(papel)}`
}
