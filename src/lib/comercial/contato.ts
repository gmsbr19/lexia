// Create-or-link a Cliente (Contato) for a Lead/Oportunidade — the dedup core
// of the Fase 1 model unification (see CLAUDE.md §11 "Comercial → CRM").
// Every oportunidade must resolve to exactly one Contato, even across repeated
// Genions imports, without ever duplicating the same person. Pure decision
// logic (normalizarEmail/Telefone, acharClienteExistente, planejarCriarCliente)
// + a thin server wrapper (resolverOuCriarCliente) that does the I/O — kept in
// one file since it's the only consumer. Mirrors ./merge.ts's shape.
import { randomUUID } from "node:crypto"
import type { Prisma, PrismaClient } from "@prisma/client"
import { normalizar } from "@/lib/text"

/** Digits-only phone key — compares across formatting variants ("(11) 9…" vs "1190…"). */
export function normalizarTelefone(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "")
}

/** Canonical comparison key for a Brazilian phone number — beyond digits-only,
 *  strips the "55" country code (Genions/WhatsApp exports carry it; UI-typed
 *  numbers usually don't) and canonicalizes the legacy 8-digit mobile format
 *  to the modern 9-digit one (a nationwide 2012–2016 rollout prepended "9" to
 *  every mobile number), so the SAME real line compares equal regardless of
 *  source/era. Landline numbers (subscriber starting 2–5) are left alone. */
export function chaveTelefone(v: string | null | undefined): string {
  let d = normalizarTelefone(v)
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2)
  if (d.length === 10 && /^[6-9]/.test(d.slice(2))) d = `${d.slice(0, 2)}9${d.slice(2)}`
  return d
}

/** Lowercased/accent-stripped e-mail key (reuses the app's accent-insensitive normalizer). */
export function normalizarEmail(v: string | null | undefined): string {
  return normalizar(v)
}

function splitJoined(v: string | null | undefined): string[] {
  return (v ?? "").split(";").map((s) => s.trim()).filter(Boolean)
}

export interface ContatoCandidate {
  id: number
  emails: string | null
  telefones: string | null
  cpfCnpj: string | null
}

/** Existing-Cliente lookup precedence: cpfCnpj (exact) → email → telefone,
 *  matched against the ';'-joined Cliente.emails/telefones. Returns the id of
 *  the first candidate that matches, or null. A Lead never collects cpfCnpj
 *  today — the param exists so the same matcher can grow other callers later. */
export function acharClienteExistente(
  candidatos: ContatoCandidate[],
  wanted: { email?: string | null; telefone?: string | null; cpfCnpj?: string | null },
): number | null {
  const cpf = normalizarTelefone(wanted.cpfCnpj)
  if (cpf) {
    const byCpf = candidatos.find((c) => c.cpfCnpj && normalizarTelefone(c.cpfCnpj) === cpf)
    if (byCpf) return byCpf.id
  }
  const email = normalizarEmail(wanted.email)
  if (email) {
    const byEmail = candidatos.find((c) => splitJoined(c.emails).some((e) => normalizarEmail(e) === email))
    if (byEmail) return byEmail.id
  }
  const telefone = chaveTelefone(wanted.telefone)
  if (telefone) {
    const byTel = candidatos.find((c) => splitJoined(c.telefones).some((t) => chaveTelefone(t) === telefone))
    if (byTel) return byTel.id
  }
  return null
}

export interface ContatoLeadInput {
  nome: string
  email: string | null
  telefone: string | null
  origem: string | null
}

export interface ClienteCreatePlan {
  astreaId: string
  nome: string
  tipo: string
  classificacao: string
  emails: string | null
  telefones: string | null
  origem: string | null
}

/** Builds the Cliente-create payload for a lead with no existing match. A
 *  synthetic astreaId is required (Cliente.astreaId is @unique + required). */
export function planejarCriarCliente(lead: ContatoLeadInput): ClienteCreatePlan {
  return {
    astreaId: `app-cliente-lead-${randomUUID()}`,
    nome: lead.nome.trim(),
    tipo: "pf",
    classificacao: "lead",
    emails: lead.email?.trim() || null,
    telefones: lead.telefone?.trim() || null,
    origem: lead.origem?.trim() || null,
  }
}

type Db = PrismaClient | Prisma.TransactionClient

// resolverOuCriarCliente is a check-then-act (SELECT candidates, then CREATE if
// none match) with no DB-level uniqueness backing the email/telefone match
// (Cliente.emails/telefones are free-text, not @unique) — two concurrent calls
// for the same brand-new contact could each see "no match" and each create a
// Cliente. The app runs as a single Node process (no horizontal scaling — see
// DEPLOY.md), so a simple in-process mutex fully closes that race by
// serializing every call through this queue.
let fila: Promise<unknown> = Promise.resolve()
function serializado<T>(fn: () => Promise<T>): Promise<T> {
  const proxima = fila.then(fn, fn)
  fila = proxima.then(
    () => undefined,
    () => undefined,
  )
  return proxima
}

/**
 * Resolve (or create) the Cliente a lead should link to. Matches an existing
 * Cliente by e-mail/telefone (see acharClienteExistente); NEVER overwrites its
 * data (see planejarBackfillCliente in ./merge.ts for gap-filling on explicit
 * merge). Creates a new "lead" Cliente only when no match is found. SERVER
 * ONLY. For a small-office dataset, loading the full Cliente contact index is
 * simpler and safer than a SQL substring prefilter (which can't normalize
 * accents/phone formatting) — correctness over micro-optimization here.
 */
export async function resolverOuCriarCliente(
  db: Db,
  lead: ContatoLeadInput,
): Promise<{ id: number; criado: boolean }> {
  return serializado(async () => {
    const email = normalizarEmail(lead.email)
    const telefone = chaveTelefone(lead.telefone)
    if (email || telefone) {
      const candidatos = await db.cliente.findMany({
        select: { id: true, emails: true, telefones: true, cpfCnpj: true },
      })
      const found = acharClienteExistente(candidatos, { email: lead.email, telefone: lead.telefone })
      if (found) return { id: found, criado: false }
    }
    const plan = planejarCriarCliente(lead)
    const created = await db.cliente.create({ data: plan })
    return { id: created.id, criado: true }
  })
}
