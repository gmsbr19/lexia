"use client"

// Tarefas — Projetos: os casos dos clientes e os projetos internos do escritório
// numa lista só (Ativos | Arquivados), com busca, Filtrar (Tipo · Responsável ·
// Andamento · Prazo final) e Ordenar — no mesmo molde da linha de filtros do
// quadro. Clicar abre o projeto no Quadro; o "⋯" da linha leva à página do caso
// (caso) ou à janela de edição (projeto interno).
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ESTAT_VAZIA,
  FILTRO_PROJETOS_PADRAO,
  estatisticasProjetos,
  filtrarProjetos,
  ordenarListaProjetos,
  subtituloProjeto,
  type FiltroAndamento,
  type FiltroPrazoFinal,
  type FiltroProjetos,
  type FiltroTipo,
  type OrdemProjetos,
} from "@/lib/tarefas/projetos-quadro"
import { compareISO } from "@/lib/datas/util"
import { dataCurta } from "@/lib/tarefas/regras"
import type { ChaveProjeto, ProjetoQuadro } from "@/lib/tarefas/types"
import { Icon, type TfIconName } from "./tf-icons"
import { TkVazio } from "./tk-board"
import { useTk } from "./tk-context"
import { TkPropMenu, type OpcaoMenu } from "./tk-pickers"
import { TkChip, TkDot, TkIconBtn, TkMenuItem, TkMenuLabel, TkMenuSep, TkPop, TkProgress, TkSeg, usePop } from "./tk-ui"

const PAGINA = 100

const OPCOES_TIPO: OpcaoMenu<FiltroTipo>[] = [
  { id: "todos", label: "Todos" },
  { id: "caso", label: "Casos de clientes" },
  { id: "interno", label: "Projetos internos" },
]
const OPCOES_ANDAMENTO: OpcaoMenu<FiltroAndamento>[] = [
  { id: "qualquer", label: "Qualquer" },
  { id: "abertas", label: "Com tarefas abertas" },
  { id: "vencidas", label: "Com tarefas vencidas" },
  { id: "sem", label: "Sem tarefas" },
]
const OPCOES_PRAZO_FINAL: OpcaoMenu<FiltroPrazoFinal>[] = [
  { id: "qualquer", label: "Qualquer prazo" },
  { id: "vencido", label: "Vencido" },
  { id: "semana", label: "Até domingo" },
  { id: "mes", label: "Até o fim do mês" },
  { id: "sem", label: "Sem prazo" },
]
const ROTULO_ORDEM: Record<OrdemProjetos, string> = { nome: "Nome", prazo: "Prazo final", progresso: "Progresso", vencidas: "Vencidas" }
const rotulo = <T,>(ops: OpcaoMenu<T>[], v: T) => ops.find((o) => o.id === v)?.label ?? ""

const CAB = { fontSize: 12, color: "var(--text-muted)" } as const

interface MenuAcao {
  icon: TfIconName
  label: string
  onClick: () => void
}

/** "⋯" da linha: abrir o caso / editar o projeto interno (sem ações = nada). */
function TkMenuProjeto({ acoes }: { acoes: MenuAcao[] }) {
  const pop = usePop()
  if (!acoes.length) return null
  return (
    <>
      <TkIconBtn icon="moreHorizontal" title="Mais ações" size={16} onClick={pop.toggle} />
      <TkPop open={pop.open} onClose={pop.close} anchor={pop.anchor} align="right" width={200}>
        {acoes.map((a) => (
          <TkMenuItem
            key={a.label}
            icon={a.icon}
            onClick={() => {
              pop.close()
              a.onClick()
            }}
          >
            {a.label}
          </TkMenuItem>
        ))}
      </TkPop>
    </>
  )
}

