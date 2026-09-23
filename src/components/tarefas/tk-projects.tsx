"use client"

// Tarefas — Projetos: Ativos (tabela; clicar abre o Quadro filtrado), Arquivados
// (somente leitura), Modelos (cartões com "Usar"). Janelas: projeto em branco /
// editar, assistente "a partir de modelo" (Projeto · Grupos · Responsáveis) e o
// editor de modelos (só sócio).
import { useMemo, useState } from "react"
import { resolveAreaLabel, toAreaOptions, useAreasStore } from "@/lib/areas/store"
import { ajustarGrupos, gruposPadrao, resumoModelo, textoDiasAntes, type GrupoWizard } from "@/lib/projetos/modelo"
import { dataCurta, vencida } from "@/lib/tarefas/regras"
import { CORES_PROJETO, type ModeloView, type PassoModelo, type PapelModelo, type ProjetoRow } from "@/lib/tarefas/types"
import { addDays } from "@/lib/datas/util"
import { apiSend } from "@/lib/client/api"
import { Icon } from "./tf-icons"
import { useTk, type ProjetoForm } from "./tk-context"
import { TkClientPicker } from "./tk-pickers"
import { TkDialog, TkDot, TkIconBtn, TkMenuItem, TkPop, TkProgress, TkSeg, useEsc, usePop } from "./tk-ui"
import { ELEVACAO_JANELA, TK_JANELA } from "./tk-glass"

const CAB = { fontSize: 12, color: "var(--text-muted)", fontWeight: 500 } as const

