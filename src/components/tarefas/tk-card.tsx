"use client"

// Tarefas — cartão do quadro (SEM vidro), no espírito do Trello: projeto·grupo,
// título, estado (Em risco / pelo que espera — "Depois de …" num bloco próprio,
// para não se confundir com a data) e, por último, o rodapé com o PRAZO em
// destaque (pílula colorida: vencida/hoje), contadores (checklist, comentários,
// anexos) e o avatar do responsável à direita.
// Vencida não tem selo — a pílula vermelha basta. Concluída: só projeto +
// título, atenuada.
import { memo } from "react"
import { selo } from "@/lib/tarefas/regras"
import { STATUS, type TaskRow, type TaskStatus } from "@/lib/tarefas/types"
import { Icon } from "./tf-icons"
import { useTk } from "./tk-context"
import { TkAvatar, TkIconBtn, TkMenuItem, TkMenuLabel, TkMenuSep, TkPop, TkPrazoBadge, TkProjTag, TkState, usePop } from "./tk-ui"

export interface CardProps {
  mostrarProjeto?: boolean
  mostrarGrupo?: boolean
  naColunaAguardando?: boolean
  arrastavel?: boolean
}

function TkCardBase({
  t,
  mostrarProjeto = true,
  mostrarGrupo = true,
  naColunaAguardando,
  arrastavel = true,
  dim,
  lit,
  onHover,
}: CardProps & {
  t: TaskRow
  dim?: boolean
  lit?: boolean
  onHover?: (id: number | null) => void
}) {
  const { map, hoje, nomePessoa, act, openTask, setDragging } = useTk()
  const pop = usePop()
  const done = t.status === "done"
  const s = done ? null : selo(t, map, hoje, nomePessoa)
  const feitos = t.checklist.filter((c) => c.marcado).length
  const linha1 = mostrarProjeto ? (
    <TkProjTag projetoId={t.projetoId} grupo={mostrarGrupo ? t.grupo : null} />
  ) : mostrarGrupo && t.grupo ? (
    <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.grupo}</span>
  ) : null
  return (
    <div
      className={"tk-card" + (done ? " done" : "") + (dim ? " dim" : "") + (lit ? " lit" : "") + (pop.open ? " menu-open" : "")}
      draggable={arrastavel}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(t.id))
        e.dataTransfer.effectAllowed = "move"
        setDragging(t.id)
      }}
      onDragEnd={() => setDragging(null)}
      onMouseEnter={() => onHover?.(t.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(t.id)}
      onBlur={() => onHover?.(null)}
      onClick={() => openTask(t.id)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) openTask(t.id)
      }}
    >
      {linha1 && <div style={{ display: "flex", minWidth: 0, paddingRight: 24 }}>{linha1}</div>}
      <div className="tk-card-title" style={{ paddingRight: linha1 ? 0 : 24 }}>
        {t.titulo}
      </div>
      <TkState selo={s} t={t} semPalavraAguardando={naColunaAguardando} caixa />
      {!done && (
        <div className="tk-card-foot">
          <div className="tk-meta">
            <TkPrazoBadge t={t} />
            {t.checklist.length > 0 && (
              <span className="tnum" title="Checklist" style={{ color: feitos === t.checklist.length ? "var(--ok)" : undefined }}>
                <Icon name="checkSquare" size={13} />
                {`${feitos}/${t.checklist.length}`}
              </span>
            )}
            {t.nComentarios > 0 && (
              <span className="tnum" title="Comentários">
                <Icon name="messageSquare" size={13} />
                {t.nComentarios}
              </span>
            )}
            {t.nAnexos > 0 && (
              <span className="tnum" title="Anexos">
                <Icon name="paperclip" size={13} />
                {t.nAnexos}
              </span>
            )}
          </div>
          <TkAvatar id={t.responsavelId} />
        </div>
      )}
      <div className="tk-card-more" onClick={(e) => e.stopPropagation()}>
        <span style={{ display: "inline-flex" }}>
          <TkIconBtn icon="moreHorizontal" title="Mais opções" size={15} onClick={pop.toggle} />
        </span>
        <TkPop open={pop.open} onClose={pop.close} anchor={pop.anchor} align="right" width={200}>
          {!done && (
            <TkMenuItem
              icon="check"
              onClick={() => {
                pop.close()
                act.concluir(t.id)
              }}
            >
              Concluir
            </TkMenuItem>
          )}
          {!done && <TkMenuSep />}
          <TkMenuLabel>Mover para…</TkMenuLabel>
          {STATUS.map((st) => (
            <TkMenuItem
              key={st.id}
              checked={t.status === st.id}
              onClick={() => {
                pop.close()
                act.mover(t.id, st.id as TaskStatus)
              }}
            >
              {st.label}
            </TkMenuItem>
          ))}
        </TkPop>
      </div>
    </div>
  )
}

export const TkCard = memo(TkCardBase)

export function TkCardSkeleton() {
  return (
    <div className="tk-card" style={{ pointerEvents: "none", gap: 8 }} aria-hidden>
      <div className="skeleton" style={{ height: 10, width: "45%" }} />
      <div className="skeleton" style={{ height: 14, width: "85%" }} />
      <div className="skeleton" style={{ height: 10, width: "30%" }} />
    </div>
  )
}
