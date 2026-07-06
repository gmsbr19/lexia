// Pure decision logic for "mesclar lead com cliente" — merging a Lead into an
// ALREADY-REGISTERED Cliente (e.g. the same person was a client before also
// showing up as a lead in a later Genions import). No I/O: the mutation layer
// (mutations.ts) reads/writes; this only decides which Cliente contact fields
// to backfill from the lead being merged in.
export interface MergeLeadContato {
  email: string | null
  telefone: string | null
  origem: string | null
}
export interface MergeClienteContato {
  emails: string | null
  telefones: string | null
  origem: string | null
}
export interface ClienteContatoPatch {
  emails?: string
  telefones?: string
  origem?: string
}

/** Never overwrites a Cliente field that already has a value — only fills
 *  gaps left empty — so merging can't clobber data already curated on the
 *  client record. origem follows the same rule: the lead's origem fills the
 *  client's only when the client has none. */
export function planejarBackfillCliente(lead: MergeLeadContato, cliente: MergeClienteContato): ClienteContatoPatch {
  const patch: ClienteContatoPatch = {}
  const email = lead.email?.trim()
  const telefone = lead.telefone?.trim()
  const origem = lead.origem?.trim()
  if (email && !cliente.emails?.trim()) patch.emails = email
  if (telefone && !cliente.telefones?.trim()) patch.telefones = telefone
  if (origem && !cliente.origem?.trim()) patch.origem = origem
  return patch
}
