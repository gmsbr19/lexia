"use client"

// LexIA · CRM — Casos list. Lists over dataset.casos (CasoRow[]) with search +
// segmented filters (Todos / Com honorário / Sem rateio definido). Row click →
// nav.openCaso(id). Money is integer centavos (crmMoney). Ported from the design
// prototype page-casos.jsx, rewired to the real CrmDataset.
import { useMemo, useState } from "react"
import {
  CrmCasoTipoPill,
  CrmEmpty,
  CrmKpiRow,
  CrmPageHead,
  CrmRow,
  CrmSearch,
  FxFrame,
  FxSegmented,
} from "../crm-kit"
import { crmMoney } from "../crm-fmt"
import type { CrmDataset, CrmNav, Role } from "../crm-types"
import type { CasoRow } from "../crm-types"

interface Props {
  dataset: CrmDataset
  role: Role
  nav: CrmNav
}

const CRM_CASO_COLS = "1fr 120px 140px 150px"

const norm = (s: string | null | undefined) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
const crmFirst = (s: string | null | undefined) => (s || "").split(/\s+/)[0] || "—"
const withFin = (k: CasoRow) => k.honorariosCents > 0
const semRateio = (k: CasoRow) => k.responsaveis.length === 0

export function CrmCasosPage({ dataset, role, nav }: Props) {
  const [q, setQ] = useState("")
  const [seg, setSeg] = useState("todos")
  const casos = dataset.casos
  const nq = norm(q.trim())

  const counts = useMemo(
    () => ({
      total: casos.length,
      comHon: casos.filter(withFin).length,
      semRateio: casos.filter(semRateio).length,
    }),
    [casos],
  )

  const rows = useMemo(
    () =>
      casos.filter((k) => {
        if (seg === "com" && !withFin(k)) return false
        if (seg === "sem" && !semRateio(k)) return false
        if (
          nq &&
          !(norm(k.titulo).includes(nq) || norm(k.cliente).includes(nq) || norm(k.responsavel).includes(nq))
        )
          return false
        return true
      }),
    [casos, seg, nq],
  )

  return (
    <FxFrame>
      <CrmPageHead title="Casos" sub="Defina os responsáveis sócios e o rateio dos honorários de cada caso" />
      <CrmKpiRow
        kpis={[
          { label: "Total de casos", value: counts.total, icon: "briefcase" },
          { label: "Com honorário", value: counts.comHon, icon: "receipt", accent: "gold" },
          { label: "Sem rateio", value: counts.semRateio, icon: "percent" },
        ]}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <CrmSearch value={q} onChange={setQ} placeholder="Buscar por caso, cliente, responsável…" />
        <FxSegmented
          options={[
            { value: "todos", label: "Todos" },
            { value: "com", label: "Com honorário" },
            { value: "sem", label: "Sem rateio" },
          ]}
          value={seg}
          onChange={setSeg}
        />
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "grid", gridTemplateColumns: CRM_CASO_COLS, gap: 14, padding: "11px 18px",
            borderBottom: "1px solid var(--border)", background: "var(--bg-soft)",
          }}
        >
          {["Caso", "Tipo", "Honorários", "Rateio (sócios)"].map((h, i) => (
            <div
              key={h}
              style={{
                fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase",
                letterSpacing: "0.08em", textAlign: i >= 2 ? "right" : "left",
              }}
            >
              {h}
            </div>
          ))}
        </div>
        {rows.length === 0 ? (
          <CrmEmpty icon="briefcase" title="Nenhum caso encontrado" sub="Ajuste a busca ou os filtros." />
        ) : (
          rows.map((k, i) => {
            const r = k.responsaveis
            const leandro = r[0]?.percentual ?? 50
            const leonardo = r.length > 1 ? r[1].percentual : 100 - leandro
            return (
              <CrmRow
                key={k.id}
                onClick={() => nav.openCaso(k.id)}
                style={{
                  display: "grid", gridTemplateColumns: CRM_CASO_COLS, gap: 14, padding: "13px 18px",
                  alignItems: "center", borderTop: i ? "1px solid var(--border)" : "none",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap",
                      overflow: "hidden", textOverflow: "ellipsis",
                    }}
                  >
                    {k.titulo}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 2 }}>
                    {k.cliente || "—"} · resp. {crmFirst(k.responsavel)}
                  </div>
                </div>
                <div>
                  <CrmCasoTipoPill tipo={k.tipo} />
                </div>
                <div
                  style={{
                    textAlign: "right", fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums",
                    color: k.honorariosCents ? "var(--text)" : "var(--text-subtle)",
                  }}
                >
                  {k.honorariosCents ? crmMoney(k.honorariosCents) : "—"}
                  {k.honorariosCount > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", marginTop: 2 }}>
                      {k.honorariosCount} {k.honorariosCount === 1 ? "honorário" : "honorários"}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                  {role === "staff" ? (
                    <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>—</span>
                  ) : semRateio(k) ? (
                    <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>—</span>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div
                        style={{
                          width: 54, height: 7, borderRadius: 999, overflow: "hidden",
                          background: "var(--brand-navy)", display: "flex",
                        }}
                      >
                        <div style={{ width: `${leandro}%`, background: "var(--brand-gold)" }} />
                      </div>
                      <span
                        style={{
                          fontSize: 12, fontWeight: 500, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {leandro}/{leonardo}
                      </span>
                    </div>
                  )}
                </div>
              </CrmRow>
            )
          })
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-subtle)", textAlign: "center", marginTop: 14 }}>
        {rows.length} de {casos.length} casos
      </div>
    </FxFrame>
  )
}
