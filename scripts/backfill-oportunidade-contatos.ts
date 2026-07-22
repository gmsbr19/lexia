/**
 * Fase 1 do CRM Comercial: liga cada Lead/Oportunidade órfã (clienteId nulo) a
 * um Contato (Cliente) — resolvendo por e-mail/telefone (dedup) ou criando um
 * Cliente novo (classificacao='lead'). Idempotente — pula leads já ligados
 * (nunca reatribui/rompe um link já existente, incl. o feito por
 * converterLead/mesclarLeadComCliente).
 *
 *   npx tsx scripts/backfill-oportunidade-contatos.ts --dry   (só conta, não grava)
 *   npm run db:backfill:oportunidades                          (grava)
 *
 * Rode UMA vez, após `npm run db:migrate` + `npm run db:generate`. Reexecutar
 * é seguro (não-destrutivo, nunca duplica Cliente — dedup por e-mail/telefone).
 * Espelha a lógica pura de src/lib/comercial/contato.ts (duplicada aqui, self-
 * contained, como os demais scripts/backfill-*.ts do repo).
 */
import { randomUUID } from "node:crypto"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const dry = process.argv.includes("--dry")

function semAcento(s: string | null | undefined): string {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
}
function normalizarEmail(s: string | null | undefined): string {
  return semAcento(s).toLowerCase().trim()
}
function normalizarTelefone(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "")
}
function chaveTelefone(s: string | null | undefined): string {
  let d = normalizarTelefone(s)
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2)
  if (d.length === 10 && /^[6-9]/.test(d.slice(2))) d = `${d.slice(0, 2)}9${d.slice(2)}`
  return d
}
function splitJoined(v: string | null | undefined): string[] {
  return (v ?? "").split(";").map((s) => s.trim()).filter(Boolean)
}

interface ContatoCandidate {
  id: number
  emails: string | null
  telefones: string | null
}

function acharClienteExistente(candidatos: ContatoCandidate[], email: string | null, telefone: string | null): number | null {
  const e = normalizarEmail(email)
  if (e) {
    const byEmail = candidatos.find((c) => splitJoined(c.emails).some((x) => normalizarEmail(x) === e))
    if (byEmail) return byEmail.id
  }
  const t = chaveTelefone(telefone)
  if (t) {
    const byTel = candidatos.find((c) => splitJoined(c.telefones).some((x) => chaveTelefone(x) === t))
    if (byTel) return byTel.id
  }
  return null
}

async function main() {
  const orfaos = await prisma.lead.findMany({
    where: { clienteId: null },
    select: { id: true, nome: true, email: true, telefone: true, origem: true },
  })

  console.log(`${orfaos.length} oportunidade(s) sem Contato vinculado.`)
  if (dry) {
    console.log("(--dry: nada será gravado)")
    await prisma.$disconnect()
    return
  }
  if (orfaos.length === 0) {
    await prisma.$disconnect()
    return
  }

  // Um único snapshot dos contatos existentes, atualizado em memória a cada
  // Cliente criado nesta rodada (evita duplicar 2 leads-irmãos no mesmo run).
  const candidatos: ContatoCandidate[] = (
    await prisma.cliente.findMany({ select: { id: true, emails: true, telefones: true } })
  ).map((c) => ({ id: c.id, emails: c.emails, telefones: c.telefones }))

  let ligados = 0
  let criados = 0

  for (const lead of orfaos) {
    const existente = acharClienteExistente(candidatos, lead.email, lead.telefone)
    let clienteId: number
    if (existente) {
      clienteId = existente
      ligados++
    } else {
      const created = await prisma.cliente.create({
        data: {
          astreaId: `app-cliente-lead-${randomUUID()}`,
          nome: lead.nome.trim(),
          tipo: "pf",
          classificacao: "lead",
          emails: lead.email?.trim() || null,
          telefones: lead.telefone?.trim() || null,
          origem: lead.origem?.trim() || null,
        },
      })
      candidatos.push({ id: created.id, emails: created.emails, telefones: created.telefones })
      clienteId = created.id
      criados++
    }
    await prisma.lead.update({ where: { id: lead.id }, data: { clienteId } })
  }

  const restantes = await prisma.lead.count({ where: { clienteId: null } })
  console.log(`Backfill oportunidades → contatos: ${ligados} ligados a Contato existente, ${criados} Contatos novos criados. Órfãos restantes: ${restantes}.`)
  if (restantes > 0) {
    console.error("ATENÇÃO: ainda há oportunidades sem Contato — verifique manualmente.")
    process.exitCode = 1
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
