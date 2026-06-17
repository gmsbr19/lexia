// Shared client helpers for the Revisão / Download pages — derive a few
// display-facing facts from the live ContratoHonorariosData payload so the
// checklist / detail rows reflect the real document instead of mock copy.
import {
  newContratoData,
  type ContratoHonorariosData,
  type Contratante,
  type Honorarios,
} from "@/lib/types/contrato-honorarios"

/**
 * Defensively coerce a stored Documento payload into a renderable
 * ContratoHonorariosData. A null / malformed / partial payload (e.g. missing
 * `contratantes` or `honorarios`) falls back to the blank contrato so the A4
 * preview never crashes.
 */
export function coerceContratoData(payload: unknown): ContratoHonorariosData {
  const base = newContratoData()
  if (!payload || typeof payload !== "object") return base
  const p = payload as Partial<ContratoHonorariosData>
  return {
    contratantes: Array.isArray(p.contratantes) && p.contratantes.length > 0 ? p.contratantes : base.contratantes,
    objeto: typeof p.objeto === "string" ? p.objeto : base.objeto,
    honorarios: p.honorarios && typeof p.honorarios === "object" ? (p.honorarios as Honorarios) : base.honorarios,
    foro: typeof p.foro === "string" ? p.foro : base.foro,
    data: typeof p.data === "string" ? p.data : base.data,
    clausulas:
      p.clausulas && typeof p.clausulas === "object" && !Array.isArray(p.clausulas)
        ? (p.clausulas as Record<string, string>)
        : undefined,
  }
}

/** The primary contratante's display name (PF nome / PJ razão social). */
export function contratanteNome(c: Contratante | undefined): string {
  if (!c) return ""
  return (c.tipo === "pf" ? c.nome : c.razaoSocial).trim()
}

/** The primary contratante's document number (CPF / CNPJ). */
export function contratanteDoc(c: Contratante | undefined): string {
  if (!c) return ""
  return (c.tipo === "pf" ? c.cpf : c.cnpj).trim()
}

/** A short "Contrato de Honorários — {Cliente}" title from the payload. */
export function contratoTitulo(data: ContratoHonorariosData, fallback: string): string {
  const nome = contratanteNome(data.contratantes[0])
  return nome ? `Contrato de Honorários — ${nome}` : fallback
}

/** Are the honorários values filled in enough to launch? Drives the checklist. */
export function honorariosPreenchidos(h: Honorarios): boolean {
  switch (h.tipo) {
    case "avista":
      return !!h.valorTotal && !!h.dataPagamento
    case "parcelado":
      return !!h.valorTotal && !!h.qtParcelas && !!h.valorParcelas && !!h.dataPrimeiraParcela
    case "parcelas_diferentes":
      return h.parcelas.length > 0 && h.parcelas.every((p) => !!p.valor && !!p.vencimento)
    case "exito":
      return !!h.percentual && !!h.baseCalculo
    case "avista_exito":
      return !!h.valorTotal && !!h.dataPagamento && !!h.percentualExito && !!h.baseCalculoExito
    case "parcelado_exito":
      return !!h.valorTotal && !!h.qtParcelas && !!h.valorParcelas && !!h.dataPrimeiraParcela && !!h.percentualExito && !!h.baseCalculoExito
  }
}

/** Human summary of the honorários values for the checklist detail line. */
export function honorariosResumo(h: Honorarios): string {
  switch (h.tipo) {
    case "avista":
      return h.valorTotal ? `R$ ${h.valorTotal} à vista` : "Valor à vista"
    case "parcelado":
      return h.qtParcelas && h.valorParcelas
        ? `${h.qtParcelas}× R$ ${h.valorParcelas}`
        : "Parcelado"
    case "parcelas_diferentes":
      return `${h.parcelas.length} parcela${h.parcelas.length === 1 ? "" : "s"}`
    case "exito":
      return h.percentual ? `${h.percentual}% de êxito` : "Honorários de êxito"
    case "avista_exito":
      return h.valorTotal ? `R$ ${h.valorTotal} + ${h.percentualExito || "?"}% êxito` : "À vista + êxito"
    case "parcelado_exito":
      return h.qtParcelas ? `${h.qtParcelas}× + ${h.percentualExito || "?"}% êxito` : "Parcelado + êxito"
  }
}

/** Documents that support the close-into-finance lifecycle. */
export const CONTRATO_LIFECYCLE_TEMPLATES = new Set([
  "contrato-honorarios",
  "contrato-prestacao-servicos",
])
