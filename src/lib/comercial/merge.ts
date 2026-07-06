// Pure decision logic for "mesclar lead com cliente" — merging a Lead into an
// ALREADY-REGISTERED Cliente (e.g. the same person was a client before also
// showing up as a lead in a later Genions import). No I/O: the mutation layer
// (mutations.ts) reads/writes; this only decides which Cliente contact fields
// to backfill from the lead being merged in.
export interface MergeLeadContato {
  email: string | null
  telefone: string | null
}
export interface MergeClienteContato {
  emails: string | null
  telefones: string | null
}
export interface ClienteContatoPatch {
  emails?: string
  telefones?: string
}

/** Never overwrites a Cliente field that already has a value — only fills
 *  gaps left empty — so merging can't clobber data already curated on the
 *  client record. */
export function planejarBackfillCliente(lead: MergeLeadContato, cliente: MergeClienteContato): ClienteContatoPatch {
  const patch: ClienteContatoPatch = {}
  const email = lead.email?.trim()
  const telefone = lead.telefone?.trim()
  if (email && !cliente.emails?.trim()) patch.emails = email
  if (telefone && !cliente.telefones?.trim()) patch.telefones = telefone
  return patch
}
