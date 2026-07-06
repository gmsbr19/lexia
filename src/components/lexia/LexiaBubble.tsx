"use client"

// Renders one chat message. User turns are a navy bubble; assistant turns are an
// avatar + an ordered stack of render blocks (markdown text, tool chips,
// navigation notes, confirmation cards, system notices) + (turno completo)
// AiActionsBar/ModelSeal — reveal-on-hover do grupo (.cc-msggroup).
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/crm/crm-icons"
import type { LexiaPersona, LexiaModelo } from "@/lib/lexia/preferencias-core"
import type { Modificador } from "@/lib/lexia/agent/modificadores"
import { AgentTimeline, type TimelineStep } from "./AgentTimeline"
import { AiActionsBar, ModelSeal } from "./AiActionsBar"
import { AnexoChips } from "./AnexoChips"
import { ChoiceCard } from "./cards/ChoiceCard"
import { EntityCard } from "./cards/EntityCard"
import { InsightCard } from "./cards/InsightCard"
import { SearchResultsCard } from "./cards/SearchResultsCard"
import { SysCard } from "./cards/SysCard"
import { StreamCaret, ThinkingState } from "./cc/motion"
import { ConfirmCard } from "./ConfirmCard"
import { DocPatchCard, type DocPatchPayload } from "./DocPatchCard"
import { FollowChips } from "./FollowChips"
import { Markdown } from "./Markdown"
import { Orb } from "./LexiaKit"
import { acaoParaNotice } from "./robustez"
import { SourcesFooter } from "./SourcesFooter"
import { ThoughtDisclosure } from "./ThoughtDisclosure"
import type { ChatBlock, ChatMsg } from "./types"

const DISCLAIMER = "A LexIA pode cometer erros — confira dados sensíveis."

type ToolBlock = Extract<ChatBlock, { type: "tool" }>
type RenderUnit = { kind: "tool-group"; tools: ToolBlock[] } | { kind: "single"; block: ChatBlock; key: number }

/** Agrupa tool chips consecutivos numa única AgentTimeline (chips soltos → timeline). */
function groupBlocks(blocks: ChatBlock[]): RenderUnit[] {
  const units: RenderUnit[] = []
  let i = 0
  while (i < blocks.length) {
    const b = blocks[i]
    if (b.type === "tool") {
      const group: ToolBlock[] = []
      while (i < blocks.length && blocks[i].type === "tool") {
        group.push(blocks[i] as ToolBlock)
        i++
      }
      units.push({ kind: "tool-group", tools: group })
      continue
    }
    units.push({ kind: "single", block: b, key: i })
    i++
  }
  return units
}

