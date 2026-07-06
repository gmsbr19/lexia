"use client"

// LexIA · CRM — Contratos (lente COMERCIAL). Um contrato = um Caso (que pode
// reunir vários honorários); esta página é o controle comercial (valor
// contratado, área, origem, pagamento, data de fechamento), enquanto a página de
// Casos é o controle operacional. Clique numa linha abre o caso.
import { useMemo, useState } from "react"
import {
  CrmBadge,
  CrmCasoTipoPill,
  CrmEmpty,
  CrmKpiRow,
  CrmPageHead,
  CrmRow,
  CrmSearch,
  FxSegmented,
  FxSelect,
  FxFrame,
} from "../crm-kit"
import { Icon } from "../crm-icons"
import { crmDate, crmMoney } from "../crm-fmt"
import type { ContratoRow, CrmDataset, CrmNav } from "../crm-types"
import { resolveAreaColor, resolveAreaLabel, useAreasStore } from "@/lib/areas/store"
import { ORIGEM_LABEL, type LeadOrigem } from "@/lib/comercial/types"

interface Props {
  dataset: CrmDataset
  nav: CrmNav
}

// Contrato · Área · Origem · Valor · Pagamento · Fechado em
const CRM_CON_COLS = "1fr 150px 130px 140px 130px 120px"
const norm = (s: string | null | undefined) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

type Pagamento = "recebido" | "parcial" | "aberto" | "vazio"
function pagamentoDe(c: ContratoRow): Pagamento {
  if (c.valorContratadoCents <= 0) return "vazio"
  if (c.recebidoCents >= c.valorContratadoCents) return "recebido"
  if (c.recebidoCents > 0) return "parcial"
  return "aberto"
}
function origemLabel(k: string | null): string {
  if (!k) return "Direto"
  return ORIGEM_LABEL[k as LeadOrigem] ?? k
}

type SortKey = "data" | "valor"

