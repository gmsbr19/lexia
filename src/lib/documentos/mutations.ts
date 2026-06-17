// Documentos — write layer. SERVER ONLY.
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { createCliente } from "@/lib/clientes/mutations"
import { createHonorario, criarLancamentos } from "@/lib/finance/mutations"
import { notificarDocumento } from "@/lib/notificacoes/triggers"
import { contratanteToCadastro, contratoClienteNome, honorariosToPlano } from "@/lib/documents/contrato-finance"
import type { ContratoHonorariosData } from "@/lib/types/contrato-honorarios"
import { DOCUMENTO_STATUS, type DocumentoStatus } from "./types"

function reqStr(v: unknown, name: string): string {
  if (typeof v !== "string" || !v.trim()) throw new UserError(`${name} obrigatório`)
  return v.trim()
}
function optId(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}
function validStatus(v: unknown): DocumentoStatus {
  return (typeof v === "string" && (DOCUMENTO_STATUS as readonly string[]).includes(v)
    ? v
    : "rascunho") as DocumentoStatus
}
function serializePayload(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = JSON.stringify(v)
  if (s.length > 200_000) throw new UserError("Documento grande demais para salvar")
  return s
}

export interface DocumentoCreate {
  nome: string
  template: string
  formato?: string | null // 'docx' | 'pdf'
  status?: string
  payload?: unknown
  clienteId?: number | null
  casoId?: number | null
  criadoPor?: string | null
}

export async function createDocumento(input: DocumentoCreate) {
  return prisma.documento.create({
    data: {
      nome: reqStr(input.nome, "nome"),
      template: reqStr(input.template, "modelo"),
      formato: input.formato === "docx" || input.formato === "pdf" ? input.formato : null,
      status: validStatus(input.status),
      payload: serializePayload(input.payload),
      clienteId: optId(input.clienteId),
      casoId: optId(input.casoId),
      criadoPor: typeof input.criadoPor === "string" ? input.criadoPor : null,
    },
  })
}

export interface DocumentoPatch {
  nome?: string
  formato?: string | null
  status?: string
  payload?: unknown
  clienteId?: number | null
  casoId?: number | null
}

export async function updateDocumento(id: number, patch: DocumentoPatch) {
  const data: Prisma.DocumentoUncheckedUpdateInput = {}
  if (patch.nome !== undefined) data.nome = reqStr(patch.nome, "nome")
  if (patch.formato !== undefined)
    data.formato = patch.formato === "docx" || patch.formato === "pdf" ? patch.formato : null
  if (patch.status !== undefined) data.status = validStatus(patch.status)
  if (patch.payload !== undefined) data.payload = serializePayload(patch.payload)
  if (patch.clienteId !== undefined) data.clienteId = optId(patch.clienteId)
  if (patch.casoId !== undefined) data.casoId = optId(patch.casoId)
  return prisma.documento.update({ where: { id }, data })
}

export async function deleteDocumento(id: number) {
  await prisma.documento.delete({ where: { id } })
  return { id }
}

/** Move a documento to 'enviado' (sent for signature). Only from finalizado. */
export async function enviarParaAssinatura(id: number, actorEmail?: string | null) {
  const doc = await prisma.documento.findUnique({ where: { id }, select: { id: true, status: true, nome: true, criadoPor: true } })
  if (!doc) throw new UserError("Documento não encontrado")
  if (doc.status === "fechado") throw new UserError("Contrato já fechado")
  // Já enviado → no-op (não re-notifica). A notificação só dispara na transição.
  if (doc.status === "enviado") return doc
  const updated = await prisma.documento.update({ where: { id }, data: { status: "enviado" } })
  void notificarDocumento({ documentoId: id, nome: doc.nome, status: "enviado", criadoPor: doc.criadoPor, actorEmail })
  return updated
}

export interface FecharContratoResult {
  documentoId: number
  clienteId: number | null
  clienteCriado: boolean
  honorarioId: number | null
  lancamentoIds: number[]
  totalCents: number
  exito: boolean
  jaFechado?: boolean
}

const todayISO = () => new Date().toISOString().slice(0, 10)

/**
 * Close a "Contrato de Honorários": fan the contract's honorários clause into
 * the finance ledger (one "a receber" Lançamento per installment) + a Honorário
 * summary line for /contratos, resolving (or creating) the cliente from the
 * primary contratante. Idempotent: a document already 'fechado' is a no-op.
 */
