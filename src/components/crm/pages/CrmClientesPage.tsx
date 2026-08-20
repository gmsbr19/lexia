"use client"

// LexIA · CRM — Contatos sobre o grid "Controles de Visão" (ViewGrid). Mesmo
// sistema da aba Leads: visões salvas por usuário (gridId "contatos"), filtros
// E/OU aninhados, ordenação multinível, agrupamento com contagem, colunas
// (reordenar/ocultar/congelar/redimensionar), densidade, CSV e lote. Célula do
// contato com avatar PF (redondo) / PJ (quadrado-arredondado). Clique na linha
// abre o detalhe do cliente (superfície de edição segura). Full-bleed/full-height.
import { useMemo } from "react"
import {
  ViewGrid, makeDefaultState,
  type VgSchema, type VgColumn, type VgRow, type VgSavedView, type VgGridStore,
  type VgEnumRegistry, type VgEnumOrder, type VgBulkField, type VgIconName,
} from "@/components/ui/viewgrid"
import { useOptimisticRows } from "@/lib/client/useOptimisticRows"
import { useViewGridStore } from "@/lib/client/useViewGridStore"
import { ORIGEM_LABEL } from "@/lib/comercial/types"
import { ORIGEM_COLOR } from "@/components/comercial/cm-meta"
import { CrmKpiRow, CrmPageHead } from "../crm-kit"
import { Icon } from "../crm-icons"
import type { ClienteRow, CrmDataset, CrmNav, Role } from "../crm-types"

const H = (h: number, l = 0.72, c = 0.12) => `oklch(${l} ${c} ${h})`
const ORIGEM_ICON: Record<string, VgIconName> = { google_ads: "target", meta_ads: "megaphone", indicacao: "handshake", organico: "globe", outro: "circleDot" }

const CLASSE_LABEL: Record<string, string> = { cliente: "Cliente", lead: "Lead", rede: "Rede" }
const CLASSE_ENUM: VgEnumRegistry["x"] = { Cliente: { c: "#2E9E5B" }, Lead: { c: "#C0A147" }, Rede: { c: "#3B7DD8" } }
const TIPO_LABEL: Record<string, string> = { pf: "Pessoa física", pj: "Pessoa jurídica" }
const TIPO_ENUM: VgEnumRegistry["x"] = { "Pessoa física": { c: H(200), icon: "user" }, "Pessoa jurídica": { c: H(60), icon: "building" } }

const CONTATOS_COLS: VgColumn[] = [
  { key: "nome", label: "Contato", type: "text", fixed: true, def: true, w: 240, personType: true },
  { key: "classificacao", label: "Classificação", type: "enum", enum: "classificacao", group: true, def: true, w: 150 },
  { key: "origem", label: "Origem", type: "enum", enum: "origem", group: true, def: true, w: 140 },
  { key: "numCasos", label: "Casos", type: "num", def: true, w: 90, align: "right" },
  { key: "cidade", label: "Cidade", type: "text", group: true, def: false, w: 150 },
  { key: "uf", label: "UF", type: "enum", enum: "uf", group: true, def: false, w: 80 },
  { key: "tipo", label: "Tipo", type: "enum", enum: "tipo", group: true, def: false, w: 130 },
  { key: "cpfCnpj", label: "CPF / CNPJ", type: "text", def: false, w: 160 },
]

const TIPO_OPTS = [{ value: "pf", label: "Pessoa física", icon: "user" as VgIconName }, { value: "pj", label: "Pessoa jurídica", icon: "building" as VgIconName }]
const CLASSE_OPTS = [{ value: "cliente", label: "Cliente", color: "#2E9E5B" }, { value: "lead", label: "Lead", color: "#C0A147" }, { value: "rede", label: "Rede", color: "#3B7DD8" }]
const ORIGEM_OPTS = Object.entries(ORIGEM_LABEL).map(([value, label]) => ({ value, label, color: ORIGEM_COLOR[value as keyof typeof ORIGEM_COLOR], icon: ORIGEM_ICON[value] }))

function contatoSeedViews(): VgSavedView[] {
  const all = makeDefaultState({ cols: CONTATOS_COLS })
  const cli = makeDefaultState({ cols: CONTATOS_COLS })
  cli.filters = { type: "group", id: "root", combinator: "E", children: [{ type: "rule", id: "seed-cli", col: "classificacao", op: "in", value: "", value2: "", values: ["Cliente"] }] }
  cli.sort = [{ col: "numCasos", dir: "desc" }]
  return [
    { id: "c-all", name: "Todos os contatos", icon: "users", isDefault: true, state: all },
    { id: "c-cli", name: "Clientes ativos", icon: "checkCircle", state: cli },
  ]
}

