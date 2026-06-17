"use client"

// Contencioso · app das listas (Painel / Processos / Prazos / Andamentos) sob a
// shell unificada. Sub-aba sincronizada com ?view= (router.replace, mesmo tab).
// A ficha é a rota própria /processos/[id]. Mutações abrem modais → router.refresh.
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FxTabs, type FxTabDef } from "@/components/crm/crm-kit"
import type { CrmDataset, CrmNav } from "@/components/crm/crm-types"
import { CrmCasoModal } from "@/components/crm/pages/CrmCasoModal"
import type { ProcessosDataset } from "@/lib/processos/dataset"
import type { PublicacaoRow } from "@/lib/processos/types"
import type { AlertaProcesso } from "@/lib/processos/saude"
import { capturaStatus, getAlertas, type CapturaStatusResponse } from "./proc-api"
import type { ProcNav, ProcView } from "./proc-types"
import { ProcPainel } from "./tabs/ProcPainel"
import { ProcProcessos } from "./tabs/ProcProcessos"
import { ProcPrazos } from "./tabs/ProcPrazos"
import { ProcAndamentos } from "./tabs/ProcAndamentos"
import { ProcCaptura } from "./tabs/ProcCaptura"
import { ProcSaude } from "./tabs/ProcSaude"
import { ProcNovoProcessoModal, ProcPrazoModal, ProcPublicacaoModal, ProcTriagemModal, ProcVincularModal } from "./ProcModals"

type Modal =
  | { kind: "prazo" }
  | { kind: "triagem"; pub: PublicacaoRow }
  | { kind: "novoProcesso" }
  | { kind: "novaPublicacao" }
  | { kind: "vincular"; pub: PublicacaoRow }
  | null

