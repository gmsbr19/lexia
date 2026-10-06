"use client"

// Tarefas — Modelos: processos repetíveis do escritório (cartões com "Usar"), o
// assistente que aplica um modelo a um caso NOVO ou a um caso EXISTENTE (Caso ·
// Grupos · Responsáveis) e o editor de modelos (só sócio). O caso é o "projeto"
// do quadro; a lista de casos fica em /casos.
import { useState } from "react"
import { resolveAreaLabel, toAreaOptions, useAreasStore } from "@/lib/areas/store"
import { ajustarGrupos, gruposPadrao, resumoModelo, textoDiasAntes, type GrupoWizard } from "@/lib/modelos/modelo"
import { dataCurta } from "@/lib/tarefas/regras"
import type { ModeloView, PassoModelo, PapelModelo } from "@/lib/tarefas/types"
import { apiSend } from "@/lib/client/api"
import { Icon } from "./tf-icons"
import { useTk, type CasoQuadroForm } from "./tk-context"
import { TkCasoFields, casoVazio, useCoresEmUso } from "./tk-caso-form"
import { TkCasoPicker, useGruposDoCaso } from "./tk-pickers"
import { TkDialog, TkDot, TkIconBtn, TkSeg, useEsc } from "./tk-ui"
import { ELEVACAO_JANELA, TK_JANELA } from "./tk-glass"

