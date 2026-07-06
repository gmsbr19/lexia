// Pure decision logic for merging a duplicate Cliente into another. No I/O: the
// mutation (mutations.ts) re-points the FKs and deletes the duplicate; this only
// decides which fields to backfill onto the surviving cliente from the duplicate
// — only where the survivor's field is empty (never overwrites curated data).
export interface MergeClienteFields {
  apelido: string | null
  cpfCnpj: string | null
  emails: string | null
  telefones: string | null
  origem: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
}
export type ClienteMergePatch = Partial<MergeClienteFields>

const CAMPOS: (keyof MergeClienteFields)[] = [
  "apelido",
  "cpfCnpj",
  "emails",
  "telefones",
  "origem",
  "logradouro",
  "numero",
  "complemento",
  "bairro",
  "cidade",
  "uf",
  "cep",
]

/** Fields to set on the surviving cliente (`alvo`) taken from the duplicate
 *  (`origem`) — only where the survivor is empty. */
export function planejarMesclagemCliente(alvo: MergeClienteFields, duplicado: MergeClienteFields): ClienteMergePatch {
  const patch: ClienteMergePatch = {}
  for (const campo of CAMPOS) {
    const atual = alvo[campo]?.trim()
    const vindo = duplicado[campo]?.trim()
    if (!atual && vindo) patch[campo] = vindo
  }
  return patch
}
