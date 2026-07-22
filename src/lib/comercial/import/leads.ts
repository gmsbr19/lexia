// Genions → Lexia lead importer. Reads the Genions "Relatório de atendimentos"
// CSV export (one row per WhatsApp atendimento/conversation) and upserts each as
// a Lead, idempotent by Protocolo. Resilient to header variations (tries several
// aliases) and maps Genions' Situação/Classificação onto our funnel etapa.
// SERVER ONLY (fs + db).
//
// Genions export columns (28): Protocolo, Quem iniciou, Contato/Nome,
// Contato/Telefone, Contato/Instagram, Contato/Tags, Usuário/Nome, Canal/Chave,
// Canal/Plataforma, Equipe, Data criação, Data início atendimento,
// Data primeira resposta, Data última interação, Data conclusão, Tempo de espera,
// Tempo de atendimento, Situação, Classificação, Classificação/Descrição,
// Classificação/Valor, UTM/Origem, UTM/Campanha, UTM/Título, UTM/Conteudo,
// UTM/UrlReferencia, Endereço conversa, Concluído automaticamente.
import type { PrismaClient } from "@prisma/client"
import { cleanNull, parseCsvText, readCsv } from "@/lib/finance/import/parse-csv"
import { parseBr, parseIso } from "@/lib/finance/import/dates"
import { toCents } from "@/lib/finance/money"
import { resolverOuCriarCliente } from "../contato"
import type { LeadEtapa, LeadOrigem, Plataforma } from "../types"

export interface LeadImportSummary {
  total: number
  novos: number
  atualizados: number
  campanhasCriadas: number
  clientesCriados: number
  porEtapa: Record<string, number>
}

const lc = (v: string | null | undefined) => (v ?? "").toLowerCase()

/** First non-null value among candidate header names (case/space tolerant). */
function pick(row: Record<string, string>, candidates: string[]): string | null {
  const wanted = candidates.map((c) => c.toLowerCase())
  for (const key of Object.keys(row)) {
    if (wanted.includes(key.trim().toLowerCase())) {
      const v = cleanNull(row[key])
      if (v) return v
    }
  }
  return null
}

function parseAnyDate(v: string | null): Date | null {
  if (!v) return null
  return /^\d{4}-\d{2}-\d{2}/.test(v) ? parseIso(v) : parseBr(v)
}

// Origem from UTM/Origem (INSTAGRAM/FACEBOOK = Meta placements) + Contato/Tags
// (which encode the paid source, e.g. "META, USUCAPIÃO" / "GOOGLE, ...").
function detectOrigem(utmOrigem: string | null, tags: string | null): LeadOrigem {
  const u = lc(utmOrigem)
  const t = lc(tags)
  if (u.includes("google") || t.includes("google") || u.includes("adwords")) return "google_ads"
  if (u.includes("insta") || u.includes("face") || u.includes("meta") || u.includes("fb") || t.includes("meta")) return "meta_ads"
  if (t.includes("indica") || u.includes("indica")) return "indicacao"
  if (!u && !t) return "outro"
  return "outro"
}

function origemToPlataforma(o: LeadOrigem): Plataforma {
  return o === "google_ads" ? "google_ads" : o === "meta_ads" ? "meta_ads" : "outro"
}

// Funnel etapa from Genions' outcome (Classificação) + conversation lifecycle
// (Situação). Classificação is authoritative for win/loss; otherwise the
// atendimento status tells us whether the lead has been engaged.
function detectEtapa(situacao: string | null, classificacao: string | null): LeadEtapa {
  const c = lc(classificacao)
  const s = lc(situacao)
  if (c.includes("ganho") || c.includes("atingido") || c.includes("convert")) return "ganho"
  if (c.includes("perdido")) return "perdido"
  if (s.includes("andamento")) return "contato"
  if (s.includes("conclu")) return "contato" // conversation concluded, no win/loss recorded
  return "novo" // "Pendente" / "Não iniciado" / unknown
}

/** Import from a CSV file path (CLI seed). */
export async function importLeadsFromCsv(prisma: PrismaClient, csvPath: string): Promise<LeadImportSummary> {
  return importLeadRows(prisma, readCsv(csvPath))
}

/** Import from raw CSV text (in-app upload route). */
export async function importLeadsFromText(prisma: PrismaClient, csvText: string): Promise<LeadImportSummary> {
  return importLeadRows(prisma, parseCsvText(csvText))
}

