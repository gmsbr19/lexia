"use client"

// LexIA · CRM — lista de CASOS (/casos) sobre o grid "Controles de Visão"
// (ViewGrid), o mesmo de Contatos: visões salvas por usuário (gridId "casos"),
// filtros E/OU, ordenação, agrupamento (ex.: por cliente), colunas, CSV e lote
// (tipo/área/status/responsável). O caso também é o "projeto" do quadro de
// Tarefas: colunas de andamento (progresso, abertas, vencidas, prazo final) e a
// visão "Com tarefas em andamento". Visões-semente para arrumar a base: "Sem
// cliente" e "Sem contrato". Clique na linha → página do caso (/casos/[id]).
// Independe do módulo Processos (a coluna Processos só aparece com ele ligado).
import { useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ViewGrid, makeDefaultState,
  type VgSchema, type VgColumn, type VgRow, type VgSavedView, type VgGridStore,
  type VgEnumRegistry, type VgEnumOrder, type VgBulkField, type VgState,
} from "@/components/ui/viewgrid"
import { useOptimisticRows } from "@/lib/client/useOptimisticRows"
import { useViewGridStore } from "@/lib/client/useViewGridStore"
import { resolveAreaColor, resolveAreaLabel, toAreaOptions, useAreasStore } from "@/lib/areas/store"
import { CASO_STATUS_OPTS, CASO_TIPO_LABEL, casoStatusLabel } from "@/lib/casos/status"
import { processosHabilitado, useModulosStore } from "@/lib/modulos/store"
import type { CasoPageRow } from "@/lib/casos/types"
import { CrmKpiRow, CrmPageHead } from "../crm-kit"
import { Icon } from "../crm-icons"
import type { CrmDataset } from "../crm-types"

const TIPO_ENUM: VgEnumRegistry["x"] = { Consultivo: { c: "#3B7DD8" }, "Litígio": { c: "#C0492F" } }
const STATUS_ENUM: VgEnumRegistry["x"] = { Ativo: { c: "#2E9E5B" }, Suspenso: { c: "#C0A147" }, Arquivado: { c: "var(--text-subtle)" } }

function buildCols(verFin: boolean, processosOk: boolean): VgColumn[] {
  return [
    { key: "titulo", label: "Caso", type: "text", fixed: true, def: true, w: 300 },
    { key: "cliente", label: "Cliente", type: "text", group: true, def: true, w: 210 },
    { key: "tipo", label: "Tipo", type: "enum", enum: "tipo", group: true, def: true, w: 120 },
    { key: "area", label: "Área", type: "enum", enum: "area", group: true, def: true, w: 150 },
    { key: "status", label: "Status", type: "enum", enum: "status", group: true, def: true, w: 120 },
    { key: "responsavel", label: "Responsável", type: "text", group: true, def: true, w: 170 },
    { key: "contrato", label: "Contrato", type: "text", group: true, def: true, w: 200 },
    { key: "progresso", label: "Progresso", type: "num", meter: "blue", def: true, w: 120, align: "right", titleKey: "progressoTxt", csvKey: "progressoTxt" },
    { key: "tarefasAbertas", label: "Tarefas abertas", type: "num", def: true, w: 120, align: "right" },
    { key: "tarefasVencidas", label: "Vencidas", type: "num", def: true, w: 100, align: "right" },
    { key: "prazo", label: "Prazo final", type: "date", def: true, w: 120 },
    ...(processosOk ? [{ key: "numProcessos", label: "Processos", type: "num", def: true, w: 100, align: "right" } as VgColumn] : []),
    ...(verFin
      ? ([
          { key: "honorarios", label: "Honorários", type: "money", def: true, w: 130, align: "right", agg: "sum" },
          { key: "recebido", label: "Recebido", type: "money", def: false, w: 130, align: "right", agg: "sum" },
          { key: "aberto", label: "Em aberto", type: "money", def: false, w: 130, align: "right", agg: "sum" },
        ] as VgColumn[])
      : []),
    { key: "ultimaMovimentacao", label: "Movimentação", type: "date", def: false, w: 130 },
    { key: "dataCriacao", label: "Aberto em", type: "date", def: false, w: 120 },
  ]
}

