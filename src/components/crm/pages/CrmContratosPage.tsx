"use client"

// LexIA · CRM — Contratos (honorários) list. Ported from the design prototype
// page-contratos.jsx, wired to the real backend: iterates dataset.contratos
// (HonorarioRow[]) instead of the mock lançamentos store. Money is centavos.
import { useMemo, useState } from "react"
import {
  CrmContratoStatus,
  CrmEmpty,
  CrmKpiRow,
  CrmPageHead,
  CrmRow,
  CrmSearch,
  FxFrame,
  FxSegmented,
} from "../crm-kit"
import { crmDate, crmMoney } from "../crm-fmt"
import type { CrmDataset, CrmNav, HonorarioRow } from "../crm-types"

interface Props {
  dataset: CrmDataset
  nav: CrmNav
}

const CRM_CON_COLS = "1fr 150px 150px 100px 120px 110px 90px 110px 100px"
const norm = (s: string | null | undefined) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

const TIPO_LABEL: Record<string, string> = {
  recorrente: "Recorrente",
  parcelado: "Parcelado",
  exito: "Êxito",
  avista: "À vista",
}

export function CrmContratosPage({ dataset, nav }: Props) {
  const [q, setQ] = useState("")
  const [seg, setSeg] = useState("todos")
  const nq = norm(q.trim())

  const contratos = dataset.contratos

  const kpis = useMemo(() => {
    const total = contratos.reduce((s, h) => s + h.valorCents, 0)
    const recebido = contratos
      .filter((h) => h.status === "recebido")
      .reduce((s, h) => s + h.valorCents, 0)
    const lancado = total - recebido
    const ticket = contratos.length ? Math.round(total / contratos.length) : 0
    return { total, recebido, lancado, ticket }
  }, [contratos])

  const rows = useMemo(
    () =>
      contratos
        .filter((h) => {
          if (seg === "recebidos" && h.status !== "recebido") return false
          if (seg === "lancados" && h.status === "recebido") return false
          if (
            nq &&
            !(
              norm(h.descricao).includes(nq) ||
              norm(h.cliente).includes(nq) ||
              norm(h.caso).includes(nq)
            )
          )
            return false
          return true
        })
        .sort((a, b) => (b.vencimento || "").localeCompare(a.vencimento || "")),
    [contratos, seg, nq],
  )

  return (
    <FxFrame>
      <CrmPageHead
        title="Contratos & honorários"
        sub={`${contratos.length} honorários · ligados ao financeiro`}
      />
      <CrmKpiRow
        kpis={[
          { label: "Total contratado", value: crmMoney(kpis.total), icon: "receipt" },
          { label: "Recebido", value: crmMoney(kpis.recebido), icon: "checkCircle", tone: "pos" },
          { label: "Em aberto (lançado)", value: crmMoney(kpis.lancado), icon: "clock", accent: "gold" },
          { label: "Ticket médio", value: crmMoney(kpis.ticket), icon: "barChart" },
        ]}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <CrmSearch value={q} onChange={setQ} placeholder="Buscar por descrição, cliente, caso…" />
        <FxSegmented
          options={[
            { value: "todos", label: "Todos" },
            { value: "recebidos", label: "Recebidos" },
            { value: "lancados", label: "Lançados" },
          ]}
          value={seg}
          onChange={setSeg}
        />
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
          {["Descrição", "Cliente", "Caso", "Vencimento", "Valor", "Status", "Tipo", "Conta", "Pago em"].map(
            (hd, i) => (
              <div
                key={hd}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--text-subtle)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  textAlign: i === 4 ? "right" : "left",
                }}
              >
                {hd}
              </div>
            ),
          )}
        </div>
        {rows.length === 0 ? (
          <CrmEmpty icon="receipt" title="Nenhum contrato encontrado" sub="Ajuste a busca ou os filtros." />
        ) : (
          rows.slice(0, 60).map((h: HonorarioRow, i) => (
            <CrmRow
              key={h.id}
              onClick={() => nav.openContrato(h.id)}
              style={{
                display: "grid",
                gridTemplateColumns: CRM_CON_COLS,
                gap: 14,
                padding: "12px 18px",
                alignItems: "center",
                borderTop: i ? "1px solid var(--border)" : "none",
              }}
            >
              <div style={ellip(13, "var(--text)", 500)}>{h.descricao}</div>
              <div style={ellip(12, "var(--text-muted)")}>{h.cliente || "—"}</div>
              <div style={ellip(12, "var(--text-muted)")}>{h.caso || "—"}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                {crmDate(h.vencimento)}
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {crmMoney(h.valorCents)}
              </div>
              <div>
                <CrmContratoStatus status={h.status} venc={h.vencimento} />
              </div>
              <div style={ellip(12, "var(--text-muted)")}>{h.tipo ? TIPO_LABEL[h.tipo] ?? h.tipo : "—"}</div>
              <div style={ellip(12, "var(--text-muted)")}>{h.conta || "—"}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                {h.dataPagamento ? crmDate(h.dataPagamento) : "—"}
              </div>
            </CrmRow>
          ))
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-subtle)", textAlign: "center", marginTop: 14 }}>
        {Math.min(rows.length, 60)} de {rows.length} honorários
      </div>
    </FxFrame>
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
