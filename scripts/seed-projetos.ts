// Seed do módulo Tarefas/Projetos (redesign). Idempotente.
//  1) Áreas do Direito canônicas (+ normaliza Caso.area legado);
//  2) Modelos de projeto — CREATE-ONLY por `chave` (nunca sobrescreve um modelo
//     editado pelo sócio): "Integralização de imóveis", "Acompanhamento
//     processual" e "Holding Patrimonial" (papéis + passos + ligações);
//  3) `--demo`: dados de exemplo do spec (projetos Alfa…Ômega com tarefas,
//     grupos, ligações, uma vencida em risco, prazo fatal etc.), marcados com
//     chave "demo-*" / astreaId "app-tarefa-demo-*" / "app-cliente-demo-*".
//     `--limpar-demo` remove tudo isso. Só para desenvolvimento.
// Rode após `db:migrate` + `db:generate`: npm run db:seed:projetos [-- --demo]
import { PrismaClient } from "@prisma/client"
import { normalizar } from "../src/lib/text"
import { addDays } from "../src/lib/datas/util"
import { hojeSP } from "../src/lib/tarefas/regras"

const prisma = new PrismaClient()

// ── Áreas do Direito ──────────────────────────────────────────────────────────
const AREAS: { id: string; name: string; color: string | null }[] = [
  { id: "trab", name: "Contencioso trabalhista", color: "#C0492F" },
  { id: "soc", name: "Societário & M&A", color: "#1F8A5B" },
  { id: "trib", name: "Tributário", color: "#C0A147" },
  { id: "civ", name: "Cível & contratos", color: null },
  { id: "int", name: "Operação interna", color: null },
]

async function seedAreasDireito(): Promise<void> {
  const normalMap: Record<string, string> = {
    trabalhista: "trab",
    "direito trabalhista": "trab",
    "trabalhista individual": "trab",
    civel: "civ",
    "civel contratos": "civ",
    "civil contratos": "civ",
    contratos: "civ",
    tributario: "trib",
    "tributario fiscal": "trib",
    fiscal: "trib",
    societario: "soc",
    "societario empresarial": "soc",
    empresarial: "soc",
    "m a": "soc",
    ma: "soc",
    holding: "soc",
    consultoria: "int",
    internacional: "int",
    arbitragem: "int",
    "direito internacional": "int",
  }
  for (const [i, a] of AREAS.entries()) {
    await prisma.areaDireito.upsert({
      where: { chave: a.id },
      create: { chave: a.id, nome: a.name, cor: a.color, ordem: i, ativo: true },
      update: { nome: a.name, cor: a.color, ordem: i },
    })
  }
  console.log(`AreaDireito: ${AREAS.length} áreas canônicas upserted.`)

  const distinct = await prisma.caso.findMany({ select: { area: true }, distinct: ["area"] })
  const canonicas = new Set<string>(AREAS.map((a) => a.id))
  let normed = 0
  for (const { area } of distinct) {
    if (!area || canonicas.has(area)) continue
    const key = normalizar(area).replace(/[^a-z0-9]+/g, " ").trim()
    const mapped = normalMap[key]
    if (mapped) {
      normed += (await prisma.caso.updateMany({ where: { area }, data: { area: mapped } })).count
      continue
    }
    const slug = normalizar(area).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50) || "area"
    let chave = slug
    let n = 1
    while (await prisma.areaDireito.findUnique({ where: { chave } })) chave = `${slug}_${++n}`
    await prisma.areaDireito.create({ data: { chave, nome: area, ordem: 100, ativo: true } })
    canonicas.add(chave)
    normed += (await prisma.caso.updateMany({ where: { area }, data: { area: chave } })).count
    console.log(`  → nova área "${area}" → chave "${chave}"`)
  }
  if (normed) console.log(`Casos normalizados: ${normed} registros.`)
}

// ── Modelos ───────────────────────────────────────────────────────────────────
interface PassoSeed {
  chave: string
  titulo: string
  papel: string | null
  dias: number
  fatal?: boolean
  depois?: string[]
  checklist?: string[]
}
interface ModeloSeed {
  chave: string
  nome: string
  area: string
  palavraGrupo: string
  sufixoGrupo: string
  papeis: { id: string; rotulo: string }[]
  passos: PassoSeed[]
}

