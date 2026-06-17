"use client"

// Contencioso · Casos & processos — o ACERVO aninhado do escritório (densidade
// informativa estilo Astrea, calmo). Lista agrupada por CASO; cada caso expande
// nos seus PROCESSOS. Clicar no caso abre o caso; clicar no processo abre a ficha
// consolidada. Há também uma visão "Plano" (lista plana de processos).
import { useMemo, useState } from "react"
import {
  FxFrame, FxSegmented, FxSelect, CrmBadge, CrmEmpty, CrmPageHead, CrmRow, CrmSearch,
} from "@/components/crm/crm-kit"
import { crmDate } from "@/components/crm/crm-fmt"
import { Icon } from "@/components/crm/crm-icons"
import type { ProcessosDataset } from "@/lib/processos/dataset"
import type { ProcessoRow, PrazoRow } from "@/lib/processos/types"
import type { AlertaProcesso } from "@/lib/processos/saude"
import type { CrmDataset, CasoRow } from "@/components/crm/crm-types"
import type { ProcNav } from "../proc-types"
import { ProcCNJ, ProcFaseTag, ProcResp, ProcSemaforo, ProcStat } from "../proc-kit"

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

// ── status coarse-bucket (a caso/processo cai em ativo/suspenso/arquivado) ──────
type StatusBucket = "ativos" | "suspensos" | "arquivados" | "todos"

/** Classifica um processo no balde grosseiro do filtro. */
function procBucket(p: ProcessoRow): Exclude<StatusBucket, "todos"> {
  if (p.status === "suspenso") return "suspensos"
  if (p.status === "arquivado" || p.status === "baixado") return "arquivados"
  return "ativos"
}

/** Classifica um CASO no balde grosseiro, derivado dos seus processos (ou do
 *  texto livre de caso.status quando não há processo — consultivos). */
function casoBucket(caso: CasoRow, procs: ProcessoRow[]): Exclude<StatusBucket, "todos"> {
  if (procs.length) {
    if (procs.some((p) => procBucket(p) === "ativos")) return "ativos"
    if (procs.some((p) => procBucket(p) === "suspensos")) return "suspensos"
    return "arquivados"
  }
  const s = norm(caso.status)
  if (s.includes("arquiv") || s.includes("encerr") || s.includes("baix")) return "arquivados"
  if (s.includes("suspens")) return "suspensos"
  return "ativos"
}

const STATUS_OPTS: { value: StatusBucket; label: string }[] = [
  { value: "ativos", label: "Ativos" },
  { value: "suspensos", label: "Suspensos" },
  { value: "arquivados", label: "Arquivados" },
  { value: "todos", label: "Todos" },
]

// ── alertas strip (tipo → tom) ───────────────────────────────────────────────
const ALERTA_TONE: Record<AlertaProcesso["tipo"], "neg" | "gold" | "neutral"> = {
  prazo_risco: "neg",
  parado: "gold",
  inconsistencia: "neutral",
}

function AlertasStrip({ alertas }: { alertas: AlertaProcesso[] }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || !alertas.length) return null
  const mostrados = alertas.slice(0, 3)
  const resto = alertas.length - mostrados.length
  return (
    <div
      className="card"
      style={{
        display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", marginBottom: 16,
        borderLeft: "3px solid var(--crit)", background: "var(--crit-soft)",
      }}
    >
      <span style={{ color: "var(--crit)", display: "inline-flex", marginTop: 1, flexShrink: 0 }}>
        <Icon name="alertTriangle" size={16} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>
          {alertas.length} {alertas.length === 1 ? "alerta no acervo" : "alertas no acervo"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {mostrados.map((a) => {
            const tone = ALERTA_TONE[a.tipo]
            const color = tone === "neg" ? "var(--crit)" : tone === "gold" ? "var(--accent)" : "var(--text-muted)"
            return (
              <a
                key={a.chave}
                href={a.href}
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)", textDecoration: "none", minWidth: 0 }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", flexShrink: 0 }}>{a.titulo}</span>
                <span style={{ color: "var(--text-subtle)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.detalhe}</span>
              </a>
            )
          })}
          {resto > 0 && (
            <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>+{resto} {resto === 1 ? "outro" : "outros"}</span>
          )}
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        title="Dispensar"
        style={{ border: "none", background: "transparent", color: "var(--text-subtle)", cursor: "pointer", padding: 3, borderRadius: 6, display: "inline-flex", flexShrink: 0 }}
      >
        <Icon name="x" size={15} />
      </button>
    </div>
  )
}

