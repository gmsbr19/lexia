"use client"

// LexIA · CRM — Contatos list page. Fase 2 do CRM Comercial: rebuilt over the
// generic DataGrid (sort/filter-builder/group-by/inline-edit/bulk-bar/CSV),
// reusing the exact same component the Oportunidades grid uses (see
// src/components/comercial/tabs/CmLeads.tsx / CLAUDE.md §11 Fase 2). Row
// click still opens the cliente detail; "Novo contato" still opens the
// CrmQuickCliente modal owned by the parent route.
import { useMemo } from "react"
import { DataGrid, GridSkeleton } from "@/components/ui/datagrid/DataGrid"
import type { BulkFieldConfig, GridColumn } from "@/components/ui/datagrid/types"
import { useOptimisticRows } from "@/lib/client/useOptimisticRows"
import { useCrmSavedView } from "@/lib/client/useCrmSavedView"
import { MenuItem } from "@/components/tarefas/tf-kit"
import { ORIGEM_LABEL } from "@/lib/comercial/types"
import { ORIGEM_COLOR } from "@/components/comercial/cm-meta"
import { CrmKpiRow, CrmPageHead, FxFrame } from "../crm-kit"
import { Icon } from "../crm-icons"
import type { ClienteRow, CrmDataset, CrmNav, Role } from "../crm-types"

const TIPO_OPTS = [{ value: "pf", label: "Pessoa física" }, { value: "pj", label: "Pessoa jurídica" }]
const CLASSE_OPTS = [{ value: "cliente", label: "Cliente", color: "#2E9E5B" }, { value: "lead", label: "Lead", color: "#C0A147" }]
const ORIGEM_OPTS = Object.entries(ORIGEM_LABEL).map(([value, label]) => ({ value, label, color: ORIGEM_COLOR[value as keyof typeof ORIGEM_COLOR] }))

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
  const savedView = useCrmSavedView("contatos")

  const counts = useMemo(
    () => ({
      total: dataset.clientes.length,
      pf: dataset.clientes.filter((c) => c.tipo === "pf").length,
      pj: dataset.clientes.filter((c) => c.tipo === "pj").length,
      leads: dataset.clientes.filter((c) => c.classificacao === "lead").length,
    }),
    [dataset.clientes],
  )

  // Cells are READ-ONLY — the row opens the cliente detail (the safe edit
  // surface). Bulk field-sets remain via the selection bar.
  const columns: GridColumn<ClienteRow>[] = useMemo(() => [
    { key: "nome", label: "Contato", type: "text", accessor: (c) => c.nome },
    { key: "tipo", label: "Tipo", type: "select", accessor: (c) => c.tipo, groupable: true, options: TIPO_OPTS },
    { key: "cpfCnpj", label: "CPF/CNPJ", type: "text", accessor: (c) => c.cpfCnpj },
    { key: "cidade", label: "Cidade", type: "text", accessor: (c) => c.cidade },
    { key: "uf", label: "UF", type: "text", accessor: (c) => c.uf, width: 70 },
    { key: "classificacao", label: "Classificação", type: "select", accessor: (c) => c.classificacao, groupable: true, options: CLASSE_OPTS },
    { key: "origem", label: "Origem", type: "select", accessor: (c) => c.origem, groupable: true, options: ORIGEM_OPTS },
    { key: "numCasos", label: "Casos", type: "number", accessor: (c) => c.numCasos, align: "right" },
  ], [])

  const bulkFields: BulkFieldConfig[] = useMemo(() => [
    { field: "tipo", label: "Tipo", icon: "user", render: (apply, close) => TIPO_OPTS.map((o) => <MenuItem key={o.value} label={o.label} onClick={() => { apply(o.value); close() }} />) },
    { field: "classificacao", label: "Classificação", icon: "flag", render: (apply, close) => CLASSE_OPTS.map((o) => <MenuItem key={o.value} dot={o.color} label={o.label} onClick={() => { apply(o.value); close() }} />) },
    { field: "origem", label: "Origem", icon: "target", render: (apply, close) => ORIGEM_OPTS.map((o) => <MenuItem key={o.value} dot={o.color} label={o.label} onClick={() => { apply(o.value); close() }} />) },
  ], [])

  return (
    <FxFrame>
      <CrmPageHead
        title="Contatos"
        sub={`${dataset.clientes.length} contatos`}
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

      {savedView.ready ? (
        <div style={{ height: 560, display: "flex", flexDirection: "column" }}>
          <DataGrid
            gridId="contatos"
            rows={optimistic.rows}
            getId={(c) => c.id}
            columns={columns}
            bulkFields={bulkFields}
            onBulkApply={(ids, field, value) => void optimistic.bulkApply(ids, field, value)}
            onRowClick={(c) => nav.openCliente(c.id)}
            searchAccessor={(c) => `${c.nome} ${c.cpfCnpj ?? ""} ${c.cidade ?? ""}`}
            csvFilename={() => `lexia-contatos-${new Date().toISOString().slice(0, 10)}.csv`}
            emptyState={{ title: "Nenhum contato encontrado", desc: "Ajuste os filtros ou cadastre um novo contato." }}
            savedView={{ initial: savedView.initial, onChange: savedView.onChange }}
          />
        </div>
      ) : (
        <div style={{ height: 560 }}>
          <GridSkeleton cols={7} />
        </div>
      )}
    </FxFrame>
  )
}
