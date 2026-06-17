import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Generate next month's "aberto" occurrence for each recurring series, only if
// it doesn't already exist. App-generated rows are marked `geradoPorApp` and
// keyed by a synthetic astreaId so re-running never duplicates (never touches
// the rows that came from Astrea).
export async function POST() {
  const denied = await guardRequest()
  if (denied) return denied

  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const targetEnd = new Date(now.getFullYear(), now.getMonth() + 2, 1)
  const ym = `${target.getFullYear()}${String(target.getMonth() + 1).padStart(2, "0")}`

  const series = await prisma.lancamento.findMany({
    where: { recorrenteParentId: { not: null }, tipo: "entrada" },
    select: { recorrenteParentId: true },
    distinct: ["recorrenteParentId"],
  })

  let created = 0
  for (const { recorrenteParentId } of series) {
    if (!recorrenteParentId) continue

    const existing = await prisma.lancamento.findFirst({
      where: {
        OR: [{ id: recorrenteParentId }, { recorrenteParentId }],
        dataVencimento: { gte: target, lt: targetEnd },
      },
      select: { id: true },
    })
    if (existing) continue

    const base = await prisma.lancamento.findFirst({
      where: { OR: [{ id: recorrenteParentId }, { recorrenteParentId }] },
      orderBy: { dataVencimento: "desc" },
    })
    if (!base || !base.dataVencimento) continue

    const day = base.dataVencimento.getDate()
    const dueDate = new Date(target.getFullYear(), target.getMonth(), Math.min(day, 28), 12, 0, 0)
    const astreaId = `app-${recorrenteParentId}-${ym}`

    await prisma.lancamento.upsert({
      where: { astreaId },
      update: {},
      create: {
        astreaId,
        tipo: "entrada",
        status: "aberto",
        subTipo: base.subTipo,
        descricao: base.descricao,
        valorCents: base.valorCents,
        valorOriginalCents: base.valorOriginalCents,
        responsavel: base.responsavel,
        dataLancamento: now,
        dataVencimento: dueDate,
        recorrenteParentId,
        geradoPorApp: true,
        isAnomalia: false,
        contaId: base.contaId,
        categoriaId: base.categoriaId,
        centroCustoId: base.centroCustoId,
        clienteId: base.clienteId,
        casoId: base.casoId,
      },
    })
    created++
  }

  return NextResponse.json({ ok: true, created, mesAlvo: ym })
}
