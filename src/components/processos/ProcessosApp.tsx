"use client"

// Contencioso · app das listas (Painel / Processos / Prazos / Andamentos) sob a
// shell unificada. Sub-aba sincronizada com ?view= (router.replace, mesmo tab).
// A ficha é a rota própria /processos/[id]. Mutações abrem modais → router.refresh.
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FxTabs, type FxTabDef } from "@/components/crm/crm-kit"
import type { CrmDataset } from "@/components/crm/crm-types"
import type { ProcessosDataset } from "@/lib/processos/dataset"
import type { PublicacaoRow } from "@/lib/processos/types"
import type { AlertaProcesso } from "@/lib/processos/saude"
import { getAlertas } from "./proc-api"
import type { ProcNav, ProcView } from "./proc-types"
import { ProcPainel } from "./tabs/ProcPainel"
import { ProcProcessos } from "./tabs/ProcProcessos"
import { ProcPrazos } from "./tabs/ProcPrazos"
import { ProcAndamentos } from "./tabs/ProcAndamentos"
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
}: {
  dataset: ProcessosDataset
  crm: CrmDataset
  initialView: ProcView
}) {
  const router = useRouter()
  const [view, setView] = useState<ProcView>(initialView)
  const [modal, setModal] = useState<Modal>(null)
  const [alertas, setAlertas] = useState<AlertaProcesso[]>([])

  useEffect(() => {
    getAlertas()
      .then(setAlertas)
      .catch(() => setAlertas([]))
  }, [])

  // Deep-link / voltar-avançar: quando só os search params mudam (link da LexIA,
  // Spotlight) o componente NÃO remonta — então sincronizamos a view com a prop
  // (ajuste durante o render, sem efeito).
  const [lastInitial, setLastInitial] = useState(initialView)
  if (initialView !== lastInitial) {
    setLastInitial(initialView)
    setView(initialView)
  }

  const nav: ProcNav = {
    openProcesso: (id) => router.push(`/processos/${id}`),
    openCliente: (id) => router.push(`/contatos/${id}`),
    setView: (v) => {
      setView(v)
      router.replace(v === "painel" ? "/processos" : `/processos?view=${v}`)
    },
    refresh: () => router.refresh(),
  }

  // O caso tem página própria (/casos/[id]) — independe deste módulo.
  const abrirCaso = (id: number) => router.push(`/casos/${id}`)

  const inbox = dataset.publicacoes.filter((p) => p.statusTriagem === "pendente").length
  const tabs: FxTabDef[] = [
    { id: "painel", label: "Painel", icon: "layoutGrid" },
    { id: "processos", label: "Processos", icon: "scale" },
    { id: "prazos", label: "Prazos", icon: "flag" },
    { id: "andamentos", label: "Andamentos", icon: "inbox", badge: inbox || null },
    { id: "saude", label: "Consistência", icon: "checkCircle" },
  ]

  return (
    <div>
      <div style={{ position: "sticky", top: 0, zIndex: 12, background: "var(--bg)" }}>
        <FxTabs tabs={tabs} active={view} onChange={(id) => nav.setView(id as ProcView)} />
      </div>

      {view === "painel" && <ProcPainel dataset={dataset} nav={nav} alertas={alertas} onLancarPrazo={() => setModal({ kind: "prazo" })} onTriar={(pub) => setModal({ kind: "triagem", pub })} />}
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
    </div>
  )
}
