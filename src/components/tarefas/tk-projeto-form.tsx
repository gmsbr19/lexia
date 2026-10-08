"use client"

// Tarefas — janela de projeto. NOVO: com cliente vira um CASO do cliente (só a
// etiqueta do quadro aqui; contrato, tipo, status e financeiro ficam na página
// do caso) e sem cliente vira um projeto INTERNO do escritório. EDITAR (só
// interno — o caso se edita em /casos/<id>): nome, responsável, prazo, cor e
// descrição; arquivar/reabrir; excluir (as tarefas ficam "Sem projeto", com
// Desfazer); "Vincular a um cliente…" transforma o projeto num caso do cliente.
import { useState } from "react"
import { resolveAreaLabel, toAreaOptions, useAreasStore } from "@/lib/areas/store"
import { addDays } from "@/lib/datas/util"
import { CORES_PROJETO, type ChaveProjeto, type ProjetoQuadro } from "@/lib/tarefas/types"
import { useTk, type PatchProjetoUI, type ProjetoForm } from "./tk-context"
import { TkClientPicker } from "./tk-pickers"
import { TkDialog, TkIconBtn, useEsc } from "./tk-ui"
import { ELEVACAO_JANELA, TK_JANELA } from "./tk-glass"

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

const doProjeto = (p: ProjetoQuadro): ProjetoForm => ({
  nomeCurto: p.nomeCurto,
  nome: p.nome,
  clienteId: null,
  area: null,
  responsavelId: p.responsavelId,
  prazo: p.prazo,
  cor: p.cor,
  descricao: p.descricao ?? "",
})

/** Cores já em uso pelos projetos com tarefas abertas (a próxima cor livre vira o padrão). */
export function useCoresEmUso(): string[] {
  const { projetosComTarefas, tarefas } = useTk()
  const abertos = new Set(tarefas.filter((t) => t.status !== "done").map((t) => t.projeto))
  return projetosComTarefas.filter((p) => abertos.has(p.chave)).map((p) => p.cor)
}

/**
 * Campos do projeto. `interno` = editar um projeto interno (sem cliente/área).
 * No novo, o cliente decide o que nasce: com cliente, um caso (e a área aparece).
 */
