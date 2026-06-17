"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Edit2, Users, Download, Check, CircleDot, Sparkles } from "lucide-react"
import { ContratoHonorariosPreview } from "@/components/documents/ContratoHonorariosPreview"
import {
  coerceContratoData,
  contratanteDoc,
  contratanteNome,
  contratoTitulo,
  honorariosPreenchidos,
  honorariosResumo,
} from "@/components/documents/review/contrato-review"
import { newContratoData } from "@/lib/types/contrato-honorarios"
import type { ContratoHonorariosData } from "@/lib/types/contrato-honorarios"
import { apiSend } from "@/lib/client/api"
import { DOCUMENTO_STATUS_LABEL, type DocumentoDetail } from "@/lib/documentos/types"
import { btn } from "@/styles/components.css"
import { tokens } from "@/styles/tokens.css"

const OK_GREEN = tokens.color.ok

function relTime(iso: string | null): string {
  if (!iso) return "—"
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return "—"
  const diff = Math.max(0, Date.now() - t)
  const min = Math.round(diff / 60_000)
  if (min < 1) return "agora há pouco"
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  return `há ${d} dia${d === 1 ? "" : "s"}`
}

interface CheckItem {
  label: string
  state: "ok" | "pending"
  detail: string
}

export default function PreviewPage() {
  const router = useRouter()
  const search = useSearchParams()
  const documentoId = search.get("documento")
  const templateIdParam = search.get("templateId")

  const [detail, setDetail] = useState<DocumentoDetail | null>(null)
  const [data, setData] = useState<ContratoHonorariosData>(() => newContratoData())
  const [loading, setLoading] = useState(Boolean(documentoId))

  useEffect(() => {
    let active = true
    if (!documentoId) {
      setData(newContratoData())
      setDetail(null)
      setLoading(false)
      return
    }
    setLoading(true)
    apiSend<DocumentoDetail>(`/api/documentos/${documentoId}`, "GET")
      .then((doc) => {
        if (!active) return
        setDetail(doc)
        setData(coerceContratoData(doc.payload))
      })
      .catch(() => {
        if (active) setData(newContratoData())
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [documentoId])

  const template = detail?.template ?? templateIdParam ?? "contrato-honorarios"
  const titulo = useMemo(
    () => contratoTitulo(data, detail?.nome ?? "Contrato de Honorários"),
    [data, detail?.nome],
  )

  const checks = useMemo<CheckItem[]>(() => {
    const c0 = data.contratantes[0]
    const nome = contratanteNome(c0)
    const doc = contratanteDoc(c0)
    const honOk = honorariosPreenchidos(data.honorarios)
    return [
      {
        label: "Partes identificadas",
        state: nome && doc ? "ok" : "pending",
        detail: nome && doc ? "Nome e documento informados" : "Faltam dados do contratante",
      },
      {
        label: "Valores e datas",
        state: honOk ? "ok" : "pending",
        detail: honOk ? honorariosResumo(data.honorarios) : "Honorários incompletos",
      },
      {
        label: "Cláusula de foro",
        state: data.foro.trim() ? "ok" : "pending",
        detail: data.foro.trim() ? `Comarca de ${data.foro}` : "Foro não definido",
      },
      {
        label: "Assinatura digital",
        state: "pending",
        detail: "Aguardando configuração",
      },
    ]
  }, [data])

  const details: Array<[string, string]> = [
    ["Cliente", detail?.cliente ?? contratanteNome(data.contratantes[0]) ?? "—"],
    ["Caso", detail?.caso ?? "—"],
    ["Criado por", detail?.criadoPor ?? "—"],
    ["Atualizado", relTime(detail?.atualizadoEm ?? null)],
    ["Status", detail ? DOCUMENTO_STATUS_LABEL[detail.status] : "Rascunho"],
  ]

  const editHref = `/documents/editor/${template}${documentoId ? `?documento=${documentoId}` : ""}`
  const downloadHref = `/documents/download${documentoId ? `?documento=${documentoId}` : `?templateId=${template}`}`

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: "100%", minHeight: 0 }}>
      {/* ── Document viewport ──────────────────────────────────────────── */}
      <section style={{ background: tokens.color.bgSunken, overflow: "auto", padding: "32px 40px 48px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: 720, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", color: tokens.color.text }}>
                {titulo}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, fontSize: 12, color: tokens.color.textMuted }}>
                <span>{detail ? DOCUMENTO_STATUS_LABEL[detail.status] : "Rascunho"}</span>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "currentColor", opacity: 0.5, display: "inline-block" }} />
                <span>Documento A4</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => router.push(editHref)}
                className={btn({ variant: "ghost" })}
                style={{ height: 32, fontSize: "12px", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Edit2 size={14} />Editar
              </button>
              <button
                className={btn({ variant: "secondary" })}
                style={{ height: 32, fontSize: "12px", display: "flex", alignItems: "center", gap: 6 }}
                title="Compartilhamento em breve"
              >
                <Users size={14} />Compartilhar
              </button>
              <button
                onClick={() => router.push(downloadHref)}
                className={btn({ variant: "primary" })}
                style={{ height: 32, fontSize: "12px", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Download size={14} />Baixar
              </button>
            </div>
          </div>

          {/* Documento / Comentários / Histórico — Documento active, others inert */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <div style={{ display: "flex", gap: 4, background: tokens.color.surface, border: `1px solid ${tokens.color.border}`, borderRadius: 999, padding: 3 }}>
              {["Documento", "Comentários", "Histórico"].map((tab, i) => (
                <button
                  key={tab}
                  disabled={i !== 0}
                  style={{
                    height: 26, padding: "0 12px", borderRadius: 999, border: "none",
                    background: i === 0 ? tokens.color.text : "transparent",
                    color: i === 0 ? tokens.color.bg : tokens.color.textMuted,
                    fontSize: "12px", fontWeight: 500, cursor: i === 0 ? "default" : "not-allowed",
                  }}
                >{tab}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ width: "100%", maxWidth: 720, display: "flex", justifyContent: "center" }}>
          <ContratoHonorariosPreview data={data} zoom={0.78} />
        </div>

        {loading && (
          <div style={{ marginTop: 14, fontSize: "12px", color: tokens.color.textSubtle }}>Carregando documento…</div>
        )}
      </section>

      {/* ── Review sidebar ─────────────────────────────────────────────── */}
      <aside style={{ borderLeft: `1px solid ${tokens.color.border}`, background: tokens.color.bg, overflow: "auto", padding: "24px 22px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: tokens.color.textSubtle, textTransform: "uppercase", marginBottom: 12 }}>Verificação</div>
          {checks.map((c, i) => (
            <div key={c.label} style={{
              display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0",
              borderBottom: i < checks.length - 1 ? `1px solid ${tokens.color.border}` : "none",
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                background: c.state === "ok" ? tokens.color.okSoft : tokens.color.accentSoft,
                color: c.state === "ok" ? OK_GREEN : tokens.color.accent,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
              }}>
                {c.state === "ok" ? <Check size={11} strokeWidth={2.4} /> : <CircleDot size={11} strokeWidth={2.4} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: 500, color: tokens.color.text, letterSpacing: "-0.01em" }}>{c.label}</div>
                <div style={{ fontSize: "12px", color: tokens.color.textMuted, marginTop: 2 }}>{c.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: tokens.color.textSubtle, textTransform: "uppercase", marginBottom: 12 }}>Sugestões da IA</div>
          <div style={{ background: tokens.color.bgSoft, border: `1px solid ${tokens.color.border}`, borderRadius: 10, padding: "12px 12px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: tokens.color.accent, fontWeight: 500, marginBottom: 6 }}>
              <Sparkles size={12} />CLÁUSULA 2ª
            </div>
            <div style={{ fontSize: "12px", color: tokens.color.text, lineHeight: 1.5, letterSpacing: "-0.005em", marginBottom: 10 }}>
              Considerar incluir multa por atraso (2% + juros 1% a.m.) — padrão do escritório.
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => router.push(editHref)}
                className={btn({ variant: "secondary" })}
                style={{ height: 26, fontSize: "12px", padding: "0 10px" }}
              >Aplicar</button>
              <button className={btn({ variant: "ghost" })} style={{ height: 26, fontSize: "12px", padding: "0 10px" }}>Ignorar</button>
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: tokens.color.textSubtle, textTransform: "uppercase", marginBottom: 12 }}>Detalhes</div>
          <div style={{ display: "grid", gap: 10, fontSize: "12px" }}>
            {details.map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ color: tokens.color.textMuted }}>{k}</span>
                <span style={{ color: tokens.color.text, fontWeight: 500, textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
