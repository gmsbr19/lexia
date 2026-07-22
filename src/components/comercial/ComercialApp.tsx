"use client"

// LexIA · Comercial v2 — app root: tabs (com badges de vencidos/abertos),
// period (Visão/Funil/Exportar via CmPeriodBar; Campanhas carrega a própria
// barra de período no cabeçalho, como no design v2), modals e mutations.
// Reads one server-fetched dataset; period scoping + metrics run client-side
// so tab/period switching is instant; mutations hit the REST API then
// revalidate the dataset in place.
import { useCallback, useMemo, useState } from "react"
import { apiSend } from "@/lib/client/api"
import { useComercialData } from "@/lib/client/useComercialData"
import { cmRoot } from "./cm-classes"
import { CmPeriodBar, CmTabs, type CmTabDef } from "./cm-kit"
import { cmDefaultDateFor, cmLeadScores, cmRefToday, cmScope, type CmRef, type Periodo } from "./cm-meta"
import { cxDaysTo, cxToday } from "./cx-kit"
import { CmVisao } from "./tabs/CmVisao"
import { CmFunil } from "./tabs/CmFunil"
import { CmCampanhas } from "./tabs/CmCampanhas"
import { CmLeads, type LastImport, type LeadInject } from "./tabs/CmLeads"
import { CmFollowUp, type CxQuickKind } from "./tabs/CmFollowUp"
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
  CmToqueModal,
  type CampanhaPayload,
  type ConverterPayload,
  type GastoPayload,
  type ImportSummary,
  type LeadPayload,
  type MesclarPayload,
  type PerdidoPayload,
  type ToquePayload,
} from "./CmModals"
import { CmImportMapModal, type MapImportSummary } from "./CmImportMap"
import { useScoringStore } from "@/lib/comercial/scoring/store"
import type { CmDataset, CmDatasetCampaign, CmDatasetLead, LeadEtapa } from "@/lib/comercial/types"

const send = (url: string, body: unknown, method = "POST") => apiSend(url, method, body)

type Tab = "visao" | "funil" | "followup" | "leads" | "campanhas" | "exportar"
type Modal =
  | { type: "campanha"; edit: CmDatasetCampaign | null }
  | { type: "gasto"; campanha: CmDatasetCampaign | null }
  | { type: "lead"; edit: CmDatasetLead | null }
  | { type: "converter"; lead: CmDatasetLead }
  | { type: "mesclar"; lead: CmDatasetLead }
  | { type: "perdido"; lead: CmDatasetLead }
  | { type: "toque"; lead: CmDatasetLead }
  | { type: "importar" }
  | { type: "importarMapeado" }
  | { type: "importarMeta" }
  | null

