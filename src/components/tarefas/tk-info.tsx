"use client"

// Tarefas — informações FIXADAS (know-how do cliente, do caso ou do projeto
// interno): aparecem sozinhas nas tarefas ligadas a eles. "Saiba antes" no
// detalhe, lista compacta no cabeçalho do projeto e a janela de fixar/editar.
// Visual neutro (caixa afundada + alfinete): o dourado é reservado à IA.
import { useState } from "react"
import {
  ROTULO_ANCORA,
  ancoraDoProjeto,
  atualizadaEm,
  chaveAncora,
  chaveInfo,
  podeExcluirInformacao,
  talvezDesatualizada,
  tempoDesde,
  type Ancora,
  type InformacaoRow,
} from "@/lib/informacoes/core"
import type { ChaveProjeto, ProjetoQuadro, TaskRow } from "@/lib/tarefas/types"
import { Icon } from "./tf-icons"
import { useTk } from "./tk-context"
import { ELEVACAO_JANELA, TK_JANELA } from "./tk-glass"
import { TkClientPicker, TkProjetoPicker } from "./tk-pickers"
import { TkDialog, TkIconBtn, TkMenuItem, TkMenuSep, TkPop, TkSeg, useEsc, usePop } from "./tk-ui"

const LONGA = 180

/** Uma informação fixada: de onde é, o texto (recolhido se longo), quem/quando e o menu. */
export function TkInfoItem({ info, compacta, tarefaAtual }: { info: InformacaoRow; compacta?: boolean; tarefaAtual?: number }) {
  const { act, nomeAncora, meId, gestao, map, openTask } = useTk()
  const [aberta, setAberta] = useState(false)
  const pop = usePop()
  const longa = info.conteudo.length > (compacta ? 110 : LONGA) || info.conteudo.split("\n").length > (compacta ? 2 : 3)
  const pode = podeExcluirInformacao(info, {
    id: meId,
    role: gestao ? "socio" : null,
  })
  const origem = info.origemTarefaId != null && info.origemTarefaId !== tarefaAtual ? map.get(info.origemTarefaId) : undefined
  const quem = info.editadaEm && info.editadaPor ? `Editada por ${info.editadaPor}` : info.autor
  return (
    <div className={"tk-info" + (compacta ? " compacta" : "")}>
      <Icon name="pin" size={13} />
      <div style={{ minWidth: 0 }}>
        <span className="tk-info-de" title={nomeAncora(info.ancora)}>
          {ROTULO_ANCORA[info.ancora.tipo]} · {nomeAncora(info.ancora)}
        </span>
        <div className={"tk-info-txt" + (aberta ? "" : " clamp")}>{info.conteudo}</div>
        {longa && (
          <button type="button" className="tk-info-mais" onClick={() => setAberta((a) => !a)}>
            {aberta ? "Mostrar menos" : "Mostrar mais"}
          </button>
        )}
        {!compacta && (
          <div className="tk-info-meta">
            <span>
              {quem} · {tempoDesde(atualizadaEm(info))}
            </span>
            {talvezDesatualizada(info) && <span>Pode estar desatualizada</span>}
            {origem && (
              <button type="button" className="tk-feedlink" onClick={() => openTask(origem.id)}>
                Da tarefa: {origem.titulo}
              </button>
            )}
          </div>
        )}
      </div>
      <span style={{ display: "inline-flex" }}>
        <TkIconBtn icon="moreHorizontal" title="Opções da informação" size={14} onClick={pop.toggle} />
      </span>
      <TkPop open={pop.open} onClose={pop.close} anchor={pop.anchor} align="right" width={190}>
        <TkMenuItem
          icon="edit"
          onClick={() => {
            pop.close()
            act.abrirInformacao({ info })
          }}
        >
          Editar
        </TkMenuItem>
        <TkMenuItem
          icon="pinOff"
          onClick={() => {
            pop.close()
            void act.editarInformacao(info, { fixado: false })
          }}
        >
          Desafixar
        </TkMenuItem>
        {pode && (
          <>
            <TkMenuSep />
            <TkMenuItem
              icon="trash2"
              danger
              onClick={() => {
                pop.close()
                act.excluirInformacao(info)
              }}
            >
              Excluir
            </TkMenuItem>
          </>
        )}
      </TkPop>
    </div>
  )
}