// ── página ───────────────────────────────────────────────────────────────────
export function TkModelosPage({
  onAssistente,
  onEditarModelo,
}: {
  onAssistente: (modeloId: number | null) => void
  onEditarModelo: (m: ModeloView | null) => void
}) {
  const { podeCriarCaso, podeModelo, modelos } = useTk()
  const areas = useAreasStore((s) => s.areas)
  return (
    <main className="tk-main">
      <div className="tk-head">
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <h1 className="tk-h1">Modelos</h1>
          <span style={{ fontSize: 14, color: "var(--text-muted)" }}>Aplique um modelo a um caso novo ou a um caso que já existe.</span>
        </div>
      </div>
      <div className="tk-body" style={{ paddingTop: 4 }}>
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
                {podeCriarCaso && (
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
      </div>
    </main>
  )
}

// ── assistente: 1 Caso · 2 Grupos · 3 Responsáveis ───────────────────────────
type Destino = "novo" | "existente"

export function TkModeloWizard({ modeloId, onClose }: { modeloId: number | null; onClose: () => void }) {
  const { modelos, pessoas, meId, hoje, act, caso, tarefas } = useTk()
  const usadas = useCoresEmUso()
  const [passo, setPasso] = useState(0)
  const [mid, setMid] = useState<number>(modeloId ?? modelos[0]?.id ?? 0)
  const m = modelos.find((x) => x.id === mid) ?? modelos[0]
  const [destino, setDestino] = useState<Destino>("novo")
  const [casoId, setCasoId] = useState<number | null>(null)
  const [v, setV] = useState<CasoQuadroForm>(() => casoVazio(meId, usadas, m?.area, hoje))
  // num caso existente, a numeração dos grupos continua depois dos que ele já tem
  const gruposExistentes = useGruposDoCaso(destino === "existente" ? casoId : null).length
  const [grupos, setGrupos] = useState<GrupoWizard[]>(() => (m ? gruposPadrao(m, 2, hoje) : []))
  const [papeis, setPapeis] = useState<Record<string, number | null>>(() => Object.fromEntries((m?.papeis ?? []).map((r) => [r.id, r.padraoUsuarioId])))
  const [salvando, setSalvando] = useState(false)
  useEsc(onClose)
  if (!m) return null
  const set = (p: Partial<CasoQuadroForm>) => setV((x) => ({ ...x, ...p }))
  const renumerar = (n: number, inicio: number, base = m) => setGrupos(gruposPadrao(base, n, hoje, inicio))
  const trocarModelo = (id: number) => {
    const n = modelos.find((x) => x.id === id)
    if (!n) return
    setMid(id)
    set({ area: n.area })
    renumerar(grupos.length, gruposExistentes, n)
    setPapeis(Object.fromEntries(n.papeis.map((r) => [r.id, r.padraoUsuarioId])))
  }
  const trocarDestino = (d: Destino) => {
    setDestino(d)
    if (d === "novo") renumerar(grupos.length, 0)
  }
  const escolherCaso = (id: number | null) => {
    setCasoId(id)
    // grupos já existentes no caso escolhido (lidos do quadro)
    const ja = id == null ? 0 : new Set(tarefas.filter((t) => t.casoId === id && t.grupo).map((t) => t.grupo)).size
    renumerar(grupos.length, ja)
  }
  const resumo = resumoModelo(m, grupos)
  const alvo = caso(casoId)
  const ok0 = destino === "novo" ? !!(v.nomeCurto.trim() && v.nome.trim()) : casoId != null
  const ok1 = grupos.every((g) => g.nome.trim() && g.prazo)
  const ETAPAS = ["Caso", "Grupos", "Responsáveis"]

  const criar = async () => {
    if (salvando) return
    setSalvando(true)
    const id = await act.usarModelo(
      m.id,
      destino === "novo" ? { caso: { ...v, prazo: v.prazo ?? resumo.prazoMax } } : { casoId: casoId! },
      grupos,
      papeis,
    )
    setSalvando(false)
    if (id != null) {
      onClose()
      act.abrirCaso(id)
    }
  }

  return (
    <div className="tk-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={TK_JANELA}
        role="dialog"
        aria-label="Usar modelo"
        style={{ ...ELEVACAO_JANELA, width: 640, maxWidth: "calc(100% - 32px)", maxHeight: "calc(100% - 64px)", display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 12px 12px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 16, fontWeight: 500 }}>Usar modelo</span>
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
              <div>
                <TkSeg<Destino>
                  options={[
                    { id: "novo", label: "Novo caso" },
                    { id: "existente", label: "Caso existente" },
                  ]}
                  value={destino}
                  onChange={trocarDestino}
                />
              </div>
              {destino === "novo" ? (
                <TkCasoFields v={v} set={set} />
              ) : (
                <div>
                  <span className="label">Caso</span>
                  <TkCasoPicker variant="field" value={casoId} onChange={escolherCaso} semCaso={false} placeholder="Escolha o caso" />
                </div>
              )}
            </div>
          )}
          {passo === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="label" style={{ margin: 0, flex: 1 }}>
                  Quantidade de grupos
                </span>
                <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)" }}>
                  <TkIconBtn icon="minus" title="Menos" onClick={() => setGrupos((g) => ajustarGrupos(g, g.length - 1, m, hoje, gruposExistentes))} />
                  <span className="tnum" style={{ width: 28, textAlign: "center", fontSize: 14, fontWeight: 500 }}>
                    {grupos.length}
                  </span>
                  <TkIconBtn icon="plus" title="Mais" onClick={() => setGrupos((g) => ajustarGrupos(g, g.length + 1, m, hoje, gruposExistentes))} />
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
                  <TkDot color={destino === "novo" ? v.cor : (alvo?.cor ?? "var(--text-subtle)")} />
                  {destino === "novo" ? v.nomeCurto : alvo?.nomeCurto}{" "}
                  <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>{destino === "novo" ? v.nome : alvo?.nome}</span>
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
              {destino === "novo" ? "Criar caso" : "Aplicar modelo"}
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
        ? await apiSend<{ result: { acaoId: string } }>(`/api/tarefas/modelos/${modelo.id}`, "PATCH", corpo)
        : await apiSend<{ result: { acaoId: string } }>("/api/tarefas/modelos", "POST", corpo)
      await act.recarregar()
      act.avisar({ msg: modelo ? `Modelo salvo: ${corpo.nome}` : `Modelo criado: ${corpo.nome}`, acaoId: r?.result?.acaoId ?? null })
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
      const r = await apiSend<{ result: { acaoId: string } }>(`/api/tarefas/modelos/${modelo.id}`, "DELETE")
      await act.recarregar()
      act.avisar({ msg: `Modelo excluído: ${modelo.nome}`, acaoId: r?.result?.acaoId ?? null })
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
