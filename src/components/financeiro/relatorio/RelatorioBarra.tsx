"use client"

// Controle de período do relatório + ações (imprimir / PDF e CSV). A faixa de
// datas é a ÚNICA fonte da verdade e vive na URL (?de=&ate=), então os presets
// só resolvem para uma faixa — recarregar a página reabre o mesmo relatório.
import { useRouter } from "next/navigation"
import { btn } from "@/styles/components.css"
import { DateField } from "@/components/ui/DatePicker"
import { downloadCsv, rowsToCsv } from "@/components/ui/datagrid/csv"
import type { GridColumn } from "@/components/ui/datagrid/types"
import {
  FAIXA_PRESETS,
  detectPreset,
  faixaLabel,
  faixaSlug,
  presetFaixa,
  shiftFaixa,
  type Faixa,
} from "@/lib/finance/relatorio-periodo"
import type { LancamentoRow } from "@/lib/finance/types"
import { Icon } from "../interativo/kit"
import { situacao } from "../interativo/fx"
import * as c from "../interativo/interativo.css"
import * as s from "./relatorio.css"

/** Colunas do CSV — reusa o serializador do DataGrid (que neutraliza `=`/`+`
 *  líder, a proteção contra injeção de fórmula no Excel/Sheets). */
const CSV_COLS: GridColumn<LancamentoRow>[] = [
  { key: "venc", label: "Vencimento", type: "text", accessor: (r) => (r.venc ? r.venc.slice(0, 10) : "") },
  { key: "dir", label: "Tipo", type: "text", accessor: (r) => (r.dir === "in" ? "Entrada" : "Saída") },
  { key: "desc", label: "Descrição", type: "text", accessor: (r) => r.desc },
  { key: "party", label: "Contato/Fornecedor", type: "text", accessor: (r) => r.party ?? "" },
  { key: "caso", label: "Caso", type: "text", accessor: (r) => r.caso ?? "" },
  { key: "cat", label: "Categoria", type: "text", accessor: (r) => r.cat ?? "" },
  { key: "conta", label: "Conta", type: "text", accessor: (r) => r.conta ?? "" },
  { key: "sit", label: "Situação", type: "text", accessor: (r) => situacao(r) },
  { key: "pagoData", label: "Baixa", type: "text", accessor: (r) => (r.pagoData ? r.pagoData.slice(0, 10) : "") },
  { key: "valor", label: "Valor", type: "money", accessor: (r) => (r.dir === "in" ? r.valorCents : -r.valorCents) },
]

export function RelatorioBarra({ faixa, lancamentos }: { faixa: Faixa; lancamentos: LancamentoRow[] }) {
  const router = useRouter()
  const preset = detectPreset(faixa)
  const rotulo = faixaLabel(faixa)

  const go = (f: Faixa) =>
    router.push(`/financeiro?tab=relatorio&de=${f.de}&ate=${f.ate}`, { scroll: false })

  const imprimir = () => window.open(`/financeiro/relatorio?de=${faixa.de}&ate=${faixa.ate}`, "_blank")

  const exportar = () =>
    downloadCsv(`relatorio-financeiro-${faixaSlug(faixa)}.csv`, rowsToCsv(lancamentos, CSV_COLS))

  return (
    <div className={`${c.periodBar} ${s.semImpressao}`} style={{ flexWrap: "wrap", rowGap: 10 }}>
      <div className={c.periodNav}>
        <button type="button" className={c.navBtn} aria-label="Período anterior" onClick={() => go(shiftFaixa(faixa, -1))}>
          <Icon name="chevronLeft" size={16} />
        </button>
        <div className={c.periodLabelBox} style={{ minWidth: 184 }}>
          <div className={c.periodTitle}>{rotulo.titulo}</div>
          <div className={c.periodSub}>{rotulo.sub}</div>
        </div>
        <button type="button" className={c.navBtn} aria-label="Período seguinte" onClick={() => go(shiftFaixa(faixa, 1))}>
          <Icon name="chevronRight" size={16} />
        </button>
      </div>

      <div className={c.segGroup}>
        {FAIXA_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            className={c.segButton({ active: preset === p.value, size: "sm" })}
            onClick={() => go(presetFaixa(p.value))}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>De</span>
        <div style={{ width: 150 }}>
          <DateField
            value={faixa.de}
            allowClear={false}
            onChange={(iso) => iso && go({ de: iso, ate: iso > faixa.ate ? iso : faixa.ate })}
          />
        </div>
        <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>até</span>
        <div style={{ width: 150 }}>
          <DateField
            value={faixa.ate}
            allowClear={false}
            onChange={(iso) => iso && go({ de: iso < faixa.de ? iso : faixa.de, ate: iso })}
          />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
        <button
          type="button"
          className={btn({ variant: "secondary" })}
          style={{ height: 32, fontSize: 12, padding: "0 12px" }}
          onClick={exportar}
          disabled={lancamentos.length === 0}
          title="Baixar os lançamentos do período em planilha"
        >
          <Icon name="download" size={14} />
          Exportar CSV
        </button>
        <button
          type="button"
          className={btn({ variant: "gold" })}
          style={{ height: 32, fontSize: 12, padding: "0 12px" }}
          onClick={imprimir}
          title="Abre o relatório em uma página limpa e chama a impressão (salve como PDF)"
        >
          <Icon name="receipt" size={14} />
          Imprimir / PDF
        </button>
      </div>
    </div>
  )
}