// ── página ───────────────────────────────────────────────────────────────────
export function TkProjectsPage({
  onNovoEmBranco,
  onAssistente,
  onEditarModelo,
}: {
  onNovoEmBranco: () => void
  onAssistente: (modeloId: number | null) => void
  onEditarModelo: (m: ModeloView | null) => void
}) {
  const { tarefas, projetos, podeProjeto, podeModelo, hoje, cliente, pessoa, modelos, act } = useTk()
  const areas = useAreasStore((s) => s.areas)
  const [aba, setAba] = useState<"active" | "arch" | "tpl">("active")
  const novo = usePop()
  const ativos = projetos.filter((p) => !p.arquivadoEm)
  const arquivados = projetos.filter((p) => p.arquivadoEm)
  const stats = useMemo(() => {
    const m = new Map<number, { total: number; feitas: number; vencidas: number }>()
    for (const t of tarefas) {
      if (t.projetoId == null) continue
      const s = m.get(t.projetoId) ?? { total: 0, feitas: 0, vencidas: 0 }
      s.total++
      if (t.status === "done") s.feitas++
      if (vencida(t, hoje)) s.vencidas++
      m.set(t.projetoId, s)
    }
    return m
  }, [tarefas, hoje])
  const st = (id: number) => stats.get(id) ?? { total: 0, feitas: 0, vencidas: 0 }

  return (
    <main className="tk-main">
      <div className="tk-head">
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <h1 className="tk-h1">Projetos</h1>
          <TkSeg
            options={[
              { id: "active", label: "Ativos", count: ativos.length },
              { id: "arch", label: "Arquivados" },
              { id: "tpl", label: "Modelos" },
            ]}
            value={aba}
            onChange={setAba}
          />
          {podeProjeto && (
            <span style={{ marginLeft: "auto", display: "inline-flex" }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={novo.toggle}>
                <Icon name="plus" size={14} />
                Novo projeto
              </button>
            </span>
          )}
          <TkPop open={novo.open} onClose={novo.close} anchor={novo.anchor} align="right" width={200}>
            <TkMenuItem
              icon="folder"
              onClick={() => {
                novo.close()
                onNovoEmBranco()
              }}
            >
              Em branco
            </TkMenuItem>
            <TkMenuItem
              icon="copy"
              disabled={!modelos.length}
              onClick={() => {
                novo.close()
                onAssistente(null)
              }}
            >
              A partir de modelo
            </TkMenuItem>
          </TkPop>
        </div>
      </div>
      <div className="tk-body" style={{ paddingTop: 4 }}>
        {aba === "active" && (
          <div style={{ maxWidth: 1120 }}>
            <div className="tk-prow" style={{ cursor: "default", minHeight: 32 }}>
              <span style={CAB}>Projeto</span>
              <span style={CAB}>Cliente</span>
              <span style={CAB}>Responsável</span>
              <span style={CAB}>Prazo</span>
              <span style={CAB}>Progresso</span>
              <span style={{ ...CAB, textAlign: "right" }}>Vencidas</span>
            </div>
            {ativos.map((p) => {
              const s = st(p.id)
              return (
                <div
                  key={p.id}
                  className="tk-prow tk-row-hover"
                  tabIndex={0}
                  onClick={() => act.abrirProjeto(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") act.abrirProjeto(p.id)
                  }}
                >
                  <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500 }}>
                      <TkDot color={p.cor} />
                      {p.nomeCurto}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", paddingLeft: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nome}</span>
                  </div>
                  <span style={{ fontSize: 14, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {cliente(p.clienteId)?.nome ?? "Sem cliente"}
                  </span>
                  <span style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pessoa(p.responsavelId)?.first ?? "—"}</span>
                  <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{p.prazo ? dataCurta(p.prazo) : "Sem prazo"}</span>
                  <TkProgress feitas={s.feitas} total={s.total} width={72} />
                  <span className="tnum" style={{ fontSize: 14, textAlign: "right", fontWeight: s.vencidas ? 500 : 400, color: s.vencidas ? "var(--crit)" : "var(--text-muted)" }}>
                    {s.vencidas || "—"}
                  </span>
                </div>
              )
            })}
            {!ativos.length && <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "12px 0" }}>Nenhum projeto</div>}
          </div>
        )}
        {aba === "arch" && (
          <div style={{ maxWidth: 1120 }}>
            {arquivados.map((p) => (
              <div key={p.id} className="tk-prow" style={{ cursor: "default", gridTemplateColumns: "minmax(0,2fr) minmax(0,1.4fr) 120px minmax(0,1fr) 32px" }}>
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, color: "var(--text-muted)" }}>
                    <TkDot color={p.cor} />
                    {p.nomeCurto}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", paddingLeft: 16 }}>{p.nome}</span>
                </div>
                <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{cliente(p.clienteId)?.nome ?? "Sem cliente"}</span>
                <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{pessoa(p.responsavelId)?.first ?? "—"}</span>
                <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
                  Arquivado em {dataCurta(p.arquivadoEm!)} · {st(p.id).total} tarefas
                </span>
                {podeProjeto ? <ArquivadoMenu p={p} /> : <span />}
              </div>
            ))}
            {!arquivados.length && <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "12px 0" }}>Nenhum projeto</div>}
          </div>
        )}
        {aba === "tpl" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12, maxWidth: 1120, alignItems: "start" }}>
            {modelos.map((m) => (
              <div key={m.id} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{m.nome}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {[resolveAreaLabel(areas, m.area), `${m.passos.length} passos por ${m.palavraGrupo.toLowerCase()}`].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {podeModelo && <TkIconBtn icon="edit" title="Editar modelo" size={14} onClick={() => onEditarModelo(m)} />}
                  {podeProjeto && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => onAssistente(m.id)}>
                      Usar
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid var(--border)" }}>
                  {m.passos.map((s) => (
                    <div key={s.chave} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 30, fontSize: 13, borderBottom: "1px solid var(--border)" }}>
                      <span style={{ flex: 1, minWidth: 0 }}>{s.titulo}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.papeis.find((r) => r.id === s.papelId)?.rotulo ?? ""}</span>
                      <span style={{ fontSize: 12, color: s.prazoFatal ? "var(--crit)" : "var(--text-muted)", width: 118, textAlign: "right" }}>
                        {s.prazoFatal ? "Prazo fatal" : textoDiasAntes(s.diasAntes)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {podeModelo && (
              <button
                type="button"
                className="card"
                onClick={() => onEditarModelo(null)}
                style={{ padding: 16, minHeight: 96, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px dashed var(--border-strong)", background: "transparent", color: "var(--text-muted)", font: "500 14px var(--font-sans)", cursor: "pointer", boxShadow: "none" }}
              >
                <Icon name="plus" size={14} />
                Novo modelo
              </button>
            )}
            {!modelos.length && !podeModelo && <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Nenhum modelo</div>}
          </div>
        )}
      </div>
    </main>
  )
}

function ArquivadoMenu({ p }: { p: ProjetoRow }) {
  const { act } = useTk()
  const pop = usePop()
  return (
    <span style={{ display: "inline-flex", justifySelf: "end" }}>
      <TkIconBtn icon="moreHorizontal" title="Mais opções" onClick={pop.toggle} />
      <TkPop open={pop.open} onClose={pop.close} anchor={pop.anchor} align="right" width={180}>
        <TkMenuItem
          icon="archiveRestore"
          onClick={() => {
            pop.close()
            void act.editarProjeto(p.id, { arquivado: false })
          }}
        >
          Desarquivar
        </TkMenuItem>
      </TkPop>
    </span>
  )
}

// ── campos compartilhados de projeto ─────────────────────────────────────────
export function projetoVazio(meId: number | null, usadas: string[], area?: string | null, hoje?: string): ProjetoForm {
  return {
    nomeCurto: "",
    nome: "",
    clienteId: null,
    area: area ?? null,
    responsavelId: meId,
    prazo: hoje ? addDays(hoje, 45) : null,
    cor: CORES_PROJETO.find((c) => !usadas.includes(c)) ?? CORES_PROJETO[0],
    descricao: "",
  }
}

function TkProjFields({ v, set }: { v: ProjetoForm; set: (p: Partial<ProjetoForm>) => void }) {
  const { pessoas } = useTk()
  const areas = useAreasStore((s) => s.areas)
  const opcoesArea = toAreaOptions(areas)
  const areaAtual = v.area && !opcoesArea.some((a) => a.id === v.area) ? [{ id: v.area, label: resolveAreaLabel(areas, v.area) }] : []
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px minmax(0,1fr)", gap: 12 }}>
      <label>
        <span className="label">Nome curto</span>
        <input className="input" style={{ height: 34 }} placeholder="Nome curto" maxLength={24} value={v.nomeCurto} onChange={(e) => set({ nomeCurto: e.target.value })} />
      </label>
      <label>
        <span className="label">Nome completo</span>
        <input className="input" style={{ height: 34 }} placeholder="Nome completo" value={v.nome} onChange={(e) => set({ nome: e.target.value })} />
      </label>
      <div style={{ gridColumn: "1 / -1" }}>
        <span className="label">Cliente</span>
        <TkClientPicker field value={v.clienteId} onChange={(c) => set({ clienteId: c })} />
      </div>
      <label style={{ gridColumn: "1 / -1" }}>
        <span className="label">Área do direito</span>
        <select className="input" style={{ height: 34, padding: "0 10px" }} value={v.area ?? ""} onChange={(e) => set({ area: e.target.value || null })}>
          <option value="">—</option>
          {[...areaAtual, ...opcoesArea].map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">Responsável</span>
        <select
          className="input"
          style={{ height: 34, padding: "0 10px" }}
          value={v.responsavelId ?? ""}
          onChange={(e) => set({ responsavelId: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">Sem responsável</option>
          {pessoas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">Prazo final</span>
        <input type="date" className="input" style={{ height: 34 }} value={v.prazo ?? ""} onChange={(e) => set({ prazo: e.target.value || null })} />
      </label>
      <div style={{ gridColumn: "1 / -1" }}>
        <span className="label">Cor</span>
        <div style={{ display: "flex", gap: 8 }}>
          {CORES_PROJETO.map((c) => (
            <button
              type="button"
              key={c}
              title={c}
              aria-label="Cor"
              aria-pressed={v.cor === c}
              onClick={() => set({ cor: c })}
              style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: "none", cursor: "pointer", boxShadow: v.cor === c ? "0 0 0 2px var(--bg-elevated), 0 0 0 4px var(--text)" : "none" }}
            />
          ))}
        </div>
      </div>
      <label style={{ gridColumn: "1 / -1" }}>
        <span className="label">Descrição</span>
        <textarea className="textarea" rows={2} placeholder="Descrição" value={v.descricao} onChange={(e) => set({ descricao: e.target.value })} />
      </label>
    </div>
  )
}

// ── projeto em branco / editar ───────────────────────────────────────────────
export function TkProjectForm({
  projeto,
  onClose,
  onCriado,
}: {
  projeto: ProjetoRow | null
  onClose: () => void
  /** Aberto de dentro de uma tarefa: devolve o projeto novo em vez de navegar até ele. */
  onCriado?: (id: number) => void
}) {
  const { act, meId, projetos, hoje, tarefas } = useTk()
  const [v, setV] = useState<ProjetoForm>(() =>
    projeto
      ? {
          nomeCurto: projeto.nomeCurto,
          nome: projeto.nome,
          clienteId: projeto.clienteId,
          area: projeto.area,
          responsavelId: projeto.responsavelId,
          prazo: projeto.prazo,
          cor: projeto.cor,
          descricao: projeto.descricao ?? "",
        }
      : projetoVazio(meId, projetos.filter((p) => !p.arquivadoEm).map((p) => p.cor), null, hoje),
  )
  const [salvando, setSalvando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const mais = usePop()
  const set = (p: Partial<ProjetoForm>) => setV((x) => ({ ...x, ...p }))
  const ok = v.nomeCurto.trim() && v.nome.trim()
  useEsc(onClose, !confirmar)

  const salvar = async () => {
    if (!ok || salvando) return
    setSalvando(true)
    if (projeto) {
      const feito = await act.editarProjeto(projeto.id, v)
      setSalvando(false)
      if (feito) onClose()
    } else {
      const id = await act.criarProjeto(v)
      setSalvando(false)
      if (id != null) {
        onClose()
        if (onCriado) onCriado(id)
        else act.abrirProjeto(id)
      }
    }
  }
  const nTarefas = projeto ? tarefas.filter((t) => t.projetoId === projeto.id).length : 0

  return (
    <div className="tk-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={TK_JANELA} role="dialog" aria-label={projeto ? "Editar projeto" : "Novo projeto"} style={{ ...ELEVACAO_JANELA, width: 560, maxWidth: "calc(100% - 32px)", maxHeight: "calc(100% - 48px)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 12px 8px 20px" }}>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>{projeto ? "Editar projeto" : "Novo projeto"}</span>
          <TkIconBtn icon="x" title="Fechar" onClick={onClose} />
        </div>
        <div style={{ padding: "4px 20px 16px", overflowY: "auto" }}>
          <TkProjFields v={v} set={set} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px 16px", borderTop: "1px solid var(--border)" }}>
          {projeto && (
            <span style={{ display: "inline-flex" }}>
              <TkIconBtn icon="moreHorizontal" title="Mais opções" onClick={mais.toggle} />
            </span>
          )}
          {projeto && (
            <TkPop open={mais.open} onClose={mais.close} anchor={mais.anchor} up width={180}>
              <TkMenuItem
                icon="archive"
                onClick={() => {
                  mais.close()
                  void act.editarProjeto(projeto.id, { arquivado: true }).then((f) => f && onClose())
                }}
              >
                Arquivar
              </TkMenuItem>
              <TkMenuItem
                icon="trash2"
                danger
                onClick={() => {
                  mais.close()
                  setConfirmar(true)
                }}
              >
                Excluir
              </TkMenuItem>
            </TkPop>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!ok || salvando} onClick={() => void salvar()}>
            {projeto ? "Salvar" : "Criar projeto"}
          </button>
        </div>
      </div>
      {confirmar && projeto && (
        <TkDialog
          title="Excluir projeto?"
          onClose={() => setConfirmar(false)}
          actions={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmar(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: "var(--crit)", color: "#fff" }}
                onClick={() => {
                  setConfirmar(false)
                  onClose()
                  act.excluirProjeto(projeto.id)
                }}
              >
                Excluir
              </button>
            </>
          }
        >
          {nTarefas === 1 ? "1 tarefa fica sem projeto" : `${nTarefas} tarefas ficam sem projeto`}
        </TkDialog>
      )}
    </div>
  )
}

// ── assistente: 1 Projeto · 2 Grupos · 3 Responsáveis ────────────────────────
export function TkWizard({ modeloId, onClose }: { modeloId: number | null; onClose: () => void }) {
  const { modelos, pessoas, meId, projetos, hoje, act } = useTk()
  const [passo, setPasso] = useState(0)
  const [mid, setMid] = useState<number>(modeloId ?? modelos[0]?.id ?? 0)
  const m = modelos.find((x) => x.id === mid) ?? modelos[0]
  const usadas = projetos.filter((p) => !p.arquivadoEm).map((p) => p.cor)
  const [v, setV] = useState<ProjetoForm>(() => projetoVazio(meId, usadas, m?.area, hoje))
  const [grupos, setGrupos] = useState<GrupoWizard[]>(() => (m ? gruposPadrao(m, 2, hoje) : []))
  const [papeis, setPapeis] = useState<Record<string, number | null>>(() => Object.fromEntries((m?.papeis ?? []).map((r) => [r.id, r.padraoUsuarioId])))
  const [salvando, setSalvando] = useState(false)
  useEsc(onClose)
  if (!m) return null
  const set = (p: Partial<ProjetoForm>) => setV((x) => ({ ...x, ...p }))
  const trocarModelo = (id: number) => {
    const n = modelos.find((x) => x.id === id)
    if (!n) return
    setMid(id)
    set({ area: n.area })
    setGrupos(gruposPadrao(n, grupos.length, hoje))
    setPapeis(Object.fromEntries(n.papeis.map((r) => [r.id, r.padraoUsuarioId])))
  }
  const resumo = resumoModelo(m, grupos)
  const ok0 = v.nomeCurto.trim() && v.nome.trim()
  const ok1 = grupos.every((g) => g.nome.trim() && g.prazo)
  const ETAPAS = ["Projeto", "Grupos", "Responsáveis"]

  const criar = async () => {
    if (salvando) return
    setSalvando(true)
    const id = await act.criarDeModelo(m.id, { ...v, prazo: v.prazo ?? resumo.prazoMax }, grupos, papeis)
    setSalvando(false)
    if (id != null) {
      onClose()
      act.abrirProjeto(id)
    }
  }

  return (
    <div className="tk-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={TK_JANELA}
        role="dialog"
        aria-label="Novo projeto a partir de modelo"
        style={{ ...ELEVACAO_JANELA, width: 640, maxWidth: "calc(100% - 32px)", maxHeight: "calc(100% - 64px)", display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 12px 12px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 16, fontWeight: 500 }}>Novo projeto</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, flexWrap: "wrap" }}>
            {ETAPAS.map((l, i) => (
              <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <span style={{ width: 16, height: 1, background: "var(--border-strong)" }} />}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: i === passo ? "var(--text)" : "var(--text-muted)" }}>
                  <span
                    className="tnum"
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      background: i < passo ? "var(--ok)" : i === passo ? "var(--brand-gold)" : "var(--bg-sunken)",
                      color: i <= passo ? "var(--brand-navy)" : "var(--text-muted)",
                    }}
                  >
                    {i < passo ? <Icon name="check" size={11} strokeWidth={3} /> : i + 1}
                  </span>
                  {l}
                </span>
              </span>
            ))}
          </div>
          <TkIconBtn icon="x" title="Fechar" onClick={onClose} />
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px" }}>
          {passo === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label>
                <span className="label">Modelo</span>
                <select className="input" style={{ height: 34, padding: "0 10px" }} value={mid} onChange={(e) => trocarModelo(Number(e.target.value))}>
                  {modelos.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nome}
                    </option>
                  ))}
                </select>
              </label>
              <TkProjFields v={v} set={set} />
            </div>
          )}
          {passo === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="label" style={{ margin: 0, flex: 1 }}>
                  Quantidade de grupos
                </span>
                <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)" }}>
                  <TkIconBtn icon="minus" title="Menos" onClick={() => setGrupos((g) => ajustarGrupos(g, g.length - 1, m, hoje))} />
                  <span className="tnum" style={{ width: 28, textAlign: "center", fontSize: 14, fontWeight: 500 }}>
                    {grupos.length}
                  </span>
                  <TkIconBtn icon="plus" title="Mais" onClick={() => setGrupos((g) => ajustarGrupos(g, g.length + 1, m, hoje))} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 150px", gap: "6px 10px", alignItems: "center" }}>
                <span className="label" style={{ margin: 0 }}>
                  Nome
                </span>
                <span className="label" style={{ margin: 0 }}>
                  Prazo
                </span>
                {grupos.map((g, i) => (
                  <span key={i} style={{ display: "contents" }}>
                    <input
                      className="input"
                      style={{ height: 34 }}
                      aria-label="Nome"
                      placeholder="Nome"
                      value={g.nome}
                      onChange={(e) => setGrupos((gs) => gs.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
                    />
                    <input
                      type="date"
                      className="input"
                      style={{ height: 34 }}
                      aria-label="Prazo"
                      value={g.prazo}
                      onChange={(e) => setGrupos((gs) => gs.map((x, j) => (j === i ? { ...x, prazo: e.target.value } : x)))}
                    />
                  </span>
                ))}
              </div>
            </div>
          )}
          {passo === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {m.papeis.map((r) => (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "120px 180px minmax(0,1fr)", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{r.rotulo}</span>
                  <select
                    className="input"
                    style={{ height: 34, padding: "0 10px" }}
                    aria-label={r.rotulo}
                    value={papeis[r.id] ?? ""}
                    onChange={(e) => setPapeis((x) => ({ ...x, [r.id]: e.target.value ? Number(e.target.value) : null }))}
                  >
                    {pessoas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                    <option value="">Sem responsável</option>
                  </select>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {m.passos
                      .filter((s) => s.papelId === r.id)
                      .map((s) => s.titulo)
                      .join(" · ")}
                  </span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500 }}>
                  <TkDot color={v.cor} />
                  {v.nomeCurto} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>{v.nome}</span>
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {`${resumo.grupos} ${resumo.grupos === 1 ? "grupo" : "grupos"} · ${resumo.tarefas} tarefas · ${resumo.ligacoes} ligações`}
                  {resumo.prazoMin && resumo.prazoMax ? ` · prazos de ${dataCurta(resumo.prazoMin)} a ${dataCurta(resumo.prazoMax)}` : ""}
                </span>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px 16px", borderTop: "1px solid var(--border)" }}>
          {passo > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPasso(passo - 1)}>
              <Icon name="chevronLeft" size={14} />
              Voltar
            </button>
          )}
          <div style={{ flex: 1 }} />
          {passo < 2 ? (
            <button type="button" className="btn btn-primary btn-sm" disabled={passo === 0 ? !ok0 : !ok1} onClick={() => setPasso(passo + 1)}>
              Próximo
              <Icon name="chevronRight" size={14} />
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" disabled={salvando} onClick={() => void criar()}>
              Criar projeto
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── editor de modelos (só sócio) ─────────────────────────────────────────────
const novaChave = (prefixo: string) => `${prefixo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

export function TkModeloEditor({ modelo, onClose }: { modelo: ModeloView | null; onClose: () => void }) {
  const { pessoas, act } = useTk()
  const areas = useAreasStore((s) => s.areas)
  const [nome, setNome] = useState(modelo?.nome ?? "")
  const [area, setArea] = useState<string | null>(modelo?.area ?? null)
  const [palavra, setPalavra] = useState(modelo?.palavraGrupo ?? "Grupo")
  const [sufixo, setSufixo] = useState(modelo?.sufixoGrupo ?? "")
  const [papeis, setPapeis] = useState<PapelModelo[]>(modelo?.papeis ?? [{ id: novaChave("papel-"), rotulo: "Responsável", padraoUsuarioId: null }])
  const [passos, setPassos] = useState<PassoModelo[]>(
    modelo?.passos ?? [{ chave: novaChave("p"), titulo: "", papelId: null, diasAntes: 0, prazoFatal: false, anteriores: [], checklist: [] }],
  )
  const [salvando, setSalvando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  useEsc(onClose, !confirmar)
  const ok = nome.trim() && palavra.trim() && passos.length > 0 && passos.every((p) => p.titulo.trim()) && papeis.every((p) => p.rotulo.trim())
  const setPasso = (i: number, p: Partial<PassoModelo>) => setPassos((ps) => ps.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const moverPasso = (i: number, d: number) =>
    setPassos((ps) => {
      const j = i + d
      if (j < 0 || j >= ps.length) return ps
      const n = [...ps]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  const removerPasso = (i: number) =>
    setPassos((ps) => {
      const chave = ps[i].chave
      return ps.filter((_, j) => j !== i).map((x) => ({ ...x, anteriores: x.anteriores.filter((a) => a !== chave) }))
    })

  const salvar = async () => {
    if (!ok || salvando) return
    setSalvando(true)
    const corpo = {
      nome: nome.trim(),
      area,
      palavraGrupo: palavra.trim(),
      sufixoGrupo: sufixo,
      papeis: papeis.map((p) => ({ ...p, rotulo: p.rotulo.trim() })),
      passos: passos.map((p) => ({ ...p, titulo: p.titulo.trim(), checklist: p.checklist.map((c) => c.trim()).filter(Boolean) })),
    }
    try {
      const r = modelo
        ? await apiSend<{ acaoId: string }>(`/api/projetos/modelos/${modelo.id}`, "PATCH", corpo)
        : await apiSend<{ acaoId: string }>("/api/projetos/modelos", "POST", corpo)
      await act.recarregar()
      act.avisar({ msg: modelo ? `Modelo salvo: ${corpo.nome}` : `Modelo criado: ${corpo.nome}`, acaoId: r?.acaoId ?? null })
      onClose()
    } catch (e) {
      act.erro(e)
    } finally {
      setSalvando(false)
    }
  }
  const excluir = async () => {
    if (!modelo) return
    try {
      const r = await apiSend<{ acaoId: string }>(`/api/projetos/modelos/${modelo.id}`, "DELETE")
      await act.recarregar()
      act.avisar({ msg: `Modelo excluído: ${modelo.nome}`, acaoId: r?.acaoId ?? null })
      onClose()
    } catch (e) {
      act.erro(e)
    }
  }

  return (
    <div className="tk-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={TK_JANELA} role="dialog" aria-label={modelo ? "Editar modelo" : "Novo modelo"} style={{ ...ELEVACAO_JANELA, width: 760, maxWidth: "calc(100% - 32px)", maxHeight: "calc(100% - 48px)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 12px 8px 20px" }}>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>{modelo ? "Editar modelo" : "Novo modelo"}</span>
          <TkIconBtn icon="x" title="Fechar" onClick={onClose} />
        </div>
        <div style={{ padding: "4px 20px 16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
            <label style={{ gridColumn: "1 / -1" }}>
              <span className="label">Nome</span>
              <input className="input" style={{ height: 34 }} placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </label>
            <label>
              <span className="label">Área do direito</span>
              <select className="input" style={{ height: 34, padding: "0 10px" }} value={area ?? ""} onChange={(e) => setArea(e.target.value || null)}>
                <option value="">—</option>
                {toAreaOptions(areas).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)", gap: 8 }}>
              <label>
                <span className="label">Grupo</span>
                <input className="input" style={{ height: 34 }} placeholder="Grupo" value={palavra} onChange={(e) => setPalavra(e.target.value)} />
              </label>
              <label>
                <span className="label">Complemento</span>
                <input className="input" style={{ height: 34 }} placeholder="Complemento" value={sufixo} onChange={(e) => setSufixo(e.target.value)} />
              </label>
            </div>
          </div>

          <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="tk-sec-title">Papéis</div>
            {papeis.map((p, i) => (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 200px 28px", gap: 8, alignItems: "center" }}>
                <input
                  className="input"
                  style={{ height: 32 }}
                  aria-label="Papel"
                  placeholder="Papel"
                  value={p.rotulo}
                  onChange={(e) => setPapeis((ps) => ps.map((x, j) => (j === i ? { ...x, rotulo: e.target.value } : x)))}
                />
                <select
                  className="input"
                  style={{ height: 32, padding: "0 10px" }}
                  aria-label="Responsável"
                  value={p.padraoUsuarioId ?? ""}
                  onChange={(e) => setPapeis((ps) => ps.map((x, j) => (j === i ? { ...x, padraoUsuarioId: e.target.value ? Number(e.target.value) : null } : x)))}
                >
                  <option value="">Sem responsável</option>
                  {pessoas.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>
                <TkIconBtn
                  icon="x"
                  title="Remover"
                  size={13}
                  onClick={() => {
                    setPapeis((ps) => ps.filter((_, j) => j !== i))
                    setPassos((ps) => ps.map((s) => (s.papelId === p.id ? { ...s, papelId: null } : s)))
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className="tk-inline-add"
              onClick={() => setPapeis((ps) => [...ps, { id: novaChave("papel-"), rotulo: "", padraoUsuarioId: null }])}
            >
              <Icon name="plus" size={13} />
              Papel
            </button>
          </section>

          <section style={{ display: "flex", flexDirection: "column" }}>
            <div className="tk-sec-title" style={{ marginBottom: 2 }}>
              Passos
            </div>
            {passos.map((s, i) => (
              <div key={s.chave} className="tk-step">
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 150px 96px auto", gap: 8, alignItems: "center" }}>
                  <input className="input" style={{ height: 32 }} aria-label="Título" placeholder="Título" value={s.titulo} onChange={(e) => setPasso(i, { titulo: e.target.value })} />
                  <select
                    className="input"
                    style={{ height: 32, padding: "0 10px" }}
                    aria-label="Papel"
                    value={s.papelId ?? ""}
                    onChange={(e) => setPasso(i, { papelId: e.target.value || null })}
                  >
                    <option value="">Sem papel</option>
                    {papeis.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.rotulo || "—"}
                      </option>
                    ))}
                  </select>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
                    <input
                      className="input"
                      style={{ height: 32, width: 56, padding: "0 8px" }}
                      type="number"
                      min={0}
                      aria-label="Dias antes"
                      value={s.diasAntes}
                      onChange={(e) => setPasso(i, { diasAntes: Math.max(0, Number(e.target.value) || 0) })}
                    />
                    dias
                  </label>
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    <TkIconBtn icon="chevronUp" title="Subir" size={13} onClick={() => moverPasso(i, -1)} />
                    <TkIconBtn icon="chevronDown" title="Descer" size={13} onClick={() => moverPasso(i, 1)} />
                    <TkIconBtn icon="x" title="Remover" size={13} onClick={() => removerPasso(i)} />
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <label className="tk-cb" style={{ color: s.prazoFatal ? "var(--crit)" : undefined }}>
                    <input type="checkbox" checked={s.prazoFatal} onChange={(e) => setPasso(i, { prazoFatal: e.target.checked })} />
                    Prazo fatal
                  </label>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Só começa depois de…</span>
                  {passos
                    .filter((o) => o.chave !== s.chave)
                    .map((o) => {
                      const on = s.anteriores.includes(o.chave)
                      return (
                        <button
                          type="button"
                          key={o.chave}
                          className={"tk-chip" + (on ? " on" : "")}
                          style={{ height: 24 }}
                          onClick={() => setPasso(i, { anteriores: on ? s.anteriores.filter((a) => a !== o.chave) : [...s.anteriores, o.chave] })}
                        >
                          <span className="tk-chip-main" style={{ padding: "0 8px" }}>
                            {o.titulo || "—"}
                          </span>
                        </button>
                      )
                    })}
                </div>
                <textarea
                  className="textarea"
                  rows={Math.max(1, s.checklist.length)}
                  placeholder="Checklist"
                  aria-label="Checklist"
                  value={s.checklist.join("\n")}
                  onChange={(e) => setPasso(i, { checklist: e.target.value.split("\n") })}
                  style={{ fontSize: 13 }}
                />
              </div>
            ))}
            <button
              type="button"
              className="tk-inline-add"
              style={{ marginTop: 6 }}
              onClick={() => setPassos((ps) => [...ps, { chave: novaChave("p"), titulo: "", papelId: null, diasAntes: 0, prazoFatal: false, anteriores: [], checklist: [] }])}
            >
              <Icon name="plus" size={13} />
              Passo
            </button>
          </section>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px 16px", borderTop: "1px solid var(--border)" }}>
          {modelo && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--crit)" }} onClick={() => setConfirmar(true)}>
              Excluir
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!ok || salvando} onClick={() => void salvar()}>
            Salvar
          </button>
        </div>
      </div>
      {confirmar && modelo && (
        <TkDialog
          title="Excluir modelo?"
          onClose={() => setConfirmar(false)}
          actions={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmar(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" style={{ background: "var(--crit)", color: "#fff" }} onClick={() => void excluir()}>
                Excluir
              </button>
            </>
          }
        >
          {modelo.nome}
        </TkDialog>
      )}
    </div>
  )
}
