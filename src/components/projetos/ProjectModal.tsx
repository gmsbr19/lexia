"use client"

// Projetos & Tarefas — criar / editar projeto (overlay). Maps the design's
// ProjectModal onto the real backend shape: vínculo → casoId|clienteId, área é
// uma tag livre. onSave receives a ProjetoFormValue the workspace turns into a
// POST /api/projetos or PATCH /api/projetos/[id].
import { useMemo, useState, type CSSProperties } from "react"
import type { IdNome, TeamMember } from "@/lib/tarefas/types"
import { PROJETO_STATUS, type ProjetoStatus, type ProjetoView, statusProjetoMeta } from "@/lib/projetos/types"
import { Icon } from "@/components/tarefas/tf-icons"
import { AssigneeAvatar, Menu, MenuItem } from "@/components/tarefas/tf-kit"
import {
  COLOR_CHOICES,
  ICON_CHOICES,
  ModalHeader,
  Overlay,
  useAreaOptions,
  fieldCol,
  fieldLbl,
  pickerStyle,
} from "./pj-kit"

export interface ProjetoFormValue {
  id?: number
  nome: string
  descricao: string | null
  status: ProjetoStatus
  area: string | null
  responsavelId: number | null
  prazo: string | null
  cor: string
  icone: string
  casoId: number | null
  clienteId: number | null
}

const modeCard = (on: boolean): CSSProperties => ({
  flex: 1,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "11px 13px",
  borderRadius: 10,
  cursor: "pointer",
  textAlign: "left",
  background: on ? "var(--accent-soft)" : "var(--surface)",
  border: `1px solid ${on ? "var(--border-gold)" : "var(--border)"}`,
})