export function LexiaBubble({
  msg,
  streaming,
  live = false,
  persona = "senior",
  showDisclaimer = false,
  isLastUser = false,
  isLastAssistant = false,
  onDecide,
  onResponder,
  onDocAccept,
  autoApplyDoc,
  onRetry,
  onContinuar,
  onRefazer,
  onEditarPergunta,
  onFollowupPick,
}: {
  msg: ChatMsg
  streaming: boolean
  /** Esta é a mensagem que está streamando agora (última + streaming=true). */
  live?: boolean
  /** Persona ativa — dá o tom das palavras "-ndo…" do estado "pensando". */
  persona?: LexiaPersona
  /** Mostra o aviso jurídico discreto abaixo desta resposta (1×/conversa). */
  showDisclaimer?: boolean
  /** Última pergunta do usuário na conversa — só ela pode ser editada (Fase 5). */
  isLastUser?: boolean
  /** Última resposta da IA — só ela oferece "Tentar de novo" (refazer mais
   *  antigas descartaria turnos reais que vieram depois; sem branching). */
  isLastAssistant?: boolean
  onDecide: (acaoId: number, decisao: "confirmar" | "recusar") => void
  /** Resolve um ChoiceCard (tool perguntar_usuario, Fase 6). */
  onResponder: (acaoId: number, resposta: { selecionadas: string[]; outro?: string }) => void
  /** Aplica edições propostas ao documento aberto (só no painel do editor). */
  onDocAccept?: (payload: DocPatchPayload) => void
  /** Modo automático: aplica as edições propostas sem clicar em "Aplicar". */
  autoApplyDoc?: boolean
  /** Reenvia a última pergunta (erro sem conteúdo útil ainda: offline/sobrecarga/timeout/genérico). */
  onRetry?: () => void
  /** Retoma de onde parou (cortada por limite, interrompida, ou stream perdido). */
  onContinuar?: () => void
  /** RetryMenu (Fase 5): refaz a última resposta, opcionalmente com ajuste/modelo. */
  onRefazer?: (modificador?: Modificador, modelo?: LexiaModelo) => void
  /** "Editar pergunta" (Fase 5): substitui o texto e refaz — descarta o que veio depois. */
  onEditarPergunta?: (novoTexto: string) => void
  /** Clique num chip de "Próximos passos" (Fase 6) — preenche o composer, não envia. */
  onFollowupPick?: (texto: string) => void
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  if (msg.role === "user") {
    const podeEditar = isLastUser && !streaming && !!onEditarPergunta
    const enviarEdicao = () => {
      const t = draft.trim()
      if (!t) return
      onEditarPergunta?.(t)
      setEditing(false)
    }
    if (editing) {
      return (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "86%", maxWidth: 420 }}>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              className="textarea"
              style={{ fontSize: 14, borderRadius: 14, borderTopRightRadius: 4, width: "100%" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  enviarEdicao()
                }
                if (e.key === "Escape") setEditing(false)
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, marginTop: 7 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary btn-sm" onClick={enviarEdicao}>
                Reenviar
              </button>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-subtle)", textAlign: "right", marginTop: 5 }}>
              Reenviar substitui esta pergunta — o que veio depois será descartado.
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="cc-msggroup" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        {msg.anexos?.length ? <AnexoChips anexos={msg.anexos} /> : null}
        {msg.text ? (
          <div
            style={{
              maxWidth: "82%",
              padding: "10px 13px",
              borderRadius: 14,
              borderTopRightRadius: 4,
              fontSize: 14,
              lineHeight: 1.5,
              letterSpacing: "-0.01em",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "var(--brand-navy)",
              color: "#F5F1E4",
            }}
          >
            {msg.text}
          </div>
        ) : null}
        {podeEditar && (
          <div className="cc-msgactions">
            <button
              className="cc-actbtn"
              title="Editar pergunta"
              onClick={() => {
                setDraft(msg.text)
                setEditing(true)
              }}
            >
              <Icon name="edit3" size={13} strokeWidth={1.9} />
            </button>
          </div>
        )}
      </div>
    )
  }

  const empty = msg.blocks.length === 0
  // Continuação de uma resposta cortada/retomada: colada à mensagem anterior
  // (sem Orb, sem o espaço do grupo) — ver useLexiaStream.continuar().
  const colada = !!msg.meta?.continuacao
  return (
    <div className="cc-msggroup" style={{ display: "flex", gap: 11, alignItems: "flex-start", marginTop: colada ? -9 : 0 }}>
      {colada ? <span style={{ width: 28, flexShrink: 0 }} /> : <Orb size={28} />}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 9, paddingTop: 2 }}>
        {!live && msg.meta?.thinking && <ThoughtDisclosure pensamento={msg.meta.thinking} />}
        {empty ? (
          <ThinkingState tone={persona} variant="glyph" />
        ) : (
          groupBlocks(msg.blocks).map((unit, ui) => {
            if (unit.kind === "tool-group") {
              const steps: TimelineStep[] = unit.tools.map((t) => ({ label: t.label, status: t.status }))
              return <AgentTimeline key={`tg${ui}`} steps={steps} />
            }
            const b = unit.block
            const i = unit.key
            const isLastBlock = i === msg.blocks.length - 1
            switch (b.type) {
              case "text":
                // resposta da IA = texto corrido (sem balão); só o usuário tem balão.
                return (
                  <div
                    key={i}
                    style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text)", letterSpacing: "-0.01em", maxWidth: "100%", wordBreak: "break-word" }}
                  >
                    <Markdown text={b.text} streaming={live && isLastBlock} />
                    {live && isLastBlock && <StreamCaret />}
                  </div>
                )
              case "card":
                return (
                  <div key={i}>
                    {b.card.type === "search" ? <SearchResultsCard payload={b.card} /> : b.card.type === "insight" ? <InsightCard payload={b.card} /> : <EntityCard payload={b.card} />}
                  </div>
                )
              case "confirm":
                return <ConfirmCard key={i} block={b} onDecide={onDecide} busy={streaming} />
              case "choice":
                return <ChoiceCard key={i} block={b} onResponder={onResponder} busy={streaming} />
              case "doc-patch":
                return onDocAccept ? <DocPatchCard key={i} block={b} onAccept={onDocAccept} autoApply={autoApplyDoc} /> : null
              case "navigate":
                return (
                  <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-subtle)", alignSelf: "flex-start" }}>
                    <Icon name="externalLink" size={12} />
                    Abri {b.rota}
                  </div>
                )
              case "link":
                return (
                  <button
                    key={i}
                    onClick={() => router.push(b.rota)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      alignSelf: "flex-start",
                      padding: "7px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border-gold, var(--accent))",
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    <Icon name="externalLink" size={13} />
                    {b.label}
                  </button>
                )
              case "notice": {
                const acao = acaoParaNotice(b.codigo)
                return (
                  <SysCard
                    key={i}
                    codigo={b.codigo}
                    mensagem={b.text}
                    working={streaming}
                    onAction={acao === "retry" ? onRetry : acao === "continuar" ? onContinuar : undefined}
                  />
                )
              }
              default:
                return null
            }
          })
        )}
        {/* Interrompida pelo usuário (botão Parar) — some assim que a próxima
           continuação chega (não é mais a última mensagem). */}
        {!live && msg.meta?.interrompida && !msg.meta?.truncada && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-subtle)" }}>
            Geração interrompida por você.
            {onContinuar && (
              <button className="btn btn-ghost btn-sm" onClick={onContinuar} style={{ fontSize: 12 }}>
                <Icon name="refreshCw" size={12} />
                Retomar
              </button>
            )}
            {isLastAssistant && onRefazer && (
              <button className="btn btn-ghost btn-sm" onClick={() => onRefazer()} style={{ fontSize: 12 }}>
                <Icon name="repeat" size={12} />
                Refazer
              </button>
            )}
          </div>
        )}
        {/* Cortada por limite de tamanho — sempre oferece Continuar, mesmo se
           também tiver sido interrompida por cima (caso raro: parar bem no corte). */}
        {!live && msg.meta?.truncada && (
          <div className="cc-sys" style={{ padding: "8px 11px" }}>
            <Icon name="minusCircle" size={13} style={{ color: "var(--text-subtle)", flexShrink: 0, marginTop: 1 }} />
            <span style={{ flex: 1, fontSize: 12.5, color: "var(--text-muted)" }}>Resposta interrompida — chegou ao limite de tamanho.</span>
            {onContinuar && (
              <button className="btn btn-secondary btn-sm" onClick={onContinuar} disabled={streaming} style={{ fontSize: 12.5, height: 28, flexShrink: 0 }}>
                <Icon name="arrowRight" size={12} strokeWidth={2.2} />
                Continuar
              </button>
            )}
          </div>
        )}
        {!live && msg.meta?.fontes?.length ? <SourcesFooter fontes={msg.meta.fontes} /> : null}
        {!empty && !live && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ModelSeal model={msg.model} />
            <AiActionsBar
              text={msg.blocks.filter((b) => b.type === "text").map((b) => (b as Extract<typeof b, { type: "text" }>).text).join("\n\n")}
              mensagemId={msg.dbId}
              initialFeedback={msg.feedback}
              onRefazer={isLastAssistant && !streaming ? onRefazer : undefined}
            />
          </div>
        )}
        {!live && showDisclaimer && <div style={{ fontSize: 11, color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: 5 }}><Icon name="alertCircle" size={11} style={{ flexShrink: 0 }} />{DISCLAIMER}</div>}
        {isLastAssistant && !live && !streaming && onFollowupPick && msg.meta?.followups?.length ? (
          <FollowChips itens={msg.meta.followups} onPick={onFollowupPick} />
        ) : null}
      </div>
    </div>
  )
}
