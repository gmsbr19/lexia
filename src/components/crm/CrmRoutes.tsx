"use client"

// LexIA · CRM — route wrappers. The CRM pages now render as normal Next routes
// under the unified shell (no workspace SPA / split). Each wrapper supplies a
// router-based nav and renders Caso/Contrato as local modal overlays. Cliente
// detail is its own route (/clientes/[id]).
import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useTabs } from "@/components/shell/tabs-store"
import { CrmClientesPage } from "./pages/CrmClientesPage"
import { CrmClienteDetail } from "./pages/CrmClienteDetail"
import { CrmCasosPage } from "./pages/CrmCasosPage"
import { CrmContratosPage } from "./pages/CrmContratosPage"
import { CrmAgendaPage } from "./pages/CrmAgendaPage"
import { CrmCasoModal } from "./pages/CrmCasoModal"
import { CrmContratoModal, CrmNovoContratoModal } from "./pages/CrmContratoModal"
import { CrmQuickCliente, CrmAnonimizar, CrmMesclarClientes } from "./pages/CrmQuickModals"
import type { ClienteTab, CrmDataset, CrmNav } from "./crm-types"

/** Router-based nav + Caso/Contrato modal overlays shared by the CRM routes. */
function useCrmRouteNav(dataset: CrmDataset, init?: { caso?: number; contrato?: number }) {
  const router = useRouter()
  const [caso, setCaso] = useState<number | null>(init?.caso ?? null)
  const [contrato, setContrato] = useState<number | null>(init?.contrato ?? null)
  const refresh = () => router.refresh()
  const nav: CrmNav = {
    navPage: (page) => router.push(page === "clientes" ? "/contatos" : `/${page}`),
    openCliente: (id) => router.push(`/contatos/${id}`),
    openClienteTab: (id) => router.push(`/contatos/${id}`),
    openCaso: (id) => setCaso(id),
    openContrato: (id) => setContrato(id),
    openProcesso: (id) => router.push(`/processos/${id}`),
  }
  const modals: ReactNode = (
    <>
      {caso != null && (
        <CrmCasoModal casoId={caso} role={dataset.role} dataset={dataset} onClose={() => setCaso(null)} onRefresh={refresh} nav={nav} />
      )}
      {contrato != null && (
        <CrmContratoModal
          contratoId={contrato}
          dataset={dataset}
          onClose={() => setContrato(null)}
          onRefresh={refresh}
          nav={{ openCliente: nav.openCliente, openCaso: (id) => { setContrato(null); setCaso(id) } }}
        />
      )}
    </>
  )
  return { nav, modals, refresh }
}

export function ClientesRoute({ dataset, newCliente }: { dataset: CrmDataset; newCliente?: boolean }) {
  const router = useRouter()
  const { nav } = useCrmRouteNav(dataset)
  const [quick, setQuick] = useState(!!newCliente)
  return (
    <>
      <CrmClientesPage dataset={dataset} role={dataset.role} nav={nav} onNovo={() => setQuick(true)} />
      {quick && <CrmQuickCliente onClose={() => setQuick(false)} onRefresh={() => router.refresh()} />}
    </>
  )
}

export function ClienteDetailRoute({ dataset, clienteId, initialTab }: { dataset: CrmDataset; clienteId: number; initialTab?: ClienteTab }) {
  const router = useRouter()
  const { nav, modals } = useCrmRouteNav(dataset)
  const [tab, setTab] = useState<ClienteTab>(initialTab ?? "financeiro")
  const [anonId, setAnonId] = useState<number | null>(null)
  const [mergeId, setMergeId] = useState<number | null>(null)
  const setLabel = useTabs((s) => s.setLabel)

  // refine the tab label/icon with the real cliente name
  useEffect(() => {
    const c = dataset.clientes.find((x) => x.id === clienteId)
    if (c) setLabel(`/contatos/${clienteId}`, c.nome, c.tipo === "pj" ? "building" : "user")
  }, [clienteId, dataset.clientes, setLabel])

  return (
    <>
      <CrmClienteDetail
        clienteId={clienteId}
        tab={tab}
        onTab={setTab}
        role={dataset.role}
        dataset={dataset}
        nav={nav}
        onAnonimizar={(id) => setAnonId(id)}
        onMesclar={(id) => setMergeId(id)}
        onRefresh={() => router.refresh()}
      />
      {modals}
      {anonId != null && <CrmAnonimizar dataset={dataset} clienteId={anonId} onClose={() => setAnonId(null)} onRefresh={() => router.refresh()} />}
      {mergeId != null && <CrmMesclarClientes dataset={dataset} alvoId={mergeId} onClose={() => setMergeId(null)} onRefresh={() => router.refresh()} />}
    </>
  )
}

export function CasosRoute({ dataset, openCaso }: { dataset: CrmDataset; openCaso?: number }) {
  const { nav, modals } = useCrmRouteNav(dataset, { caso: openCaso })
  return (
    <>
      <CrmCasosPage dataset={dataset} role={dataset.role} nav={nav} />
      {modals}
    </>
  )
}

export function ContratosRoute({ dataset, openContrato }: { dataset: CrmDataset; openContrato?: number }) {
  const router = useRouter()
  const { nav, modals } = useCrmRouteNav(dataset, { contrato: openContrato })
  const [novo, setNovo] = useState(false)
  return (
    <>
      <CrmContratosPage dataset={dataset} nav={nav} onNovo={() => setNovo(true)} />
      {modals}
      {novo && (
        <CrmNovoContratoModal
          dataset={dataset}
          onClose={() => setNovo(false)}
          onCreated={(id) => {
            setNovo(false)
            router.refresh()
            nav.openContrato(id)
          }}
        />
      )}
    </>
  )
}

export function AgendaRoute({ dataset }: { dataset: CrmDataset }) {
  const { nav, modals } = useCrmRouteNav(dataset)
  return (
    <>
      <CrmAgendaPage dataset={dataset} role={dataset.role} nav={nav} />
      {modals}
    </>
  )
}
