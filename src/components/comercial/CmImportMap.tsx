"use client"

// LexIA · Comercial v2 — Importar planilha com mapeamento manual (ported from
// the design handoff src/com2/cx-leads-flows.jsx CxImportManualModal, wired to
// the real 2-step server flow). Flow: pick file → POST /preview (server
// parses, returns headers + sample + auto-suggested mapping) → adjust the
// mapping in the 3-column grid → POST /mapeado (create-or-link Cliente,
// idempotent) → summary tiles.
import { useState } from "react"
import { apiSend } from "@/lib/client/api"
import { Icon } from "./cm-icons"
import { CxModal, CxSelect } from "./cx-kit"
import { CxImportSummary } from "./CmModals"
import { MAP_FIELDS, type ColumnMapping } from "@/lib/comercial/import/mapeado-core"

interface PreviewResult {
  headers: string[]
  sample: Record<string, string>[]
  suggested: ColumnMapping
  count: number
}
export interface MapImportSummary {
  total: number
  novos: number
  atualizados: number
  campanhasCriadas: number
  clientesCriados: number
  porEtapa: Record<string, number>
}

const FIELD_OPTS = [
  { value: "", label: "Ignorar coluna" },
  ...MAP_FIELDS.map((f) => ({ value: f.field, label: f.required ? `${f.label} *` : f.label })),
]

export function CmImportMapModal({ onClose, onImported }: { onClose: () => void; onImported: (s: MapImportSummary) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState("")
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [result, setResult] = useState<MapImportSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const hasNome = Object.values(mapping).some((f) => f === "nome")

  const loadPreview = async () => {
    if (!file) return
    setBusy(true)
    setErr(null)
    try {
      const text = await file.text()
      const json = await apiSend<PreviewResult>("/api/comercial/leads/import/preview", "POST", text, { contentType: "text/csv" })
      setCsvText(text)
      setPreview(json)
      setMapping(json.suggested ?? {})
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao ler o CSV")
    } finally {
      setBusy(false)
    }
  }

  const runImport = async () => {
    if (!hasNome) return
    setBusy(true)
    setErr(null)
    try {
      const json = await apiSend<{ result?: MapImportSummary }>("/api/comercial/leads/import/mapeado", "POST", { csv: csvText, mapping })
      setResult(json.result as MapImportSummary)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao importar")
    } finally {
      setBusy(false)
    }
  }

  const footer = result ? (
    <>
      <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Fechar</button>
      <button className="btn btn-primary" onClick={() => { onImported(result); onClose() }} style={{ height: 36 }}><Icon name="check" size={14} />Concluir</button>
    </>
  ) : preview ? (
    <>
      <span style={{ marginRight: "auto", fontSize: 12, color: hasNome ? "var(--text-muted)" : "var(--crit)", display: "flex", alignItems: "center", gap: 6 }}>{!hasNome && <Icon name="alertCircle" size={13} />}{hasNome ? "Mapeamento válido" : "Mapeie a coluna do nome do lead"}</span>
      <button className="btn btn-ghost" onClick={() => { setPreview(null); setErr(null) }} style={{ height: 36 }}>Voltar</button>
      <button className="btn btn-primary" onClick={() => void runImport()} disabled={!hasNome || busy} style={{ height: 36, opacity: hasNome && !busy ? 1 : 0.5 }}>
        {busy ? <><Icon name="refreshCw" size={14} className="pulse" />Importando…</> : <><Icon name="check" size={14} />Importar {preview.count} linha(s)</>}
      </button>
    </>
  ) : (
    <>
      <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
      <button className="btn btn-primary" onClick={() => void loadPreview()} disabled={!file || busy} style={{ height: 36, opacity: file && !busy ? 1 : 0.5 }}>
        {busy ? <><Icon name="refreshCw" size={14} className="pulse" />Lendo…</> : <><Icon name="arrowRight" size={14} />Avançar</>}
      </button>
    </>
  )

  return (
    <CxModal width={600} icon="braces" title="Importar planilha com mapeamento" sub={preview ? "Detectamos as colunas — confira o mapeamento sugerido." : "Suba qualquer planilha e diga qual coluna corresponde a cada campo do lead."} onClose={onClose} footer={footer}>
      {err && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", marginBottom: 12, background: "var(--crit-soft)", border: "1px solid rgba(192,73,47,0.28)", borderRadius: "var(--r-sm)", fontSize: 12, color: "var(--crit)" }}>
          <Icon name="alertTriangle" size={14} />{err}
        </div>
      )}

      {result ? (
        <CxImportSummary rows={[["Registros", result.total, "var(--text)"], ["Novos leads", result.novos, "var(--accent)"], ["Atualizados", result.atualizados, "var(--text)"], ["Contatos criados", result.clientesCriados, "var(--text)"], ["Campanhas criadas", result.campanhasCriadas, "var(--text)"]]} />
      ) : preview ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 9, alignItems: "flex-start" }}>
            <Icon name="fileSpreadsheet" size={14} style={{ color: "var(--text-subtle)", flexShrink: 0, marginTop: 1 }} />
            <span><strong style={{ color: "var(--text)" }}>{file?.name ?? "planilha.csv"}</strong> · {preview.headers.length} colunas · {preview.count} linha(s). Reatribua livremente ou marque &quot;Ignorar coluna&quot;. Reimportar atualiza registros existentes (idempotente).</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 168px", gap: 10, padding: "8px 13px", background: "var(--bg-soft)", borderBottom: "1px solid var(--border)", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-subtle)" }}><span>Coluna detectada</span><span>Exemplo</span><span>Campo do lead</span></div>
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {preview.headers.map((h, i) => {
                const sample = preview.sample.map((r) => r[h]).find((v) => v && v.trim())
                return (
                  <div key={h} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 168px", gap: 10, padding: "9px 13px", borderTop: i ? "1px solid var(--border)" : "none", alignItems: "center" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h}</span>
                    <span style={{ fontSize: 12, color: "var(--text-subtle)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sample ?? "—"}</span>
                    <CxSelect
                      options={FIELD_OPTS}
                      value={mapping[h] ?? ""}
                      onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value as ColumnMapping[string] }))}
                      style={{ height: 34, fontSize: 13 }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "26px 20px", border: "1.5px dashed var(--border-strong)", borderRadius: "var(--r-md)", background: "var(--bg-soft)", cursor: "pointer" }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="fileSpreadsheet" size={22} /></div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{file ? file.name : "Selecionar arquivo CSV"}</div>
          <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>qualquer planilha exportada em .csv</div>
          <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
        </label>
      )}
    </CxModal>
  )
}
