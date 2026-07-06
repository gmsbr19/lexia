// Pure: contracted value of WON leads for the acquisition metrics (ROAS/ROI/
// ticket). A "contrato" = a Caso (which bundles the honorários), so a won lead
// is valued by the REAL honorários of its linked caso — the money actually
// recorded — credited ONCE per caso (to its most-recently-converted ganho lead)
// so two leads → one caso don't double-count. Leads without caso fees fall back
// to the honorário linked to the lead itself. No estimate fallback: only real
// fees count as contracted value. No I/O.
export interface LeadValorInput {
  id: number
  casoId: number | null
  conv: number // dataConversao timestamp (ms); 0 when unset
  honorarioCents: number // honorário linked to the lead itself; 0 when none
  casoHonorariosCents: number // Σ honorários of the lead's caso; 0 when none
}

/** Map leadId → contracted value (centavos), deduped per caso. */
export function valorContratadoPorLead(ganhos: LeadValorInput[]): Map<number, number> {
  // Pick, per caso with fees, the ganho lead that carries its value (latest
  // conversion; ties → higher id for determinism).
  const owner = new Map<number, { id: number; conv: number }>()
  for (const l of ganhos) {
    if (l.casoId == null || l.casoHonorariosCents <= 0) continue
    const cur = owner.get(l.casoId)
    if (!cur || l.conv > cur.conv || (l.conv === cur.conv && l.id > cur.id)) {
      owner.set(l.casoId, { id: l.id, conv: l.conv })
    }
  }
  const out = new Map<number, number>()
  for (const l of ganhos) {
    if (l.casoId != null && l.casoHonorariosCents > 0) {
      out.set(l.id, owner.get(l.casoId)!.id === l.id ? l.casoHonorariosCents : 0)
    } else {
      out.set(l.id, l.honorarioCents)
    }
  }
  return out
}

/** Total contracted value across the given won leads (deduped per caso). */
export function somaValorContratado(ganhos: LeadValorInput[]): number {
  let total = 0
  for (const v of valorContratadoPorLead(ganhos).values()) total += v
  return total
}