// ── tipo do caso (consultivo / litígio) + área ────────────────────────────────
function CasoTipoPill({ tipo, area }: { tipo: CasoRow["tipo"]; area: string | null }) {
  const lit = tipo === "litigio"
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <CrmBadge tone={lit ? "neg" : "blue"} dot>{lit ? "Litígio" : "Consultivo"}</CrmBadge>
      {area && (
        <span style={{ fontSize: 11.5, color: "var(--text-subtle)", whiteSpace: "nowrap" }}>{area}</span>
      )}
    </span>
  )
}

// ── indicador de rateio compacto (50/50, 60/40…) ──────────────────────────────
function RateioMini({ caso }: { caso: CasoRow }) {
  const rs = caso.responsaveis
  if (!rs?.length) return null
  const label = rs.map((r) => `${Math.round(r.percentual)}`).join("/")
  const title = rs.map((r) => `${r.nome} ${Math.round(r.percentual)}%`).join(" · ")
  return (
    <span
      title={title}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, color: "var(--text-muted)",
        background: "var(--bg-sunken)", padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums",
      }}
    >
      <Icon name="percent" size={11} />
      {label}
    </span>
  )
}

// ── status do caso (texto livre, badge neutro) ────────────────────────────────
function CasoStatusBadge({ bucket }: { bucket: Exclude<StatusBucket, "todos"> }) {
  if (bucket === "ativos") return <CrmBadge tone="pos" dot>Ativo</CrmBadge>
  if (bucket === "suspensos") return <CrmBadge tone="gold" dot>Suspenso</CrmBadge>
  return <CrmBadge tone="neutral" dot>Arquivado</CrmBadge>
}

const CASO_COLS = "26px 1.7fr 1fr 150px 110px"
const PROC_COLS = "1.5fr 1.2fr 1fr 150px"

