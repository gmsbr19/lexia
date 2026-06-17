/**
 * Remove os DADOS MOCK do módulo de Processos (semeados por seed-processos-demo,
 * "Costa & Andrade" / "Dra. Mariana Costa"). HARD-delete — é dado de demonstração,
 * não dado jurídico real (este NÃO usa soft-delete). Idempotente: rodar de novo
 * quando já está limpo é no-op. Identifica os mocks pelos astreaId determinísticos
 * (app-cliente-demo-*, app-caso-demo-*, app-tarefa-demo-*, app-lanc-demo-*) + a
 * advogada demo (mariana.costa@costaandrade.local).
 *
 *   npm run db:purge:processos:demo
 */
import { PrismaClient } from "@prisma/client"

try {
  process.loadEnvFile()
} catch {
  // Prisma também carrega .env sozinho
}

const prisma = new PrismaClient()
const MARIANA = "mariana.costa@costaandrade.local"

async function main(): Promise<void> {
  const demoCasos = await prisma.caso.findMany({ where: { astreaId: { startsWith: "app-caso-demo-" } }, select: { id: true } })
  const demoClientes = await prisma.cliente.findMany({ where: { astreaId: { startsWith: "app-cliente-demo-" } }, select: { id: true } })
  const casoIds = demoCasos.map((c) => c.id)
  const clienteIds = demoClientes.map((c) => c.id)
  const procs = casoIds.length
    ? await prisma.processo.findMany({ where: { casoId: { in: casoIds } }, select: { id: true } })
    : []
  const procIds = procs.map((p) => p.id)

  // Filhos primeiro (FKs não-cascade): lançamentos, tarefas, eventos, anotações,
  // depois os filhos diretos do processo, o processo, partes, casos, clientes, user.
  const inCasoOuProc = {
    OR: [
      ...(casoIds.length ? [{ casoId: { in: casoIds } }] : []),
      ...(procIds.length ? [{ processoId: { in: procIds } }] : []),
    ],
  }
  const r: Record<string, number> = {}
  if (casoIds.length || procIds.length) {
    r.lancamentos = (await prisma.lancamento.deleteMany({ where: { OR: [{ astreaId: { startsWith: "app-lanc-demo-" } }, ...inCasoOuProc.OR] } })).count
    r.tarefas = (await prisma.tarefa.deleteMany({ where: { OR: [{ astreaId: { startsWith: "app-tarefa-demo-" } }, ...inCasoOuProc.OR] } })).count
    r.eventos = (await prisma.evento.deleteMany({ where: inCasoOuProc })).count
    r.anotacoes = (await prisma.anotacao.deleteMany({ where: inCasoOuProc })).count
  }
  if (procIds.length) {
    r.prazos = (await prisma.prazo.deleteMany({ where: { processoId: { in: procIds } } })).count
    r.andamentos = (await prisma.andamento.deleteMany({ where: { processoId: { in: procIds } } })).count
    r.publicacoes = (await prisma.publicacao.deleteMany({ where: { processoId: { in: procIds } } })).count
    r.partesProcesso = (await prisma.parteProcesso.deleteMany({ where: { processoId: { in: procIds } } })).count
    r.processos = (await prisma.processo.deleteMany({ where: { id: { in: procIds } } })).count
  }
  if (clienteIds.length) r.partes = (await prisma.parte.deleteMany({ where: { clienteId: { in: clienteIds } } })).count
  if (casoIds.length) r.casos = (await prisma.caso.deleteMany({ where: { id: { in: casoIds } } })).count
  if (clienteIds.length) r.clientes = (await prisma.cliente.deleteMany({ where: { id: { in: clienteIds } } })).count
  r.advogadaDemo = (await prisma.user.deleteMany({ where: { email: MARIANA } })).count

  const total = Object.values(r).reduce((a, b) => a + b, 0)
  if (total === 0) {
    console.log("Nada a remover — sem dados mock de processos.")
    return
  }
  console.log("Dados mock de processos removidos:")
  for (const [k, v] of Object.entries(r)) if (v) console.log(`  - ${k}: ${v}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