export async function fecharContrato(id: number, actorEmail?: string | null): Promise<FecharContratoResult> {
  const doc = await prisma.documento.findUnique({
    where: { id },
    select: { id: true, nome: true, template: true, status: true, payload: true, clienteId: true, casoId: true, criadoPor: true, caso: { select: { titulo: true } } },
  })
  if (!doc) throw new UserError("Documento não encontrado")
  if (doc.template !== "contrato-honorarios" && doc.template !== "contrato-prestacao-servicos")
    throw new UserError("Apenas contratos de honorários podem ser fechados")
  if (doc.status === "fechado")
    return { documentoId: id, clienteId: doc.clienteId, clienteCriado: false, honorarioId: null, lancamentoIds: [], totalCents: 0, exito: false, jaFechado: true }

  let data: ContratoHonorariosData
  try {
    data = JSON.parse(doc.payload ?? "")
  } catch {
    throw new UserError("Contrato sem dados de honorários para lançar")
  }
  if (!data?.honorarios) throw new UserError("Contrato sem cláusula de honorários")

  const plano = honorariosToPlano(data.honorarios)
  if (plano.parcelas.length === 0 && !plano.exito)
    throw new UserError("Defina os honorários (valor e vencimento) antes de fechar o contrato")

  // ── resolve / create the cliente from the primary contratante ──
  let clienteId = doc.clienteId
  let clienteCriado = false
  const nome = contratoClienteNome(data)
  if (!clienteId && nome) {
    const existing = await prisma.cliente.findFirst({ where: { nome }, select: { id: true } })
    if (existing) {
      clienteId = existing.id
    } else {
      const cad = contratanteToCadastro(data.contratantes[0])
      const created = await createCliente({
        nome: cad.nome,
        tipo: cad.tipo,
        classificacao: "cliente",
        cpfCnpj: cad.cpfCnpj,
        logradouro: cad.logradouro,
        emails: cad.emails,
      })
      clienteId = created.id
      clienteCriado = true
    }
  }
  const casoTitulo = doc.caso?.titulo ?? null

  // ── finance: one Lançamento série per fixed installment group ──
  const lancamentoIds: number[] = []
  for (let i = 0; i < plano.parcelas.length; i++) {
    const p = plano.parcelas[i]
    const label = plano.parcelas.length > 1 ? `${doc.nome} (${i + 1})` : doc.nome
    // Installments ("mensal" here = a fixed N-parcela plan) go in as a
    // 'parcelado' série so criarLancamentos links them and labels "parcela N/M".
    // Integer cents × vezes ÷ vezes round-trips exactly (no rounding drift).
    const parcelado = p.modo === "mensal" && p.vezes > 1
    const res = await criarLancamentos({
      dir: "in",
      desc: `Honorários — ${label}`,
      valorCents: parcelado ? p.valorCents * p.vezes : p.valorCents,
      venc: p.vencISO ?? todayISO(),
      party: nome ?? undefined,
      caso: casoTitulo ?? undefined,
      pago: false,
      modo: parcelado ? "parcelado" : "unica",
      vezes: p.vezes,
      requestId: `contrato-${id}-p${i}`,
    })
    lancamentoIds.push(...res.ids)
  }

  // ── /contratos: a Honorário summary line for the contract ──
  let honorarioId: number | null = null
  if (plano.totalCents > 0) {
    const hon = await createHonorario({
      descricao: doc.nome,
      valorCents: plano.totalCents,
      dataVencimento: plano.parcelas[0]?.vencISO ?? null,
      tipo: data.honorarios.tipo.includes("parcel") ? "parcelado" : "avista",
      clienteId,
      casoId: doc.casoId,
    })
    honorarioId = hon.id
  } else if (plano.exito) {
    // pure success-fee: a 0-value honorário note (launched when received)
    const hon = await createHonorario({
      descricao: `${doc.nome} — êxito ${plano.exito.percentual}% sobre ${plano.exito.base}`,
      valorCents: 0,
      dataVencimento: null,
      tipo: "exito",
      clienteId,
      casoId: doc.casoId,
    })
    honorarioId = hon.id
  }

  await prisma.documento.update({ where: { id }, data: { status: "fechado", clienteId } })
  void notificarDocumento({ documentoId: id, nome: doc.nome, status: "fechado", criadoPor: doc.criadoPor, actorEmail })

  return { documentoId: id, clienteId, clienteCriado, honorarioId, lancamentoIds, totalCents: plano.totalCents, exito: !!plano.exito }
}
