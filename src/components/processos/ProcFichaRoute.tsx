"use client"

// Contencioso · wrapper de rota da ficha (/processos/[id]): provê nav (router) e
// os modais (lançar prazo / triar publicação) sobre o ProcFicha server-fetched.
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCrmToast } from "@/components/crm/crm-kit"
import type { ProcessoDetail, ProcessoRow, PublicacaoRow } from "@/lib/processos/types"
import type { UsuarioOption } from "@/lib/processos/dataset"
import { deleteProcesso } from "./proc-api"
import { ProcFicha } from "./ProcFicha"
import { ProcConfirmDelete, ProcPrazoModal, ProcProcessoModal, ProcTriagemModal } from "./ProcModals"

export function ProcFichaRoute({ detail, responsaveis, hoje }: { detail: ProcessoDetail; responsaveis: UsuarioOption[]; hoje: string }) {
  const router = useRouter()
  const { toast } = useCrmToast()
  const [modal, setModal] = useState<
    { kind: "prazo" } | { kind: "triagem"; pub: PublicacaoRow } | { kind: "editar" } | { kind: "excluir" } | null
  >(null)
  // só o próprio processo é selecionável no modal de prazo a partir da ficha
  const procRef = [{
    id: detail.id, casoId: detail.casoId, caso: detail.caso, numeroCnj: detail.numeroCnj, classe: detail.classe,
    assunto: detail.assunto, status: detail.status, faseAtual: detail.faseAtual, instancia: detail.instancia,
    vara: detail.vara, comarca: detail.comarca, tribunal: detail.tribunal, uf: detail.uf, sistema: detail.sistema,
    segredoJustica: detail.segredoJustica, valorCausaCents: detail.valorCausaCents, dataDistribuicao: detail.dataDistribuicao,
    responsavelUserId: detail.responsavelUserId, responsavel: detail.responsavel, prazosPendentes: detail.prazosPendentes,
    proximaDataFatal: detail.proximaDataFatal, createdAt: detail.createdAt,
  }]

  return (
    <>
      <ProcFicha
        detail={detail}
        hoje={hoje}
        onBack={() => router.push("/processos")}
        openCliente={(id) => router.push(`/contatos/${id}`)}
        onLancarPrazo={() => setModal({ kind: "prazo" })}
        onTriar={(pub) => setModal({ kind: "triagem", pub })}
        refresh={() => router.refresh()}
        onEditar={() => setModal({ kind: "editar" })}
        onExcluir={() => setModal({ kind: "excluir" })}
      />
      {modal?.kind === "prazo" && (
        <ProcPrazoModal processos={procRef} responsaveis={responsaveis} hoje={hoje} preset={{ processoId: detail.id }} onClose={() => setModal(null)} onSaved={() => router.refresh()} />
      )}
      {modal?.kind === "triagem" && (
        <ProcTriagemModal pub={modal.pub} responsaveis={responsaveis} hoje={hoje} onClose={() => setModal(null)} onDone={() => router.refresh()} />
      )}
      {modal?.kind === "editar" && (
        <ProcProcessoModal
          casoOptions={[]}
          responsaveis={responsaveis}
          processo={procRef[0] as ProcessoRow}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); router.refresh() }}
        />
      )}
      {modal?.kind === "excluir" && (
        <ProcConfirmDelete
          titulo="Excluir processo"
          mensagem={`Excluir o processo ${detail.numeroCnj ?? detail.classe ?? ""}? Ele sai das listas (os dados não são apagados de vez). Prazos e publicações vinculados continuam no histórico.`}
          confirmarLabel="Excluir processo"
          onConfirmar={async () => {
            await deleteProcesso(detail.id)
            toast("Processo excluído")
            router.push("/processos")
          }}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