const rule = (id: string, col: string, op: string, values: string[] = []) =>
  ({ type: "rule" as const, id, col, op, value: "", value2: "", values })

function casoSeedViews(cols: VgColumn[]): VgSavedView[] {
  const base = () => makeDefaultState({ cols })
  const withRule = (r: ReturnType<typeof rule>): VgState => {
    const s = base()
    s.filters = { type: "group", id: "root", combinator: "E", children: [r] }
    return s
  }
  const porCliente = base()
  porCliente.groupCols = ["cliente"]
  porCliente.sort = [{ col: "titulo", dir: "asc" }]
  return [
    { id: "k-all", name: "Todos os casos", icon: "list", isDefault: true, state: base() },
    { id: "k-ativos", name: "Ativos", icon: "checkCircle", state: withRule(rule("seed-ativo", "status", "in", ["Ativo"])) },
    {
      id: "k-andamento",
      name: "Com tarefas em andamento",
      icon: "kanban",
      state: withRule({ ...rule("seed-andamento", "tarefasAbertas", "gt"), value: "0" }),
    },
    { id: "k-cliente", name: "Por cliente", icon: "users", state: porCliente },
    { id: "k-semcli", name: "Sem cliente", icon: "alertCircle", state: withRule(rule("seed-semcli", "cliente", "empty")) },
    { id: "k-semctr", name: "Sem contrato", icon: "fileText", state: withRule(rule("seed-semctr", "contrato", "empty")) },
    { id: "k-arquivados", name: "Arquivados", icon: "list", state: withRule(rule("seed-arquivados", "status", "in", ["Arquivado"])) },
  ]
}

interface Props {
  dataset: CrmDataset
  casos: CasoPageRow[]
  verFin: boolean
  podeCriar: boolean
  onNovo: () => void
}

