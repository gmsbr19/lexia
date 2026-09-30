"use client"

// LexIA · CRM — route wrappers. The CRM pages now render as normal Next routes
// under the unified shell (no workspace SPA / split). Each wrapper supplies a
// router-based nav and renders Contrato as a local modal overlay. Cliente detail
// (/contatos/[id]) and Caso (/casos/[id]) are their own routes.
import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useTabs } from "@/components/shell/tabs-store"
import { CrmClientesPage } from "./pages/CrmClientesPage"
import { CrmClienteDetail } from "./pages/CrmClienteDetail"
import { CrmCasosPage } from "./pages/CrmCasosPage"
import { CrmCasoDetail } from "./pages/CrmCasoDetail"
import type { CasoTab } from "@/lib/casos/status"
import { CrmCasoFormModal } from "./pages/CrmCasoForm"
import { CrmContratosPage } from "./pages/CrmContratosPage"
import { CrmAgendaPage } from "./pages/CrmAgendaPage"
import { CrmContratoModal, CrmNovoContratoModal } from "./pages/CrmContratoModal"
import { CrmQuickCliente, CrmAnonimizar, CrmMesclarClientes } from "./pages/CrmQuickModals"
import type { CasoPageRow } from "@/lib/casos/types"
import type { ClienteTab, CrmDataset, CrmNav } from "./crm-types"

/** Router-based nav + Contrato modal overlay shared by the CRM routes. */
function useCrmRouteNav(dataset: CrmDataset, init?: { contrato?: number }) {
  const router = useRouter()
  const [contrato, setContrato] = useState<number | null>(init?.contrato ?? null)
  const refresh = () => router.refresh()
  const nav: CrmNav = {
    navPage: (page) => router.push(page === "clientes" ? "/contatos" : `/${page}`),
    openCliente: (id) => router.push(`/contatos/${id}`),
    openClienteTab: (id) => router.push(`/contatos/${id}`),
    openCaso: (id) => router.push(`/casos/${id}`),
    openContrato: (id) => setContrato(id),
    openProcesso: (id) => router.push(`/processos/${id}`),
  }
  const modals: ReactNode = (
    <>
      {contrato != null && (
        <CrmContratoModal
          contratoId={contrato}
          dataset={dataset}
          onClose={() => setContrato(null)}
          onRefresh={refresh}
          nav={{ openCliente: nav.openCliente, openCaso: (id) => { setContrato(null); nav.openCaso(id) } }}
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

export function CasosRoute({
  dataset,
  casos,
  verFin,
  podeCriar,
  novo,
}: {
  dataset: CrmDataset
  casos: CasoPageRow[]
  verFin: boolean
  podeCriar: boolean
  novo?: boolean
}) {
  const router = useRouter()
  const [form, setForm] = useState(!!novo && podeCriar)
  return (
    <>
      <CrmCasosPage dataset={dataset} casos={casos} verFin={verFin} podeCriar={podeCriar} onNovo={() => setForm(true)} />
      {form && (
        <CrmCasoFormModal
          dataset={dataset}
          onClose={() => setForm(false)}
          onSaved={(id) => {
            setForm(false)
            router.push(`/casos/${id}`)
          }}
        />
      )}
    </>
  )
}

export function CasoDetailRoute({ dataset, casoId, initialTab }: { dataset: CrmDataset; casoId: number; initialTab?: CasoTab }) {
  const router = useRouter()
  const { nav, modals, refresh } = useCrmRouteNav(dataset)
  const [tab, setTab] = useState<CasoTab>(initialTab ?? "honorarios")
  const setLabel = useTabs((s) => s.setLabel)

  // refine the route-tab label with the real caso title
  useEffect(() => {
    const k = dataset.casos.find((x) => x.id === casoId)
    if (k) setLabel(`/casos/${casoId}`, k.titulo, "briefcase")
  }, [casoId, dataset.casos, setLabel])

  return (
    <>
      <CrmCasoDetail
        casoId={casoId}
        tab={tab}
        onTab={setTab}
        dataset={dataset}
        nav={nav}
        onRefresh={refresh}
        onDeleted={() => {
          router.push("/casos")
          router.refresh()
        }}
      />
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