const MODELOS: ModeloSeed[] = [
  {
    chave: "integralizacao-imoveis",
    nome: "Integralização de imóveis",
    area: "soc",
    palavraGrupo: "Protocolo",
    sufixoGrupo: " · 1º RI Taubaté",
    papeis: [
      { id: "apoio", rotulo: "Apoio" },
      { id: "adv", rotulo: "Advogado" },
    ],
    passos: [
      { chave: "doc", titulo: "Reunir documentação", papel: "apoio", dias: 15, checklist: ["Matrículas atualizadas", "Certidões negativas", "Contrato social"] },
      { chave: "cert", titulo: "Conferir certidões", papel: "apoio", dias: 10, depois: ["doc"], checklist: ["Certidão de ônus", "Certidão de tributos"] },
      { chave: "itbi", titulo: "Solicitar ITBI", papel: "adv", dias: 8, depois: ["doc"], checklist: ["Guia emitida", "Pagamento", "Comprovante anexado"] },
      { chave: "prot", titulo: "Protocolar remessa", papel: "adv", dias: 0, depois: ["cert", "itbi"] },
    ],
  },
  {
    chave: "acompanhamento-processual",
    nome: "Acompanhamento processual",
    area: "civ",
    palavraGrupo: "Fase",
    sufixoGrupo: "",
    papeis: [
      { id: "apoio", rotulo: "Apoio" },
      { id: "adv", rotulo: "Advogado" },
    ],
    passos: [
      { chave: "pub", titulo: "Conferir publicação", papel: "apoio", dias: 12 },
      { chave: "docs", titulo: "Reunir documentos do cliente", papel: "apoio", dias: 8, depois: ["pub"], checklist: ["Procuração", "Documentos pessoais"] },
      { chave: "peca", titulo: "Redigir peça", papel: "adv", dias: 3, depois: ["docs"], checklist: ["Minuta", "Revisão"] },
      { chave: "prot", titulo: "Protocolar peça", papel: "adv", dias: 0, fatal: true, depois: ["peca"] },
    ],
  },
  {
    chave: "holding-patrimonial",
    nome: "Holding Patrimonial",
    area: "soc",
    palavraGrupo: "Holding",
    sufixoGrupo: "",
    papeis: [
      { id: "adv", rotulo: "Advogado responsável" },
      { id: "socio", rotulo: "Sócio responsável" },
      { id: "adm", rotulo: "Equipe administrativa" },
    ],
    passos: [
      { chave: "p1", titulo: "Reunião inicial e coleta de documentos", papel: "adv", dias: 69 },
      { chave: "p2", titulo: "Levantamento patrimonial e societário", papel: "adv", dias: 64, depois: ["p1"] },
      { chave: "p3", titulo: "Análise tributária e definição da estrutura", papel: "socio", dias: 57, depois: ["p2"] },
      { chave: "p4", titulo: "Elaboração do contrato social da holding", papel: "adv", dias: 50, depois: ["p3"] },
      { chave: "p5", titulo: "Definição do acordo de sócios e governança", papel: "socio", dias: 46, depois: ["p4"] },
      { chave: "p6", titulo: "Registro da holding na Junta Comercial", papel: "adm", dias: 39, depois: ["p5"] },
      { chave: "p7", titulo: "Inscrições fiscais (CNPJ e demais)", papel: "adm", dias: 35, depois: ["p6"] },
      { chave: "p8", titulo: "Integralização de bens ao capital social", papel: "adv", dias: 28, depois: ["p7"] },
      { chave: "p9", titulo: "Transferência e averbação dos bens imóveis", papel: "adm", dias: 14, depois: ["p8"] },
      { chave: "p10", titulo: "Planejamento sucessório (doação com reserva de usufruto)", papel: "socio", dias: 4, depois: ["p9"] },
      { chave: "p11", titulo: "Entrega e arquivamento da documentação ao cliente", papel: "adv", dias: 0, depois: ["p10"] },
    ],
  },
]