export function CrmContratosPage({ dataset, nav }: Props) {
  const areas = useAreasStore((s) => s.areas)
  const [q, setQ] = useState("")
  const [pag, setPag] = useState("todos")
  const [area, setArea] = useState("")
  const [origem, setOrigem] = useState("")
  const [tipo, setTipo] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("data")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const nq = norm(q.trim())

  const contratos = dataset.contratos

  const kpis = useMemo(() => {
    const total = contratos.reduce((s, c) => s + c.valorContratadoCents, 0)
    const recebido = contratos.reduce((s, c) => s + c.recebidoCents, 0)
    const aberto = total - recebido
    const ticket = contratos.length ? Math.round(total / contratos.length) : 0
    return { total, recebido, aberto, ticket }
  }, [contratos])

  // Filter option lists — only the área/origem values that actually occur.
  const areaOpts = useMemo(() => {
    const keys = [...new Set(contratos.map((c) => c.area).filter((a): a is string => !!a))]
    return keys
      .map((k) => ({ value: k, label: resolveAreaLabel(areas, k) }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))
  }, [contratos, areas])
  const origemOpts = useMemo(() => {
    const keys = [...new Set(contratos.map((c) => c.origem))]
    return keys
      .map((k) => ({ value: k ?? "__direto", label: origemLabel(k) }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))
  }, [contratos])

  const rows = useMemo(() => {
    const filtered = contratos.filter((c) => {
      if (pag !== "todos" && pagamentoDe(c) !== pag) return false
      if (area && c.area !== area) return false
      if (origem && (c.origem ?? "__direto") !== origem) return false
      if (tipo && c.tipo !== tipo) return false
      if (nq && !(norm(c.titulo).includes(nq) || norm(c.cliente).includes(nq))) return false
      return true
    })
    const dir = sortDir === "asc" ? 1 : -1
    return filtered.sort((a, b) => {
      const cmp =
        sortKey === "valor"
          ? a.valorContratadoCents - b.valorContratadoCents
          : (a.dataFechamento ?? "").localeCompare(b.dataFechamento ?? "")
      return cmp * dir
    })
  }, [contratos, pag, area, origem, tipo, nq, sortKey, sortDir])

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(k)
      setSortDir("desc")
    }
  }

  const hasFilter = !!(pag !== "todos" || area || origem || tipo || nq)

  return (
    <FxFrame>
      <CrmPageHead
        title="Contratos"
        sub={`${contratos.length} contratos · controle comercial (um contrato reúne os honorários do caso)`}
      />
      <CrmKpiRow
        kpis={[
          { label: "Total contratado", value: crmMoney(kpis.total), icon: "receipt" },
          { label: "Recebido", value: crmMoney(kpis.recebido), icon: "checkCircle", tone: "pos" },
          { label: "Em aberto", value: crmMoney(kpis.aberto), icon: "clock", accent: "gold" },
          { label: "Ticket médio", value: crmMoney(kpis.ticket), icon: "barChart" },
        ]}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <CrmSearch value={q} onChange={setQ} placeholder="Buscar por contrato ou cliente…" />
        {areaOpts.length > 0 && (
          <div style={{ width: 170 }}>
            <FxSelect value={area} onChange={(e) => setArea(e.target.value)} placeholder="Todas as áreas" options={areaOpts} />
          </div>
        )}
        {origemOpts.length > 0 && (
          <div style={{ width: 160 }}>
            <FxSelect value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Todas as origens" options={origemOpts} />
          </div>
        )}
        <div style={{ width: 160 }}>
          <FxSelect
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            placeholder="Todos os tipos"
            options={[
              { value: "consultivo", label: "Consultivo" },
              { value: "litigio", label: "Litígio" },
            ]}
          />
        </div>
        <FxSegmented
          options={[
            { value: "todos", label: "Todos" },
            { value: "recebido", label: "Recebido" },
            { value: "parcial", label: "Parcial" },
            { value: "aberto", label: "Em aberto" },
          ]}
          value={pag}
          onChange={setPag}
        />
        {hasFilter && (
          <button
            className="btn btn-ghost"
            onClick={() => { setQ(""); setPag("todos"); setArea(""); setOrigem(""); setTipo("") }}
            style={{ height: 34, fontSize: 12 }}
          >
            Limpar
          </button>
        )}
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: CRM_CON_COLS,
            gap: 14,
            padding: "11px 18px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-soft)",
          }}
        >
          <Hd label="Contrato" />
          <Hd label="Área" />
          <Hd label="Origem" />
          <Hd label="Valor" align="right" sortActive={sortKey === "valor"} dir={sortDir} onSort={() => toggleSort("valor")} />
          <Hd label="Pagamento" />
          <Hd label="Fechado em" sortActive={sortKey === "data"} dir={sortDir} onSort={() => toggleSort("data")} />
        </div>
        {rows.length === 0 ? (
          <CrmEmpty icon="receipt" title="Nenhum contrato encontrado" sub="Ajuste a busca ou os filtros." />
        ) : (
          rows.slice(0, 80).map((c, i) => {
            const cor = resolveAreaColor(areas, c.area)
            return (
              <CrmRow
                key={c.id}
                onClick={() => nav.openCaso(c.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: CRM_CON_COLS,
                  gap: 14,
                  padding: "12px 18px",
                  alignItems: "center",
                  borderTop: i ? "1px solid var(--border)" : "none",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={ellip(13, "var(--text)", 500)}>{c.titulo}</div>
                  <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.cliente || "—"}</span>
                    {c.tipo && <CrmCasoTipoPill tipo={c.tipo} />}
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  {c.area ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)", overflow: "hidden" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: cor || "var(--text-subtle)", flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resolveAreaLabel(areas, c.area)}</span>
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>—</span>
                  )}
                </div>
                <div style={ellip(12, "var(--text-muted)")}>{origemLabel(c.origem)}</div>
                <div style={{ textAlign: "right", minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                    {crmMoney(c.valorContratadoCents)}
                  </div>
                  {c.honorariosCount > 0 && (
                    <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 2 }}>
                      {c.honorariosCount} {c.honorariosCount === 1 ? "honorário" : "honorários"}
                    </div>
                  )}
                </div>
                <div>
                  <PagamentoBadge p={pagamentoDe(c)} />
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                  {c.dataFechamento ? crmDate(c.dataFechamento) : "—"}
                </div>
              </CrmRow>
            )
          })
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-subtle)", textAlign: "center", marginTop: 14 }}>
        {Math.min(rows.length, 80)} de {rows.length} contratos
      </div>
    </FxFrame>
  )
}

function PagamentoBadge({ p }: { p: Pagamento }) {
  if (p === "recebido") return <CrmBadge tone="pos" dot>Recebido</CrmBadge>
  if (p === "parcial") return <CrmBadge tone="gold" dot>Parcial</CrmBadge>
  if (p === "aberto") return <CrmBadge tone="neutral" dot>Em aberto</CrmBadge>
  return <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>—</span>
}

function Hd({
  label,
  align = "left",
  sortActive,
  dir,
  onSort,
}: {
  label: string
  align?: "left" | "right"
  sortActive?: boolean
  dir?: "asc" | "desc"
  onSort?: () => void
}) {
  const base = {
    fontSize: 11,
    fontWeight: 500,
    color: sortActive ? "var(--text-muted)" : "var(--text-subtle)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  }
  if (!onSort) return <div style={{ ...base, textAlign: align }}>{label}</div>
  return (
    <button
      onClick={onSort}
      style={{
        ...base,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
      }}
    >
      {label}
      <Icon
        name={sortActive ? (dir === "asc" ? "chevronUp" : "chevronDown") : "chevronsUpDown"}
        size={13}
        style={{ opacity: sortActive ? 1 : 0.4 }}
      />
    </button>
  )
}

const ellip = (fontSize: number, color: string, fontWeight: number = 400) =>
  ({
    fontSize,
    color,
    fontWeight,
    minWidth: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }) as const
