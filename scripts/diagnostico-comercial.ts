/**
 * DIAGNÓSTICO (somente leitura) do dashboard Comercial.
 *
 * Explica, para um mês, POR QUE "Investimento em anúncios" e/ou
 * "Valor contratado" aparecem zerados. Replica a mesma lógica de
 * src/lib/comercial/{queries,valor,cm-meta}.ts. NÃO grava nada.
 *
 *   npx tsx scripts/diagnostico-comercial.ts 2026-06
 *
 * (sem argumento usa o mês atual)
 */
import { PrismaClient } from "@prisma/client"
import { normalizar } from "../src/lib/text"
import { MARKETING_CATEGORIA_ASTREA_ID } from "../src/lib/comercial/types"
import { valorContratadoPorLead } from "../src/lib/comercial/valor"

const prisma = new PrismaClient()

// mesmo helper de queries.ts
function ehCategoriaMarketing(nome: string | null | undefined): boolean {
  const n = normalizar(nome ?? "")
  return n.includes("marketing") || n.includes("anuncio") || n.includes("ad ") || n === "ads"
}

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const mesDe = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "—")

async function main() {
  const arg = process.argv[2]
  const now = new Date()
  const mes = arg ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const [y, m] = mes.split("-").map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 1)
  console.log(`\n═══ Diagnóstico Comercial · ${mes} ═══\n`)

  // ── 1) INVESTIMENTO EM ANÚNCIOS ────────────────────────────────────────────
  const cats = await prisma.categoria.findMany({ select: { id: true, nome: true, astreaId: true } })
  const marketingIds = cats
    .filter((c) => c.astreaId === MARKETING_CATEGORIA_ASTREA_ID || ehCategoriaMarketing(c.nome))
    .map((c) => c.id)
  console.log("── INVESTIMENTO EM ANÚNCIOS ──────────────────────────────")
  console.log(`Categorias reconhecidas como marketing: ${
    cats.filter((c) => marketingIds.includes(c.id)).map((c) => `"${c.nome}"`).join(", ") || "(nenhuma)"
  }`)

  // saídas que a dashboard CONSIDERA gasto (campanha OU categoria marketing)
  const gastos = await prisma.lancamento.findMany({
    where: {
      tipo: "saida",
      isAnomalia: false,
      OR: [{ campanhaId: { not: null } }, ...(marketingIds.length ? [{ categoriaId: { in: marketingIds } }] : [])],
    },
    select: {
      id: true, valorCents: true, dataLancamento: true, dataVencimento: true,
      descricao: true, campanhaId: true, categoria: { select: { nome: true } },
    },
    orderBy: { dataLancamento: "desc" },
  })
  // Competência = vencimento quando houver, senão data do lançamento (mesma
  // regra do spendWhere/dataset no app).
  const comp = (g: { dataVencimento: Date | null; dataLancamento: Date | null }) => g.dataVencimento ?? g.dataLancamento
  const noMes = gastos.filter((g) => { const d = comp(g); return d && d >= start && d < end })
  const totalMes = noMes.reduce((a, g) => a + Math.abs(g.valorCents), 0)
  console.log(`\nGastos reconhecidos NO MÊS (por competência = vencimento ?? lançamento): ${noMes.length} → ${brl(totalMes)}`)
  const foraDoMes = gastos.filter((g) => !noMes.includes(g))
  if (foraDoMes.length) {
    console.log(`\nⓘ  ${foraDoMes.length} gasto(s) de marketing NÃO caem no mês (competência fora de ${mes}).`)
    console.log("   A dashboard usa a competência = VENCIMENTO quando há, senão a data do lançamento.")
    console.log("   Se um deveria contar em " + mes + ", ajuste o vencimento (ou a data do lançamento) para o mês certo:")
    for (const g of foraDoMes.slice(0, 12)) {
      console.log(
        `      #${g.id} ${brl(Math.abs(g.valorCents))} · competência=${mesDe(comp(g))} (lançamento=${mesDe(g.dataLancamento)} venc=${mesDe(g.dataVencimento)}) ` +
          `· ${g.campanhaId ? "campanha#" + g.campanhaId : "cat:" + (g.categoria?.nome ?? "—")} · ${g.descricao ?? ""}`,
      )
    }
  }

  // near-misses: saídas que PARECEM anúncio mas NÃO batem no filtro
  const suspeitas = await prisma.lancamento.findMany({
    where: {
      tipo: "saida", isAnomalia: false, campanhaId: null,
      dataLancamento: { gte: start, lt: end },
      NOT: marketingIds.length ? { categoriaId: { in: marketingIds } } : undefined,
    },
    select: { id: true, valorCents: true, descricao: true, categoria: { select: { nome: true } } },
  })
  const termos = ["google", "meta", "facebook", "instagram", "ads", "anunc", "publicid", "midia", "mídia", "trafego", "tráfego", "campanha"]
  const quaseGasto = suspeitas.filter((s) => {
    const t = normalizar(`${s.descricao ?? ""} ${s.categoria?.nome ?? ""}`)
    return termos.some((k) => t.includes(normalizar(k)))
  })
  if (quaseGasto.length) {
    console.log(`\n⚠️  ${quaseGasto.length} saída(s) no mês PARECEM anúncio mas NÃO contam (categoria não é "marketing/anúncios" e sem campanha vinculada):`)
    for (const s of quaseGasto) console.log(`      #${s.id} ${brl(Math.abs(s.valorCents))} · cat:"${s.categoria?.nome ?? "—"}" · ${s.descricao ?? ""}`)
    console.log('      → mova para a categoria "Marketing/Anúncios" ou vincule uma campanha.')
  }

  // ── 2) VALOR CONTRATADO (leads ganhos) ─────────────────────────────────────
  console.log("\n── VALOR CONTRATADO (leads ganhos) ───────────────────────")
  // a dashboard cliente (cm-meta) filtra ganhos por dataENTRADA no mês;
  // o servidor (getComercialKpis) filtra por dataCONVERSAO. Mostro os dois.
  const ganhos = await prisma.lead.findMany({
    where: {
      etapa: "ganho",
      OR: [{ dataEntrada: { gte: start, lt: end } }, { dataConversao: { gte: start, lt: end } }],
    },
    select: {
      id: true, nome: true, casoId: true, dataEntrada: true, dataConversao: true,
      valorEstimadoCents: true,
      honorario: { select: { valorCents: true } },
      caso: { select: { titulo: true, honorarios: { select: { valorCents: true } } } },
    },
  })
  const valorMap = valorContratadoPorLead(
    ganhos.map((l) => ({
      id: l.id,
      casoId: l.casoId,
      conv: l.dataConversao?.getTime() ?? 0,
      honorarioCents: l.honorario?.valorCents ?? 0,
      casoHonorariosCents: (l.caso?.honorarios ?? []).reduce((a, h) => a + h.valorCents, 0),
    })),
  )
  if (ganhos.length === 0) console.log("(nenhum lead ganho com entrada ou conversão neste mês)")
  for (const l of ganhos) {
    const casoHon = (l.caso?.honorarios ?? []).reduce((a, h) => a + h.valorCents, 0)
    const valor = valorMap.get(l.id) ?? 0
    console.log(
      `\n  Lead #${l.id} "${l.nome}"` +
        `\n    entrada=${mesDe(l.dataEntrada)}  conversão=${mesDe(l.dataConversao)}` +
        `\n    casoId=${l.casoId ?? "— (SEM CASO VINCULADO)"}${l.caso ? ` ("${l.caso.titulo}")` : ""}` +
        `\n    honorários do caso: ${brl(casoHon)}   honorário ligado ao lead: ${brl(l.honorario?.valorCents ?? 0)}` +
        `\n    → VALOR CONTRATADO CONTABILIZADO: ${brl(valor)}`,
    )
    if (valor === 0) {
      if (l.casoId == null) console.log("    ✗ Motivo: lead marcado 'Ganho' SEM caso vinculado. Vincule ao caso (ou use 'Converter').")
      else if (casoHon === 0) console.log("    ✗ Motivo: o caso vinculado NÃO tem honorários (registro Honorário) — talvez o valor esteja como Lançamento avulso, ou em OUTRO caso (duplicado).")
    }
    if (l.dataEntrada && (l.dataEntrada < start || l.dataEntrada >= end)) {
      console.log(`    ⓘ  A tela do Comercial atribui a conversão pelo mês de ENTRADA/contato (${mesDe(l.dataEntrada)}) — este lead conta em ${mesDe(l.dataEntrada)}, não em ${mes}, ainda que tenha fechado agora.`)
    }
  }
  console.log("\n═══ fim ═══\n")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
