"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  AlertCircle,
  AlertTriangle,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  History,
  Mail,
  Phone,
  Receipt,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
} from "lucide-react"
import { pageShell, tabPanel, scrollArea, pageFrame } from "@/components/documents/page/documents-page.css"
import { btn } from "@/styles/components.css"
import { formatBRLCompact } from "@/lib/finance/money"
import type { PlanoAcaoData, PlanoGroup, PlanoIcon, PlanoStep } from "@/lib/finance/types"
import * as s from "./plano.css"

const ICON: Record<PlanoIcon, LucideIcon> = {
  phone: Phone,
  mail: Mail,
  receipt: Receipt,
  fileText: FileText,
  alertCircle: AlertCircle,
  calendar: Calendar,
  briefcase: Briefcase,
  alertTriangle: AlertTriangle,
  sliders: SlidersHorizontal,
  trendingDown: TrendingDown,
  clock: Clock,
}

function ProgressRing({ pct, size = 92, stroke = 9 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className={s.ring} style={{ width: size, height: size }}>
      <svg width={size} height={size} className={s.ringSvg}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className={s.ringTrack} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className={s.ringBar}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className={s.ringLabel}>{Math.round(pct * 100)}%</div>
    </div>
  )
}

function ActionStep({ step, done, onToggle }: { step: PlanoStep; done: boolean; onToggle: (id: string) => void }) {
  return (
    <div className={s.step({ done })}>
      <button
        type="button"
        onClick={() => onToggle(step.id)}
        aria-label={done ? "Marcar como pendente" : "Marcar como concluída"}
        className={s.check({ done })}
      >
        {done && <Check size={13} strokeWidth={2.6} />}
      </button>

      <div className={s.stepBody}>
        <div className={s.stepTitleRow}>
          <span className={s.stepTitle({ done })}>{step.title}</span>
          {step.ai && (
            <span className={s.iaBadge}>
              <Sparkles size={9} strokeWidth={2} />
              IA
            </span>
          )}
          <span className={s.priorityPill({ level: step.priority })}>{step.priority}</span>
        </div>
        <div className={s.stepCtx}>{step.ctx}</div>
      </div>

      {step.valueCents > 0 && (
        <div className={s.stepValue}>
          <div className={s.stepValueMoney}>{formatBRLCompact(step.valueCents)}</div>
          <div className={s.stepValueKind}>{step.valueKind === "recuperar" ? "a recuperar" : "potencial"}</div>
        </div>
      )}

      {done ? (
        <button
          type="button"
          onClick={() => onToggle(step.id)}
          className={`${btn({ variant: "ghost" })} ${s.stepDoneBtn}`}
        >
          <CheckCircle2 size={13} strokeWidth={2} />
          Concluída
        </button>
      ) : (
        <Link href={step.href} className={`${btn({ variant: "secondary" })} ${s.stepCta}`}>
          {step.cta}
        </Link>
      )}
    </div>
  )
}

function PlanGroupCard({
  group,
  doneSet,
  onToggle,
}: {
  group: PlanoGroup
  doneSet: Set<string>
  onToggle: (id: string) => void
}) {
  const Icon = ICON[group.icon] ?? Receipt
  const done = group.steps.filter((st) => doneSet.has(st.id)).length
  const groupValue = group.steps.reduce((sum, st) => sum + st.valueCents, 0)
  return (
    <div className={s.groupCard}>
      <div className={s.groupHead}>
        <div className={s.groupIcon({ tone: group.tone })}>
          <Icon size={16} strokeWidth={1.85} />
        </div>
        <div className={s.groupBody}>
          <div className={s.groupTitleRow}>
            <span className={s.groupTitle}>{group.title}</span>
            {groupValue > 0 && <span className={s.groupValuePill({ tone: group.tone })}>{formatBRLCompact(groupValue)}</span>}
          </div>
          <div className={s.groupDesc}>{group.desc}</div>
        </div>
        <span className={s.groupCount({ complete: done === group.steps.length })}>
          {done}/{group.steps.length}
        </span>
      </div>
      <div>
        {group.steps.map((st) => (
          <ActionStep key={st.id} step={st} done={doneSet.has(st.id)} onToggle={onToggle} />
        ))}
      </div>
    </div>
  )
}

const TIMELINE_BUCKETS = [
  { when: "Esta semana", tone: "vencido", priority: "Alta" },
  { when: "Próximos 15 dias", tone: "gold", priority: "Média" },
  { when: "Acompanhar", tone: "alerta", priority: "Baixa" },
] as const

