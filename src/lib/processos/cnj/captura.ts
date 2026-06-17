// Orquestração da captura CNJ: liga os clients (Comunica/DJEN + DataJud) à porta
// `ingerir` JÁ existente, com falha ISOLADA por OAB/tribunal (uma falha não derruba
// a rodada), dedup por externalId (no `ingerir`), dry-run, backfill e log de execução
// (ExecucaoCaptura — a superfície de "falha de captura"). NÃO duplica persistência.
// SERVER ONLY. Chamado pelos jobs de cron, pela rota manual e pelos scripts CLI.
import { prisma } from "@/lib/db"
import { env } from "@/lib/env"
import { log } from "@/lib/log"
import { notificarCapturaFalha } from "@/lib/notificacoes/triggers"
import { aliasDataJud } from "../cnj-tribunal"
import { carregarContextoPrazo } from "../contexto"
import { addDiasISO, hojeISO } from "../datas"
import { ingerir } from "../ingestao"
import { isDiaUtil } from "../prazo"
import { proporPrazosDeAndamentos } from "../triagem-ai"
import type { PublicacaoExterna } from "../types"
import { consultarPorOab } from "./comunica/client"
import { comunicacaoParaPublicacao } from "./comunica/map"
import { COMUNICA, DATAJUD, datajudApiKey } from "./config"
import { consultarProcesso, DataJudIndisponivel } from "./datajud/client"
import { movimentosParaAndamentos } from "./datajud/map"

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/** Mascara dígitos longos (CPF/OAB/protocolo) em mensagens antes de logar/persistir. */
function mascararErro(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.replace(/\d{6,}/g, "###").slice(0, 300)
}