export function ProjectModal({
  projeto,
  socios,
  casos,
  clientes,
  onClose,
  onSave,
  onDelete,
  onUseTemplate,
}: {
  projeto: ProjetoView | null
  socios: TeamMember[]
  casos: IdNome[]
  clientes: IdNome[]
  onClose: () => void
  onSave: (form: ProjetoFormValue) => void
  onDelete?: (id: number) => void
  onUseTemplate: () => void
}) {
  const isNew = !projeto
  const areaOpts = useAreaOptions()
  const [mode, setMode] = useState<"branco" | "template">("branco")
  const [form, setForm] = useState<ProjetoFormValue>(() => ({
    id: projeto?.id,
    nome: projeto?.nome ?? "",
    descricao: projeto?.descricao ?? null,
    status: projeto?.status ?? "ativo",
    area: projeto?.area ?? "soc",
    responsavelId: projeto?.responsavel?.id ?? null,
    prazo: projeto?.prazo ?? null,
    cor: projeto?.cor ?? "#1F3A6E",
    icone: projeto?.icone ?? "folder",
    casoId: projeto?.vinculo?.tipo === "caso" ? projeto.vinculo.id : null,
    clienteId: projeto?.vinculo?.tipo === "cliente" ? projeto.vinculo.id : null,
  }))
  const set = (p: Partial<ProjetoFormValue>) => setForm((f) => ({ ...f, ...p }))
  const valid = form.nome.trim().length > 0
  const member = form.responsavelId != null ? socios.find((m) => m.id === form.responsavelId) : null
  const vincName =
    form.casoId != null
      ? casos.find((c) => c.id === form.casoId)?.nome
      : form.clienteId != null
        ? clientes.find((c) => c.id === form.clienteId)?.nome
        : null

  return (
    <Overlay onClose={onClose}>
      <ModalHeader
        title={isNew ? "Novo projeto" : "Editar projeto"}
        onClose={onClose}
        icon="layoutGrid"
        sub={isNew ? "Comece em branco ou a partir de um template" : projeto?.nome}
      />

      {isNew && (
        <div style={{ display: "flex", gap: 10, padding: "14px 18px 4px" }}>
          <button onClick={() => setMode("branco")} className="mode-card" style={modeCard(mode === "branco")}>
            <Icon name="plus" size={16} strokeWidth={2} style={{ color: mode === "branco" ? "var(--accent)" : "var(--text-muted)" }} />
            <span>
              <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Começar em branco</span>
              <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>Projeto vazio</span>
            </span>
          </button>
          <button onClick={onUseTemplate} className="mode-card" style={modeCard(false)}>
            <Icon name="copy" size={16} strokeWidth={1.9} style={{ color: "var(--text-muted)" }} />
            <span>
              <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text)" }}>A partir de template</span>
              <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>Tarefas e prazos prontos</span>
            </span>
          </button>
        </div>
      )}

      <div style={{ overflowY: "auto", padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        <label style={fieldCol}>
          <span style={fieldLbl}>Nome do projeto</span>
          <input autoFocus value={form.nome} onChange={(e) => set({ nome: e.target.value })} className="input" placeholder="ex.: Holding Patrimonial — Vargas" />
        </label>
        <label style={fieldCol}>
          <span style={fieldLbl}>Descrição</span>
          <textarea value={form.descricao ?? ""} onChange={(e) => set({ descricao: e.target.value })} className="textarea" style={{ minHeight: 52, fontSize: 13 }} placeholder="Objetivo e escopo do projeto…" />
        </label>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <label style={{ ...fieldCol, flex: "1 1 150px" }}>
            <span style={fieldLbl}>Status</span>
            <Menu
              width={180}
              trigger={
                <span className="picker-btn" style={pickerStyle}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusProjetoMeta(form.status).color }} />
                    {statusProjetoMeta(form.status).label}
                  </span>
                  <Icon name="chevronDown" size={13} />
                </span>
              }
            >
              {(close) => PROJETO_STATUS.map((s) => <MenuItem key={s.id} dot={s.color} label={s.label} active={form.status === s.id} onClick={() => { set({ status: s.id }); close() }} />)}
            </Menu>
          </label>
          <label style={{ ...fieldCol, flex: "1 1 150px" }}>
            <span style={fieldLbl}>Área</span>
            <Menu width={180} trigger={<span className="picker-btn" style={pickerStyle}>{areaOpts.find((a) => a.id === form.area)?.label ?? form.area ?? "—"}<Icon name="chevronDown" size={13} /></span>}>
              {(close) => areaOpts.map((a) => <MenuItem key={a.id} label={a.label} active={form.area === a.id} onClick={() => { set({ area: a.id }); close() }} />)}
            </Menu>
          </label>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <label style={{ ...fieldCol, flex: "1 1 150px" }}>
            <span style={fieldLbl}>Responsável</span>
            <Menu
              width={220}
              trigger={
                <span className="picker-btn" style={pickerStyle}>
                  {member ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                      <AssigneeAvatar id={member.id} size={18} title={false} />
                      {member.nome}
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-subtle)" }}>Não atribuído</span>
                  )}
                  <Icon name="chevronDown" size={13} />
                </span>
              }
            >
              {(close) => (
                <>
                  <MenuItem label="Não atribuído" active={form.responsavelId == null} onClick={() => { set({ responsavelId: null }); close() }} />
                  {socios.map((m) => (
                    <MenuItem key={m.id} label={m.nome} sub={m.role} active={form.responsavelId === m.id} onClick={() => { set({ responsavelId: m.id }); close() }} right={<AssigneeAvatar id={m.id} size={18} title={false} />} />
                  ))}
                </>
              )}
            </Menu>
          </label>
          <label style={{ ...fieldCol, flex: "1 1 150px" }}>
            <span style={fieldLbl}>Prazo-alvo</span>
            <input type="date" value={form.prazo ?? ""} onChange={(e) => set({ prazo: e.target.value || null })} className="dt-input" style={{ height: 40, fontSize: 14 }} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          <div>
            <span style={{ ...fieldLbl, display: "block", marginBottom: 8 }}>Cor</span>
            <div style={{ display: "flex", gap: 8 }}>
              {COLOR_CHOICES.map((c) => (
                <button key={c} onClick={() => set({ cor: c })} style={{ width: 26, height: 26, borderRadius: 8, background: c, border: form.cor === c ? "2px solid var(--text)" : "2px solid transparent", cursor: "pointer", boxShadow: form.cor === c ? "0 0 0 2px var(--bg)" : "none" }} />
              ))}
            </div>
          </div>
          <div>
            <span style={{ ...fieldLbl, display: "block", marginBottom: 8 }}>Ícone</span>
            <div style={{ display: "flex", gap: 6 }}>
              {ICON_CHOICES.map((ic) => (
                <button
                  key={ic}
                  onClick={() => set({ icone: ic })}
                  style={{ width: 32, height: 32, borderRadius: 8, background: form.icone === ic ? "var(--accent-soft)" : "var(--surface)", color: form.icone === ic ? "var(--accent)" : "var(--text-muted)", border: `1px solid ${form.icone === ic ? "var(--border-gold)" : "var(--border-strong)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Icon name={ic} size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <label style={fieldCol}>
          <span style={fieldLbl}>
            Vínculo a caso / cliente <span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>(opcional)</span>
          </span>
          {vincName ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, color: "var(--text-muted)", background: "var(--bg-sunken)", border: "1px solid var(--border)", padding: "5px 10px", borderRadius: 8 }}>
                <Icon name={form.casoId != null ? "briefcase" : "user"} size={13} />
                {vincName}
              </span>
              <button onClick={() => set({ casoId: null, clienteId: null })} className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
                <Icon name="x" size={14} />
              </button>
            </span>
          ) : (
            <Menu
              width={260}
              trigger={
                <span className="picker-btn" style={{ ...pickerStyle, color: "var(--text-subtle)", alignSelf: "flex-start", width: 260 }}>
                  <Icon name="link2" size={14} />
                  Vincular caso / cliente
                  <Icon name="chevronDown" size={13} />
                </span>
              }
            >
              {(close) => (
                <>
                  {casos.map((c) => (
                    <MenuItem key={`caso-${c.id}`} icon="briefcase" label={c.nome} sub="Caso" onClick={() => { set({ casoId: c.id, clienteId: null }); close() }} />
                  ))}
                  {clientes.map((c) => (
                    <MenuItem key={`cli-${c.id}`} icon="user" label={c.nome} sub="Cliente" onClick={() => { set({ clienteId: c.id, casoId: null }); close() }} />
                  ))}
                  {!casos.length && !clientes.length && <div style={{ fontSize: 12, color: "var(--text-subtle)", padding: "8px 9px" }}>Nenhum caso/cliente.</div>}
                </>
              )}
            </Menu>
          )}
        </label>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
        {!isNew && onDelete && projeto && (
          <button className="btn btn-ghost" onClick={() => onDelete(projeto.id)} style={{ height: 38, color: "var(--crit)" }}>
            <Icon name="trash2" size={14} strokeWidth={1.9} />
            Excluir
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={onClose} className="btn btn-ghost" style={{ height: 38 }}>Cancelar</button>
        <button onClick={() => valid && onSave(form)} disabled={!valid} className="btn btn-primary" style={{ height: 38, opacity: valid ? 1 : 0.5 }}>
          {isNew ? "Criar projeto" : "Salvar"}
        </button>
      </div>
    </Overlay>
  )
}
