// Acerto entre sócios, DETALHADO — os mesmos totais de `computeAcertoSocios`
// acompanhados das linhas que os produziram e do que ficou de FORA, com o motivo.
//
// Por que existe: o relatório do repasse precisa ser auditável ("de onde veio
// esse número?") sem ninguém refazer a conta à mão num SQL. Então o detalhamento
// NÃO recalcula nada por conta própria: ele classifica as linhas, manda as que
// contam para `computeAcertoSocios` e reparte as cotas de modo que a soma das
// linhas feche EXATAMENTE nos totais (ver `repartirCotaCompartilhada`).
//
// Puro: nada de prisma aqui. Quem busca as linhas é `getAcertoSociosDetalhado`.
import { computeAcertoSocios, emptyAcerto, repartirCotaCompartilhada, type AcertoSocioConta } from "./acerto"
import type {
  AcertoDespesaLinha,
  AcertoEntradaLinha,
  AcertoIgnorado,
  AcertoParte,
  AcertoSociosDetalhado,
  TransferenciaRow,
} from "./types"

/** Teto de linhas devolvidas por lista (os TOTAIS são sempre do conjunto inteiro). */
export const MAX_LINHAS_ACERTO = 200

export interface DetalheEntradaFonte {
  id: number
  data: string | null // YYYY-MM-DD do pagamento
  descricao: string | null
  valorCents: number
  contaId: number | null
  conta: string | null
  isAnomalia: boolean
  casoId: number | null
  caso: string | null
  cliente: string | null
  responsaveis: { contaId: number; percentual: number }[]
}

export interface DetalheSaidaFonte {
  id: number
  data: string | null
  descricao: string | null
  valorCents: number
  contaId: number | null
  conta: string | null
  isAnomalia: boolean
  categoria: string | null
  socioResponsavelId: number | null
}

export interface DetalheTransferenciaFonte extends TransferenciaRow {
  contaOrigemId: number
}

export interface DetalharAcertoArgs {
  socios: AcertoSocioConta[]
  entradas: DetalheEntradaFonte[]
  saidas: DetalheSaidaFonte[]
  transferencias: DetalheTransferenciaFonte[]
  faixa: { de: string | null; ate: string | null }
}

const porDataDesc = <T extends { data: string | null }>(a: T, b: T) => (b.data ?? "").localeCompare(a.data ?? "")

