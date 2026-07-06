"use client"

// LexIA · Comercial — app root: tabs, period, modals, and mutations. Reads one
// server-fetched dataset; period scoping + metrics run client-side for instant
// switching. Mutations hit the REST API then router.refresh() re-fetches.
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { apiSend } from "@/lib/client/api"
import { cmRoot } from "./cm-classes"
import { Icon } from "./cm-icons"
import { CmPeriodBar, CmTabs, type CmTabDef } from "./cm-kit"
import { cmDefaultDateFor, cmRefToday, cmScope, type CmRef, type Periodo } from "./cm-meta"
import { CmVisao } from "./tabs/CmVisao"
import { CmFunil } from "./tabs/CmFunil"
import { CmCampanhas } from "./tabs/CmCampanhas"
import { CmLeads, type LastImport, type LeadInject } from "./tabs/CmLeads"
import { CmExportar } from "./tabs/CmExportar"
import {
  CmCampanhaModal,
  CmConverterModal,
  CmGastoModal,
  CmImportarModal,
  CmImportarMetaModal,
  CmLeadModal,
  CmMergeModal,
  CmPerdidoModal,
  type CampanhaPayload,
  type ConverterPayload,
  type GastoPayload,
  type ImportSummary,
  type LeadPayload,
  type MesclarPayload,
  type PerdidoPayload,
} from "./CmModals"
import type { CmDataset, CmDatasetCampaign, CmDatasetLead, LeadEtapa } from "@/lib/comercial/types"

const send = (url: string, body: unknown, method = "POST") => apiSend(url, method, body)

type Tab = "visao" | "funil" | "campanhas" | "leads" | "exportar"
type Modal =
  | { type: "campanha"; edit: CmDatasetCampaign | null }
  | { type: "gasto"; campanha: CmDatasetCampaign | null }
  | { type: "lead"; edit: CmDatasetLead | null }
  | { type: "converter"; lead: CmDatasetLead }
  | { type: "mesclar"; lead: CmDatasetLead }
  | { type: "perdido"; lead: CmDatasetLead }
  | { type: "importar" }
  | { type: "importarMeta" }
  | null

