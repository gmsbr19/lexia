// Seed do módulo Projetos. Idempotente:
//  1) Cria 1 Projeto por área de prática existente (chave `area-<id>`), preservando
//     a taxonomia antiga como TAG `Projeto.area`;
//  2) Faz o backfill de `Tarefa.projetoId` a partir da string `Tarefa.projeto`
//     (sobras vão p/ a Caixa de entrada);
//  3) Semeia o template "Holding Patrimonial" (chave `holding-patrimonial`) com os
//     passos-padrão do processo (prazos relativos em dias úteis).
// Rode após `db:migrate` + `db:generate`. Reexecutar é seguro (upsert + replace).
import { PrismaClient } from "@prisma/client"
import { PROJECTS } from "../src/lib/tarefas/types"
import { normalizar } from "../src/lib/text"

const prisma = new PrismaClient()

interface TemplateItemSeed {
  titulo: string
  descricao: string
  prio: number
  responsavelPlaceholder: string
  offsetDias: number // dias úteis
  base: "inicio" | "anterior"
  dor: string[]
  dod: string[]
}

// Passos OPERACIONAIS de um processo de constituição de holding patrimonial
// (workflow do escritório — não são exigências legais). Prazos em dias úteis,
// encadeados a partir do passo anterior (a 1ª tarefa parte do início do projeto).
const HOLDING_ITENS: TemplateItemSeed[] = [
  {
    titulo: "Reunião inicial e coleta de documentos",
    descricao: "Alinhar objetivos com o cliente e levantar documentos pessoais, societários e patrimoniais.",
    prio: 2,
    responsavelPlaceholder: "Advogado responsável",
    offsetDias: 0,
    base: "inicio",
    dor: ["Cliente e família identificados", "Checklist de documentos enviado ao cliente"],
    dod: ["Documentos recebidos e conferidos", "Resumo da reunião registrado no caso"],
  },
  {
    titulo: "Levantamento patrimonial e societário",
    descricao: "Mapear bens (imóveis, participações, aplicações) e as empresas/participações já existentes.",
    prio: 2,
    responsavelPlaceholder: "Advogado responsável",
    offsetDias: 3,
    base: "anterior",
    dor: ["Documentos da etapa anterior disponíveis"],
    dod: ["Planilha de bens e participações consolidada", "Pendências de documentação anotadas"],
  },
  {
    titulo: "Análise tributária e definição da estrutura",
    descricao: "Avaliar a estrutura societária e o enquadramento tributário mais adequados ao caso.",
    prio: 1,
    responsavelPlaceholder: "Sócio responsável",
    offsetDias: 5,
    base: "anterior",
    dor: ["Levantamento patrimonial concluído"],
    dod: ["Estrutura proposta validada com o cliente", "Premissas tributárias documentadas"],
  },
  {
    titulo: "Elaboração do contrato social da holding",
    descricao: "Redigir o contrato social conforme a estrutura definida.",
    prio: 1,
    responsavelPlaceholder: "Advogado responsável",
    offsetDias: 5,
    base: "anterior",
    dor: ["Estrutura societária aprovada"],
    dod: ["Minuta do contrato social revisada por outro advogado"],
  },
  {
    titulo: "Definição do acordo de sócios e governança",
    descricao: "Estruturar regras de governança, sucessão e administração entre os sócios.",
    prio: 2,
    responsavelPlaceholder: "Sócio responsável",
    offsetDias: 3,
    base: "anterior",
    dor: ["Contrato social em elaboração"],
    dod: ["Acordo de sócios minutado e validado com o cliente"],
  },
  {
    titulo: "Registro da holding na Junta Comercial",
    descricao: "Protocolar os atos constitutivos para registro.",
    prio: 1,
    responsavelPlaceholder: "Equipe administrativa",
    offsetDias: 5,
    base: "anterior",
    dor: ["Contrato social assinado"],
    dod: ["Registro deferido", "Número de registro arquivado no caso"],
  },
  {
    titulo: "Inscrições fiscais (CNPJ e demais)",
    descricao: "Providenciar as inscrições fiscais necessárias à operação da holding.",
    prio: 2,
    responsavelPlaceholder: "Equipe administrativa",
    offsetDias: 3,
    base: "anterior",
    dor: ["Holding registrada na Junta Comercial"],
    dod: ["Inscrições obtidas e comprovantes anexados"],
  },
  {
    titulo: "Integralização de bens ao capital social",
    descricao: "Formalizar a integralização dos bens ao capital social da holding.",
    prio: 1,
    responsavelPlaceholder: "Advogado responsável",
    offsetDias: 5,
    base: "anterior",
    dor: ["Holding constituída e com inscrições ativas", "Avaliação dos bens definida"],
    dod: ["Integralização formalizada nos atos societários"],
  },
  {
    titulo: "Transferência e averbação dos bens imóveis",
    descricao: "Conduzir a transferência e a averbação dos imóveis junto aos cartórios competentes.",
    prio: 2,
    responsavelPlaceholder: "Equipe administrativa",
    offsetDias: 10,
    base: "anterior",
    dor: ["Integralização formalizada"],
    dod: ["Averbações concluídas", "Matrículas atualizadas anexadas ao caso"],
  },
  {
    titulo: "Planejamento sucessório (doação com reserva de usufruto)",
    descricao: "Formalizar a etapa sucessória conforme a estrutura aprovada com o cliente.",
    prio: 2,
    responsavelPlaceholder: "Sócio responsável",
    offsetDias: 7,
    base: "anterior",
    dor: ["Estrutura patrimonial concluída"],
    dod: ["Instrumentos sucessórios formalizados e arquivados"],
  },
  {
    titulo: "Entrega e arquivamento da documentação ao cliente",
    descricao: "Consolidar e entregar ao cliente todos os documentos finais do projeto.",
    prio: 3,
    responsavelPlaceholder: "Advogado responsável",
    offsetDias: 3,
    base: "anterior",
    dor: ["Etapas anteriores concluídas"],
    dod: ["Dossiê final entregue ao cliente", "Documentos arquivados no sistema"],
  },
]