export function TkProjetosPage({ onNovo, onAssistente }: { onNovo: () => void; onAssistente: () => void }) {
  const { projetos, tarefas, hoje, cliente, pessoa, pessoas, meId, modelos, podeAbrirProjeto, podeCriarProjeto, act } = useTk()
  const router = useRouter()
  const [f, setF] = useState<FiltroProjetos>(FILTRO_PROJETOS_PADRAO)
  const [ordem, setOrdem] = useState<OrdemProjetos>("nome")
  const [limite, setLimite] = useState(PAGINA)
  const pf = usePop()
  const po = usePop()
  const pn = usePop()
  const mudar = (p: Partial<FiltroProjetos>) => {
    setF((x) => ({ ...x, ...p }))
    setLimite(PAGINA)
  }

  const est = useMemo(() => estatisticasProjetos(tarefas, hoje), [tarefas, hoje])
  const estDe = (k: ChaveProjeto) => est.get(k) ?? ESTAT_VAZIA
  const nomeCliente = (id: number | null) => cliente(id)?.nome
  // advogado/estagiário só veem os casos que acessam; internos são de todos
  const meus = projetos.filter((p) => podeAbrirProjeto(p.chave))
  const nAtivos = meus.filter((p) => !p.arquivado).length
  const lista = ordenarListaProjetos(filtrarProjetos(meus, f, estDe, nomeCliente, hoje), ordem, estDe)
  const mostrados = lista.slice(0, limite)

  const ativos = [
    ...(f.tipo !== "todos" ? [{ k: "tipo", label: rotulo(OPCOES_TIPO, f.tipo), limpar: () => mudar({ tipo: "todos" }) }] : []),
    ...(f.responsavel != null
      ? [{ k: "resp", label: pessoa(f.responsavel)?.first ?? "Responsável", limpar: () => mudar({ responsavel: null }) }]
      : []),
    ...(f.andamento !== "qualquer" ? [{ k: "and", label: rotulo(OPCOES_ANDAMENTO, f.andamento), limpar: () => mudar({ andamento: "qualquer" }) }] : []),
    ...(f.prazoFinal !== "qualquer"
      ? [{ k: "prazo", label: `Prazo final: ${rotulo(OPCOES_PRAZO_FINAL, f.prazoFinal).toLowerCase()}`, limpar: () => mudar({ prazoFinal: "qualquer" }) }]
      : []),
  ]
  const limparFiltros = () => mudar({ texto: "", tipo: "todos", responsavel: null, andamento: "qualquer", prazoFinal: "qualquer" })
  const filtrando = ativos.length > 0 || f.texto.trim() !== ""

  const opcoesResp: OpcaoMenu<number | null>[] = [
    { id: null, label: "Todos" },
    ...pessoas.map((p) => ({ id: p.id as number | null, label: p.id === meId ? `${p.nome} (eu)` : p.nome })),
  ]

  const abrir = (p: ProjetoQuadro) => act.abrirProjeto(p.chave)
  const acoesDe = (p: ProjetoQuadro): MenuAcao[] =>
    p.tipo === "caso"
      ? [{ icon: "externalLink", label: "Abrir o caso", onClick: () => router.push(`/casos/${p.id}`) }]
      : podeCriarProjeto
        ? [{ icon: "edit", label: "Editar projeto", onClick: () => act.editarProjetoInterno(p.id) }]
        : []

  return (
    <main className="tk-main">
      <div className="tk-head">
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <h1 className="tk-h1">Projetos</h1>
          <TkSeg
            options={[
              { id: "ativos", label: "Ativos", count: nAtivos },
              { id: "arquivados", label: "Arquivados" },
            ]}
            value={f.arquivados ? "arquivados" : "ativos"}
            onChange={(v) => mudar({ arquivados: v === "arquivados" })}
          />
          {podeCriarProjeto && (
            <span style={{ marginLeft: "auto", display: "inline-flex" }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={pn.toggle}>
                <Icon name="plus" size={15} strokeWidth={2.2} />
                Novo projeto
              </button>
              <TkPop open={pn.open} onClose={pn.close} anchor={pn.anchor} align="right" width={220}>
                <TkMenuItem
                  icon="folder"
                  onClick={() => {
                    pn.close()
                    onNovo()
                  }}
                >
                  Em branco
                </TkMenuItem>
                <TkMenuItem
                  icon="layers"
                  disabled={!modelos.length}
                  onClick={() => {
                    pn.close()
                    onAssistente()
                  }}
                >
                  A partir de modelo
                </TkMenuItem>
              </TkPop>
            </span>
          )}
        </div>

        {/* busca · filtros ativos · Filtrar · Ordenar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div
            className="tk-titlebox"
            style={{ display: "flex", alignItems: "center", gap: 6, height: 32, width: 300, maxWidth: "100%", padding: "0 4px 0 10px", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", background: "var(--surface)" }}
          >
            <Icon name="search" size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input
              className="tk-plain-input"
              placeholder="Buscar projeto ou cliente"
              aria-label="Buscar projeto ou cliente"
              value={f.texto}
              onChange={(e) => mudar({ texto: e.target.value })}
            />
            {f.texto && <TkIconBtn icon="x" title="Limpar busca" size={13} onClick={() => mudar({ texto: "" })} />}
          </div>
          {ativos.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
              {ativos.map((i) => (
                <TkChip key={i.k} active onClick={i.limpar} onRemove={i.limpar}>
                  {i.label}
                </TkChip>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" style={{ height: 28, padding: "0 8px", fontSize: 12 }} onClick={limparFiltros}>
                Limpar
              </button>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
            <span style={{ display: "inline-flex" }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={pf.toggle} style={{ color: ativos.length ? "var(--accent)" : undefined }}>
                <Icon name="filter" size={14} />
                Filtrar
                {ativos.length ? <span className="tnum">{`(${ativos.length})`}</span> : null}
              </button>
            </span>
            <TkPop open={pf.open} onClose={pf.close} anchor={pf.anchor} align="right" width={340}>
              <div style={{ padding: "4px 10px 4px 14px" }}>
                <div className="tk-prop">
                  <span className="tk-prop-label">Tipo</span>
                  <TkPropMenu<FiltroTipo> value={f.tipo} options={OPCOES_TIPO} muted={f.tipo === "todos"} width={220} onPick={(v) => mudar({ tipo: v })} />
                </div>
                <div className="tk-prop">
                  <span className="tk-prop-label">Responsável</span>
                  <TkPropMenu<number | null>
                    value={f.responsavel}
                    options={opcoesResp}
                    muted={f.responsavel == null}
                    width={240}
                    onPick={(v) => mudar({ responsavel: v })}
                  />
                </div>
                <div className="tk-prop">
                  <span className="tk-prop-label">Andamento</span>
                  <TkPropMenu<FiltroAndamento>
                    value={f.andamento}
                    options={OPCOES_ANDAMENTO}
                    muted={f.andamento === "qualquer"}
                    width={220}
                    onPick={(v) => mudar({ andamento: v })}
                  />
                </div>
                <div className="tk-prop">
                  <span className="tk-prop-label">Prazo final</span>
                  <TkPropMenu<FiltroPrazoFinal>
                    value={f.prazoFinal}
                    options={OPCOES_PRAZO_FINAL}
                    muted={f.prazoFinal === "qualquer"}
                    width={200}
                    onPick={(v) => mudar({ prazoFinal: v })}
                  />
                </div>
              </div>
              {ativos.length > 0 && (
                <>
                  <TkMenuSep />
                  <TkMenuItem
                    icon="x"
                    onClick={() => {
                      limparFiltros()
                      pf.close()
                    }}
                  >
                    Limpar filtros
                  </TkMenuItem>
                </>
              )}
            </TkPop>
            <span style={{ display: "inline-flex" }}>
              <button type="button" className="btn btn-ghost btn-sm tk-viewbtn" onClick={po.toggle}>
                <Icon name="arrowUpDown" size={14} />
                <span style={{ color: "var(--text-muted)" }}>Ordenar:</span>
                {ROTULO_ORDEM[ordem]}
              </button>
              <TkPop open={po.open} onClose={po.close} anchor={po.anchor} align="right" width={200}>
                <TkMenuLabel>Ordenar por</TkMenuLabel>
                {(Object.keys(ROTULO_ORDEM) as OrdemProjetos[]).map((o) => (
                  <TkMenuItem
                    key={o}
                    checked={ordem === o}
                    onClick={() => {
                      setOrdem(o)
                      po.close()
                    }}
                  >
                    {ROTULO_ORDEM[o]}
                  </TkMenuItem>
                ))}
              </TkPop>
            </span>
          </div>
        </div>
      </div>

      <div className="tk-body" style={{ paddingTop: 4 }}>
        {!meus.length ? (
          <TkVazio icon="folder" titulo="Nenhum projeto ainda">
            {podeCriarProjeto && (
              <button type="button" className="btn btn-primary btn-sm" onClick={onNovo}>
                <Icon name="plus" size={15} strokeWidth={2.2} />
                Novo projeto
              </button>
            )}
          </TkVazio>
        ) : !lista.length ? (
          filtrando ? (
            <TkVazio icon="filter" titulo="Nenhum projeto com estes filtros">
              <button type="button" className="btn btn-secondary btn-sm" onClick={limparFiltros}>
                Limpar filtros
              </button>
            </TkVazio>
          ) : (
            <TkVazio icon="folder" titulo={f.arquivados ? "Nenhum projeto arquivado" : "Nenhum projeto ativo"} />
          )
        ) : (
          <div style={{ maxWidth: 1200 }}>
            <div className="tk-prow" style={{ cursor: "default", minHeight: 32 }}>
              <span style={CAB}>Projeto</span>
              <span className="tk-pcol" style={CAB}>
                Cliente
              </span>
              <span className="tk-pcol" style={CAB}>
                Responsável
              </span>
              <span className="tk-pcol" style={CAB}>
                Prazo final
              </span>
              <span style={CAB}>Progresso</span>
              <span className="tk-pcol" style={{ ...CAB, textAlign: "right" }}>
                Abertas
              </span>
              <span className="tk-pcol" style={{ ...CAB, textAlign: "right" }}>
                Vencidas
              </span>
              <span />
            </div>
            {mostrados.map((p) => {
              const e = estDe(p.chave)
              const prazoVencido = !!p.prazo && !p.arquivado && compareISO(p.prazo, hoje) < 0
              return (
                <div
                  key={p.chave}
                  className="tk-prow tk-row-hover"
                  role="button"
                  tabIndex={0}
                  title="Abrir no quadro"
                  onClick={() => abrir(p)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") abrir(p)
                  }}
                >
                  <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, minWidth: 0 }}>
                      <TkDot color={p.cor} />
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nomeCurto}</span>
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", paddingLeft: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.nome !== p.nomeCurto ? p.nome : subtituloProjeto(p, nomeCliente)}
                    </span>
                  </div>
                  <span className="tk-pcol" style={{ fontSize: 14, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {subtituloProjeto(p, nomeCliente)}
                  </span>
                  <span className="tk-pcol" style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {pessoa(p.responsavelId)?.first ?? "—"}
                  </span>
                  <span className="tk-pcol" style={{ fontSize: 14, color: prazoVencido ? "var(--crit)" : p.prazo ? "var(--text)" : "var(--text-muted)" }}>
                    {p.prazo ? dataCurta(p.prazo) : "Sem prazo"}
                  </span>
                  <TkProgress feitas={e.feitas} total={e.total} width={64} />
                  <span className="tk-pcol tnum" style={{ fontSize: 14, textAlign: "right", color: e.abertas ? "var(--text)" : "var(--text-muted)" }}>
                    {e.abertas || "—"}
                  </span>
                  <span
                    className="tk-pcol tnum"
                    style={{ fontSize: 14, textAlign: "right", fontWeight: e.vencidas ? 500 : 400, color: e.vencidas ? "var(--crit)" : "var(--text-muted)" }}
                  >
                    {e.vencidas || "—"}
                  </span>
                  <span style={{ display: "inline-flex", justifyContent: "flex-end" }} onClick={(ev) => ev.stopPropagation()} onKeyDown={(ev) => ev.stopPropagation()}>
                    <TkMenuProjeto acoes={acoesDe(p)} />
                  </span>
                </div>
              )
            })}
            {lista.length > mostrados.length && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setLimite((n) => n + PAGINA)}>
                Mostrar mais ({lista.length - mostrados.length})
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