async function importLeadRows(prisma: PrismaClient, rows: Record<string, string>[]): Promise<LeadImportSummary> {
  const summary: LeadImportSummary = { total: 0, novos: 0, atualizados: 0, campanhasCriadas: 0, clientesCriados: 0, porEtapa: {} }
  const campanhaCache = new Map<string, number>() // `${plataforma}::${nome}` → id

  async function resolveCampanha(nome: string | null, plataforma: Plataforma): Promise<number | null> {
    if (!nome) return null
    const key = `${plataforma}::${nome}`
    const cached = campanhaCache.get(key)
    if (cached) return cached
    const existing = await prisma.campanha.findUnique({
      where: { plataforma_nome: { plataforma, nome } },
      select: { id: true },
    })
    if (existing) {
      campanhaCache.set(key, existing.id)
      return existing.id
    }
    const created = await prisma.campanha.create({ data: { plataforma, nome, status: "ativa", ativo: true } })
    campanhaCache.set(key, created.id)
    summary.campanhasCriadas += 1
    return created.id
  }

  for (const row of rows) {
    const nome = pick(row, ["Contato/Nome", "Contato Nome", "Nome", "Lead", "Contato"])
    if (!nome) continue // skip empty rows

    const protocolo = pick(row, ["Protocolo", "Código", "Codigo", "ID", "Id"])
    const telefone = pick(row, ["Contato/Telefone", "Telefone", "Celular", "WhatsApp", "Fone"])
    const tags = pick(row, ["Contato/Tags", "Tags"])
    const utmOrigem = pick(row, ["UTM/Origem", "Origem", "Fonte", "Canal", "Source"])
    const campanhaNome = pick(row, ["UTM/Campanha", "Campanha", "Campaign"])
    const situacao = pick(row, ["Situação", "Situacao", "Status"])
    const classificacao = pick(row, ["Classificação", "Classificacao", "Resultado", "Etapa", "Estágio"])
    const classifDesc = pick(row, ["Classificação/Descrição", "Classificacao/Descricao", "Motivo"])
    const valor = toCents(pick(row, ["Classificação/Valor", "Classificacao/Valor", "Valor", "Valor estimado"]))
    const usuario = pick(row, ["Usuário/Nome", "Usuario/Nome", "Responsável", "Responsavel", "Atendente"])
    const dataEntrada = parseAnyDate(pick(row, ["Data criação", "Data criacao", "Data de criação", "Data", "Criado em"])) ?? new Date()
    const dataConclusao = parseAnyDate(pick(row, ["Data conclusão", "Data conclusao", "Data de fechamento", "Concluído em"]))

    const origem = detectOrigem(utmOrigem, tags)
    const etapa = detectEtapa(situacao, classificacao)
    const campanhaId = await resolveCampanha(campanhaNome, origemToPlataforma(origem))

    const genionsId = protocolo
      ? `genions-${protocolo}`
      : `genions-nome:${lc(nome)}:${dataEntrada.toISOString().slice(0, 10)}`

    const obs = [tags && `tags: ${tags}`, situacao && `situação: ${situacao}`, classifDesc, usuario && `atendente: ${usuario}`]
      .filter(Boolean)
      .join(" · ")

    // Genions carries no e-mail column — telefone (digits-only) is the dedup
    // key. NEVER re-resolve an already-linked lead (preserves a link set by
    // converterLead/mesclarLeadComCliente on a re-import of the same Protocolo).
    const existing = await prisma.lead.findUnique({ where: { genionsId }, select: { id: true, clienteId: true } })
    let clienteId = existing?.clienteId ?? null
    if (!clienteId) {
      const resolved = await resolverOuCriarCliente(prisma, { nome, email: null, telefone, origem })
      clienteId = resolved.id
      if (resolved.criado) summary.clientesCriados += 1
    }

    const data = {
      nome,
      telefone,
      origem,
      campanhaId,
      etapa,
      valorEstimadoCents: valor > 0 ? valor : null,
      dataEntrada,
      dataConversao: etapa === "ganho" ? dataConclusao ?? dataEntrada : null,
      motivoPerda: etapa === "perdido" ? classifDesc ?? classificacao : null,
      observacoes: obs || null,
      clienteId,
    }

    await prisma.lead.upsert({ where: { genionsId }, create: { genionsId, ...data }, update: data })

    summary.total += 1
    if (existing) summary.atualizados += 1
    else summary.novos += 1
    summary.porEtapa[etapa] = (summary.porEtapa[etapa] ?? 0) + 1
  }

  return summary
}
