// Acerto entre sócios — the PURE math, extracted from the query layer so it is
// unit-testable (no prisma). `getAcertoSocios` in queries.ts fetches the rows
// and delegates here.
//
// Model: (a) honorários: each paid honorário with a caso split generates a
// *direito* (entitlement) per sócio vs the *recebido* by the account that
// actually received it; (b) despesas: every saída paid from a sócio account is
// shared 50/50 (*cota* vs *pago*) UNLESS it names a `socioResponsavelId`, in
// which case the whole cota lands on that sócio; sócio↔sócio transfers settle
// the imbalance.
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
  /**
   * Despesa 100% deste sócio (pró-labore, anuidade da OAB, custa de um caso só
   * dele). Ausente/null = despesa do escritório, rateada 50/50 como sempre.
   */
  socioResponsavelId?: number | null
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
  // paid it covered the other's half, so the other owes them that half. A
  // despesa with `socioResponsavelId` is NOT shared — the whole cota goes to
  // that sócio (so when he is also the payer it nets to zero and the despesa
  // leaves the acerto, which is what pró-labore needs). A responsável that is
  // not one of the two active sócios falls back to the shared bucket, so money
  // never silently disappears from the acerto.
  let compartilhadoCents = 0
  for (const s of saidas) {
    const v = Math.abs(s.valorCents)
    const i = s.contaId != null ? idxById.get(s.contaId) : undefined
    if (i !== undefined) lados[i].pagoSaidaCents += v
    const r = s.socioResponsavelId != null ? idxById.get(s.socioResponsavelId) : undefined
    if (r !== undefined) lados[r].cotaSaidaCents += v
    else compartilhadoCents += v
  }
  const cotaB = Math.round(compartilhadoCents / 2)
  lados[1].cotaSaidaCents += cotaB
  lados[0].cotaSaidaCents += compartilhadoCents - cotaB

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

/**
 * Reparte a cota COMPARTILHADA entre as linhas que a compõem, de modo que a soma
 * feche EXATAMENTE no total agregado do acerto (método do maior resto).
 *
 * `computeAcertoSocios` arredonda a metade UMA vez, sobre a soma. Arredondar cada
 * linha isolada daria um total diferente por alguns centavos — e um relatório que
 * não fecha com o acerto não serve. Devolve a cota do sócio B (índice 1) por linha;
 * a do sócio A é `valor - cotaB`.
 */
export function repartirCotaCompartilhada(valores: number[], cotaTotalB: number): number[] {
  const cotas = valores.map((v) => Math.floor(Math.abs(v) / 2))
  let resto = cotaTotalB - cotas.reduce((a, b) => a + b, 0)
  // O floor tirou meio centavo exatamente das linhas de valor ímpar: são elas que
  // recebem o troco de volta, uma a uma, até o total fechar.
  for (let i = 0; i < valores.length && resto > 0; i++) {
    if (Math.abs(valores[i]) % 2 !== 0) {
      cotas[i] += 1
      resto -= 1
    }
  }
  if (resto !== 0 && cotas.length) cotas[0] += resto // rede de segurança: nunca perde centavo
  return cotas
}