export function CrmCasosPage({ dataset, casos, verFin, podeCriar, onNovo }: Props) {
  const router = useRouter()
  const processosOk = processosHabilitado(useModulosStore((s) => s.modulos))
  const areas = useAreasStore((s) => s.areas)
  const optimistic = useOptimisticRows<CasoPageRow>({
    initialRows: casos,
    getId: useCallback((c: CasoPageRow) => c.id, []),
    patchUrl: (id) => `/api/casos/${id}`,
    bulkUrl: "/api/casos/lote",
  })
  const saved = useViewGridStore("casos")
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const cols = useMemo(() => buildCols(verFin, processosOk), [verFin, processosOk])
  const userNome = useMemo(() => new Map(dataset.usuarios.map((u) => [u.id, u.nome])), [dataset.usuarios])

  const counts = useMemo(() => ({
    total: optimistic.rows.length,
    ativos: optimistic.rows.filter((c) => casoStatusLabel(c.status) === "Ativo").length,
    semCliente: optimistic.rows.filter((c) => c.clienteId == null).length,
    semContrato: optimistic.rows.filter((c) => c.contratoId == null).length,
  }), [optimistic.rows])

  const schema: VgSchema = useMemo(() => {
    const areaKeys = [...new Set(optimistic.rows.map((c) => c.area).filter((a): a is string => !!a))]
    const areaLabels = areaKeys.map((k) => resolveAreaLabel(areas, k) || k)
    const areaEnum: VgEnumRegistry["x"] = Object.fromEntries(
      areaKeys.map((k, i) => [areaLabels[i], { c: resolveAreaColor(areas, k) ?? "var(--text-muted)" }]),
    )
    const enums: VgEnumRegistry = { tipo: TIPO_ENUM, status: STATUS_ENUM, area: areaEnum }
    const enumOrder: VgEnumOrder = {
      tipo: ["Consultivo", "Litígio"],
      status: ["Ativo", "Suspenso", "Arquivado"],
      area: [...areaLabels].sort((a, b) => a.localeCompare(b)),
    }
    return { id: "casos", label: "Casos", primaryLabel: "Caso", icon: "fileText", cols, enums, enumOrder, people: [], peopleMap: {}, today }
  }, [optimistic.rows, areas, cols, today])

  const rows: VgRow[] = useMemo(() => optimistic.rows.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    cliente: c.cliente ?? "",
    tipo: CASO_TIPO_LABEL[c.tipo] ?? c.tipo,
    area: c.area ? resolveAreaLabel(areas, c.area) || c.area : "",
    status: casoStatusLabel(c.status),
    // após um lote otimista só o id muda — o nome vem da lista de usuários
    responsavel: (c.responsavelUserId != null ? userNome.get(c.responsavelUserId) : null) ?? c.responsavel ?? "",
    contrato: c.contrato ?? "",
    progresso: c.tarefasTotal ? Math.round((c.tarefasFeitas / c.tarefasTotal) * 100) : 0,
    progressoTxt: c.tarefasTotal ? `${c.tarefasFeitas} de ${c.tarefasTotal} ${c.tarefasTotal === 1 ? "tarefa" : "tarefas"}` : "Sem tarefas",
    tarefasAbertas: c.tarefasAbertas,
    tarefasVencidas: c.tarefasVencidas,
    prazo: c.prazo ?? "",
    numProcessos: c.numProcessos,
    honorarios: c.honorariosCents / 100,
    recebido: c.recebidoCents / 100,
    aberto: c.abertoCents / 100,
    ultimaMovimentacao: c.ultimaMovimentacao ?? "",
    dataCriacao: c.dataCriacao ?? "",
  })), [optimistic.rows, areas, userNome])

  const seedViews = useMemo(() => casoSeedViews(cols), [cols])

  const bulkFields: VgBulkField[] = useMemo(() => [
    { field: "tipo", label: "Tipo", icon: "flag", options: [{ value: "consultivo", label: "Consultivo" }, { value: "litigio", label: "Litígio" }] },
    { field: "area", label: "Área", icon: "circleDot", options: toAreaOptions(areas).map((a) => ({ value: a.id, label: a.label })) },
    { field: "status", label: "Status", icon: "checkCircle", options: CASO_STATUS_OPTS.map((o) => ({ value: o.value, label: o.label })) },
    { field: "responsavelUserId", label: "Responsável", icon: "user", options: dataset.usuarios.map((u) => ({ value: String(u.id), label: u.nome })) },
  ], [areas, dataset.usuarios])

  const onBulkApply = useCallback((ids: (string | number)[], field: string, value: string | null) => {
    const v: unknown = field === "responsavelUserId" ? (value == null ? null : Number(value)) : value
    void optimistic.bulkApply(ids as number[], field, v)
  }, [optimistic])

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ flexShrink: 0, padding: "20px 24px 10px" }}>
        <CrmPageHead
          title="Casos"
          sub="A matéria de cada cliente — vincule cliente, contrato e honorários. Processos judiciais ficam dentro do caso."
          right={
            podeCriar && (
              <span style={{ display: "inline-flex", gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => router.push("/tarefas?pagina=modelos")} title="Montar um caso a partir de um modelo de tarefas">
                  <Icon name="layers" size={15} />A partir de modelo
                </button>
                <button className="btn btn-primary" onClick={onNovo}><Icon name="plus" size={15} />Novo caso</button>
              </span>
            )
          }
        />
        <CrmKpiRow
          kpis={[
            { label: "Total de casos", value: counts.total, icon: "briefcase" },
            { label: "Ativos", value: counts.ativos, icon: "checkCircle" },
            { label: "Sem cliente", value: counts.semCliente, icon: "user", accent: counts.semCliente ? "gold" : undefined },
            { label: "Sem contrato", value: counts.semContrato, icon: "receipt" },
          ]}
        />
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {saved.ready ? (
          <ViewGrid
            schema={schema}
            rows={rows}
            searchKeys={["titulo", "cliente", "contrato", "responsavel"]}
            initialStore={saved.initial}
            seedViews={seedViews}
            onStoreChange={(s: VgGridStore) => saved.onChange(s)}
            onRowClick={(r) => router.push(`/casos/${r.id}`)}
            selectable={podeCriar}
            bulkFields={bulkFields}
            onBulkApply={onBulkApply}
            csvName={() => `lexia-casos-${today}.csv`}
          />
        ) : (
          <div className="vc-root" style={{ padding: 24 }}><div className="skeleton" style={{ height: 32, width: 260, borderRadius: 8 }} /></div>
        )}
      </div>
    </div>
  )
}