export function ProcProcessos({
  dataset, crm, nav, onAbrirCaso, onNovoProcesso, alertas,
}: {
  dataset: ProcessosDataset
  crm: CrmDataset
  nav: ProcNav
  onAbrirCaso: (casoId: number) => void
  onNovoProcesso: () => void
  alertas: AlertaProcesso[]
}) {
  const { processos, prazos, responsaveis } = dataset
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<StatusBucket>("ativos")
  const [resp, setResp] = useState("todos")
  const [modo, setModo] = useState<"agrupado" | "plano">("agrupado")
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const nq = norm(q.trim())

  // próximo prazo pendente por processo (prazos já vêm ordenados por dataFatal asc)
  const proxPrazo = useMemo(() => {
    const m = new Map<number, PrazoRow>()
    for (const p of prazos) {
      if (p.status !== "pendente") continue
      if (!m.has(p.processoId)) m.set(p.processoId, p)
    }
    return m
  }, [prazos])

  // processos por caso
  const procsPorCaso = useMemo(() => {
    const m = new Map<number, ProcessoRow[]>()
    for (const p of processos) {
      const arr = m.get(p.casoId)
      if (arr) arr.push(p)
      else m.set(p.casoId, [p])
    }
    return m
  }, [processos])

  // um processo "passa" pelos filtros de status + responsável + busca
  const procMatch = (p: ProcessoRow) => {
    if (status !== "todos" && procBucket(p) !== status) return false
    if (resp !== "todos" && p.responsavel !== resp) return false
    if (
      nq &&
      !(
        norm(p.numeroCnj).includes(nq) ||
        norm(p.caso).includes(nq) ||
        norm(p.classe).includes(nq) ||
        norm(p.assunto).includes(nq) ||
        norm(p.tribunal).includes(nq)
      )
    )
      return false
    return true
  }

  // ── visão AGRUPADA: casos + os processos que casam (um caso aparece se ele OU
  //    algum processo dele casa; o status filtra coerentemente os dois níveis) ──
  const grupos = useMemo(() => {
    return crm.casos
      .map((caso) => {
        const procs = procsPorCaso.get(caso.id) ?? []
        const bucket = casoBucket(caso, procs)
        // filtro de status no nível do caso
        if (status !== "todos" && bucket !== status) {
          // exceção: ainda pode aparecer se algum processo dele casar o status
          if (!procs.some(procMatch)) return null
        }
        // filtro de responsável: caso casa se algum processo casa OU
        // (consultivo sem processo) o responsável operacional bate
        if (resp !== "todos") {
          const procRespOk = procs.some((p) => p.responsavel === resp)
          const casoRespOk = procs.length === 0 && caso.responsavel === resp
          if (!procRespOk && !casoRespOk) return null
        }
        // busca: caso casa se o texto bate no caso/cliente OU em algum processo
        const casoTextOk =
          !nq ||
          norm(caso.titulo).includes(nq) ||
          norm(caso.cliente).includes(nq) ||
          norm(caso.area).includes(nq) ||
          norm(caso.responsavel).includes(nq)
        const procsMatched = procs.filter(procMatch)
        if (!casoTextOk && procsMatched.length === 0) return null
        // se o caso casa pelo texto, mostramos seus processos (respeitando status/resp)
        const childProcs = (casoTextOk ? procs.filter((p) => {
          if (status !== "todos" && procBucket(p) !== status) return false
          if (resp !== "todos" && p.responsavel !== resp) return false
          return true
        }) : procsMatched)
        return { caso, bucket, procs: childProcs, totalProcs: procs.length }
      })
      .filter((g): g is { caso: CasoRow; bucket: Exclude<StatusBucket, "todos">; procs: ProcessoRow[]; totalProcs: number } => g != null)
  }, [crm.casos, procsPorCaso, status, resp, nq])

  // visão PLANA: lista de processos filtrados (comportamento legado)
  const planoRows = useMemo(() => processos.filter(procMatch), [processos, status, resp, nq])

  // KPIs (sobre o universo total, não sobre o filtro — para dar contexto estável)
  const casosAtivos = useMemo(
    () => crm.casos.filter((c) => casoBucket(c, procsPorCaso.get(c.id) ?? []) === "ativos").length,
    [crm.casos, procsPorCaso],
  )
  const procAtivos = processos.filter((p) => procBucket(p) === "ativos").length
  const comPrazo = processos.filter((p) => proxPrazo.has(p.id)).length
  const criticos = processos.filter((p) => proxPrazo.get(p.id)?.urgencia?.faixa === "vermelho").length

  // contagem do rodapé (sobre o que está visível)
  const casosVisiveis = modo === "agrupado" ? grupos.length : new Set(planoRows.map((p) => p.casoId)).size
  const procVisiveis = modo === "agrupado" ? grupos.reduce((s, g) => s + g.procs.length, 0) : planoRows.length

  const allExpanded = grupos.length > 0 && grupos.every((g) => expanded.has(g.caso.id))
  const toggleAll = () => {
    if (allExpanded) setExpanded(new Set())
    else setExpanded(new Set(grupos.map((g) => g.caso.id)))
  }
  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <FxFrame>
      <CrmPageHead
        title="Casos & processos"
        sub="Acervo do escritório · casos e seus processos · clique para abrir"
        right={<button className="btn btn-primary" onClick={onNovoProcesso}><Icon name="plus" size={15} />Novo processo</button>}
      />

      <AlertasStrip alertas={alertas} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
        <ProcStat label="Casos ativos" value={casosAtivos} icon="briefcase" />
        <ProcStat label="Processos ativos" value={procAtivos} icon="scale" />
        <ProcStat label="Com prazo aberto" value={comPrazo} icon="flag" />
        <ProcStat label="Prazos críticos" value={criticos} icon="alertTriangle" tone={criticos ? "neg" : null} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <FxSegmented options={STATUS_OPTS} value={status} onChange={(v) => setStatus(v as StatusBucket)} />
        <CrmSearch value={q} onChange={setQ} placeholder="Buscar por caso, cliente, nº CNJ, classe…" />
        <FxSelect
          options={["Todos", ...responsaveis.map((u) => u.nome)]}
          value={resp === "todos" ? "Todos" : resp}
          onChange={(e) => setResp(e.target.value === "Todos" ? "todos" : e.target.value)}
        />
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {modo === "agrupado" && grupos.length > 0 && (
            <button className="btn btn-ghost" onClick={toggleAll} style={{ height: 32, fontSize: 12 }}>
              <Icon name={allExpanded ? "chevronDown" : "chevronRight"} size={14} />
              {allExpanded ? "Recolher tudo" : "Expandir tudo"}
            </button>
          )}
          <FxSegmented
            options={[{ value: "agrupado", label: "Agrupado" }, { value: "plano", label: "Plano" }]}
            value={modo}
            onChange={(v) => setModo(v as "agrupado" | "plano")}
            size="sm"
          />
        </div>
      </div>

      {modo === "agrupado" ? (
        <AcervoAgrupado
          grupos={grupos}
          expanded={expanded}
          toggle={toggle}
          proxPrazo={proxPrazo}
          onAbrirCaso={onAbrirCaso}
          nav={nav}
        />
      ) : (
        <AcervoPlano rows={planoRows} proxPrazo={proxPrazo} nav={nav} />
      )}

      <div style={{ fontSize: 12, color: "var(--text-subtle)", textAlign: "center", marginTop: 14 }}>
        {casosVisiveis} {casosVisiveis === 1 ? "caso" : "casos"} · {procVisiveis} {procVisiveis === 1 ? "processo" : "processos"}
      </div>
    </FxFrame>
  )
}

