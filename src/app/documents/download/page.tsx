"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, Download, Mail, Copy, Send, FileSignature, ArrowRight } from "lucide-react"
import { ContratoHonorariosPreview } from "@/components/documents/ContratoHonorariosPreview"
import {
  CONTRATO_LIFECYCLE_TEMPLATES,
  coerceContratoData,
  contratanteNome,
} from "@/components/documents/review/contrato-review"
import { newContratoData } from "@/lib/types/contrato-honorarios"
import type { ContratoHonorariosData } from "@/lib/types/contrato-honorarios"
import { Switch } from "@/components/ui/Switch"
import { apiSend } from "@/lib/client/api"
import { toast } from "@/lib/client/toast"
import { formatBRL } from "@/lib/finance/money"
import {
  DOCUMENTO_STATUS_LABEL,
  type DocumentoDetail,
  type DocumentoStatus,
} from "@/lib/documentos/types"
import type { FecharContratoResult } from "@/lib/documentos/mutations"
import { btn } from "@/styles/components.css"
import { tokens } from "@/styles/tokens.css"

const OK_GREEN = tokens.color.ok

const FORMATS = [
  { format: "PDF", description: "PDF para assinatura", size: "A4 · pronto para impressão" },
  { format: "DOCX", description: "DOCX editável", size: "Compatível com Word e Pages" },
] as const

const TOGGLES = [
  "Assinar digitalmente (ICP-Brasil)",
  "Marca d'água \"CÓPIA\" nas demais páginas",
  "Enviar por e-mail ao cliente após download",
] as const

