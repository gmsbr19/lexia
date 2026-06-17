"use client"

// Contencioso · caixa de entrada unificada. Dois segmentos:
//  • Movimentos  — andamentos capturados (DataJud) agrupados POR PROCESSO, a revisar.
//    Abrir um processo → revisar movimento a movimento (IA sugere relevância/prazo).
//  • Intimações  — fila de triagem das publicações capturadas (DJe etc.).
import { useCallback, useEffect, useMemo, useState } from "react"
import { FxFrame, FxSegmented, CrmBadge, CrmEmpty, CrmLink, CrmPageHead, CrmSearch, useCrmToast } from "@/components/crm/crm-kit"
import { crmDate } from "@/components/crm/crm-fmt"
import { Icon } from "@/components/crm/crm-icons"
import { limparTextoPublicacao } from "@/lib/processos/texto"
import type { ProcessosDataset } from "@/lib/processos/dataset"
import type { MovimentoInboxRow, PublicacaoRow } from "@/lib/processos/types"
import type { ProcNav } from "../proc-types"
import { ProcFonte, ProcMovIcon, ProcStat } from "../proc-kit"
import { listMovimentosInbox, reabrirTriagem, triarPublicacao } from "../proc-api"
import { ProcMovimentoReviewModal } from "../ProcModals"

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]
const norm = (s: string | null) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
const diaDe = (p: PublicacaoRow) => (p.dataPublicacao ?? p.dataDisponibilizacao ?? p.createdAt).slice(0, 10)

export function ProcAndamentos({
  dataset, nav, onTriar, onNovaPublicacao, onVincular,
}: {
  dataset: ProcessosDataset
  nav: ProcNav
  onTriar: (pub: PublicacaoRow) => void
  onNovaPublicacao: () => void
  onVincular: (pub: PublicacaoRow) => void
}) {
  const [seg, setSeg] = useState<"movimentos" | "intimacoes">("movimentos")
  const [inbox, setInbox] = useState<MovimentoInboxRow[] | null>(null)
  const [reviewing, setReviewing] = useState<MovimentoInboxRow | null>(null)

  const loadInbox = useCallback(() => {
    listMovimentosInbox()
      .then(setInbox)
      .catch(() => setInbox([]))
  }, [])
  useEffect(() => loadInbox(), [loadInbox])

  const kInbox = inbox?.length ?? 0
  const kPend = dataset.publicacoes.filter((a) => a.statusTriagem === "pendente").length

  return (
    <FxFrame>
      <CrmPageHead
        title="Andamentos & publicações"
        sub="Tudo que a captura trouxe dos tribunais (DataJud) e diários (DJe) — revise e adicione um a um."
      />

      <div style={{ marginBottom: 18 }}>
        <FxSegmented
          options={[
            { value: "movimentos", label: kInbox ? `Movimentos (${kInbox})` : "Movimentos" },
            { value: "intimacoes", label: kPend ? `Intimações (${kPend})` : "Intimações" },
          ]}
          value={seg}
          onChange={(v) => setSeg(v as "movimentos" | "intimacoes")}
        />
      </div>

      {seg === "movimentos" ? (
        <MovimentosQueue inbox={inbox} nav={nav} onReview={setReviewing} />
      ) : (
        <IntimacoesQueue dataset={dataset} nav={nav} onTriar={onTriar} onNovaPublicacao={onNovaPublicacao} onVincular={onVincular} />
      )}

      {reviewing && (
        <ProcMovimentoReviewModal
          processoId={reviewing.processoId}
          titulo={reviewing.numeroCnj ?? reviewing.caso ?? `Processo #${reviewing.processoId}`}
          responsaveis={dataset.responsaveis}
          hoje={dataset.hoje}
          onClose={() => setReviewing(null)}
          onDone={() => {
            loadInbox()
            nav.refresh()
          }}
        />
      )}
    </FxFrame>
  )
}