export function TkProjetoFields({ v, set, interno }: { v: ProjetoForm; set: (p: Partial<ProjetoForm>) => void; interno?: boolean }) {
  const { pessoas } = useTk()
  const areas = useAreasStore((s) => s.areas)
  const opcoesArea = toAreaOptions(areas)
  const areaAtual = v.area && !opcoesArea.some((a) => a.id === v.area) ? [{ id: v.area, label: resolveAreaLabel(areas, v.area) }] : []
  const caso = !interno && v.clienteId != null
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px minmax(0,1fr)", gap: 12 }}>
      <label>
        <span className="label">Nome curto</span>
        <input className="input" style={{ height: 34 }} placeholder="Nome curto" maxLength={24} value={v.nomeCurto} onChange={(e) => set({ nomeCurto: e.target.value })} />
      </label>
      <label>
        <span className="label">{caso ? "Título do caso" : "Nome do projeto"}</span>
        <input className="input" style={{ height: 34 }} placeholder={caso ? "Título do caso" : "Nome do projeto"} value={v.nome} onChange={(e) => set({ nome: e.target.value })} />
      </label>
      {!interno && (
        <div style={{ gridColumn: "1 / -1" }}>
          <span className="label">Cliente</span>
          <TkClientPicker field value={v.clienteId} onChange={(c) => set({ clienteId: c, area: c == null ? null : v.area })} />
          <span style={{ display: "block", marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
            {caso ? "Com cliente, o projeto é um caso do cliente." : "Sem cliente, é um projeto interno do escritório."}
          </span>
        </div>
      )}
      {caso && (
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
      )}
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

/** O que mudou no projeto interno (só os campos alterados vão para a API). */
function diferencas(antes: ProjetoForm, v: ProjetoForm): PatchProjetoUI {
  const p: PatchProjetoUI = {}
  if (v.nomeCurto.trim() !== antes.nomeCurto) p.nomeCurto = v.nomeCurto.trim()
  if (v.nome.trim() !== antes.nome) p.nome = v.nome.trim()
  if (v.responsavelId !== antes.responsavelId) p.responsavelId = v.responsavelId
  if (v.prazo !== antes.prazo) p.prazo = v.prazo
  if (v.cor !== antes.cor) p.cor = v.cor
  if (v.descricao.trim() !== antes.descricao.trim()) p.descricao = v.descricao.trim() || null
  return p
}

/**
 * Janela de projeto. Sem `projeto` = novo (aberto da aba Projetos, de uma tarefa
 * ou da Nova tarefa: `onCriado` devolve a chave criada). Com `projeto` interno =
 * editar.
 */
export function TkProjetoForm({
  projeto,
  onClose,
  onCriado,
}: {
  projeto?: ProjetoQuadro | null
  onClose: () => void
  onCriado?: (chave: ChaveProjeto) => void
}) {
  const { act, meId, hoje, cliente } = useTk()
  const usadas = useCoresEmUso()
  const editando = projeto?.tipo === "interno" ? projeto : null
  const [antes] = useState<ProjetoForm>(() => (editando ? doProjeto(editando) : projetoVazio(meId, usadas, null, hoje)))
  const [v, setV] = useState<ProjetoForm>(antes)
  const [salvando, setSalvando] = useState(false)
  const [dialogo, setDialogo] = useState<null | "excluir" | "cliente">(null)
  const [clienteId, setClienteId] = useState<number | null>(null)
  const set = (p: Partial<ProjetoForm>) => setV((x) => ({ ...x, ...p }))
  const ok = v.nomeCurto.trim() && v.nome.trim()
  useEsc(onClose, dialogo == null)

  const salvar = async () => {
    if (!ok || salvando) return
    setSalvando(true)
    if (editando) {
      const patch = diferencas(antes, v)
      const feito = Object.keys(patch).length ? await act.editarProjeto(editando.id, patch) : true
      setSalvando(false)
      if (feito) onClose()
      return
    }
    const chave = await act.criarProjeto(v)
    setSalvando(false)
    if (chave != null) {
      onClose()
      if (onCriado) onCriado(chave)
      else act.abrirProjeto(chave)
    }
  }

  const arquivar = async () => {
    if (!editando || salvando) return
    setSalvando(true)
    const feito = await act.editarProjeto(editando.id, { arquivado: !editando.arquivado })
    setSalvando(false)
    if (feito) onClose()
  }

  const excluir = async () => {
    if (!editando) return
    setDialogo(null)
    setSalvando(true)
    const feito = await act.excluirProjeto(editando.id)
    setSalvando(false)
    if (feito) onClose()
  }

  const vincular = async () => {
    if (!editando || clienteId == null) return
    setDialogo(null)
    setSalvando(true)
    const casoId = await act.converterProjeto(editando.id, clienteId)
    setSalvando(false)
    if (casoId != null) onClose()
  }

  const titulo = editando ? "Projeto interno" : v.clienteId != null ? "Novo caso" : "Novo projeto"
  return (
    <div className="tk-scrim" onMouseDown={(e) => e.target === e.currentTarget && dialogo == null && onClose()}>
      <div className={TK_JANELA} role="dialog" aria-label={titulo} style={{ ...ELEVACAO_JANELA, width: 560, maxWidth: "calc(100% - 32px)", maxHeight: "calc(100% - 48px)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 12px 8px 20px" }}>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>{titulo}</span>
          <TkIconBtn icon="x" title="Fechar" onClick={onClose} />
        </div>
        <div style={{ padding: "4px 20px 16px", overflowY: "auto" }}>
          <TkProjetoFields v={v} set={set} interno={!!editando} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px 16px", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
          {editando ? (
            <>
              <button type="button" className="btn btn-ghost btn-sm" disabled={salvando} onClick={() => void arquivar()}>
                {editando.arquivado ? "Reabrir" : "Arquivar"}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={salvando} onClick={() => setDialogo("cliente")}>
                Vincular a um cliente…
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={salvando} style={{ color: "var(--crit)" }} onClick={() => setDialogo("excluir")}>
                Excluir
              </button>
            </>
          ) : (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {v.clienteId != null ? "Contrato, tipo e financeiro: na página do caso" : "Aparece só nas Tarefas, não em Casos"}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!ok || salvando} onClick={() => void salvar()}>
            {editando ? "Salvar" : v.clienteId != null ? "Criar caso" : "Criar projeto"}
          </button>
        </div>
      </div>
      {dialogo === "excluir" && editando && (
        <TkDialog
          title="Excluir o projeto?"
          onClose={() => setDialogo(null)}
          actions={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setDialogo(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" style={{ background: "var(--crit)", color: "#fff" }} onClick={() => void excluir()}>
                Excluir
              </button>
            </>
          }
        >
          As tarefas de {editando.nomeCurto} ficam sem projeto.
        </TkDialog>
      )}
      {dialogo === "cliente" && editando && (
        <TkDialog
          title="Vincular a um cliente"
          width={440}
          onClose={() => setDialogo(null)}
          actions={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setDialogo(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" disabled={clienteId == null} onClick={() => void vincular()}>
                Virar caso
              </button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <TkClientPicker field value={clienteId} onChange={setClienteId} />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {clienteId != null
                ? `${editando.nomeCurto} vira um caso de ${cliente(clienteId)?.nome ?? "cliente"}, com as tarefas. Não dá para desfazer.`
                : "O projeto vira um caso do cliente, com as tarefas. Não dá para desfazer."}
            </span>
          </div>
        </TkDialog>
      )}
    </div>
  )
}