export function ComercialApp({ dataset: serverDataset, verFin }: { dataset: CmDataset; verFin: boolean }) {
  const { dataset, revalidate } = useComercialData(serverDataset)
  const [ref0, setRef] = useState<CmRef>(() => cmRefToday())
  const [period, setPeriod] = useState<Periodo>("mes")
  const [tab, setTab] = useState<Tab>("visao")
  const [modal, setModal] = useState<Modal>(null)
  const [leadInject, setLeadInject] = useState<LeadInject | null>(null)
  const [lastImport, setLastImport] = useState<LastImport | null>(null)
  const [nonce, setNonce] = useState(1)

  const scope = useMemo(() => cmScope(ref0, period), [ref0, period])
  // revalidateShared (inside useComercialData) is a module-level function —
  // referentially stable across renders — so wrapping it here gives every
  // mutation handler below a stable `refresh` too, once THEY are useCallback'd.
  const refresh = useCallback(() => { void revalidate() }, [revalidate])

  // derived scores — badges (vencidos/abertos) + the Registrar toque suggestion
  const scoringCfg = useScoringStore((s) => s.scoring)
  const followupCfg = useScoringStore((s) => s.followup)
  const hoje = useMemo(() => cxToday(), [])
  const scores = useMemo(() => cmLeadScores(dataset, scoringCfg, followupCfg, hoje), [dataset, scoringCfg, followupCfg, hoje])

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
    const contato = {
      nome: p.nome, telefone: p.contato, origem: p.origem, campanhaId: p.campanhaId, valorEstimadoCents: p.valorEstimadoCents,
      dataEntrada: p.dataEntrada, area: p.area, responsavelUserId: p.responsavelUserId, proximaAcaoEm: p.proximaAcaoEm,
      proximaAcaoNota: p.proximaAcaoNota, temperatura: p.temperatura, potencialFinanceiro: p.potencialFinanceiro,
      urgenciaNivel: p.urgenciaNivel, poderDecisao: p.poderDecisao, jurisdicao: p.jurisdicao, viabilidade: p.viabilidade,
    }
    if (p.id) {
      await send(`/api/comercial/leads/${p.id}`, contato, "PATCH")
      const orig = dataset.leads.find((l) => l.id === p.id)
      if (orig && orig.etapa !== p.etapa) await send(`/api/comercial/leads/${p.id}/etapa`, { etapa: p.etapa })
    } else {
      await send("/api/comercial/leads", { ...contato, etapa: p.etapa })
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
    await send(`/api/comercial/leads/${p.id}/etapa`, { etapa: "perdido", motivo: p.motivo, motivoCategoria: p.motivoCategoria })
    refresh()
  }
  const submitToque = async (p: ToquePayload) => {
    await send(`/api/comercial/leads/${p.leadId}/atividades`, { tipo: p.tipo, descricao: p.nota || null, resultado: p.resultado, toqueNumero: p.toqueNumero, sinais: p.sinais, ocorreuEm: p.ocorreuEm })
    refresh()
  }
  // quick actions — mirror the design's semantics: the result classification
  // feeds the loss rules and the signal carries the engagement points.
  // useCallback'd (only depend on the now-stable `refresh`) so the per-card
  // onQuick/onToggleContrato/onReabrir props CmFollowUp forwards to the
  // memoized CxFollowCard stay reference-stable across renders.
  const submitQuick = useCallback(async (lead: CmDatasetLead, kind: CxQuickKind) => {
    const payloads: Record<CxQuickKind, { tipo: string; resultado: string; descricao: string; sinais: string[] }> = {
      compareceu: { tipo: "reuniao", resultado: "positiva", descricao: "Compareceu à reunião.", sinais: ["compareceu_reuniao"] },
      noshow: { tipo: "reuniao", resultado: "sem_resposta", descricao: "Não compareceu (no-show).", sinais: ["no_show"] },
      proposta: { tipo: "whatsapp", resultado: "positiva", descricao: "Respondeu sobre a proposta enviada.", sinais: ["respondeu_proposta"] },
    }
    await send(`/api/comercial/leads/${lead.id}/atividades`, payloads[kind])
    refresh()
  }, [refresh])
  const submitContrato = useCallback(async (lead: CmDatasetLead) => {
    await send(`/api/comercial/leads/${lead.id}`, { contratoEnviado: !lead.contratoEnviadoEm }, "PATCH")
    refresh()
  }, [refresh])
  const submitReabrir = useCallback(async (lead: CmDatasetLead) => {
    await send(`/api/comercial/leads/${lead.id}/etapa`, { etapa: "contato" })
    refresh()
  }, [refresh])
  const onImported = (s: ImportSummary) => { setLastImport({ fonte: "Genions", data: new Date().toISOString().slice(0, 10), novos: s.novos, atualizados: s.atualizados, campanhas: s.campanhasCriadas }); refresh() }
  const onImportedMap = (s: MapImportSummary) => { setLastImport({ fonte: "Planilha", data: new Date().toISOString().slice(0, 10), novos: s.novos, atualizados: s.atualizados, campanhas: s.campanhasCriadas }); refresh() }
  const onImportedMeta = () => { refresh() }

  // stable modal openers — passed as onEdit/onConvert/onLose/onMerge/onToque
  // etc. into the memoized per-row/per-card components (CxLeadRow,
  // CxKanbanCard, CxFollowCard); setModal itself is a stable setState fn, so
  // `[]` deps are safe.
  const openLeadEdit = useCallback((l: CmDatasetLead) => setModal({ type: "lead", edit: l }), [])
  const openLeadNew = useCallback(() => setModal({ type: "lead", edit: null }), [])
  const openConverter = useCallback((l: CmDatasetLead) => setModal({ type: "converter", lead: l }), [])
  const openPerdido = useCallback((l: CmDatasetLead) => setModal({ type: "perdido", lead: l }), [])
  const openMesclar = useCallback((l: CmDatasetLead) => setModal({ type: "mesclar", lead: l }), [])
  const openToque = useCallback((l: CmDatasetLead) => setModal({ type: "toque", lead: l }), [])
  const openImportar = useCallback(() => setModal({ type: "importar" }), [])
  const openImportarMapeado = useCallback(() => setModal({ type: "importarMapeado" }), [])
  const onQuick = useCallback((l: CmDatasetLead, kind: CxQuickKind) => void submitQuick(l, kind), [submitQuick])
  const onToggleContrato = useCallback((l: CmDatasetLead) => void submitContrato(l), [submitContrato])
  const onReabrir = useCallback((l: CmDatasetLead) => void submitReabrir(l), [submitReabrir])

  // ── navigation helpers ──
  const goLeadsStage = (etapa: LeadEtapa) => { setTab("leads"); setLeadInject({ etapa, nonce }); setNonce((n) => n + 1) }
  const goLeadsCampaign = (camp: CmDatasetCampaign) => { setTab("leads"); setLeadInject({ campId: camp.id, etapa: "todas", nonce }); setNonce((n) => n + 1) }

  const abertos = useMemo(() => dataset.leads.filter((l) => l.etapa !== "ganho" && l.etapa !== "perdido").length, [dataset.leads])
  const vencidos = useMemo(
    () => dataset.leads.filter((l) => {
      if (l.etapa === "ganho" || l.etapa === "perdido") return false
      const p = scores.get(l.id)?.proximoToque
      return !!p && (cxDaysTo(p.dataISO, hoje) ?? 99) <= 0
    }).length,
    [dataset.leads, scores, hoje],
  )

  const TABS: CmTabDef[] = [
    { id: "visao", label: "Visão geral", icon: "home" },
    { id: "funil", label: "Funil", icon: "funnel" },
    { id: "followup", label: "Follow-up", icon: "target", badge: vencidos || null },
    { id: "leads", label: "Leads", icon: "users", badge: abertos || null },
    { id: "campanhas", label: "Campanhas", icon: "megaphone" },
    { id: "exportar", label: "Exportar", icon: "download" },
  ]

  return (
    <>
      <div className={cmRoot}>
        <div style={{ flexShrink: 0 }}>
          <CmTabs tabs={TABS} active={tab} onChange={(id) => setTab(id as Tab)} />
          {(tab === "visao" || tab === "funil" || tab === "exportar") && <CmPeriodBar ref0={ref0} setRef={setRef} period={period} setPeriod={setPeriod} scope={scope} />}
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {tab === "visao" && <CmVisao dataset={dataset} ref0={ref0} period={period} scope={scope} onNew={() => setModal({ type: "campanha", edit: null })} onLead={() => setModal({ type: "lead", edit: null })} onGoCampanhas={() => setTab("campanhas")} />}
          {tab === "funil" && <CmFunil dataset={dataset} ref0={ref0} period={period} scope={scope} onStage={goLeadsStage} onLead={() => setModal({ type: "lead", edit: null })} />}
          {tab === "followup" && (
            <CmFollowUp
              dataset={dataset}
              scores={scores}
              hoje={hoje}
              onEdit={openLeadEdit}
              onToque={openToque}
              onQuick={onQuick}
              onToggleContrato={onToggleContrato}
              onReabrir={onReabrir}
            />
          )}
          {tab === "leads" && <CmLeads dataset={dataset} scores={scores} hoje={hoje} injectFilter={leadInject} lastImport={lastImport} onNew={openLeadNew} onConvert={openConverter} onLose={openPerdido} onEdit={openLeadEdit} onImport={openImportar} onImportMap={openImportarMapeado} onMerge={openMesclar} />}
          {tab === "campanhas" && <CmCampanhas dataset={dataset} ref0={ref0} setRef={setRef} period={period} setPeriod={setPeriod} scope={scope} verFin={verFin} onNew={() => setModal({ type: "campanha", edit: null })} onGasto={(c) => setModal({ type: "gasto", campanha: c })} onEdit={(c) => setModal({ type: "campanha", edit: c })} onLeads={goLeadsCampaign} onImport={() => setModal({ type: "importarMeta" })} />}
          {tab === "exportar" && <CmExportar dataset={dataset} ref0={ref0} period={period} scope={scope} />}
        </div>

        {modal?.type === "campanha" && <CmCampanhaModal onClose={() => setModal(null)} onSubmit={submitCampanha} edit={modal.edit} />}
        {modal?.type === "gasto" && <CmGastoModal onClose={() => setModal(null)} onSubmit={submitGasto} campaigns={dataset.campaigns} contas={dataset.contas} campanha={modal.campanha} defaultData={cmDefaultDateFor(ref0, period)} />}
        {modal?.type === "lead" && <CmLeadModal onClose={() => setModal(null)} onSubmit={submitLead} campaigns={dataset.campaigns} usuarios={dataset.usuarios} edit={modal.edit} />}
        {modal?.type === "toque" && <CmToqueModal lead={modal.lead} score={scores.get(modal.lead.id) ?? null} onClose={() => setModal(null)} onSubmit={submitToque} />}
        {modal?.type === "converter" && <CmConverterModal lead={modal.lead} onClose={() => setModal(null)} onSubmit={submitConverter} />}
        {modal?.type === "mesclar" && <CmMergeModal lead={modal.lead} onClose={() => setModal(null)} onSubmit={submitMesclar} />}
        {modal?.type === "perdido" && <CmPerdidoModal lead={modal.lead} onClose={() => setModal(null)} onSubmit={submitPerdido} />}
        {modal?.type === "importar" && <CmImportarModal onClose={() => setModal(null)} onImported={onImported} />}
        {modal?.type === "importarMapeado" && <CmImportMapModal onClose={() => setModal(null)} onImported={onImportedMap} />}
        {modal?.type === "importarMeta" && <CmImportarMetaModal onClose={() => setModal(null)} onImported={onImportedMeta} />}
      </div>
    </>
  )
}