export function detalharAcertoSocios(args: DetalharAcertoArgs): AcertoSociosDetalhado {
  const { socios, faixa } = args
  const lados = socios.map((s) => ({
    id: s.id,
    nome: s.titular ?? s.nome,
    direitoCents: 0,
    recebidoCents: 0,
    cotaSaidaCents: 0,
    pagoSaidaCents: 0,
  }))
  const vazio = {
    faixa,
    entradas: [] as AcertoEntradaLinha[],
    despesas: [] as AcertoDespesaLinha[],
    transferencias: [] as TransferenciaRow[],
    ignorados: [] as AcertoIgnorado[],
    contagens: { entradas: 0, despesas: 0, transferencias: 0, ignorados: 0 },
    truncado: false,
  }
  // Fora de "exatamente 2 sócios" o acerto não existe (nem no cálculo original).
  if (socios.length !== 2) return { ...emptyAcerto(lados), ...vazio }

  const idSocios = new Set(socios.map((s) => s.id))
  const nomeDe = (id: number | null | undefined) =>
    id == null ? null : (socios.find((s) => s.id === id)?.titular ?? socios.find((s) => s.id === id)?.nome ?? `Conta #${id}`)

  const ignorados: AcertoIgnorado[] = []
  const ignora = (
    tipo: "entrada" | "saida",
    r: { id: number; data: string | null; descricao: string | null; valorCents: number },
    motivo: AcertoIgnorado["motivo"],
    detalhe: string,
  ) => {
    ignorados.push({ id: r.id, tipo, data: r.data, descricao: r.descricao, valorCents: Math.abs(r.valorCents), motivo, detalhe })
  }

  // ── entradas: honorário recebido numa conta de sócio, num caso com rateio ──
  const entradas: AcertoEntradaLinha[] = []
  for (const e of args.entradas) {
    if (e.isAnomalia) {
      ignora("entrada", e, "anomalia", "Marcada como anomalia (movimento de saldo): fica fora de todos os relatórios financeiros.")
      continue
    }
    if (e.contaId == null) {
      ignora("entrada", e, "sem_conta", "Sem conta informada — não se sabe em qual conta o dinheiro entrou. Informe a conta com editar_lancamento.")
      continue
    }
    if (!idSocios.has(e.contaId)) {
      ignora("entrada", e, "conta_nao_socio", `Entrou na conta "${e.conta ?? `#${e.contaId}`}", que não é de sócio: o acerto só olha o que passa pelas contas dos sócios.`)
      continue
    }
    if (e.casoId == null) {
      ignora("entrada", e, "sem_caso", "Sem caso vinculado — sem caso não há rateio. Vincule o caso com editar_lancamento.")
      continue
    }
    const totalPct = e.responsaveis.reduce((a, r) => a + r.percentual, 0)
    if (totalPct <= 0) {
      ignora("entrada", e, "sem_rateio", `O caso "${e.caso ?? `#${e.casoId}`}" não tem rateio definido. Defina com definir_rateio.`)
      continue
    }
    const valor = Math.abs(e.valorCents)
    // MESMA fórmula de computeAcertoSocios, para as partes somarem o direito dele.
    const partes: AcertoParte[] = e.responsaveis.map((r) => ({
      contaId: r.contaId,
      nome: nomeDe(r.contaId) ?? `Conta #${r.contaId}`,
      percentual: r.percentual,
      valorCents: Math.round((valor * r.percentual) / totalPct),
    }))
    entradas.push({
      id: e.id,
      data: e.data,
      descricao: e.descricao,
      casoId: e.casoId,
      caso: e.caso,
      cliente: e.cliente,
      contaRecebeuId: e.contaId,
      contaRecebeu: e.conta,
      valorCents: valor,
      partes,
    })
  }

  // ── despesas: saída paga de uma conta de sócio ──
  const contam: DetalheSaidaFonte[] = []
  for (const s of args.saidas) {
    if (s.isAnomalia) {
      ignora("saida", s, "anomalia", "Marcada como anomalia (movimento de saldo, ex.: repasse): fica fora de todos os relatórios financeiros.")
      continue
    }
    if (s.contaId == null) {
      ignora("saida", s, "sem_conta", "Sem conta informada — não se sabe de qual conta saiu. Informe a conta com editar_lancamento.")
      continue
    }
    if (!idSocios.has(s.contaId)) {
      ignora("saida", s, "conta_nao_socio", `Paga pela conta "${s.conta ?? `#${s.contaId}`}", que não é de sócio: o acerto só divide o que um sócio pagou do próprio bolso.`)
      continue
    }
    contam.push(s)
  }

  // A cota compartilhada é arredondada UMA vez sobre a soma (igual ao cálculo
  // original); aqui ela é repartida pelas linhas sem perder centavo.
  const compartilhadas = contam.filter((s) => s.socioResponsavelId == null || !idSocios.has(s.socioResponsavelId))
  const valoresCompart = compartilhadas.map((s) => Math.abs(s.valorCents))
  const cotaTotalB = Math.round(valoresCompart.reduce((a, b) => a + b, 0) / 2)
  const cotasB = repartirCotaCompartilhada(valoresCompart, cotaTotalB)
  const cotaBPorId = new Map(compartilhadas.map((s, i) => [s.id, cotasB[i]]))
  const [A, B] = socios

  const despesas: AcertoDespesaLinha[] = contam.map((s) => {
    const valor = Math.abs(s.valorCents)
    const respId = s.socioResponsavelId != null && idSocios.has(s.socioResponsavelId) ? s.socioResponsavelId : null
    const parte = (conta: AcertoSocioConta, valorCents: number): AcertoParte => ({
      contaId: conta.id,
      nome: conta.titular ?? conta.nome,
      percentual: valor > 0 ? Math.round((valorCents / valor) * 100) : 0,
      valorCents,
    })
    // Com responsável, a cota INTEIRA é dele; sem, vale a metade repartida.
    const cotaB = respId != null ? (respId === B.id ? valor : 0) : (cotaBPorId.get(s.id) ?? 0)
    return {
      id: s.id,
      data: s.data,
      descricao: s.descricao,
      categoria: s.categoria,
      contaId: s.contaId,
      conta: s.conta,
      valorCents: valor,
      responsavelId: respId,
      responsavel: nomeDe(respId),
      cotas: [parte(A, valor - cotaB), parte(B, cotaB)],
    }
  })

  const totais = computeAcertoSocios(
    socios,
    entradas.map((e) => ({
      valorCents: e.valorCents,
      contaId: e.contaRecebeuId,
      responsaveis: e.partes.map((p) => ({ contaId: p.contaId, percentual: p.percentual })),
    })),
    contam.map((s) => ({ valorCents: s.valorCents, contaId: s.contaId, socioResponsavelId: s.socioResponsavelId })),
    args.transferencias.map((t) => ({ valorCents: t.valorCents, contaOrigemId: t.contaOrigemId })),
  )

  entradas.sort(porDataDesc)
  despesas.sort(porDataDesc)
  ignorados.sort((a, b) => b.valorCents - a.valorCents) // o maior problema primeiro
  const contagens = {
    entradas: entradas.length,
    despesas: despesas.length,
    transferencias: args.transferencias.length,
    ignorados: ignorados.length,
  }
  const truncado =
    contagens.entradas > MAX_LINHAS_ACERTO ||
    contagens.despesas > MAX_LINHAS_ACERTO ||
    contagens.transferencias > MAX_LINHAS_ACERTO ||
    contagens.ignorados > MAX_LINHAS_ACERTO

  return {
    ...totais,
    faixa,
    entradas: entradas.slice(0, MAX_LINHAS_ACERTO),
    despesas: despesas.slice(0, MAX_LINHAS_ACERTO),
    transferencias: args.transferencias
      .slice(0, MAX_LINHAS_ACERTO)
      .map(({ id, valorCents, data, descricao, contaOrigem, contaDestino }) => ({ id, valorCents, data, descricao, contaOrigem, contaDestino })),
    ignorados: ignorados.slice(0, MAX_LINHAS_ACERTO),
    contagens,
    truncado,
  }
}