export function ComercialApp({ dataset, verFin }: { dataset: CmDataset; verFin: boolean }) {
  const router = useRouter()
  const [ref0, setRef] = useState<CmRef>(() => cmRefToday())
  const [period, setPeriod] = useState<Periodo>("mes")
  const [tab, setTab] = useState<Tab>("visao")
  const [modal, setModal] = useState<Modal>(null)
  const [leadInject, setLeadInject] = useState<LeadInject | null>(null)
  const [lastImport, setLastImport] = useState<LastImport | null>(null)
  const [nonce, setNonce] = useState(1)

  const scope = useMemo(() => cmScope(ref0, period), [ref0, period])
  const refresh = () => router.refresh()

  // ── mutations ──
  const submitCampanha = async (p: CampanhaPayload) => {
    const body = { plataforma: p.plataforma, nome: p.nome, objetivo: p.objetivo, status: p.status, externalId: p.extId, dataInicio: p.inicio || null, dataFim: p.fim || null, area: p.area }
    await send(p.id ? `/api/comercial/campanhas/${p.id}` : "/api/comercial/campanhas", body, p.id ? "PATCH" : "POST")
    refresh()
  }
  const submitGasto = async (p: GastoPayload) => {
    await send(`/api/comercial/campanhas/${p.campanhaId}/gasto`, { valorCents: p.valorCents, data: p.data, contaId: p.contaId, descricao: p.descricao, requestId: p.requestId })
    refresh()
  }
  const submitLead = async (p: LeadPayload) => {
    if (p.id) {
      await send(`/api/comercial/leads/${p.id}`, { nome: p.nome, telefone: p.contato, origem: p.origem, campanhaId: p.campanhaId, valorEstimadoCents: p.valorEstimadoCents, dataEntrada: p.dataEntrada, area: p.area }, "PATCH")
      const orig = dataset.leads.find((l) => l.id === p.id)
      if (orig && orig.etapa !== p.etapa) await send(`/api/comercial/leads/${p.id}/etapa`, { etapa: p.etapa })
    } else {
      await send("/api/comercial/leads", { nome: p.nome, telefone: p.contato, origem: p.origem, campanhaId: p.campanhaId, etapa: p.etapa, valorEstimadoCents: p.valorEstimadoCents, dataEntrada: p.dataEntrada, area: p.area })
    }
    refresh()
  }
  const submitConverter = async (p: ConverterPayload) => {
    await send(`/api/comercial/leads/${p.id}/converter`, { valorContratadoCents: p.valorContratadoCents, tipoHonorario: p.tipoHonorario, clienteNome: p.clienteNome, casoTitulo: p.casoTitulo, dataConversao: p.dataConversao })
    refresh()
  }
  const submitMesclar = async (p: MesclarPayload) => {
    await send(`/api/comercial/leads/${p.id}/mesclar`, { clienteId: p.clienteId })
    refresh()
  }
  const submitPerdido = async (p: PerdidoPayload) => {
    await send(`/api/comercial/leads/${p.id}/etapa`, { etapa: "perdido", motivo: p.motivo })
    refresh()
  }
  const moveStage = (id: number, etapa: LeadEtapa) => { void send(`/api/comercial/leads/${id}/etapa`, { etapa }).then(refresh).catch(() => {}) }
  const bulkMove = (ids: number[], etapa: LeadEtapa) => { void Promise.all(ids.map((id) => send(`/api/comercial/leads/${id}/etapa`, { etapa }))).then(refresh).catch(() => {}) }
  const reopenLead = (id: number) => { void send(`/api/comercial/leads/${id}/etapa`, { etapa: "contato" }).then(refresh).catch(() => {}) }
  const onImported = (s: ImportSummary) => { setLastImport({ data: new Date().toISOString().slice(0, 10), novos: s.novos, atualizados: s.atualizados }); refresh() }

  // ── navigation helpers ──
  const goLeadsStage = (etapa: LeadEtapa) => { setTab("leads"); setLeadInject({ etapa, nonce }); setNonce((n) => n + 1) }
  const goLeadsCampaign = (camp: CmDatasetCampaign) => { setTab("leads"); setLeadInject({ campId: camp.id, etapa: "todas", nonce }); setNonce((n) => n + 1) }

  const novosLeads = useMemo(() => dataset.leads.filter((l) => scope.test(l.dataEntrada) && l.etapa === "novo").length, [dataset.leads, scope])

  const TABS: CmTabDef[] = [
    { id: "visao", label: "Visão geral", icon: "home" },
    { id: "funil", label: "Funil", icon: "funnel" },
    { id: "campanhas", label: "Campanhas", icon: "megaphone" },
    { id: "leads", label: "Leads", icon: "users", badge: novosLeads || null },
    { id: "exportar", label: "Exportar", icon: "download" },
  ]

  return (
    <>
      <div className={cmRoot}>
        <div style={{ flexShrink: 0 }}>
          <CmTabs tabs={TABS} active={tab} onChange={(id) => setTab(id as Tab)} />
          {tab !== "leads" && <CmPeriodBar ref0={ref0} setRef={setRef} period={period} setPeriod={setPeriod} scope={scope} />}
          {tab === "leads" && (
            <div style={{ padding: "12px 40px", borderBottom: "1px solid var(--border)", background: "var(--bg-soft)", fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="users" size={14} style={{ color: "var(--text-subtle)" }} />
              Carteira completa de leads · filtre por origem, etapa ou campanha · o período não restringe esta lista
            </div>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {tab === "visao" && <CmVisao dataset={dataset} ref0={ref0} period={period} scope={scope} onNew={() => setModal({ type: "campanha", edit: null })} onLead={() => setModal({ type: "lead", edit: null })} onGoCampanhas={() => setTab("campanhas")} />}
          {tab === "funil" && <CmFunil dataset={dataset} ref0={ref0} period={period} scope={scope} onStage={goLeadsStage} onLead={() => setModal({ type: "lead", edit: null })} />}
          {tab === "campanhas" && <CmCampanhas dataset={dataset} ref0={ref0} period={period} scope={scope} verFin={verFin} onNew={() => setModal({ type: "campanha", edit: null })} onGasto={(c) => setModal({ type: "gasto", campanha: c })} onEdit={(c) => setModal({ type: "campanha", edit: c })} onLeads={goLeadsCampaign} onImport={() => setModal({ type: "importarMeta" })} />}
          {tab === "leads" && <CmLeads dataset={dataset} injectFilter={leadInject} lastImport={lastImport} onNew={() => setModal({ type: "lead", edit: null })} onMove={moveStage} onConvert={(l) => setModal({ type: "converter", lead: l })} onLose={(l) => setModal({ type: "perdido", lead: l })} onEdit={(l) => setModal({ type: "lead", edit: l })} onReopen={reopenLead} onBulkMove={bulkMove} onImport={() => setModal({ type: "importar" })} onMerge={(l) => setModal({ type: "mesclar", lead: l })} />}
          {tab === "exportar" && <CmExportar dataset={dataset} ref0={ref0} period={period} scope={scope} />}
        </div>

        {modal?.type === "campanha" && <CmCampanhaModal onClose={() => setModal(null)} onSubmit={submitCampanha} edit={modal.edit} />}
        {modal?.type === "gasto" && <CmGastoModal onClose={() => setModal(null)} onSubmit={submitGasto} campaigns={dataset.campaigns} contas={dataset.contas} campanha={modal.campanha} defaultData={cmDefaultDateFor(ref0, period)} />}
        {modal?.type === "lead" && <CmLeadModal onClose={() => setModal(null)} onSubmit={submitLead} campaigns={dataset.campaigns} edit={modal.edit} />}
        {modal?.type === "converter" && <CmConverterModal lead={modal.lead} onClose={() => setModal(null)} onSubmit={submitConverter} />}
        {modal?.type === "mesclar" && <CmMergeModal lead={modal.lead} clientes={dataset.clientes} onClose={() => setModal(null)} onSubmit={submitMesclar} />}
        {modal?.type === "perdido" && <CmPerdidoModal lead={modal.lead} onClose={() => setModal(null)} onSubmit={submitPerdido} />}
        {modal?.type === "importar" && <CmImportarModal onClose={() => setModal(null)} onImported={onImported} />}
        {modal?.type === "importarMeta" && <CmImportarMetaModal onClose={() => setModal(null)} onImported={() => refresh()} />}
      </div>
    </>
  )
}
