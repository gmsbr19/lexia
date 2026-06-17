"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { Clock, Flag, MoreVertical, Phone, Receipt, Sparkles, Zap } from "lucide-react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { btn } from "@/styles/components.css"
import { apiSend } from "@/lib/client/api"
import type { ProximoPassoItem, ProximoPassoTipo, Urgencia } from "@/lib/finance/types"
import * as s from "./ProximoPassoQueue.css"

const ICON: Record<ProximoPassoTipo, LucideIcon> = {
  inadimplente: Phone,
  parcela_vence: Clock,
  caso_sem_fee: Receipt,
  prazo: Flag,
  briefing: Sparkles,
}

/** Snooze (30d) or permanently dismiss a suggestion, then refresh the queue. */
function DismissMenu({ chave }: { chave: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const run = async (dias: number | null) => {
    if (busy) return
    setBusy(true)
    try {
      await apiSend("/api/sugestoes/dispensar", "POST", { chave, dias })
      router.refresh()
    } catch {
      /* apiSend already surfaced a toast */
    } finally {
      setBusy(false)
    }
  }
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={s.dismissBtn} aria-label="Dispensar sugestão" title="Dispensar sugestão">
          <MoreVertical size={15} strokeWidth={2} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={s.menu} sideOffset={4} align="end">
          <DropdownMenu.Item className={s.menuItem} onSelect={() => run(30)}>
            Adiar por 30 dias
          </DropdownMenu.Item>
          <DropdownMenu.Item className={s.menuItem} onSelect={() => run(null)}>
            Não sugerir novamente
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

/**
 * The anti-idleness queue: prioritized "what to do now". Driven by the
 * deterministic rules engine (src/lib/finance/proximo-passo.ts); the gold "IA"
 * badge marks items a Claude ranker will refine later. Each item can be snoozed
 * or permanently dismissed so it stops "insisting".
 */
export function ProximoPassoQueue({ items }: { items: ProximoPassoItem[] }) {
  return (
    <div className={s.card}>
      <div className={s.head}>
        <div className={s.headLeft}>
          <div className={s.headIcon}>
            <Zap size={15} strokeWidth={1.9} />
          </div>
          <div>
            <div className={s.headTitle}>Próximo passo</div>
            <div className={s.headSub}>Priorizado pela LexIA · o que fazer agora</div>
          </div>
        </div>
        <Link href="/plano-acao" className={s.headLink}>
          Ver tudo →
        </Link>
      </div>

      {items.length === 0 ? (
        <div className={s.empty}>Nada urgente agora.</div>
      ) : (
        items.map((it) => {
          const Icon = ICON[it.tipo] ?? Sparkles
          const tone: Urgencia = it.urgencia
          const row = (
            <>
              <div className={s.iconCircle({ tone })}>
                <Icon size={16} strokeWidth={1.8} />
              </div>
              <div className={s.body}>
                <div className={s.titleRow}>
                  <span className={s.itemTitle}>{it.titulo}</span>
                  {it.ai && (
                    <span className={s.iaBadge}>
                      <Sparkles size={9} strokeWidth={2} />
                      IA
                    </span>
                  )}
                </div>
                <span className={s.itemCtx}>{it.descricao}</span>
              </div>
              {it.cta && <span className={`${btn({ variant: "secondary" })} ${s.cta}`}>{it.cta}</span>}
            </>
          )
          return (
            <div key={it.id} className={s.rowWrap}>
              {it.href ? (
                <Link href={it.href} className={s.item}>
                  {row}
                </Link>
              ) : (
                <div className={s.item}>{row}</div>
              )}
              {it.chave && <DismissMenu chave={it.chave} />}
            </div>
          )
        })
      )}
    </div>
  )
}