interface Props {
  dataset: CrmDataset
  role: Role
  nav: CrmNav
  onNovo: () => void
}

export function CrmClientesPage({ dataset, nav, onNovo }: Props) {
  const optimistic = useOptimisticRows<ClienteRow>({
    initialRows: dataset.clientes,
    getId: (c) => c.id,
    patchUrl: (id) => `/api/clientes/${id}`,
    bulkUrl: "/api/clientes/lote",
  })
  const saved = useViewGridStore("contatos")
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const counts = useMemo(() => ({
    total: dataset.clientes.length,
    pf: dataset.clientes.filter((c) => c.tipo === "pf").length,
    pj: dataset.clientes.filter((c) => c.tipo === "pj").length,
    leads: dataset.clientes.filter((c) => c.classificacao === "lead").length,
  }), [dataset.clientes])

  const schema: VgSchema = useMemo(() => {
    const ufs = [...new Set(dataset.clientes.map((c) => c.uf).filter((u): u is string => Boolean(u)))].sort()
    const ufEnum: VgEnumRegistry["x"] = Object.fromEntries(ufs.map((uf, i) => [uf, { c: H((i * 67) % 360) }]))
    const enums: VgEnumRegistry = {
      classificacao: CLASSE_ENUM,
      origem: Object.fromEntries((Object.keys(ORIGEM_LABEL) as (keyof typeof ORIGEM_LABEL)[]).map((code) => [ORIGEM_LABEL[code], { c: ORIGEM_COLOR[code] ?? "var(--text-muted)", icon: ORIGEM_ICON[code] }])),
      uf: ufEnum,
      tipo: TIPO_ENUM,
    }
    const enumOrder: VgEnumOrder = {
      classificacao: ["Cliente", "Lead", "Rede"],
      origem: Object.values(ORIGEM_LABEL),
      uf: ufs,
      tipo: ["Pessoa física", "Pessoa jurídica"],
    }
    return {
      id: "contatos", label: "Contatos", primaryLabel: "Contato", icon: "users",
      cols: CONTATOS_COLS, enums, enumOrder, people: [], peopleMap: {}, today,
    }
  }, [dataset.clientes, today])

  const rows: VgRow[] = useMemo(() => optimistic.rows.map((c) => ({
    id: c.id,
    nome: c.nome,
    classificacao: CLASSE_LABEL[c.classificacao] ?? c.classificacao,
    origem: c.origem ? (ORIGEM_LABEL[c.origem as keyof typeof ORIGEM_LABEL] ?? c.origem) : "",
    numCasos: c.numCasos,
    cidade: c.cidade ?? "",
    uf: c.uf ?? "",
    tipo: TIPO_LABEL[c.tipo] ?? c.tipo,
    cpfCnpj: c.cpfCnpj ?? "",
  })), [optimistic.rows])

  const seedViews = useMemo(() => contatoSeedViews(), [])

  const bulkFields: VgBulkField[] = useMemo(() => [
    { field: "tipo", label: "Tipo", icon: "user", options: TIPO_OPTS },
    { field: "classificacao", label: "Classificação", icon: "flag", options: CLASSE_OPTS },
    { field: "origem", label: "Origem", icon: "target", options: ORIGEM_OPTS },
  ], [])

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ flexShrink: 0, padding: "20px 24px 10px" }}>
        <CrmPageHead
          title="Contatos"
          sub={`${dataset.clientes.length} contatos`}
          right={<button className="btn btn-primary" onClick={onNovo}><Icon name="userPlus" size={15} />Novo contato</button>}
        />
        <CrmKpiRow
          kpis={[
            { label: "Total", value: counts.total, icon: "users" },
            { label: "Pessoa física", value: counts.pf, icon: "user" },
            { label: "Pessoa jurídica", value: counts.pj, icon: "building" },
            { label: "Leads", value: counts.leads, icon: "flame", accent: "gold" },
          ]}
        />
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {saved.ready ? (
          <ViewGrid
            schema={schema}
            rows={rows}
            searchKeys={["nome", "cpfCnpj", "cidade"]}
            initialStore={saved.initial}
            seedViews={seedViews}
            onStoreChange={(s: VgGridStore) => saved.onChange(s)}
            onRowClick={(r) => nav.openCliente(Number(r.id))}
            selectable
            bulkFields={bulkFields}
            onBulkApply={(ids, field, value) => void optimistic.bulkApply(ids as number[], field, value)}
            csvName={() => `lexia-contatos-${today}.csv`}
          />
        ) : (
          <div className="vc-root" style={{ padding: 24 }}><div className="skeleton" style={{ height: 32, width: 260, borderRadius: 8 }} /></div>
        )}
      </div>
    </div>
  )
}
