// Acerto entre sócios — the PURE math, extracted from the query layer so it is
// unit-testable (no prisma). `getAcertoSocios` in queries.ts fetches the rows
// and delegates here.
//
// Model: (a) honorários: each paid honorário with a caso split generates a
// *direito* (entitlement) per sócio vs the *recebido* by the account that
// actually received it; (b) despesas: every saída paid from a sócio account is
// shared 50/50 (*cota* vs *pago*); sócio↔sócio transfers settle the imbalance.
import type { AcertoSocioLado, AcertoSocios } from "./types"

export interface AcertoSocioConta {
  id: number
  nome: string
  titular: string | null
}

export interface AcertoHonoRow {
  valorCents: number
  contaId: number | null
  responsaveis: { contaId: number; percentual: number }[]
}

export interface AcertoSaidaRow {
  valorCents: number
  contaId: number | null
}

export interface AcertoTransferRow {
  valorCents: number
  contaOrigemId: number
}

export function emptyAcerto(lados: AcertoSocioLado[]): AcertoSocios {
  return {
    socios: lados,
    brutoCents: 0,
    transferidoCents: 0,
    valorCents: 0,
    devedorId: null,
    credorId: null,
    devedorNome: null,
    credorNome: null,
    quitado: true,
  }
}

export function computeAcertoSocios(
  socios: AcertoSocioConta[],
  honos: AcertoHonoRow[],
  saidas: AcertoSaidaRow[],
  transfers: AcertoTransferRow[],
): AcertoSocios {
  const lados: AcertoSocioLado[] = socios.map((s) => ({
    id: s.id,
    nome: s.titular ?? s.nome,
    direitoCents: 0,
    recebidoCents: 0,
    cotaSaidaCents: 0,
    pagoSaidaCents: 0,
  }))
  if (socios.length !== 2) return emptyAcerto(lados)
  const [A, B] = socios
  const idxById = new Map(socios.map((s, i) => [s.id, i]))

  for (const h of honos) {
    const resp = h.responsaveis
    const totalPct = resp.reduce((acc, r) => acc + r.percentual, 0)
    if (totalPct <= 0) continue // no split defined → not part of the acerto
    const valor = Math.abs(h.valorCents)
    for (const r of resp) {
      const i = idxById.get(r.contaId)
      if (i !== undefined) lados[i].direitoCents += Math.round((valor * r.percentual) / totalPct)
    }
    const ri = h.contaId != null ? idxById.get(h.contaId) : undefined
    if (ri !== undefined) lados[ri].recebidoCents += valor
  }

  // Every despesa (saída) paid from a sócio account is shared 50/50: whoever
  // paid it covered the other's half, so the other owes them that half.
  let totalSaida = 0
  for (const s of saidas) {
    const v = Math.abs(s.valorCents)
    totalSaida += v
    const i = s.contaId != null ? idxById.get(s.contaId) : undefined
    if (i !== undefined) lados[i].pagoSaidaCents += v
  }
  const cotaB = Math.round(totalSaida / 2)
  lados[1].cotaSaidaCents = cotaB
  lados[0].cotaSaidaCents = totalSaida - cotaB

  let transfBtoA = 0
  let transfAtoB = 0
  for (const t of transfers) {
    if (t.contaOrigemId === B.id) transfBtoA += t.valorCents
    else transfAtoB += t.valorCents
  }

  // B's net position before transfers = honorário excess + despesa shortfall.
  // (despesaB > 0 means B paid less than its 50% share → B owes A that much.)
  const excessB = lados[1].recebidoCents - lados[1].direitoCents
  const despesaB = lados[1].cotaSaidaCents - lados[1].pagoSaidaCents
  const preTransfer = excessB + despesaB
  const valorAcerto = Math.round(preTransfer - (transfBtoA - transfAtoB))
  const brutoCents = Math.abs(preTransfer)
  const transferidoCents = Math.abs(transfBtoA - transfAtoB)
  const valorCents = Math.abs(valorAcerto)
  const quitado = valorCents < 1
  const devedor = valorAcerto > 0 ? B : A
  const credor = valorAcerto > 0 ? A : B

  return {
    socios: lados,
    brutoCents,
    transferidoCents,
    valorCents: quitado ? 0 : valorCents,
    devedorId: quitado ? null : devedor.id,
    credorId: quitado ? null : credor.id,
    devedorNome: quitado ? null : devedor.titular ?? devedor.nome,
    credorNome: quitado ? null : credor.titular ?? credor.nome,
    quitado,
  }
}