async function seedModelos(): Promise<number> {
  let criados = 0
  for (const [ordem, m] of MODELOS.entries()) {
    if (await prisma.projetoModelo.findUnique({ where: { chave: m.chave } })) continue
    await prisma.projetoModelo.create({
      data: {
        chave: m.chave,
        nome: m.nome,
        area: m.area,
        palavraGrupo: m.palavraGrupo,
        sufixoGrupo: m.sufixoGrupo,
        papeis: JSON.stringify(m.papeis.map((p) => ({ ...p, padraoUsuarioId: null }))),
        ordem,
        passos: {
          create: m.passos.map((p, i) => ({
            chave: p.chave,
            titulo: p.titulo,
            papelId: p.papel,
            diasAntes: p.dias,
            prazoFatal: !!p.fatal,
            anteriores: JSON.stringify(p.depois ?? []),
            checklist: JSON.stringify(p.checklist ?? []),
            ordem: i,
          })),
        },
      },
    })
    criados++
  }
  return criados
}

// ── dados de exemplo (--demo) ─────────────────────────────────────────────────
async function limparDemo(): Promise<void> {
  const t = await prisma.tarefa.deleteMany({ where: { astreaId: { startsWith: "app-tarefa-demo-" } } })
  const p = await prisma.projeto.deleteMany({ where: { chave: { startsWith: "demo-" } } })
  const c = await prisma.cliente.deleteMany({ where: { astreaId: { startsWith: "app-cliente-demo-" }, tarefas: { none: {} } } })
  console.log(`Demo removida: ${t.count} tarefas, ${p.count} projetos, ${c.count} clientes.`)
}

