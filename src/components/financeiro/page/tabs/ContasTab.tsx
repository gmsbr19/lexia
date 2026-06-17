import { Scale, Wallet } from "lucide-react"
import { scrollArea } from "@/components/documents/page/documents-page.css"
import { statsGrid } from "@/components/documents/page/tabs/LibraryTab/LibraryTab.css"
import { getAcertoSocios, getContaBalances, getContasOptions, getTransferencias } from "@/lib/finance/queries"
import { KpiCard } from "../../shared/KpiCard"
import { ContasPanel } from "../../contas/ContasPanel"
import { AcertoSociosPanel } from "../../contas/AcertoSociosPanel"
import { TransferenciasPanel } from "../../contas/TransferenciasPanel"
import * as f from "../financeiro.css"

export async function ContasTab() {
  const [balanco, contas, transferencias, acerto] = await Promise.all([
    getContaBalances(),
    getContasOptions(),
    getTransferencias(),
    getAcertoSocios(),
  ])
  const socios = balanco.socioContas

  return (
    <div className={scrollArea}>
      <div className={f.pad}>
        <div className={f.header}>
          <div>
            <h1 className={f.title}>Contas & Balanço</h1>
            <p className={f.subtitle}>Saldo de cada conta, balanço entre os sócios e transferências.</p>
          </div>
        </div>

        <div className={statsGrid} style={{ marginBottom: 20 }}>
          <KpiCard label="Saldo total" cents={balanco.saldoTotalCents} sub={`${balanco.contas.length} contas`} icon={Wallet} accent="gold" />
          {socios.map((s) => (
            <KpiCard key={s.id} label={`Saldo ${s.nome}`} cents={s.saldoCents} sub="sócio" icon={Wallet} />
          ))}
          {socios.length === 2 && (
            <KpiCard
              label="Acerto entre sócios"
              cents={acerto.valorCents}
              sub={acerto.quitado ? "tudo acertado" : `${acerto.devedorNome} → ${acerto.credorNome}`}
              icon={Scale}
            />
          )}
        </div>

        {socios.length === 2 && (
          <>
            <div className={f.sectionTitle}>Acerto entre sócios</div>
            <div className={f.sectionGap}>
              <AcertoSociosPanel acerto={acerto} />
            </div>
          </>
        )}

        <div className={f.sectionTitle}>Saldo por conta</div>
        <div className={f.sectionGap}>
          <ContasPanel contas={balanco.contas} />
        </div>

        <div className={f.sectionTitle}>Transferências entre contas</div>
        <TransferenciasPanel contas={contas} transferencias={transferencias} />
      </div>
    </div>
  )
}
