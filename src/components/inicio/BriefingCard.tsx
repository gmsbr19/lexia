"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRightCircle, ArrowUpRight, RefreshCw, Sparkles } from "lucide-react"
import { btn } from "@/styles/components.css"
import { apiSend } from "@/lib/client/api"
import type { BriefingArea, BriefingDiario } from "@/lib/finance/types"
import * as s from "./InicioPage.css"

/**
 * Daily briefing — the AI surface that opens the action plan. The text is
 * written once per day by Claude from the office's real context (cached
 * server-side); "Regenerar" forces a fresh pass. Falls back to a deterministic
 * sentence when the model is unavailable.
 */

const AREA_HREF: Record<BriefingArea, string | null> = {
  prazos: "/processos?view=prazos",
  inadimplencia: "/financeiro?tab=lancamentos&dir=in&stat=vencido",
  "casos-sem-fee": "/financeiro?tab=casos-sem-honorario",
  agenda: "/agenda",
  tarefas: "/tarefas",
  caixa: "/financeiro?tab=fluxo",
  comercial: "/comercial",
  none: null,
}

function geradoLabel(iso: string): string {
  try {
    const t = new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    return `Atualizado às ${t}`
  } catch {
    return "Atualizado agora"
  }
}

export function BriefingCard({ data, verFin }: { data: BriefingDiario; verFin: boolean }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const regenerar = async () => {
    if (pending) return
    setPending(true)
    try {
      await apiSend("/api/briefing/regenerar", "POST")
      router.refresh()
    } catch {
      /* apiSend already surfaced a toast */
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={s.briefingWrap}>
      <div className={s.briefingCard}>
        <div className={s.briefingGlow} />
        <div className={s.briefingInner}>
          <div className={s.briefingEyebrow}>
            <Sparkles size={12} strokeWidth={2} />
            Briefing diário · LexIA
            {data.fonte === "deterministico" && <span className={s.briefingEyebrowTag}>· base</span>}
          </div>

          <p className={s.briefingFoco}>{data.foco}</p>

          {data.destaques.length > 0 && (
            <div className={s.destaqueList}>
              {data.destaques.map((d, i) => {
                const href = AREA_HREF[d.area]
                const dot = <span className={s.destaqueDot({ tom: d.tom })} />
                if (href) {
                  return (
                    <Link key={i} href={href} className={`${s.destaqueRow} ${s.destaqueRowLink}`}>
                      {dot}
                      <span className={s.destaqueText}>{d.texto}</span>
                      <span className={s.destaqueArrow}>
                        <ArrowUpRight size={14} strokeWidth={2} />
                      </span>
                    </Link>
                  )
                }
                return (
                  <div key={i} className={s.destaqueRow}>
                    {dot}
                    <span className={s.destaqueText}>{d.texto}</span>
                  </div>
                )
              })}
            </div>
          )}

          <div className={s.briefingFooter}>
            {/* O plano de ação é financeiro (cobrança/receita) — só para quem vê o financeiro. */}
            {verFin && (
              <Link href="/plano-acao" className={`${btn({ variant: "gold" })} ${s.briefingBtn}`}>
                <ArrowRightCircle size={13} strokeWidth={2} />
                Ver plano de ação
              </Link>
            )}
            <button type="button" onClick={regenerar} disabled={pending} className={`${btn({ variant: "ghost" })} ${s.regenBtn}`}>
              <RefreshCw size={12} strokeWidth={2} className={pending ? s.spinning : undefined} />
              {pending ? "Gerando…" : "Regenerar"}
            </button>
            <span className={s.briefingMeta}>{geradoLabel(data.geradoEm)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
