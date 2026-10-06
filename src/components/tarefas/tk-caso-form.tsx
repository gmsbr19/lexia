"use client"

// Tarefas — "Novo caso…" rápido pelo quadro (o caso é o "projeto" do quadro). Só
// a etiqueta do quadro: nome curto, título, cliente, área, responsável, prazo
// final, cor e descrição. O cadastro completo (contrato, tipo, status, financeiro)
// e a edição ficam na página do caso (/casos/<id>).
import { useState } from "react"
import { resolveAreaLabel, toAreaOptions, useAreasStore } from "@/lib/areas/store"
import { addDays } from "@/lib/datas/util"
import { CORES_CASO } from "@/lib/tarefas/types"
import { useTk, type CasoQuadroForm } from "./tk-context"
import { TkClientPicker } from "./tk-pickers"
import { TkIconBtn, useEsc } from "./tk-ui"
import { ELEVACAO_JANELA, TK_JANELA } from "./tk-glass"

export function casoVazio(meId: number | null, usadas: string[], area?: string | null, hoje?: string): CasoQuadroForm {
  return {
    nomeCurto: "",
    nome: "",
    clienteId: null,
    area: area ?? null,
    responsavelId: meId,
    prazo: hoje ? addDays(hoje, 45) : null,
    cor: CORES_CASO.find((c) => !usadas.includes(c)) ?? CORES_CASO[0],
    descricao: "",
  }
}

/** Cores já em uso pelos casos com tarefas abertas (a próxima cor livre vira o padrão). */
export function useCoresEmUso(): string[] {
  const { casosComTarefas, tarefas } = useTk()
  const abertos = new Set(tarefas.filter((t) => t.status !== "done").map((t) => t.casoId))
  return casosComTarefas.filter((c) => abertos.has(c.id)).map((c) => c.cor)
}

export function TkCasoFields({ v, set }: { v: CasoQuadroForm; set: (p: Partial<CasoQuadroForm>) => void }) {
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
        <span className="label">Título do caso</span>
        <input className="input" style={{ height: 34 }} placeholder="Título do caso" value={v.nome} onChange={(e) => set({ nome: e.target.value })} />
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
          {CORES_CASO.map((c) => (
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

/** "Novo caso…" (aberto de dentro de uma tarefa ou da Nova tarefa): devolve o id criado. */
export function TkCasoForm({ onClose, onCriado }: { onClose: () => void; onCriado?: (id: number) => void }) {
  const { act, meId, hoje } = useTk()
  const usadas = useCoresEmUso()
  const [v, setV] = useState<CasoQuadroForm>(() => casoVazio(meId, usadas, null, hoje))
  const [salvando, setSalvando] = useState(false)
  const set = (p: Partial<CasoQuadroForm>) => setV((x) => ({ ...x, ...p }))
  const ok = v.nomeCurto.trim() && v.nome.trim()
  useEsc(onClose)

  const salvar = async () => {
    if (!ok || salvando) return
    setSalvando(true)
    const id = await act.criarCaso(v)
    setSalvando(false)
    if (id != null) {
      onClose()
      if (onCriado) onCriado(id)
      else act.abrirCaso(id)
    }
  }

  return (
    <div className="tk-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={TK_JANELA} role="dialog" aria-label="Novo caso" style={{ ...ELEVACAO_JANELA, width: 560, maxWidth: "calc(100% - 32px)", maxHeight: "calc(100% - 48px)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 12px 8px 20px" }}>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>Novo caso</span>
          <TkIconBtn icon="x" title="Fechar" onClick={onClose} />
        </div>
        <div style={{ padding: "4px 20px 16px", overflowY: "auto" }}>
          <TkCasoFields v={v} set={set} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px 16px", borderTop: "1px solid var(--border)" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Contrato, tipo e financeiro: na página do caso</span>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!ok || salvando} onClick={() => void salvar()}>
            Criar caso
          </button>
        </div>
      </div>
    </div>
  )
}