async function seedDemo(): Promise<void> {
  if (await prisma.projeto.findFirst({ where: { chave: { startsWith: "demo-" } } })) {
    console.log("Demo já existe — rode com --limpar-demo antes para recriar.")
    return
  }
  const hoje = hojeSP()
  const d = (n: number) => new Date(`${addDays(hoje, n)}T12:00:00.000Z`)
  const users = await prisma.user.findMany({ where: { ativo: true }, select: { id: true, nome: true } })
  const pessoa = (primeiro: string) => users.find((u) => normalizar(u.nome).startsWith(normalizar(primeiro)))?.id ?? users[0]?.id ?? null
  const TH = pessoa("Thiago")
  const LE = pessoa("Leonardo")
  const ED = pessoa("Eduarda")

  const cliente = async (chave: string, nome: string, tipo: "pf" | "pj" = "pj") =>
    (
      await prisma.cliente.upsert({
        where: { astreaId: `app-cliente-demo-${chave}` },
        create: { astreaId: `app-cliente-demo-${chave}`, nome, tipo, classificacao: "cliente" },
        update: {},
        select: { id: true },
      })
    ).id
  const projeto = async (chave: string, nomeCurto: string, nome: string, clienteId: number | null, area: string, resp: number | null, prazo: number | null, cor: string, descricao: string) =>
    (
      await prisma.projeto.create({
        data: { chave: `demo-${chave}`, nomeCurto, nome, clienteId, area, responsavelId: resp, prazo: prazo == null ? null : d(prazo), cor, descricao },
        select: { id: true },
      })
    ).id

  const ALFA = await projeto("alfa", "Alfa", "Integralização Holding Alfa", await cliente("andrade", "Família Andrade", "pf"), "soc", LE, 37, "#2E7D6B", "Integralização de quatro imóveis ao capital social da Holding Alfa, em quatro protocolos no 1º Registro de Imóveis de Taubaté.")
  const BETA = await projeto("beta", "Beta", "Integralização Beta Participações", await cliente("beta", "Beta Participações Ltda."), "soc", LE, 21, "#5A4F9A", "Alteração contratual e integralização de dois imóveis comerciais.")
  const GAMA = await projeto("gama", "Gama", "Integralização Gama", await cliente("gama", "Grupo Gama"), "soc", TH, 45, "#9A6B2E", "Levantamento e integralização dos imóveis rurais do Grupo Gama.")
  const DELTA = await projeto("delta", "Delta", "Integralização de Imóveis Delta", await cliente("delta", "Delta Empreendimentos"), "soc", LE, 60, "#9A2E5A", "Avaliação e integralização de três imóveis urbanos.")
  const OMEGA = await projeto("omega", "Ômega", "Acompanhamento Processual Ômega", await cliente("omega", "Ômega Comércio S.A."), "civ", LE, null, "#7A8699", "Ação de cobrança movida contra a Ômega Comércio na 2ª Vara Cível de São José dos Campos.")
  const HELENA = await cliente("helena", "Helena Vargas", "pf")

  const G = (n: number) => `Protocolo 0${n} · 1º RI Taubaté`
  interface T {
    k: string
    titulo: string
    projetoId: number | null
    grupo?: string
    resp: number | null
    due: number
    status: "todo" | "doing" | "wait" | "done"
    doneAt?: number
    fatal?: boolean
    espera?: string
    depois?: string[]
    clienteId?: number
    checklist?: [string, boolean][]
  }
  const tarefas: T[] = [
    { k: "a1", titulo: "Reunir documentação", projetoId: ALFA, grupo: G(1), resp: ED, due: -3, status: "done", doneAt: -4, checklist: [["Matrículas atualizadas", true], ["Certidões negativas", true], ["Contrato social", true]] },
    { k: "a2", titulo: "Solicitar ITBI", projetoId: ALFA, grupo: G(1), resp: LE, due: 2, status: "doing", depois: ["a1"], checklist: [["Guia emitida", true], ["Pagamento", false], ["Comprovante anexado", false]] },
    { k: "a3", titulo: "Protocolar remessa", projetoId: ALFA, grupo: G(1), resp: LE, due: 6, status: "wait", depois: ["a2"] },
    { k: "a4", titulo: "Reunir documentação", projetoId: ALFA, grupo: G(2), resp: ED, due: -5, status: "done", doneAt: -6 },
    { k: "a5", titulo: "Emitir guia de ITBI", projetoId: ALFA, grupo: G(2), resp: LE, due: 5, status: "wait", espera: "Prefeitura — ITBI", depois: ["a4"] },
    { k: "a6", titulo: "Conferir certidões", projetoId: ALFA, grupo: G(2), resp: ED, due: -2, status: "todo", depois: ["a4"], checklist: [["Certidão de ônus", true], ["Certidão de tributos", false], ["Certidão trabalhista", false]] },
    { k: "a7", titulo: "Protocolar remessa", projetoId: ALFA, grupo: G(2), resp: LE, due: 8, status: "wait", depois: ["a5", "a6"] },
    { k: "a8", titulo: "Reunir documentação", projetoId: ALFA, grupo: G(3), resp: ED, due: 9, status: "todo" },
    { k: "a9", titulo: "Solicitar ITBI", projetoId: ALFA, grupo: G(3), resp: LE, due: 14, status: "wait", depois: ["a8"] },
    { k: "a10", titulo: "Protocolar remessa", projetoId: ALFA, grupo: G(3), resp: null, due: 13, status: "wait", depois: ["a9"] },
    { k: "a11", titulo: "Reunir documentação", projetoId: ALFA, grupo: G(4), resp: ED, due: 12, status: "todo" },
    { k: "a12", titulo: "Solicitar ITBI", projetoId: ALFA, grupo: G(4), resp: LE, due: 17, status: "wait", depois: ["a11"] },
    { k: "a13", titulo: "Protocolar remessa", projetoId: ALFA, grupo: G(4), resp: LE, due: 22, status: "wait", depois: ["a12", "a10"] },
    { k: "b1", titulo: "Enviar minuta de alteração contratual", projetoId: BETA, resp: LE, due: -1, status: "todo" },
    { k: "b2", titulo: "Calcular ITBI dos imóveis", projetoId: BETA, resp: TH, due: 3, status: "todo", checklist: [["Imóvel da Rua Direita", false], ["Imóvel da Av. Brasil", false]] },
    { k: "b3", titulo: "Colher assinaturas dos sócios", projetoId: BETA, resp: LE, due: 12, status: "wait", espera: "Cliente — assinaturas" },
    { k: "b4", titulo: "Levantar matrículas", projetoId: BETA, resp: ED, due: -3, status: "done", doneAt: -2 },
    { k: "g1", titulo: "Revisar contrato social", projetoId: GAMA, resp: TH, due: 0, status: "doing" },
    { k: "g2", titulo: "Montar planilha de imóveis rurais", projetoId: GAMA, resp: ED, due: 8, status: "todo" },
    { k: "g3", titulo: "Reunião inicial com o cliente", projetoId: GAMA, resp: TH, due: -1, status: "done", doneAt: -1 },
    { k: "d1", titulo: "Solicitar matrículas atualizadas", projetoId: DELTA, resp: ED, due: 1, status: "todo" },
    { k: "d2", titulo: "Minuta de laudo de avaliação", projetoId: DELTA, resp: LE, due: 15, status: "doing" },
    { k: "d3", titulo: "Aprovar laudo de avaliação", projetoId: DELTA, resp: TH, due: 20, status: "wait", depois: ["d2"] },
    { k: "o1", titulo: "Protocolar contestação", projetoId: OMEGA, resp: LE, due: 2, fatal: true, status: "doing" },
    { k: "o2", titulo: "Conferir publicações do processo", projetoId: OMEGA, resp: ED, due: 7, status: "todo" },
    { k: "o3", titulo: "Juntar procuração", projetoId: OMEGA, resp: ED, due: -4, status: "done", doneAt: -3 },
    { k: "o4", titulo: "Preparar audiência de conciliação", projetoId: OMEGA, resp: LE, due: 16, status: "todo" },
    { k: "o5", titulo: "Cadastrar processo", projetoId: OMEGA, resp: ED, due: -16, status: "done", doneAt: -15 },
    { k: "n1", titulo: "Renovar certificado digital", projetoId: null, resp: TH, due: 11, status: "todo" },
    { k: "n2", titulo: "Enviar proposta de honorários", projetoId: null, resp: TH, due: 9, status: "todo", clienteId: HELENA },
  ]
  const ids = new Map<string, number>()
  for (const t of tarefas) {
    const r = await prisma.tarefa.create({
      data: {
        astreaId: `app-tarefa-demo-${t.k}`,
        titulo: t.titulo,
        status: t.status,
        done: t.status === "done",
        prazo: d(t.due),
        prazoFatal: !!t.fatal,
        grupo: t.grupo ?? null,
        aguardandoTexto: t.espera ?? null,
        checklist: JSON.stringify((t.checklist ?? []).map(([texto, marcado], i) => ({ id: `c${i + 1}`, texto, marcado }))),
        responsavelId: t.resp,
        criadoPorId: TH,
        projetoId: t.projetoId,
        clienteId: t.clienteId ?? null,
        concluidoEm: t.doneAt != null ? d(t.doneAt) : null,
        origem: "manual",
      },
      select: { id: true },
    })
    ids.set(t.k, r.id)
  }
  const ligacoes = tarefas.flatMap((t) => (t.depois ?? []).map((a) => ({ anteriorId: ids.get(a)!, seguinteId: ids.get(t.k)! })))
  await prisma.tarefaLigacao.createMany({ data: ligacoes, skipDuplicates: true })
  await prisma.tarefaHistorico.createMany({ data: [...ids.values()].map((tarefaId) => ({ tarefaId, texto: "Tarefa criada", autorId: TH })) })
  console.log(`Demo: 5 projetos, ${tarefas.length} tarefas, ${ligacoes.length} ligações.`)
}

async function main() {
  const args = new Set(process.argv.slice(2))
  if (args.has("--limpar-demo")) {
    await limparDemo()
    return
  }
  await seedAreasDireito()
  const n = await seedModelos()
  console.log(`Modelos de projeto: ${n} criados (os existentes não são alterados).`)
  if (args.has("--demo")) await seedDemo()
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