async function seedAreas(): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  for (const [i, p] of PROJECTS.entries()) {
    const cor = p.color.startsWith("#") ? p.color : null
    const chave = `area-${p.id}`
    const proj = await prisma.projeto.upsert({
      where: { chave },
      create: { chave, nome: p.name, area: p.id, cor, status: "ativo", ordem: i },
      update: { nome: p.name, area: p.id, cor },
    })
    map.set(p.id, proj.id)
  }
  return map
}

async function backfillTarefas(map: Map<string, number>): Promise<number> {
  let total = 0
  for (const [area, projetoId] of map) {
    const r = await prisma.tarefa.updateMany({ where: { projeto: area, projetoId: null }, data: { projetoId } })
    total += r.count
  }
  // Tarefas com `projeto` fora das chaves conhecidas → Caixa de entrada.
  const inboxId = map.get("inbox")
  if (inboxId) {
    const r = await prisma.tarefa.updateMany({ where: { projetoId: null }, data: { projetoId: inboxId } })
    total += r.count
  }
  return total
}

async function seedHolding(): Promise<{ nome: string; itens: number }> {
  const descricao = "Constituição de holding patrimonial e planejamento sucessório (processo-padrão do escritório)."
  const tpl = await prisma.projetoTemplate.upsert({
    where: { chave: "holding-patrimonial" },
    create: { chave: "holding-patrimonial", nome: "Holding Patrimonial", descricao, area: "soc", cor: "#1F8A5B", ativo: true, ordem: 0 },
    update: { nome: "Holding Patrimonial", descricao, area: "soc", cor: "#1F8A5B", ativo: true },
  })
  // Replace-all dos itens (idempotente).
  await prisma.projetoTemplateTarefa.deleteMany({ where: { templateId: tpl.id } })
  await prisma.projetoTemplateTarefa.createMany({
    data: HOLDING_ITENS.map((it, i) => ({
      templateId: tpl.id,
      titulo: it.titulo,
      descricao: it.descricao,
      prio: it.prio,
      responsavelPlaceholder: it.responsavelPlaceholder,
      offsetDias: it.offsetDias,
      base: it.base,
      dor: JSON.stringify(it.dor),
      dod: JSON.stringify(it.dod),
      ordem: i,
    })),
  })
  return { nome: tpl.nome, itens: HOLDING_ITENS.length }
}

// ── AreaDireito canonical seed ────────────────────────────────────────────────
// Maps PROJECTS (excluding inbox) to AreaDireito entries. Chave = PROJECTS[*].id.
// Also normalizes legacy Caso.area free-text values to canonical chaves.
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

  const areas = PROJECTS.filter((p) => !p.inbox)
  for (const [i, p] of areas.entries()) {
    const cor = p.color?.startsWith("#") ? p.color : null
    await prisma.areaDireito.upsert({
      where: { chave: p.id },
      create: { chave: p.id, nome: p.name, cor, ordem: i, ativo: true },
      update: { nome: p.name, cor, ordem: i },
    })
  }
  console.log(`AreaDireito: ${areas.length} áreas canônicas upserted.`)

  // Normalize legacy Caso.area values
  const distinct = await prisma.caso.findMany({ select: { area: true }, distinct: ["area"] })
  const canonicalChaves = new Set<string>(areas.map((p) => p.id))
  let normed = 0
  for (const { area } of distinct) {
    if (!area) continue
    if (canonicalChaves.has(area)) continue // already a canonical chave
    const key = normalizar(area).replace(/[^a-z0-9]+/g, " ").trim()
    const mapped = normalMap[key]
    if (mapped) {
      const r = await prisma.caso.updateMany({ where: { area }, data: { area: mapped } })
      normed += r.count
    } else {
      // Create a new AreaDireito from the free-text value and keep the chave
      const slug = normalizar(area).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50) || "area"
      let chave = slug
      let attempt = 1
      while (true) {
        const exists = await prisma.areaDireito.findUnique({ where: { chave } })
        if (!exists) break
        chave = `${slug}_${++attempt}`
      }
      await prisma.areaDireito.upsert({
        where: { chave },
        create: { chave, nome: area, ordem: 100, ativo: true },
        update: { nome: area },
      })
      canonicalChaves.add(chave)
      const r = await prisma.caso.updateMany({ where: { area }, data: { area: chave } })
      normed += r.count
      console.log(`  → nova área "${area}" → chave "${chave}"`)
    }
  }
  if (normed) console.log(`Casos normalizados: ${normed} registros.`)
}

async function main() {
  const map = await seedAreas()
  const backfilled = await backfillTarefas(map)
  const tpl = await seedHolding()
  await seedAreasDireito()
  console.log(`Projetos por área: ${map.size}. Backfill de tarefas: ${backfilled}.`)
  console.log(`Template "${tpl.nome}" pronto com ${tpl.itens} itens.`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