// ── Movimentos a revisar (por processo) ──────────────────────────────────────────
function MovimentosQueue({
  inbox, nav, onReview,
}: {
  inbox: MovimentoInboxRow[] | null
  nav: ProcNav
  onReview: (row: MovimentoInboxRow) => void
}) {
  if (inbox == null) return <div style={{ fontSize: 13, color: "var(--text-subtle)", padding: 8 }}>Carregando movimentos…</div>
  if (inbox.length === 0)
    return (
      <div className="card">
        <CrmEmpty icon="checkCircle" title="Nenhum movimento a revisar" sub="Rode a captura (aba Captura) para trazer os andamentos dos tribunais." />
      </div>
    )
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {inbox.map((p) => (
        <div key={p.processoId} className="card" style={{ display: "flex", gap: 13, padding: "14px 18px", alignItems: "flex-start" }}>
          <ProcMovIcon tipo="andamento" active={p.temRelevante} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <CrmLink onClick={() => nav.openProcesso(p.processoId)} icon="scale">{p.numeroCnj ?? p.caso ?? `Processo #${p.processoId}`}</CrmLink>
              <CrmBadge tone={p.temRelevante ? "gold" : "neutral"} dot>{p.totalNovos} novo{p.totalNovos === 1 ? "" : "s"}</CrmBadge>
              {p.temRelevante && <span style={{ fontSize: 11.5, color: "var(--warn)", fontWeight: 500 }}>há movimento relevante</span>}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {p.caso ? `${p.caso}${p.cliente ? ` · ${p.cliente}` : ""} — ` : ""}{p.exemplos.join(" · ")}
            </div>
            {p.ultimaData && <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 6 }}>último movimento: {crmDate(p.ultimaData)}</div>}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => onReview(p)} style={{ fontSize: 12, flexShrink: 0 }}>
            <Icon name="inbox" size={13} />Revisar
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Intimações (triagem de publicações) — fluxo existente ──────────────────────────
function IntimacoesQueue({
  dataset, nav, onTriar, onNovaPublicacao, onVincular,
}: {
  dataset: ProcessosDataset
  nav: ProcNav
  onTriar: (pub: PublicacaoRow) => void
  onNovaPublicacao: () => void
  onVincular: (pub: PublicacaoRow) => void
}) {
  const { publicacoes, hoje } = dataset
  const { toast } = useCrmToast()
  const [filtro, setFiltro] = useState("pendente")
  const [q, setQ] = useState("")
  const nq = norm(q.trim())

  const list = useMemo(
    () =>
      publicacoes
        .filter((a) => (filtro === "todos" ? true : a.statusTriagem === filtro))
        .filter((a) => (!nq ? true : norm(a.conteudo).includes(nq) || norm(a.diario).includes(nq) || norm(a.numeroCnj).includes(nq)))
        .sort((a, b) => diaDe(b).localeCompare(diaDe(a))),
    [publicacoes, filtro, nq],
  )

  const kPend = publicacoes.filter((a) => a.statusTriagem === "pendente").length
  const kTriada = publicacoes.filter((a) => a.statusTriagem === "triada").length
  const kDesc = publicacoes.filter((a) => a.statusTriagem === "descartada").length

  const byDay = useMemo(() => {
    const m: Record<string, PublicacaoRow[]> = {}
    for (const a of list) (m[diaDe(a)] ||= []).push(a)
    return m
  }, [list])
  const days = Object.keys(byDay).sort((a, b) => b.localeCompare(a))

  const descartar = async (id: number) => {
    try {
      await triarPublicacao(id, { acao: "descartar" })
      toast("Marcada como cartorário — desfaça em Descartadas", { icon: "circleDot" })
      nav.refresh()
    } catch {
      toast("Não foi possível descartar", { tone: "neg" })
    }
  }
  const reabrir = async (id: number) => {
    try {
      await reabrirTriagem(id)
      toast("Publicação reaberta para triagem", { icon: "inbox" })
      nav.refresh()
    } catch {
      toast("Não foi possível reabrir", { tone: "neg" })
    }
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 18 }}>
        <ProcStat label="A triar" value={kPend} icon="inbox" tone={kPend ? "warn" : null} onClick={() => setFiltro("pendente")} />
        <ProcStat label="Triadas (geraram prazo)" value={kTriada} icon="flag" />
        <ProcStat label="Descartadas (cartorário)" value={kDesc} icon="circleDot" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <FxSegmented
          options={[{ value: "pendente", label: "A triar" }, { value: "triada", label: "Triadas" }, { value: "descartada", label: "Descartadas" }, { value: "todos", label: "Todas" }]}
          value={filtro}
          onChange={setFiltro}
        />
        <CrmSearch value={q} onChange={setQ} placeholder="Buscar publicação, processo…" />
        <button className="btn btn-secondary" onClick={onNovaPublicacao} style={{ marginLeft: "auto" }}><Icon name="plus" size={15} />Registrar publicação</button>
      </div>

      {list.length === 0 ? (
        <div className="card"><CrmEmpty icon="checkCircle" title="Nada por aqui" sub="Nenhuma publicação neste filtro." /></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {days.map((iso) => {
            const d = new Date(`${iso}T12:00:00`)
            const isToday = iso === hoje
            return (
              <div key={iso}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 9 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>{isToday ? "Hoje" : `${d.getDate()} de ${MESES[d.getMonth()]}`}</span>
                  <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{DIAS[d.getDay()]}-feira</span>
                </div>
                <div className="card" style={{ overflow: "hidden" }}>
                  {byDay[iso].map((a, i) => {
                    const isPend = a.statusTriagem === "pendente"
                    return (
                      <div key={a.id} style={{ display: "flex", gap: 13, padding: "14px 18px", borderTop: i ? "1px solid var(--border)" : "none", background: isPend ? "var(--bg-soft)" : "transparent" }}>
                        <ProcMovIcon tipo="publicacao" active={isPend} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>{a.diario ?? "Publicação"}</span>
                            {isPend && <CrmBadge tone="gold" dot>a triar</CrmBadge>}
                            {a.statusTriagem === "triada" && <CrmBadge tone="pos" dot>relevante</CrmBadge>}
                            {a.statusTriagem === "descartada" && <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>cartorário</span>}
                          </div>
                          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{limparTextoPublicacao(a.conteudo)}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 8, flexWrap: "wrap" }}>
                            <ProcFonte fonte="dje" />
                            <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{crmDate(a.dataPublicacao ?? a.dataDisponibilizacao ?? a.createdAt)}</span>
                            {a.processoId && a.numeroCnj ? (
                              <CrmLink onClick={() => nav.openProcesso(a.processoId as number)} icon="scale">{a.numeroCnj}</CrmLink>
                            ) : (
                              <button
                                onClick={() => onVincular(a)}
                                title="Vincular a um processo/caso"
                                style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, fontSize: 12, fontWeight: 500, color: "var(--warn)", display: "inline-flex", alignItems: "center", gap: 4 }}
                              >
                                <Icon name="alertCircle" size={12} />Vincular processo
                              </button>
                            )}
                          </div>
                        </div>
                        {isPend ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 7, alignItems: "flex-end", flexShrink: 0 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => onTriar(a)} style={{ fontSize: 12 }}><Icon name="flag" size={13} />Triar / gerar prazo</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => descartar(a.id)} style={{ fontSize: 12 }}><Icon name="circleDot" size={12} />Cartorário</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "flex-start", flexShrink: 0 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => reabrir(a.id)} title="Voltar para 'a triar'" style={{ fontSize: 12 }}><Icon name="refreshCw" size={12} />Reabrir</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