export function ProcessosApp({
  dataset,
  crm,
  initialView,
  openCaso,
}: {
  dataset: ProcessosDataset
  crm: CrmDataset
  initialView: ProcView
  openCaso?: number
}) {
  const router = useRouter()
  const [view, setView] = useState<ProcView>(initialView)
  const [modal, setModal] = useState<Modal>(null)
  const [casoModal, setCasoModal] = useState<number | null>(openCaso ?? null)
  const [captura, setCaptura] = useState<CapturaStatusResponse | null>(null)
  const [capturaLoading, setCapturaLoading] = useState(true)
  const [alertas, setAlertas] = useState<AlertaProcesso[]>([])

  const reloadCaptura = useCallback(() => {
    capturaStatus()
      .then(setCaptura)
      .catch(() => setCaptura(null))
      .finally(() => setCapturaLoading(false))
  }, [])
  useEffect(() => reloadCaptura(), [reloadCaptura])

  useEffect(() => {
    getAlertas()
      .then(setAlertas)
      .catch(() => setAlertas([]))
  }, [])

  // Deep-link / voltar-avançar: quando só os search params mudam (link "Ver caso"
  // da LexIA, redirect de /casos, Spotlight) o componente NÃO remonta — então
  // sincronizamos a view e o modal do caso com as props vindas do server.
  useEffect(() => {
    setView(initialView)
  }, [initialView])
  useEffect(() => {
    setCasoModal(openCaso ?? null)
  }, [openCaso])

  const nav: ProcNav = {
    openProcesso: (id) => router.push(`/processos/${id}`),
    openCliente: (id) => router.push(`/clientes/${id}`),
    setView: (v) => {
      setView(v)
      router.replace(v === "painel" ? "/processos" : `/processos?view=${v}`)
    },
    refresh: () => router.refresh(),
  }

  const abrirCaso = (id: number) => {
    setCasoModal(id)
    router.replace(`/processos?view=processos&caso=${id}`)
  }

  // Cross-module navigation used by the embedded CRM caso modal.
  const crmNav: CrmNav = {
    navPage: (p) => router.push(`/${p}`),
    openCliente: (id) => router.push(`/clientes/${id}`),
    openClienteTab: (id) => router.push(`/clientes/${id}`),
    openCaso: (id) => abrirCaso(id),
    openContrato: (id) => router.push(`/contratos?contrato=${id}`),
    openProcesso: (id) => router.push(`/processos/${id}`),
  }

  const inbox = dataset.publicacoes.filter((p) => p.statusTriagem === "pendente").length
  const capturaFalhou = !!captura && (captura.comunica.ultima?.status === "erro" || captura.datajud.ultima?.status === "erro" || captura.comunica.falhasRecentes.length > 0 || captura.datajud.falhasRecentes.length > 0)
  const tabs: FxTabDef[] = [
    { id: "painel", label: "Painel", icon: "layoutGrid" },
    { id: "processos", label: "Casos & processos", icon: "scale" },
    { id: "prazos", label: "Prazos", icon: "flag" },
    { id: "andamentos", label: "Andamentos", icon: "inbox", badge: inbox || null },
    { id: "captura", label: "Captura", icon: "download", badge: capturaFalhou ? "!" : null },
    { id: "saude", label: "Consistência", icon: "checkCircle" },
  ]

  return (
    <div>
      <div style={{ position: "sticky", top: 0, zIndex: 12, background: "var(--bg)" }}>
        <FxTabs tabs={tabs} active={view} onChange={(id) => nav.setView(id as ProcView)} />
      </div>

      {view === "painel" && <ProcPainel dataset={dataset} nav={nav} alertas={alertas} onLancarPrazo={() => setModal({ kind: "prazo" })} onTriar={(pub) => setModal({ kind: "triagem", pub })} capturaFalhou={capturaFalhou} />}
      {view === "processos" && (
        <ProcProcessos
          dataset={dataset}
          crm={crm}
          nav={nav}
          onAbrirCaso={abrirCaso}
          onNovoProcesso={() => setModal({ kind: "novoProcesso" })}
          alertas={alertas}
        />
      )}
      {view === "prazos" && <ProcPrazos dataset={dataset} nav={nav} onLancarPrazo={() => setModal({ kind: "prazo" })} />}
      {view === "andamentos" && <ProcAndamentos dataset={dataset} nav={nav} onTriar={(pub) => setModal({ kind: "triagem", pub })} onNovaPublicacao={() => setModal({ kind: "novaPublicacao" })} onVincular={(pub) => setModal({ kind: "vincular", pub })} />}
      {view === "captura" && <ProcCaptura status={captura} loading={capturaLoading} reload={reloadCaptura} />}
      {view === "saude" && <ProcSaude />}

      {modal?.kind === "prazo" && (
        <ProcPrazoModal processos={dataset.processos} responsaveis={dataset.responsaveis} hoje={dataset.hoje} onClose={() => setModal(null)} onSaved={() => router.refresh()} />
      )}
      {modal?.kind === "triagem" && (
        <ProcTriagemModal pub={modal.pub} responsaveis={dataset.responsaveis} hoje={dataset.hoje} onClose={() => setModal(null)} onDone={() => router.refresh()} />
      )}
      {modal?.kind === "novoProcesso" && (
        <ProcNovoProcessoModal casoOptions={dataset.casoOptions} responsaveis={dataset.responsaveis} onClose={() => setModal(null)} onCreated={(id) => { setModal(null); router.push(`/processos/${id}`) }} />
      )}
      {modal?.kind === "novaPublicacao" && (
        <ProcPublicacaoModal processos={dataset.processos} onClose={() => setModal(null)} onDone={() => router.refresh()} />
      )}
      {modal?.kind === "vincular" && (
        <ProcVincularModal
          pub={modal.pub}
          processos={dataset.processos}
          casoOptions={dataset.casoOptions}
          responsaveis={dataset.responsaveis}
          onClose={() => setModal(null)}
          onDone={() => router.refresh()}
        />
      )}

      {casoModal != null && (
        <CrmCasoModal
          casoId={casoModal}
          role={crm.role}
          dataset={crm}
          onClose={() => {
            setCasoModal(null)
            router.replace("/processos?view=processos")
          }}
          onRefresh={() => router.refresh()}
          nav={crmNav}
        />
      )}
    </div>
  )
}