// ── visão agrupada (caso → processos) ─────────────────────────────────────────
function AcervoAgrupado({
  grupos, expanded, toggle, proxPrazo, onAbrirCaso, nav,
}: {
  grupos: { caso: CasoRow; bucket: Exclude<StatusBucket, "todos">; procs: ProcessoRow[]; totalProcs: number }[]
  expanded: Set<number>
  toggle: (id: number) => void
  proxPrazo: Map<number, PrazoRow>
  onAbrirCaso: (casoId: number) => void
  nav: ProcNav
}) {
  if (grupos.length === 0) {
    return (
      <div className="card" style={{ overflow: "hidden" }}>
        <CrmEmpty icon="briefcase" title="Nenhum caso encontrado" sub="Ajuste a busca ou os filtros de status / responsável." />
      </div>
    )
  }
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: CASO_COLS, gap: 14, padding: "11px 18px", borderBottom: "1px solid var(--border)", background: "var(--bg-soft)" }}>
        {["", "Caso · cliente", "Tipo · status", "Última mov.", "Processos"].map((h, i) => (
          <div key={i} style={{ fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: i === 4 ? "right" : "left" }}>{h}</div>
        ))}
      </div>
      {grupos.map((g, gi) => {
        const isOpen = expanded.has(g.caso.id)
        const semProcesso = g.totalProcs === 0
        return (
          <div key={g.caso.id} style={{ borderTop: gi ? "1px solid var(--border)" : "none" }}>
            <CrmRow
              onClick={() => onAbrirCaso(g.caso.id)}
              style={{ display: "grid", gridTemplateColumns: CASO_COLS, gap: 14, padding: "13px 18px", alignItems: "center", background: isOpen ? "var(--bg-soft)" : undefined }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); if (!semProcesso) toggle(g.caso.id) }}
                title={semProcesso ? "Sem processo" : isOpen ? "Recolher" : "Expandir"}
                disabled={semProcesso}
                style={{
                  width: 24, height: 24, borderRadius: 6, border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: "transparent", color: semProcesso ? "var(--text-subtle)" : "var(--text-muted)",
                  cursor: semProcesso ? "default" : "pointer", flexShrink: 0,
                }}
              >
                <Icon name={semProcesso ? "circleDot" : isOpen ? "chevronDown" : "chevronRight"} size={semProcesso ? 8 : 16} />
              </button>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.caso.titulo}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3, fontSize: 12, color: "var(--text-subtle)", minWidth: 0 }}>
                  <Icon name="building" size={12} />
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.caso.cliente ?? "sem cliente"}</span>
                </div>
              </div>
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                <CasoTipoPill tipo={g.caso.tipo} area={g.caso.area} />
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <CasoStatusBadge bucket={g.bucket} />
                  <RateioMini caso={g.caso} />
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {crmDate(g.caso.ultimaMovimentacao)}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                {semProcesso ? (
                  <span style={{ fontSize: 11.5, color: "var(--text-subtle)", whiteSpace: "nowrap" }}>sem processo</span>
                ) : (
                  <span
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 24, height: 22, padding: "0 8px",
                      borderRadius: 6, background: "var(--bg-sunken)", color: "var(--text-muted)", fontSize: 12, fontWeight: 500, fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {g.procs.length === g.totalProcs ? g.totalProcs : `${g.procs.length}/${g.totalProcs}`}
                  </span>
                )}
              </div>
            </CrmRow>

            {isOpen && g.procs.length > 0 && (
              <div style={{ background: "var(--bg-soft)", padding: "2px 18px 10px 50px" }}>
                {g.procs.map((p) => {
                  const pz = proxPrazo.get(p.id)
                  return (
                    <CrmRow
                      key={p.id}
                      onClick={() => nav.openProcesso(p.id)}
                      style={{
                        display: "grid", gridTemplateColumns: PROC_COLS, gap: 14, padding: "10px 12px", alignItems: "center",
                        borderRadius: 8, borderLeft: "2px solid var(--border)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <ProcCNJ numero={p.numeroCnj} size={12.5} copy />
                          {p.segredoJustica && <span title="Segredo de justiça" style={{ color: "var(--text-subtle)", display: "inline-flex" }}><Icon name="eye" size={12} /></span>}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[p.classe, p.assunto].filter(Boolean).join(" · ") || "—"}</div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[p.tribunal, p.comarca].filter(Boolean).join(" · ") || "—"}</div>
                        <div style={{ marginTop: 4 }}>{p.faseAtual ? <ProcFaseTag fase={p.faseAtual} /> : <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>—</span>}</div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <ProcResp nome={p.responsavel} size={20} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                        {pz ? <ProcSemaforo urgencia={pz.urgencia} /> : <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>sem prazo</span>}
                      </div>
                    </CrmRow>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── visão plana (lista de processos — comportamento legado) ───────────────────
const FLAT_COLS = "1.7fr 1.3fr 1fr 150px"

function AcervoPlano({
  rows, proxPrazo, nav,
}: {
  rows: ProcessoRow[]
  proxPrazo: Map<number, PrazoRow>
  nav: ProcNav
}) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: FLAT_COLS, gap: 14, padding: "11px 18px", borderBottom: "1px solid var(--border)", background: "var(--bg-soft)" }}>
        {["Processo", "Caso", "Foro · fase", "Próximo prazo"].map((h, i) => (
          <div key={h} style={{ fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: i === 3 ? "right" : "left" }}>{h}</div>
        ))}
      </div>
      {rows.length === 0 ? (
        <CrmEmpty icon="scale" title="Nenhum processo encontrado" sub="Ajuste a busca ou os filtros." />
      ) : (
        rows.map((p, i) => {
          const pz = proxPrazo.get(p.id)
          return (
            <CrmRow key={p.id} onClick={() => nav.openProcesso(p.id)} style={{ display: "grid", gridTemplateColumns: FLAT_COLS, gap: 14, padding: "14px 18px", alignItems: "center", borderTop: i ? "1px solid var(--border)" : "none" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ProcCNJ numero={p.numeroCnj} copy />
                  {p.segredoJustica && <span title="Segredo de justiça" style={{ color: "var(--text-subtle)", display: "inline-flex" }}><Icon name="eye" size={13} /></span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[p.classe, p.assunto].filter(Boolean).join(" · ") || "—"}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.caso ?? "—"}</div>
                <div style={{ fontSize: 12, color: "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.responsavel ?? "sem responsável"}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[p.tribunal, p.comarca].filter(Boolean).join(" · ") || "—"}</div>
                <div style={{ marginTop: 4 }}>{p.faseAtual ? <ProcFaseTag fase={p.faseAtual} /> : <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>—</span>}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                <ProcResp nome={p.responsavel} showName={false} size={22} />
                {pz ? <ProcSemaforo urgencia={pz.urgencia} /> : <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>sem prazo</span>}
              </div>
            </CrmRow>
          )
        })
      )}
    </div>
  )
}