/** Lista com as 2 primeiras e "Mostrar todas (N)". */
function TkListaInfos({ lista, compacta, tarefaAtual }: { lista: InformacaoRow[]; compacta?: boolean; tarefaAtual?: number }) {
  const [todas, setTodas] = useState(false)
  const vis = todas ? lista : lista.slice(0, 2)
  return (
    <>
      {vis.map((i) => (
        <TkInfoItem key={chaveInfo(i)} info={i} compacta={compacta} tarefaAtual={tarefaAtual} />
      ))}
      {lista.length > 2 && (
        <button type="button" className="tk-info-mais" onClick={() => setTodas((v) => !v)}>
          {todas ? "Mostrar menos" : `Mostrar todas (${lista.length})`}
        </button>
      )}
    </>
  )
}

/** "Saiba antes" no detalhe da tarefa: fixadas do projeto e do cliente dela. */
export function TkSaibaAntes({ t }: { t: TaskRow }) {
  const { fixadasDaTarefa } = useTk()
  const lista = fixadasDaTarefa(t)
  if (!lista.length) return null
  return (
    <div className="tk-infos" role="region" aria-label="Saiba antes">
      <span className="tk-campo-label" style={{ marginBottom: 0 }}>
        Saiba antes
      </span>
      <TkListaInfos lista={lista} tarefaAtual={t.id} />
    </div>
  )
}

/** Âncoras de um projeto do quadro: ele mesmo e (caso) o cliente dele. */
export function ancorasDoProjeto(c: ProjetoQuadro): Ancora[] {
  const a = ancoraDoProjeto(c.chave)
  return [...(a ? [a] : []), ...(c.clienteId != null ? [{ tipo: "cliente" as const, id: c.clienteId }] : [])]
}

/** Fixadas no cabeçalho do quadro filtrado por um projeto (compactas). */
export function TkFixadasProjeto({ c }: { c: ProjetoQuadro }) {
  const { fixadasDe } = useTk()
  const lista = fixadasDe(ancorasDoProjeto(c))
  if (!lista.length) return null
  return (
    <div className="tk-infos" role="region" aria-label="Informações fixadas" style={{ maxWidth: 820 }}>
      <TkListaInfos lista={lista} compacta />
    </div>
  )
}

/**
 * Fixar uma informação nova (escolhendo a que ela se refere, quando há mais de
 * uma opção) ou editar o texto de uma existente.
 */
export function TkInfoDialog({
  ancoras,
  texto,
  origemTarefaId,
  info,
  onClose,
}: {
  ancoras: Ancora[]
  texto?: string
  origemTarefaId?: number | null
  info?: InformacaoRow
  onClose: () => void
}) {
  const { act, nomeAncora } = useTk()
  const [chave, setChave] = useState(() => chaveAncora(info?.ancora ?? ancoras[0]))
  const [v, setV] = useState(info?.conteudo ?? texto ?? "")
  const [salvando, setSalvando] = useState(false)
  const opcoes = info ? [info.ancora] : ancoras
  const ancora = opcoes.find((a) => chaveAncora(a) === chave) ?? opcoes[0]
  const pronto = !!v.trim() && !salvando && (!info || v.trim() !== info.conteudo)
  const salvar = async () => {
    if (!pronto || !ancora) return
    setSalvando(true)
    const ok = info
      ? await act.editarInformacao(info, { conteudo: v.trim() })
      : await act.criarInformacao({
          ancora,
          conteudo: v.trim(),
          origemTarefaId: origemTarefaId ?? null,
        })
    setSalvando(false)
    if (ok) onClose()
  }
  return (
    <TkDialog
      title={info ? "Editar informação" : "Fixar informação"}
      width={480}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" disabled={!pronto} onClick={() => void salvar()}>
            <Icon name="pin" size={14} />
            {info ? "Salvar" : "Fixar"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {opcoes.length > 1 && (
          <TkSeg
            options={opcoes.map((a) => ({
              id: chaveAncora(a),
              label: ROTULO_ANCORA[a.tipo],
            }))}
            value={chave}
            onChange={setChave}
          />
        )}
        {ancora && (
          <span
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {ROTULO_ANCORA[ancora.tipo]}: <span style={{ color: "var(--text)", fontWeight: 500 }}>{nomeAncora(ancora)}</span>
          </span>
        )}
        <textarea
          className="textarea"
          autoFocus
          rows={4}
          maxLength={2000}
          placeholder="Ex.: só paga no dia 10"
          aria-label="Informação"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void salvar()
          }}
          style={{ color: "var(--text)", width: "100%" }}
        />
      </div>
    </TkDialog>
  )
}

