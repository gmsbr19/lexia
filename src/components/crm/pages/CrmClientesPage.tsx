"use client"

// LexIA · CRM — Clientes list page. Lists dataset.clientes (ClienteRow[]) with
// top counters, search (nome / CPF-CNPJ / cidade) and a PF/PJ/Leads segment
// filter. Row click opens the cliente detail; "Novo cliente" calls onNovo.
import { useMemo, useState } from "react"
import {
  CrmAvatar,
  CrmClasseBadge,
  CrmEmpty,
  CrmKpiRow,
  CrmPageHead,
  CrmRow,
  CrmSearch,
  CrmTipoBadge,
  FxFrame,
  FxSegmented,
} from "../crm-kit"
import { Icon } from "../crm-icons"
import type { CrmDataset, CrmNav, Role } from "../crm-types"

const CRM_CLI_COLS = "1fr 76px 168px 150px 130px 64px"

const norm = (s: string | null | undefined) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

interface Props {
  dataset: CrmDataset
  role: Role
  nav: CrmNav
  onNovo: () => void
}

export function CrmClientesPage({ dataset, nav, onNovo }: Props) {
  const [q, setQ] = useState("")
  const [seg, setSeg] = useState("todos")
  const nq = norm(q.trim())

  const clientes = dataset.clientes

  const counts = useMemo(
    () => ({
      total: clientes.length,
      pf: clientes.filter((c) => c.tipo === "pf").length,
      pj: clientes.filter((c) => c.tipo === "pj").length,
      leads: clientes.filter((c) => c.classificacao === "lead").length,
    }),
    [clientes],
  )

  const rows = useMemo(
    () =>
      clientes
        .filter((c) => {
          if (seg === "pf" && c.tipo !== "pf") return false
          if (seg === "pj" && c.tipo !== "pj") return false
          if (seg === "leads" && c.classificacao !== "lead") return false
          if (
            nq &&
            !(
              norm(c.nome).includes(nq) ||
              norm(c.cpfCnpj).includes(nq) ||
              norm(c.cidade).includes(nq)
            )
          )
            return false
          return true
        })
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [clientes, seg, nq],
  )

  return (
    <FxFrame>
      <CrmPageHead
        title="Contatos"
        sub={`${clientes.length} contatos`}
        right={
          <button className="btn btn-primary" onClick={onNovo}>
            <Icon name="userPlus" size={15} />
            Novo contato
          </button>
        }
      />

      <CrmKpiRow
        kpis={[
          { label: "Total", value: counts.total, icon: "users" },
          { label: "Pessoa física", value: counts.pf, icon: "user" },
          { label: "Pessoa jurídica", value: counts.pj, icon: "building" },
          { label: "Leads", value: counts.leads, icon: "flame", accent: "gold" },
        ]}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <CrmSearch value={q} onChange={setQ} placeholder="Buscar por nome, CPF/CNPJ, cidade…" />
        <FxSegmented
          options={[
            { value: "todos", label: "Todos" },
            { value: "pf", label: "PF" },
            { value: "pj", label: "PJ" },
            { value: "leads", label: "Leads" },
          ]}
          value={seg}
          onChange={setSeg}
        />
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: CRM_CLI_COLS,
            gap: 14,
            padding: "11px 18px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-soft)",
          }}
        >
          {["Contato", "Tipo", "CPF/CNPJ", "Cidade/UF", "Classificação", "Casos"].map((h, i) => (
            <div
              key={h}
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-subtle)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                textAlign: i >= 5 ? "right" : "left",
              }}
            >
              {h}
            </div>
          ))}
        </div>
        {rows.length === 0 ? (
          <CrmEmpty
            icon="users"
            title="Nenhum contato encontrado"
            sub="Ajuste a busca ou cadastre um novo contato."
            cta={
              <button className="btn btn-secondary" onClick={onNovo}>
                <Icon name="userPlus" size={14} />
                Novo contato
              </button>
            }
          />
        ) : (
          rows.map((c, i) => (
            <CrmRow
              key={c.id}
              onClick={() => nav.openCliente(c.id)}
              style={{
                display: "grid",
                gridTemplateColumns: CRM_CLI_COLS,
                gap: 14,
                padding: "12px 18px",
                alignItems: "center",
                borderTop: i ? "1px solid var(--border)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <CrmAvatar name={c.nome} tipo={c.tipo} size={34} />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--text)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.nome}
                  </div>
                </div>
              </div>
              <div>
                <CrmTipoBadge tipo={c.tipo} />
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: c.cpfCnpj ? "var(--text-muted)" : "var(--text-subtle)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {c.cpfCnpj || "—"}
              </div>
              <div style={{ fontSize: 12, color: c.cidade ? "var(--text-muted)" : "var(--text-subtle)" }}>
                {c.cidade ? `${c.cidade}${c.uf ? `/${c.uf}` : ""}` : "—"}
              </div>
              <div>
                <CrmClasseBadge classe={c.classificacao} />
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontSize: 13,
                  fontWeight: 500,
                  color: c.numCasos ? "var(--text)" : "var(--text-subtle)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {c.numCasos}
              </div>
            </CrmRow>
          ))
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-subtle)", textAlign: "center", marginTop: 14 }}>
        {rows.length} de {clientes.length} contatos
      </div>
    </FxFrame>
  )
}
