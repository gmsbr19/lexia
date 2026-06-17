// Saúde / consistência do módulo Processos. SERVER ONLY. Lista (RBAC-escopado) as
// pendências de integração de dados que a IA deve ajudar a resolver: processos sem
// partes estruturadas, casos sem cliente, prazos sem responsável, publicações a
// vincular e honorários sem processo. Cada linha tem deep-link para onde se conserta
// e uma `chave` de dispensa (soneca/"nunca mais", via lib/sugestoes/dispensa).
import type { Prisma } from "@prisma/client"
import type { SessionUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { dispensadas } from "@/lib/sugestoes/dispensa"
import { addDiasISO, hojeISO } from "./datas"
import { scopeProcessoWhere, veTudo } from "./rbac"
import { urgenciaDe } from "./urgencia"

export interface SaudeItem {
  id: number
  titulo: string
  sub: string
  href: string
  chave: string
}
export interface SaudeGrupo {
  id: string
  titulo: string
  descricao: string
  icon: string
  tone: "alerta" | "neutro"
  itens: SaudeItem[]
  mais: number // quantos além dos exibidos (indicador)
}
export interface SaudeProcessos {
  grupos: SaudeGrupo[]
  total: number
  geradoEm: string
}

const CAP = 20

export async function getSaudeProcessos(user: SessionUser): Promise<SaudeProcessos> {
  const scope = await scopeProcessoWhere(user)
  const podeFin = veTudo(user.role) // honorários/publicações 'a vincular' são office-wide

  const [dismissed, semPartes, semCliente, prazosSemResp, pubsPendentes, honSemProc] = await Promise.all([
    dispensadas(),
    prisma.processo.findMany({
      where: { AND: [scope, { excluidoEm: null }, { partes: { none: {} } }] },
      select: { id: true, numeroCnj: true, caso: { select: { titulo: true } } },
      take: CAP + 1,
    }),
    prisma.processo.findMany({
      where: { AND: [scope, { excluidoEm: null }, { caso: { clientePrincipalId: null } }] },
      select: { id: true, numeroCnj: true, caso: { select: { titulo: true } } },
      take: CAP + 1,
    }),
    prisma.prazo.findMany({
      where: { AND: [{ excluidoEm: null, status: "pendente", responsavelUserId: null }, { processo: { AND: [scope, { excluidoEm: null }] } }] },
      select: { id: true, descricao: true, processoId: true, processo: { select: { numeroCnj: true } } },
      orderBy: { dataFatal: "asc" },
      take: CAP + 1,
    }),
    podeFin
      ? prisma.publicacao.findMany({
          where: { excluidoEm: null, statusTriagem: "pendente", processoId: null },
          select: { id: true, numeroProcessoBruto: true },
          orderBy: { createdAt: "asc" },
          take: CAP + 1,
        })
      : Promise.resolve([] as { id: number; numeroProcessoBruto: string | null }[]),
    podeFin
      ? prisma.honorario.findMany({
          where: { processoId: null, processoTitulo: { not: null } },
          select: { id: true, descricao: true, processoTitulo: true },
          take: CAP + 1,
        })
      : Promise.resolve([] as { id: number; descricao: string; processoTitulo: string | null }[]),
  ])

  const grupos: SaudeGrupo[] = []
  const add = (g: Omit<SaudeGrupo, "itens" | "mais">, raw: SaudeItem[]) => {
    const itens = raw.filter((it) => !dismissed.has(it.chave))
    if (!itens.length) return
    grupos.push({ ...g, itens: itens.slice(0, CAP), mais: Math.max(0, itens.length - CAP) })
  }

  add(
    { id: "prazo-sem-resp", titulo: "Prazos sem responsável", descricao: "Defina o advogado responsável para que as notificações cheguem a alguém.", icon: "flag", tone: "alerta" },
    prazosSemResp.map((p) => ({
      id: p.id,
      titulo: p.descricao,
      sub: `${p.processo?.numeroCnj ?? "processo"} · sem responsável`,
      href: `/processos/${p.processoId}`,
      chave: `reconcile:prazoresp:${p.id}`,
    })),
  )
  add(
    { id: "sem-partes", titulo: "Processos sem partes", descricao: "Processos capturados sem partes estruturadas — peça à LexIA para estruturá-las.", icon: "scale", tone: "neutro" },
    semPartes.map((p) => ({
      id: p.id,
      titulo: p.numeroCnj ?? p.caso?.titulo ?? `Processo #${p.id}`,
      sub: p.caso?.titulo ?? "sem caso",
      href: `/processos/${p.id}`,
      chave: `reconcile:partes:${p.id}`,
    })),
  )
  add(
    { id: "sem-cliente", titulo: "Processos sem cliente", descricao: "O caso destes processos não tem cliente principal vinculado.", icon: "inbox", tone: "neutro" },
    semCliente.map((p) => ({
      id: p.id,
      titulo: p.numeroCnj ?? p.caso?.titulo ?? `Processo #${p.id}`,
      sub: p.caso?.titulo ?? "sem caso",
      href: `/processos/${p.id}`,
      chave: `reconcile:cliente:${p.id}`,
    })),
  )
  add(
    { id: "pub-pendente", titulo: "Publicações a vincular", descricao: "Intimações capturadas ainda sem processo — faça a triagem/vínculo.", icon: "inbox", tone: "alerta" },
    pubsPendentes.map((pub) => ({
      id: pub.id,
      titulo: pub.numeroProcessoBruto ?? `Publicação #${pub.id}`,
      sub: "pendente de triagem/vínculo",
      href: `/processos?view=andamentos`,
      chave: `reconcile:pub:${pub.id}`,
    })),
  )
  add(
    { id: "hon-sem-proc", titulo: "Honorários sem processo", descricao: "Honorários ligados apenas por texto — conecte-os a um processo específico.", icon: "fileText", tone: "neutro" },
    honSemProc.map((h) => ({
      id: h.id,
      titulo: h.descricao,
      sub: h.processoTitulo ? `${h.processoTitulo} · sem vínculo` : "sem vínculo",
      href: `/financeiro?tab=honorarios`,
      chave: `reconcile:hon:${h.id}`,
    })),
  )

  return { grupos, total: grupos.reduce((s, g) => s + g.itens.length, 0), geradoEm: new Date().toISOString() }
}

// ── Alertas de processos (flat list for the Painel/Processos tab) ───────────────
// A higher-signal, flat feed of "needs attention" rows: processos parados (sem
// movimentação há 60+ dias), prazos em risco (urgência vermelha) e algumas
// inconsistências de dados (reaproveita getSaudeProcessos). RBAC-escopado; cada
// alerta carrega uma `chave` estável (dispensa via lib/sugestoes/dispensa).
export interface AlertaProcesso {
  tipo: "parado" | "prazo_risco" | "inconsistencia"
  processoId: number | null
  titulo: string
  detalhe: string
  href: string
  chave: string
}

const ALERTA_CAP = 30
const PARADO_DIAS = 60

export async function getAlertasProcessos(user: SessionUser): Promise<AlertaProcesso[]> {
  const scope = await scopeProcessoWhere(user)
  const hoje = hojeISO()
  const limiteParado = addDiasISO(hoje, -PARADO_DIAS)

  const baseProcesso: Prisma.ProcessoWhereInput = { AND: [scope, { excluidoEm: null }] }

  const [dismissed, processosAtivos, prazosPendentes, saude] = await Promise.all([
    dispensadas(),
    // processos ativos + o andamento mais recente (p/ detectar "parado")
    prisma.processo.findMany({
      where: { AND: [scope, { excluidoEm: null }, { status: "ativo" }] },
      select: {
        id: true,
        numeroCnj: true,
        caso: { select: { titulo: true } },
        andamentos: {
          where: { excluidoEm: null },
          select: { data: true },
          orderBy: { data: "desc" },
          take: 1,
        },
      },
      take: 500,
    }),
    // prazos pendentes do escopo → urgência vermelha vira alerta
    prisma.prazo.findMany({
      where: { AND: [{ excluidoEm: null, status: "pendente" }, { processo: baseProcesso }] },
      select: {
        id: true,
        descricao: true,
        processoId: true,
        dataFatal: true,
        dataInterna: true,
        processo: { select: { numeroCnj: true } },
      },
      orderBy: { dataFatal: "asc" },
      take: 200,
    }),
    getSaudeProcessos(user),
  ])

  const alertas: AlertaProcesso[] = []

  // 1) parados (sem andamento ou último andamento há 60+ dias)
  for (const p of processosAtivos) {
    const ultimo = p.andamentos[0]?.data
    const ultimoISO = ultimo ? ultimo.toISOString().slice(0, 10) : null
    if (ultimoISO && ultimoISO >= limiteParado) continue // movimentou recentemente
    const titulo = p.numeroCnj ?? p.caso?.titulo ?? `Processo #${p.id}`
    const detalhe = ultimoISO ? `Sem movimentação desde ${ultimoISO}.` : "Sem andamentos registrados."
    alertas.push({
      tipo: "parado",
      processoId: p.id,
      titulo,
      detalhe,
      href: `/processos/${p.id}`,
      chave: `alerta:parado:${p.id}`,
    })
  }

  // 2) prazos em risco (urgência vermelha = vencido/hoje/dentro da margem)
  for (const pr of prazosPendentes) {
    const dataFatal = pr.dataFatal.toISOString().slice(0, 10)
    const dataInterna = pr.dataInterna ? pr.dataInterna.toISOString().slice(0, 10) : null
    const u = urgenciaDe(dataFatal, dataInterna, hoje)
    if (u.faixa !== "vermelho") continue
    const venc =
      u.estado === "vencido"
        ? `Vencido em ${dataFatal}.`
        : u.estado === "hoje"
          ? "Vence hoje."
          : `Data fatal ${dataFatal} — dentro da margem de segurança.`
    alertas.push({
      tipo: "prazo_risco",
      processoId: pr.processoId,
      titulo: pr.descricao,
      detalhe: `${pr.processo?.numeroCnj ?? "Processo"} · ${venc}`,
      href: `/processos/${pr.processoId}`,
      chave: `alerta:prazorisco:${pr.id}`,
    })
  }

  // 3) inconsistências (reaproveita a saúde; só veTudo já é filtrado lá dentro)
  for (const g of saude.grupos) {
    for (const it of g.itens) {
      alertas.push({
        tipo: "inconsistencia",
        processoId: g.id === "pub-pendente" ? null : it.id,
        titulo: it.titulo,
        detalhe: `${g.titulo} · ${it.sub}`,
        href: it.href,
        chave: it.chave, // já é estável e dispensável (reconcile:*)
      })
    }
  }

  // filtra dispensados, prioriza prazo em risco → parado → inconsistência, e limita
  const ordem: Record<AlertaProcesso["tipo"], number> = { prazo_risco: 0, parado: 1, inconsistencia: 2 }
  return alertas
    .filter((a) => !dismissed.has(a.chave))
    .sort((a, b) => ordem[a.tipo] - ordem[b.tipo])
    .slice(0, ALERTA_CAP)
}