export default function DownloadPage() {
  const search = useSearchParams()
  const documentoId = search.get("documento")
  const templateIdParam = search.get("templateId")

  const [detail, setDetail] = useState<DocumentoDetail | null>(null)
  const [data, setData] = useState<ContratoHonorariosData>(() => newContratoData())
  const [status, setStatus] = useState<DocumentoStatus>("finalizado")

  const [selectedFormat, setSelectedFormat] = useState<"PDF" | "DOCX">("PDF")
  const [toggles, setToggles] = useState<boolean[]>([true, false, true])
  const [downloading, setDownloading] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    if (!documentoId) {
      setData(newContratoData())
      setDetail(null)
      return
    }
    apiSend<DocumentoDetail>(`/api/documentos/${documentoId}`, "GET")
      .then((doc) => {
        if (!active) return
        setDetail(doc)
        setStatus(doc.status)
        setData(coerceContratoData(doc.payload))
      })
      .catch(() => {
        if (active) setData(newContratoData())
      })
    return () => {
      active = false
    }
  }, [documentoId])

  const template = detail?.template ?? templateIdParam ?? "contrato-honorarios"
  const clienteNome = detail?.cliente ?? contratanteNome(data.contratantes[0])
  const supportsLifecycle = CONTRATO_LIFECYCLE_TEMPLATES.has(template)

  const arquivoNota = clienteNome ? `na pasta de ${clienteNome}` : "na biblioteca de documentos"

  // ── binary download (NOT apiSend — it returns a blob) ──────────────
  async function handleDownload() {
    if (downloading) return
    setDownloading(true)
    const format = selectedFormat.toLowerCase() as "pdf" | "docx"
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "contrato-honorarios",
          format,
          data,
          ...(documentoId ? { documentoId: Number(documentoId), salvar: true } : {}),
        }),
      })
      if (res.status === 401) {
        window.location.assign("/login")
        return
      }
      if (!res.ok) {
        toast("Falha ao gerar o documento", { kind: "error" })
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Contrato de Honorários Advocatícios.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      // Generating with salvar marks the row finalizado server-side.
      if (documentoId && status === "rascunho") setStatus("finalizado")
    } catch {
      toast("Sem conexão — tente novamente", { kind: "error" })
    } finally {
      setDownloading(false)
    }
  }

  // ── lifecycle: enviar para assinatura ──────────────────────────────
  async function handleEnviar() {
    if (!documentoId || busy) return
    setBusy(true)
    try {
      await apiSend(`/api/documentos/${documentoId}/enviar`, "POST")
      setStatus("enviado")
      toast("Contrato enviado para assinatura.")
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao enviar", { kind: "error" })
    } finally {
      setBusy(false)
    }
  }

  // ── lifecycle: contrato fechado → launch honorários into finance ───
  async function handleFechar() {
    if (!documentoId || busy) return
    setBusy(true)
    try {
      const { result: r } = await apiSend<{ ok: boolean; result: FecharContratoResult }>(`/api/documentos/${documentoId}/fechar`, "POST")
      setStatus("fechado")
      const partes: string[] = []
      if (r.totalCents > 0) partes.push(`${formatBRL(r.totalCents)} em honorários`)
      partes.push(`${r.lancamentoIds.length} lançamento${r.lancamentoIds.length === 1 ? "" : "s"}`)
      if (r.clienteCriado) partes.push("cliente criado")
      toast(`Contrato fechado · ${partes.join(" · ")}.`)
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao fechar o contrato", { kind: "error" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%", minHeight: 0 }}>
      {/* ── Left — success + options ──────────────────────────────────── */}
      <section style={{ padding: "48px 56px", display: "flex", flexDirection: "column", justifyContent: "center", overflow: "auto" }}>
        <div style={{ maxWidth: 460 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: tokens.color.okSoft,
            color: OK_GREEN, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22,
          }}>
            <CheckCircle size={28} strokeWidth={1.6} />
          </div>

          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 500, letterSpacing: "-0.025em", color: tokens.color.text }}>
            Pronto para baixar.
          </h1>
          <p style={{ margin: "8px 0 28px", fontSize: "14px", color: tokens.color.textMuted, lineHeight: 1.55 }}>
            O documento foi gerado no papel timbrado e arquivado {arquivoNota}
            {detail?.nome ? <> como <strong style={{ color: tokens.color.text, fontWeight: 500 }}>{detail.nome}</strong></> : null}.
          </p>

          {/* Format selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: tokens.color.textSubtle, textTransform: "uppercase", marginBottom: 10 }}>Formato</div>
            <div style={{ display: "grid", gap: 10 }}>
              {FORMATS.map(({ format, description, size }) => {
                const selected = selectedFormat === format
                return (
                  <button
                    key={format}
                    onClick={() => setSelectedFormat(format)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                      background: selected ? tokens.color.accentSoft : tokens.color.surface,
                      border: `1px solid ${selected ? tokens.brand.gold : tokens.color.border}`,
                      borderRadius: 10, cursor: "pointer", textAlign: "left", width: "100%",
                    }}
                  >
                    <div style={{
                      width: 40, height: 48, borderRadius: 6,
                      background: selected ? tokens.brand.gold : tokens.color.bgSunken,
                      color: selected ? tokens.brand.navy : tokens.color.textMuted,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 500, fontFamily: tokens.font.mono,
                      position: "relative", flexShrink: 0,
                    }}>
                      {format}
                      <div style={{
                        position: "absolute", top: 0, right: 0, width: 0, height: 0,
                        borderStyle: "solid", borderWidth: "0 8px 8px 0",
                        borderColor: `transparent ${selected ? "rgba(2,13,37,0.15)" : "rgba(2,13,37,0.06)"} transparent transparent`,
                      }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: 500, color: tokens.color.text }}>{description}</div>
                      <div style={{ fontSize: "12px", color: tokens.color.textMuted, marginTop: 2 }}>{size}</div>
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      border: `1.5px solid ${selected ? tokens.brand.gold : tokens.color.borderStrong}`,
                      background: selected ? tokens.brand.gold : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: tokens.brand.navy, flexShrink: 0,
                    }}>
                      {selected && <CheckCircle size={11} strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Options (local-state visual toggles) */}
          <div style={{
            display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px",
            background: tokens.color.bgSoft, border: `1px solid ${tokens.color.border}`,
            borderRadius: 14, marginBottom: 24,
          }}>
            {TOGGLES.map((label, i) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Switch
                  checked={toggles[i]}
                  onCheckedChange={(v) => setToggles((prev) => { const n = [...prev]; n[i] = v; return n })}
                />
                <span style={{ fontSize: 13, color: tokens.color.text }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Primary download action */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className={btn({ variant: "primary" })}
              style={{ height: 44, fontSize: 14, flex: 1, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: downloading ? 0.7 : 1 }}
            >
              <Download size={16} />{downloading ? "Gerando…" : `Baixar ${selectedFormat}`}
            </button>
            <button className={btn({ variant: "secondary" })} style={{ height: 44, width: 44, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }} title="Enviar por e-mail">
              <Mail size={16} />
            </button>
            <button className={btn({ variant: "secondary" })} style={{ height: 44, width: 44, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }} title="Copiar link">
              <Copy size={16} />
            </button>
          </div>

          {/* ── Contract lifecycle ───────────────────────────────────── */}
          {supportsLifecycle && documentoId && (
            <div style={{
              marginTop: 20, paddingTop: 20, borderTop: `1px solid ${tokens.color.border}`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: tokens.color.textSubtle, textTransform: "uppercase", marginBottom: 12 }}>
                Assinatura · {DOCUMENTO_STATUS_LABEL[status]}
              </div>

              {status === "finalizado" && (
                <button
                  onClick={handleEnviar}
                  disabled={busy}
                  className={btn({ variant: "secondary" })}
                  style={{ height: 40, fontSize: 13, display: "flex", alignItems: "center", gap: 8, opacity: busy ? 0.7 : 1 }}
                >
                  <Send size={15} />Enviar para assinatura
                </button>
              )}

              {status === "enviado" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, color: tokens.color.textMuted, lineHeight: 1.5 }}>
                    O contrato está com o cliente para assinatura. Quando estiver assinado, registre o fechamento para lançar os honorários no Financeiro.
                  </p>
                  <button
                    onClick={handleFechar}
                    disabled={busy}
                    className={btn({ variant: "gold" })}
                    style={{ height: 44, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, alignSelf: "flex-start", padding: "0 18px", opacity: busy ? 0.7 : 1 }}
                  >
                    <FileSignature size={16} />Contrato fechado
                  </button>
                </div>
              )}

              {status === "fechado" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                    background: tokens.color.okSoft, borderRadius: 10,
                    fontSize: 13, color: tokens.color.text,
                  }}>
                    <CheckCircle size={18} strokeWidth={1.8} style={{ color: OK_GREEN, flexShrink: 0 }} />
                    Contrato fechado · honorários lançados.
                  </div>
                  <a
                    href="/financeiro"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: tokens.color.accent, fontWeight: 500, textDecoration: "none" }}
                  >
                    Ver no Financeiro <ArrowRight size={14} />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Footer links */}
          <div style={{ display: "flex", gap: 16, marginTop: 22, fontSize: "12px" }}>
            <a href="/documents" style={{ color: tokens.color.accent, fontWeight: 500, textDecoration: "none" }}>Criar novo documento</a>
            <span style={{ color: tokens.color.borderStrong }}>·</span>
            <a href="/documents?tab=library" style={{ color: tokens.color.textMuted, textDecoration: "none" }}>Ver histórico</a>
          </div>
        </div>
      </section>

      {/* ── Right — document mockup ───────────────────────────────────── */}
      <section style={{
        background: tokens.color.bgSunken, padding: "48px 56px",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(circle at 50% 30%, rgba(192,161,71,0.12) 0%, transparent 60%)",
          opacity: 0.6,
        }} />
        {/* A4 preview (scaled), with a subtle paper-stack behind it. */}
        <div style={{ position: "relative", transform: "rotate(-2deg)", aspectRatio: "210 / 297", height: "min(72%, 560px)" }}>
          <div style={{ position: "absolute", inset: 0, background: "#FFFFFF", borderRadius: 6, transform: "translate(12px, 16px) rotate(3deg)", boxShadow: "0 4px 16px rgba(2, 13, 37, 0.08)", opacity: 0.7 }} />
          <div style={{ position: "absolute", inset: 0, background: "#FFFFFF", borderRadius: 6, transform: "translate(6px, 8px) rotate(1.5deg)", boxShadow: "0 4px 16px rgba(2, 13, 37, 0.1)", opacity: 0.85 }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
            <ContratoHonorariosPreview data={data} zoom={0.42} />
          </div>
        </div>
      </section>
    </div>
  )
}