function noon(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

export type FonteCaptura = "comunica" | "datajud"

export interface ResumoCaptura {
  fonte: FonteCaptura
  dryRun: boolean
  escopos: number // OABs ou tribunais varridos
  encontrados: number
  criados: number
  ignorados: number
  semVinculo: number
  falhas: number // escopos que deram erro
  execucoes: number[] // ids das ExecucaoCaptura gravadas
}

function novoResumo(fonte: FonteCaptura, dryRun: boolean): ResumoCaptura {
  return { fonte, dryRun, escopos: 0, encontrados: 0, criados: 0, ignorados: 0, semVinculo: 0, falhas: 0, execucoes: [] }
}

function semExecucoes(r: ResumoCaptura): Omit<ResumoCaptura, "execucoes"> {
  const { execucoes: _execucoes, ...rest } = r
  return rest
}

async function registrarExecucao(input: {
  fonte: FonteCaptura
  escopo: string
  status: "ok" | "erro" | "dry-run"
  iniciadoEm: Date
  janelaDe?: string
  janelaAte?: string
  encontrados?: number
  criados?: number
  ignorados?: number
  semVinculo?: number
  erro?: string
}): Promise<number> {
  const row = await prisma.execucaoCaptura.create({
    data: {
      fonte: input.fonte,
      escopo: input.escopo,
      status: input.status,
      iniciadoEm: input.iniciadoEm,
      finalizadoEm: new Date(),
      janelaDe: input.janelaDe ? noon(input.janelaDe) : null,
      janelaAte: input.janelaAte ? noon(input.janelaAte) : null,
      encontrados: input.encontrados ?? 0,
      criados: input.criados ?? 0,
      ignorados: input.ignorados ?? 0,
      semVinculo: input.semVinculo ?? 0,
      erro: input.erro ?? null,
    },
    select: { id: true },
  })
  // Falha de captura → alerta os gestores (sino + e-mail conforme preferências).
  if (input.status === "erro") {
    void notificarCapturaFalha({ fonte: input.fonte, escopo: input.escopo, erro: input.erro ?? null })
  }
  return row.id
}

// ── Intimações (Comunica/DJEN) → Publicacao pendente de triagem ────────────────
export interface OpcoesIntimacoes {
  desdeISO?: string // backfill: início da janela; default = hoje - CAPTURA_JANELA_DIAS
  ateISO?: string // default = hoje
  janelaDias?: number
  dryRun?: boolean
  oabIds?: number[] // subconjunto; default = todas as ativas
}

export async function capturarIntimacoes(opts: OpcoesIntimacoes = {}): Promise<ResumoCaptura> {
  const dryRun = !!opts.dryRun
  const ate = opts.ateISO ?? hojeISO()
  const janela = opts.janelaDias ?? env.CAPTURA_JANELA_DIAS
  const de = opts.desdeISO ?? addDiasISO(ate, -janela)
  const oabs = await prisma.oabMonitorada.findMany({
    where: { ativo: true, ...(opts.oabIds?.length ? { id: { in: opts.oabIds } } : {}) },
    orderBy: { id: "asc" },
  })

  const resumo = novoResumo("comunica", dryRun)
  resumo.escopos = oabs.length

  for (const oab of oabs) {
    const escopo = `${oab.numero}/${oab.uf}`
    const iniciadoEm = new Date()
    try {
      const items = await consultarPorOab({ numeroOab: oab.numero, ufOab: oab.uf, de, ate }, () =>
        sleep(COMUNICA.delayEntrePaginasMs),
      )
      const pubs = items
        .map((it) => comunicacaoParaPublicacao(it, oab.numero, oab.uf))
        .filter((p): p is PublicacaoExterna => p != null)
      let criados = 0
      let ignorados = 0
      let semVinculo = 0
      if (!dryRun && pubs.length) {
        const r = await ingerir({ publicacoes: pubs })
        criados = r.publicacoesCriadas
        ignorados = r.publicacoesIgnoradas
        semVinculo = r.semVinculo
      }
      resumo.encontrados += items.length
      resumo.criados += criados
      resumo.ignorados += ignorados
      resumo.semVinculo += semVinculo
      resumo.execucoes.push(
        await registrarExecucao({
          fonte: "comunica",
          escopo,
          status: dryRun ? "dry-run" : "ok",
          iniciadoEm,
          janelaDe: de,
          janelaAte: ate,
          encontrados: items.length,
          criados,
          ignorados,
          semVinculo,
        }),
      )
    } catch (e) {
      resumo.falhas++
      log.error({ cnj: "captura-intimacoes", escopo, err: mascararErro(e) }, "falha na captura de uma OAB")
      resumo.execucoes.push(
        await registrarExecucao({
          fonte: "comunica",
          escopo,
          status: "erro",
          iniciadoEm,
          janelaDe: de,
          janelaAte: ate,
          erro: mascararErro(e),
        }),
      )
    }
  }
  log.info({ cnj: "captura-intimacoes", ...semExecucoes(resumo) }, "captura de intimações concluída")
  return resumo
}

// ── Andamentos (DataJud) → Andamento (metadados, NÃO conta prazo) ──────────────
export interface OpcoesAndamentos {
  processoIds?: number[] // subconjunto; default = todos com numeroCnj
  dryRun?: boolean
}

export async function capturarAndamentos(opts: OpcoesAndamentos = {}): Promise<ResumoCaptura> {
  const dryRun = !!opts.dryRun
  const resumo = novoResumo("datajud", dryRun)
  if (!datajudApiKey()) {
    log.warn({ cnj: "captura-andamentos" }, "DATAJUD_API_KEY ausente — captura de andamentos desabilitada")
    return resumo
  }
  const processos = await prisma.processo.findMany({
    where: { excluidoEm: null, numeroCnj: { not: null }, ...(opts.processoIds?.length ? { id: { in: opts.processoIds } } : {}) },
    select: { id: true, numeroCnj: true },
    orderBy: { id: "asc" },
  })
  resumo.escopos = new Set(processos.map((p) => aliasDataJud(p.numeroCnj ?? "")).filter(Boolean)).size

  // A consulta é POR PROCESSO, mas o log de execução é POR TRIBUNAL (uma linha por
  // alias), para casar com `escopos` e não inflar a tabela com N linhas/processo.
  const iniciadoEm = new Date()
  type Agg = { encontrados: number; criados: number; ignorados: number; falhas: number; erro?: string }
  const porTribunal = new Map<string, Agg>()
  const agg = (escopo: string): Agg => {
    let a = porTribunal.get(escopo)
    if (!a) {
      a = { encontrados: 0, criados: 0, ignorados: 0, falhas: 0 }
      porTribunal.set(escopo, a)
    }
    return a
  }

  for (const proc of processos) {
    const cnj = proc.numeroCnj ?? ""
    const escopo = aliasDataJud(cnj) ?? "desconhecido"
    const a = agg(escopo)
    try {
      const source = await consultarProcesso(cnj)
      await sleep(DATAJUD.delayEntreProcessosMs) // mantém-se abaixo de 120 req/min
      const ands = source ? movimentosParaAndamentos(source) : []
      let criados = 0
      let ignorados = 0
      if (!dryRun && ands.length) {
        const r = await ingerir({ andamentos: ands })
        criados = r.andamentosCriados
        ignorados = r.andamentosIgnorados
      }
      a.encontrados += ands.length
      a.criados += criados
      a.ignorados += ignorados
      resumo.encontrados += ands.length
      resumo.criados += criados
      resumo.ignorados += ignorados
    } catch (e) {
      if (e instanceof DataJudIndisponivel) throw e // config global ausente → aborta a rodada
      a.falhas++
      a.erro ??= mascararErro(e)
      resumo.falhas++
      log.error({ cnj: "captura-andamentos", escopo, err: mascararErro(e) }, "falha ao consultar um processo no DataJud")
    }
  }

  for (const [escopo, a] of porTribunal) {
    resumo.execucoes.push(
      await registrarExecucao({
        fonte: "datajud",
        escopo,
        status: a.falhas > 0 ? "erro" : dryRun ? "dry-run" : "ok",
        iniciadoEm,
        encontrados: a.encontrados,
        criados: a.criados,
        ignorados: a.ignorados,
        erro: a.erro,
      }),
    )
  }
  // Pós-captura: a IA propõe prazos RASCUNHO p/ os movimentos relevantes novos
  // (rotina é arquivada). Best-effort — nunca derruba a captura.
  if (!dryRun) {
    try {
      const r = await proporPrazosDeAndamentos({ processoIds: processos.map((p) => p.id) })
      log.info({ cnj: "captura-andamentos", ...r }, "auto-proposta de prazos")
    } catch (e) {
      log.warn({ cnj: "captura-andamentos", err: mascararErro(e) }, "auto-proposta de prazos falhou")
    }
  }
  log.info({ cnj: "captura-andamentos", ...semExecucoes(resumo) }, "captura de andamentos concluída")
  return resumo
}

// ── Gatilho unificado (rota manual / scripts) ──────────────────────────────────
export interface RunCapturaInput {
  fonte?: "comunica" | "datajud" | "ambas"
  dryRun?: boolean
  desde?: string // backfill p/ intimações
}

export async function runCaptura(
  input: RunCapturaInput = {},
): Promise<{ intimacoes?: ResumoCaptura; andamentos?: ResumoCaptura }> {
  const fonte = input.fonte ?? "ambas"
  const dryRun = !!input.dryRun
  const out: { intimacoes?: ResumoCaptura; andamentos?: ResumoCaptura } = {}
  if (fonte === "comunica" || fonte === "ambas") out.intimacoes = await capturarIntimacoes({ dryRun, desdeISO: input.desde })
  if (fonte === "datajud" || fonte === "ambas") out.andamentos = await capturarAndamentos({ dryRun })
  return out
}

/** Hoje é dia útil (não é fim de semana/feriado/suspensão)? Para o gate do cron. */
export async function ehDiaUtilHoje(): Promise<boolean> {
  const hoje = hojeISO()
  const ctx = await carregarContextoPrazo([Number(hoje.slice(0, 4))])
  return isDiaUtil(hoje, ctx)
}
