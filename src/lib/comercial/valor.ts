// Pure: contracted value of WON leads for the acquisition metrics (ROAS/ROI/
// ticket). A "contrato" = a Caso (which bundles the fees), so a won lead is
// valued, in precedence order, by:
//   1. the REAL revenue booked to its caso — Honorário records + income
//      Lançamentos typed as honorário that aren't already mirrored by a
//      Honorário (so the office's manual "entrada" bookings count too, without
//      double-counting the Astrea entrada that mirrors an imported Honorário) —
//      credited ONCE per caso (to its latest-converted ganho lead) so two leads
//      → one caso don't double-count;
//   2. else the honorário linked to the lead itself;
//   3. else the lead's own estimate (valorEstimado) — the closed value the user
//      typed when a lead is won without any fee record (the quick-"ganho" flow).
// No I/O.
export interface LeadValorInput {
  id: number
  casoId: number | null
  conv: number // dataConversao timestamp (ms); 0 when unset
  honorarioCents: number // honorário linked to the lead itself; 0 when none
  casoRevenueCents: number // real revenue booked to the lead's caso; 0 when none
  estimadoCents: number // lead's own valorEstimado; final fallback
}

/** Map leadId → contracted value (centavos), deduped per caso. */
export function valorContratadoPorLead(ganhos: LeadValorInput[]): Map<number, number> {
  // Pick, per caso with real revenue, the ganho lead that carries its value
  // (latest conversion; ties → higher id for determinism).
  const owner = new Map<number, { id: number; conv: number }>()
  for (const l of ganhos) {
    if (l.casoId == null || l.casoRevenueCents <= 0) continue
    const cur = owner.get(l.casoId)
    if (!cur || l.conv > cur.conv || (l.conv === cur.conv && l.id > cur.id)) {
      owner.set(l.casoId, { id: l.id, conv: l.conv })
    }
  }
  const out = new Map<number, number>()
  for (const l of ganhos) {
    if (l.casoId != null && l.casoRevenueCents > 0) {
      out.set(l.id, owner.get(l.casoId)!.id === l.id ? l.casoRevenueCents : 0)
    } else if (l.honorarioCents > 0) {
      out.set(l.id, l.honorarioCents)
    } else {
      out.set(l.id, l.estimadoCents)
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