/**
 * "Nova tarefa" no modo Informação: o texto e a que ele se refere — o projeto
 * (caso ou interno) ou um cliente. Fixada, aparece em todas as tarefas deles.
 */
export function TkNovaInformacao({
  projetoInicial,
  onTarefa,
  onClose,
}: {
  projetoInicial: ChaveProjeto | null
  /** Volta para o modo Tarefa. */
  onTarefa: () => void
  onClose: () => void
}) {
  const { act } = useTk()
  const [texto, setTexto] = useState("")
  const [sobre, setSobre] = useState<"projeto" | "cliente">(projetoInicial != null ? "projeto" : "cliente")
  const [projeto, setProjeto] = useState<ChaveProjeto | null>(projetoInicial)
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  useEsc(onClose)
  const ancora: Ancora | null =
    sobre === "projeto" ? ancoraDoProjeto(projeto) : clienteId != null ? { tipo: "cliente", id: clienteId } : null
  const pronto = !!texto.trim() && !!ancora && !salvando
  const fixar = async () => {
    if (!pronto || !ancora) return
    setSalvando(true)
    const ok = await act.criarInformacao({ ancora, conteudo: texto.trim() })
    setSalvando(false)
    if (ok) onClose()
  }
  return (
    <div className="tk-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={TK_JANELA} role="dialog" aria-label="Nova informação" style={{ ...ELEVACAO_JANELA, width: 540, maxWidth: "calc(100% - 32px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 12px 4px 20px" }}>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>Nova informação</span>
          <TkModoNova modo="info" onChange={(m) => m === "tarefa" && onTarefa()} />
          <TkIconBtn icon="x" title="Fechar" onClick={onClose} />
        </div>
        <div style={{ padding: "4px 20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <textarea
            className="textarea"
            autoFocus
            rows={4}
            maxLength={2000}
            placeholder="Ex.: só paga no dia 10"
            aria-label="Informação"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void fixar()
            }}
            style={{ color: "var(--text)", width: "100%" }}
          />
          <div className="tk-props" style={{ width: "auto", border: "none", background: "none", padding: 0, overflow: "visible" }}>
            <div className="tk-prop">
              <span className="tk-prop-label">Sobre</span>
              <div style={{ minWidth: 0 }}>
                <TkSeg<"projeto" | "cliente">
                  options={[
                    { id: "projeto", label: "Projeto" },
                    { id: "cliente", label: "Cliente" },
                  ]}
                  value={sobre}
                  onChange={setSobre}
                />
              </div>
            </div>
            <div className="tk-prop">
              <span className="tk-prop-label">{sobre === "projeto" ? "Projeto" : "Cliente"}</span>
              <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                {sobre === "projeto" ? (
                  <TkProjetoPicker value={projeto} onChange={setProjeto} />
                ) : (
                  <TkClientPicker value={clienteId} onChange={setClienteId} />
                )}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "12px 20px 16px", borderTop: "1px solid var(--border)" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!pronto} onClick={() => void fixar()}>
            <Icon name="pin" size={13} />
            Fixar
          </button>
        </div>
      </div>
    </div>
  )
}

/** Tarefa | Informação — no topo da janela "Nova tarefa". */
export function TkModoNova({ modo, onChange }: { modo: "tarefa" | "info"; onChange: (m: "tarefa" | "info") => void }) {
  return (
    <TkSeg<"tarefa" | "info">
      options={[
        { id: "tarefa", label: "Tarefa" },
        { id: "info", label: "Informação" },
      ]}
      value={modo}
      onChange={onChange}
    />
  )
}
