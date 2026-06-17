// Pure helpers that bridge a generated "Contrato de Honorários" (the Documento
// payload) onto the finance ledger and the clientes cadastro. No DB access here
// — the mutation layer (lib/documentos/mutations.ts `fecharContrato`) consumes
// these and calls the finance/clientes writers. Kept pure so it is unit-testable.
import { parseBRLToCents } from "@/lib/finance/money"
import type {
  Contratante,
  ContratoHonorariosData,
  Honorarios,
} from "@/lib/types/contrato-honorarios"

// ── dates ────────────────────────────────────────────────────────────────────
// Contract date fields are free-text. Accept ISO (yyyy-mm-dd), BR (dd/mm/yyyy),
// or "dd de mês de yyyy"; return an ISO "yyyy-mm-dd" or null when unparseable.
const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
}

export function contractDateToISO(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()
  // ISO
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  // dd/mm/yyyy or dd-mm-yyyy
  const br = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/)
  if (br) {
    const d = br[1].padStart(2, "0")
    const m = br[2].padStart(2, "0")
    let y = br[3]
    if (y.length === 2) y = `20${y}`
    return `${y}-${m}-${d}`
  }
  // "10 de junho de 2026"
  const ext = s.toLowerCase().match(/(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})/)
  if (ext) {
    const mes = MESES[ext[2]]
    if (mes) return `${ext[3]}-${String(mes).padStart(2, "0")}-${ext[1].padStart(2, "0")}`
  }
  return null
}

// ── honorários → parcelas ────────────────────────────────────────────────────
export interface ContratoParcela {
  valorCents: number // magnitude of a single installment
  vencISO: string | null // due date "yyyy-mm-dd"
  modo: "unica" | "mensal" // mensal → recurring monthly from vencISO
  vezes: number // installment count
}

export interface HonorariosPlano {
  parcelas: ContratoParcela[] // fixed-value receivables (may be empty for pure-êxito)
  totalCents: number // sum of all fixed parcelas
  exito: { percentual: string; base: string } | null // success-fee note (no fixed value)
}

/**
 * Convert the contract's honorários clause into a finance plan: the fixed
 * receivables to create now (à vista / parceladas), plus an optional success-fee
 * note (lançado only when actually received, so no upfront ledger entry).
 */
export function honorariosToPlano(h: Honorarios): HonorariosPlano {
  const cents = (s: string) => parseBRLToCents(s)
  const parcelas: ContratoParcela[] = []
  let exito: HonorariosPlano["exito"] = null

  switch (h.tipo) {
    case "avista":
      parcelas.push({ valorCents: cents(h.valorTotal), vencISO: contractDateToISO(h.dataPagamento), modo: "unica", vezes: 1 })
      break
    case "parcelado": {
      const vezes = Math.max(1, Math.min(120, parseInt(h.qtParcelas, 10) || 1))
      const each = cents(h.valorParcelas) || (cents(h.valorTotal) && Math.round(cents(h.valorTotal) / vezes))
      parcelas.push({ valorCents: each, vencISO: contractDateToISO(h.dataPrimeiraParcela), modo: "mensal", vezes })
      break
    }
    case "parcelas_diferentes":
      for (const p of h.parcelas) {
        const v = cents(p.valor)
        if (v > 0) parcelas.push({ valorCents: v, vencISO: contractDateToISO(p.vencimento), modo: "unica", vezes: 1 })
      }
      break
    case "exito":
      exito = { percentual: h.percentual, base: h.baseCalculo }
      break
    case "avista_exito":
      parcelas.push({ valorCents: cents(h.valorTotal), vencISO: contractDateToISO(h.dataPagamento), modo: "unica", vezes: 1 })
      exito = { percentual: h.percentualExito, base: h.baseCalculoExito }
      break
    case "parcelado_exito": {
      const vezes = Math.max(1, Math.min(120, parseInt(h.qtParcelas, 10) || 1))
      const each = cents(h.valorParcelas) || (cents(h.valorTotal) && Math.round(cents(h.valorTotal) / vezes))
      parcelas.push({ valorCents: each, vencISO: contractDateToISO(h.dataPrimeiraParcela), modo: "mensal", vezes })
      exito = { percentual: h.percentualExito, base: h.baseCalculoExito }
      break
    }
  }

  const totalCents = parcelas.reduce((sum, p) => sum + p.valorCents * p.vezes, 0)
  return { parcelas: parcelas.filter((p) => p.valorCents > 0), totalCents, exito }
}

// ── contratante → cliente cadastro ───────────────────────────────────────────
export interface ContratanteCadastro {
  nome: string
  tipo: "pf" | "pj"
  cpfCnpj: string | null
  logradouro: string | null // the contract carries a single free-text address
  emails: string[]
}

/** The primary contratante mapped onto the Cliente create shape. */
export function contratanteToCadastro(c: Contratante): ContratanteCadastro {
  if (c.tipo === "pf") {
    return {
      nome: c.nome.trim(),
      tipo: "pf",
      cpfCnpj: c.cpf.trim() || null,
      logradouro: c.endereco.trim() || null,
      emails: c.email.trim() ? [c.email.trim()] : [],
    }
  }
  return {
    nome: c.razaoSocial.trim(),
    tipo: "pj",
    cpfCnpj: c.cnpj.trim() || null,
    logradouro: c.endereco.trim() || null,
    emails: c.email.trim() ? [c.email.trim()] : [],
  }
}

/** Primary contratante name (used to label honorários / resolve the cliente). */
export function contratoClienteNome(data: ContratoHonorariosData): string | null {
  const c = data.contratantes[0]
  if (!c) return null
  return (c.tipo === "pf" ? c.nome : c.razaoSocial).trim() || null
}
