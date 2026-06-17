// Shared Astrea importer — called by the CLI seed (scripts/import-astrea.ts)
// and by the "Reimportar backup" route handler. Idempotent: every row is
// upserted by its Astrea "Código". SERVER ONLY (touches the filesystem + db).
import { existsSync } from "node:fs"
import { join } from "node:path"
import type { PrismaClient } from "@prisma/client"
import { readCsv, cleanNull, multi, firstMulti } from "./parse-csv"
import { parseBr, parseIso } from "./dates"
import { classifyComposicao, detectAnomalia } from "./classify"
import { toCents } from "../money"
import type { ImportSummary } from "../types"

const lc = (v: string | null | undefined) => (v ?? "").toLowerCase()
const yes = (v: string | null | undefined) => lc(v) === "sim"
const isAtivo = (v: string | null | undefined) => lc(v) === "ativo"

const mapClienteTipo = (v: string | null) => (lc(v).includes("jur") ? "pj" : "pf")
const mapClassificacao = (v: string | null) => (lc(v).includes("lead") ? "lead" : "cliente")
const mapCasoTipo = (v: string | null) => (lc(v).startsWith("proc") ? "litigio" : "consultivo")
const mapLancTipo = (v: string | null) => (lc(v).startsWith("sa") ? "saida" : "entrada")
const mapLancStatus = (v: string | null) => (lc(v) === "feito" ? "feito" : "aberto")

function mapSubTipo(v: string | null): string | null {
  const t = lc(v)
  if (!t) return null
  if (t.includes("honor")) return "honorario"
  if (t.includes("avuls")) return "avulsa"
  if (t.includes("inicial")) return "valor_inicial"
  return null
}
function mapHonStatus(v: string | null): string | null {
  const t = lc(v)
  if (t.includes("receb")) return "recebido"
  if (t.includes("lanc") || t.includes("lanç")) return "lancado"
  return null
}
function resolve(map: Map<string, number>, key: string | null): number | null {
  if (!key) return null
  return map.get(key) ?? null
}