export function PlanoAcaoPage({ plano, briefingDataLabel }: { plano: PlanoAcaoData; briefingDataLabel: string }) {
  const router = useRouter()
  const [doneSet, setDoneSet] = useState<Set<string>>(() => new Set())

  const allSteps = useMemo(() => plano.groups.flatMap((g) => g.steps), [plano])
  const toggle = (id: string) =>
    setDoneSet((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const doneCount = doneSet.size
  const recovered = allSteps.filter((st) => doneSet.has(st.id)).reduce((sum, st) => sum + st.valueCents, 0)
  const pct = allSteps.length > 0 ? doneCount / allSteps.length : 0
  const allDone = allSteps.length > 0 && doneCount === allSteps.length

  const timeline = TIMELINE_BUCKETS.map((b) => ({
    ...b,
    items: allSteps.filter((st) => st.priority === b.priority).map((st) => st.title),
  })).filter((b) => b.items.length > 0)

  return (
    <>
      <div className={pageShell}>
        <div className={tabPanel}>
          <div className={scrollArea}>
            <div className={`${pageFrame} ${s.pad}`}>
              <div className={s.headRow}>
                <div>
                  <h1 className={s.title}>Plano de ação</h1>
                  <p className={s.subtitle}>Do briefing de {briefingDataLabel} · revise, aja e acompanhe o progresso.</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {doneCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setDoneSet(new Set())}
                      className={`${btn({ variant: "ghost" })} ${s.smallBtn}`}
                    >
                      <History size={12} strokeWidth={1.9} />
                      Reiniciar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => router.refresh()}
                    className={`${btn({ variant: "secondary" })} ${s.actionBtn}`}
                  >
                    <RefreshCw size={13} strokeWidth={1.9} />
                    Regenerar
                  </button>
                </div>
              </div>

              {allSteps.length === 0 ? (
                <div className={s.empty}>
                  <span className={s.emptyIcon}>
                    <CheckCircle2 size={28} strokeWidth={1.6} />
                  </span>
                  Nada a recuperar agora — cobranças em dia, casos com honorário e nenhuma importação pendente.
                </div>
              ) : (
                <>
                  <div className={s.hero}>
                    <div className={s.heroGlow} />
                    <div className={s.heroBody}>
                      <div className={s.heroEyebrow}>
                        <Sparkles size={12} strokeWidth={2} />
                        Plano gerado pela LexIA
                      </div>
                      <div className={s.heroTitle}>
                        Recupere até <span className={s.heroPos}>{formatBRLCompact(plano.totalValueCents)}</span> em receita
                      </div>
                      <p className={s.heroSub}>
                        {plano.totalSteps} ações priorizadas a partir do seu briefing semanal: cobranças vencidas,
                        honorários não lançados e pendências do caixa.
                      </p>
                    </div>
                    <div className={s.heroStats}>
                      <ProgressRing pct={pct} />
                      <div className={s.heroStatCol}>
                        <div>
                          <div className={s.heroStatLabel}>Ações concluídas</div>
                          <div className={s.heroStatValue}>
                            {doneCount} <span className={s.heroStatTotal}>/ {plano.totalSteps}</span>
                          </div>
                        </div>
                        <div>
                          <div className={s.heroStatLabel}>Receita recuperada</div>
                          <div className={s.heroRecovered({ positive: recovered > 0 })}>{formatBRLCompact(recovered)}</div>
                        </div>
                        {allDone && (
                          <span className={s.heroDone}>
                            <CheckCircle2 size={13} strokeWidth={2} />
                            Plano concluído
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={s.grid}>
                    <div>
                      {plano.groups.map((g) => (
                        <PlanGroupCard key={g.id} group={g} doneSet={doneSet} onToggle={toggle} />
                      ))}
                    </div>

                    <div className={s.rail}>
                      {plano.reasoning.length > 0 && (
                        <div className={s.reasonCard}>
                          <div className={s.reasonGlow} />
                          <div className={s.reasonInner}>
                            <div className={s.reasonEyebrow}>
                              <Sparkles size={12} strokeWidth={2} />
                              Por que a LexIA sugeriu isto
                            </div>
                            <div className={s.reasonList}>
                              {plano.reasoning.map((r, i) => {
                                const Icon = ICON[r.icon] ?? Clock
                                return (
                                  <div key={i} className={s.reasonItem}>
                                    <div className={s.reasonIcon}>
                                      <Icon size={13} strokeWidth={1.85} />
                                    </div>
                                    <p className={s.reasonText}>{r.text}</p>
                                  </div>
                                )
                              })}
                            </div>
                            <div className={s.reasonFooter}>
                              <button
                                type="button"
                                onClick={() => router.refresh()}
                                className={`${btn({ variant: "ghost" })} ${s.smallBtn}`}
                              >
                                <RefreshCw size={12} strokeWidth={2} />
                                Regenerar plano
                              </button>
                              <span className={s.reasonMeta}>agora</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {timeline.length > 0 && (
                        <div className={s.card}>
                          <div className={s.timelineHead}>
                            <span className={s.timelineHeadIcon}>
                              <Calendar size={15} strokeWidth={1.9} />
                            </span>
                            <span className={s.timelineTitle}>Sequência sugerida</span>
                          </div>
                          <div className={s.timelineList}>
                            {timeline.map((blk, i) => (
                              <div key={blk.when} className={s.timelineRow}>
                                <div className={s.timelineSpine}>
                                  <span className={s.timelineDot({ tone: blk.tone })} />
                                  {i < timeline.length - 1 && <span className={s.timelineLine} />}
                                </div>
                                <div>
                                  <div className={s.timelineWhen}>{blk.when}</div>
                                  <ul className={s.timelineItems}>
                                    {blk.items.map((it, j) => (
                                      <li key={j} className={s.timelineItem}>
                                        {it}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