export async function importAstrea(prisma: PrismaClient, dir: string): Promise<ImportSummary> {
  const csv = (name: string) => {
    const p = join(dir, name)
    if (!existsSync(p)) {
      console.warn(`! missing ${name} — skipping`)
      return [] as Record<string, string>[]
    }
    return readCsv(p)
  }

  // 0) Users (Código → display name) for resolving "Responsável".
  const userMap = new Map<string, string>()
  for (const r of csv("Usuário.csv")) {
    const id = cleanNull(r["Código"])
    const nome = cleanNull(r["Apelido"]) ?? cleanNull(r["Login"])
    if (id && nome) userMap.set(id, nome)
  }
  const user = (v: string | null) => (v ? userMap.get(v) ?? null : null)

  // 1) Categorias
  const catMap = new Map<string, number>()
  for (const r of csv("Categorias.csv")) {
    const astreaId = cleanNull(r["Código"])
    if (!astreaId) continue
    const data = {
      nome: cleanNull(r["Nome"]) ?? "Sem nome",
      cor: cleanNull(r["Cor"]),
      bloqueado: yes(r["Bloqueado"]),
      ativo: isAtivo(r["Status"]),
    }
    const row = await prisma.categoria.upsert({ where: { astreaId }, create: { astreaId, ...data }, update: data })
    catMap.set(astreaId, row.id)
  }

  // 2) Contas
  const contaMap = new Map<string, number>()
  for (const r of csv("Contas.csv")) {
    const astreaId = cleanNull(r["Código"])
    if (!astreaId) continue
    const data = {
      nome: cleanNull(r["Nome"]) ?? "Sem nome",
      tipo: cleanNull(r["Tipo"]),
      valorInicialCents: toCents(r["Valor inicial"]),
      dataInicio: parseBr(r["Data de início"]),
      agencia: cleanNull(r["Agência"]),
      numero: cleanNull(r["Conta"]),
      ativo: isAtivo(r["Status"]),
    }
    const row = await prisma.conta.upsert({ where: { astreaId }, create: { astreaId, ...data }, update: data })
    contaMap.set(astreaId, row.id)
  }

  // 3) Centros de custo
  const ccMap = new Map<string, number>()
  for (const r of csv("Centros de custo.csv")) {
    const astreaId = cleanNull(r["Código"])
    if (!astreaId) continue
    const data = { nome: cleanNull(r["Nome"]) ?? "Sem nome", ativo: isAtivo(r["Status"]) }
    const row = await prisma.centroCusto.upsert({ where: { astreaId }, create: { astreaId, ...data }, update: data })
    ccMap.set(astreaId, row.id)
  }

  // 4) Clientes (Contatos.csv)
  const clienteMap = new Map<string, number>()
  for (const r of csv("Contatos.csv")) {
    const astreaId = cleanNull(r["Código"])
    if (!astreaId) continue
    const data = {
      nome: cleanNull(r["Nome"]) ?? "Sem nome",
      apelido: cleanNull(r["Apelido"]),
      tipo: mapClienteTipo(cleanNull(r["Tipo do contato"])),
      classificacao: mapClassificacao(cleanNull(r["Classificação"])),
      cpfCnpj: cleanNull(r["CPF"]),
      simplesNacional: yes(r["Simples Nacional"]),
      logradouro: firstMulti(r["Ruas"]),
      numero: firstMulti(r["Números"]),
      complemento: firstMulti(r["Complementos"]),
      bairro: firstMulti(r["Bairros"]),
      cidade: firstMulti(r["Cidades"]),
      uf: firstMulti(r["Estados"]),
      cep: firstMulti(r["CEP"]),
      emails: multi(r["Endereços de email"]).join("; ") || null,
      telefones: multi(r["Número dos telefones"]).join("; ") || null,
    }
    const row = await prisma.cliente.upsert({ where: { astreaId }, create: { astreaId, ...data }, update: data })
    clienteMap.set(astreaId, row.id)
  }

  // 5) Casos (Processos.csv)
  const casoMap = new Map<string, number>()
  for (const r of csv("Processos.csv")) {
    const astreaId = cleanNull(r["Código"])
    if (!astreaId) continue
    const data = {
      titulo: cleanNull(r["Titulo"]) ?? "Sem título",
      tipo: mapCasoTipo(cleanNull(r["Tipo"])),
      status: cleanNull(r["Status"]),
      responsavel: user(cleanNull(r["Responsável"])),
      clientePrincipalId: resolve(clienteMap, firstMulti(r["Clientes"])),
      valorCausaCents: toCents(r["Valor"]),
      instancia: cleanNull(r["Instância"]),
      tipoAcao: cleanNull(r["Tipo de ação"]),
      tribunal: cleanNull(r["Tribunal"]),
      numeroProcesso: cleanNull(r["Número do processo"]),
      vara: cleanNull(r["Nome da Vara"]),
      dataDistribuicao: parseBr(r["Data de distribuição"]),
      dataCriacao: parseBr(r["Data de criação"]),
      ultimaMovimentacao: parseBr(r["Última movimentação"]),
    }
    const row = await prisma.caso.upsert({ where: { astreaId }, create: { astreaId, ...data }, update: data })
    casoMap.set(astreaId, row.id)
  }

  // 6) Lançamentos (Entradas.csv) — the livro-caixa core. ISO dates here.
  const lancMap = new Map<string, number>()
  const lancMeta = new Map<
    string,
    { clienteId: number | null; casoId: number | null; isRecorrente: boolean; parentAstreaId: string | null }
  >()
  for (const r of csv("Entradas.csv")) {
    const astreaId = cleanNull(r["Código"])
    if (!astreaId) continue
    const valorCents = toCents(r["Valores"])
    const valorOriginalCents = toCents(r["Valores Originais"])
    const subTipo = mapSubTipo(cleanNull(r["Sub-Tipo"]))
    const descricao = cleanNull(r["Descrições"])
    const entradaOriginalAstreaId = cleanNull(r["Entrada original (se recorrente)"])
    const isAnomalia = detectAnomalia({ subTipo, descricao, valorCents, valorOriginalCents })
    const clienteId = resolve(clienteMap, cleanNull(r["Cliente"]))
    const casoId = resolve(casoMap, cleanNull(r["Processo"]))
    const data = {
      tipo: mapLancTipo(cleanNull(r["Tipo"])),
      status: mapLancStatus(cleanNull(r["Status"])),
      subTipo,
      descricao,
      valorCents,
      valorOriginalCents,
      pagoPara: cleanNull(r["Pago para"]),
      responsavel: user(cleanNull(r["Responsável"])),
      dataLancamento: parseIso(r["Data de lançamento"]),
      dataVencimento: parseIso(r["Data de vencimento"]),
      dataPagamento: parseIso(r["Data de pagamento"]),
      vencimentoFatura: parseIso(r["Vencimento da fatura"]),
      entradaOriginalAstreaId,
      isAnomalia,
      contaId: resolve(contaMap, cleanNull(r["Conta"])),
      categoriaId: resolve(catMap, firstMulti(r["Categorias"])),
      centroCustoId: resolve(ccMap, firstMulti(r["Centros de custo"])),
      clienteId,
      casoId,
    }
    const row = await prisma.lancamento.upsert({ where: { astreaId }, create: { astreaId, ...data }, update: data })
    lancMap.set(astreaId, row.id)
    lancMeta.set(astreaId, {
      clienteId,
      casoId,
      isRecorrente: !!entradaOriginalAstreaId,
      parentAstreaId: entradaOriginalAstreaId,
    })
  }

  // 6b) 2nd pass: resolve recurring self-reference (parent must already exist).
  for (const [astreaId, dbId] of lancMap) {
    const parentAstrea = lancMeta.get(astreaId)?.parentAstreaId
    if (!parentAstrea) continue
    const parentId = lancMap.get(parentAstrea)
    if (!parentId || parentId === dbId) continue
    await prisma.lancamento.update({ where: { id: dbId }, data: { recorrenteParentId: parentId } })
  }

  // 7) Honorários — link to its Lançamento via the "Entrada" id; derive
  //    cliente/caso from that link; title-match Caso only as a fallback.
  for (const r of csv("Honorários.csv")) {
    const astreaId = cleanNull(r["Código"])
    if (!astreaId) continue
    const entradaAstreaId = cleanNull(r["Entrada"])
    const lancamentoId = resolve(lancMap, entradaAstreaId)
    const linkMeta = entradaAstreaId ? lancMeta.get(entradaAstreaId) : undefined
    const processoTitulo = cleanNull(r["Processo"])

    let clienteId = linkMeta?.clienteId ?? null
    let casoId = linkMeta?.casoId ?? null
    if (!casoId && processoTitulo) {
      const match = await prisma.caso.findFirst({
        where: { titulo: processoTitulo },
        select: { id: true, clientePrincipalId: true },
      })
      if (match) {
        casoId = match.id
        clienteId = clienteId ?? match.clientePrincipalId
      }
    }

    const descricao = cleanNull(r["Descrição"]) ?? "Honorário"
    const data = {
      descricao,
      dataVencimento: parseBr(r["Data de vencimento"]),
      valorCents: toCents(r["Valor"]),
      valorLiquidoCents: toCents(r["Valor líquido"]),
      status: mapHonStatus(cleanNull(r["Status"])),
      tipo: classifyComposicao({ descricao, isRecorrente: linkMeta?.isRecorrente ?? false }),
      pagamento: cleanNull(r["Pagamento"]),
      responsavel: user(cleanNull(r["Responsável"])),
      processoTitulo,
      entradaAstreaId,
      lancamentoId,
      casoId,
      clienteId,
    }
    await prisma.honorario.upsert({ where: { astreaId }, create: { astreaId, ...data }, update: data })
  }

  // ── final summary via DB counts (accurate after idempotent upserts) ─────────
  const [clientes, casos, honorarios, lancamentos, categorias, contas, centrosCusto, anomalias, casosSemFee] =
    await Promise.all([
      prisma.cliente.count(),
      prisma.caso.count(),
      prisma.honorario.count(),
      prisma.lancamento.count(),
      prisma.categoria.count(),
      prisma.conta.count(),
      prisma.centroCusto.count(),
      prisma.lancamento.count({ where: { isAnomalia: true } }),
      prisma.caso.count({ where: { status: "Ativo", honorarios: { none: {} } } }),
    ])
  return { clientes, casos, honorarios, lancamentos, categorias, contas, centrosCusto, anomalias, casosSemFee }
}
