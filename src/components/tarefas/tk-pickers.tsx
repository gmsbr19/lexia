"use client"

// Tarefas — seletor de data do app (texto livre + atalhos + mini calendário; SEM
// "Sem prazo": toda tarefa tem prazo), seletor de cliente com busca, menu de
// propriedade genérico e "Repetir".
import { useState } from "react"
import { addMonthIndex, buildMonthGrid, MONTHS_LONG } from "@/lib/datas/mes"
import { recorrenciaOptions } from "@/lib/datas/recorrencia"
import { normalizar } from "@/lib/text"
import {
  dataCurta,
  dataLonga,
  diaSemana3,
  interpretarData,
  proximaSegunda,
  proximaSexta,
  rotuloPrazo,
} from "@/lib/tarefas/regras"
import { addDays } from "@/lib/datas/util"
import { Icon, type TfIconName } from "./tf-icons"
import { useTk } from "./tk-context"
import { TkDialog, TkDot, TkIconBtn, TkMenuItem, TkMenuSep, TkPop, usePop } from "./tk-ui"

// ── mini calendário ──────────────────────────────────────────────────────────
const DIAS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]

export function TkMiniCal({ value, onPick }: { value: string | null; onPick: (iso: string) => void }) {
  const { hoje } = useTk()
  const base = value ?? hoje
  const [cur, setCur] = useState({ ano: +base.slice(0, 4), mes0: +base.slice(5, 7) - 1 })
  const grade = buildMonthGrid(cur.ano, cur.mes0, hoje)
  // sem as semanas finais que são todas do mês seguinte — o menu não precisa rolar
  let n = grade.length
  while (n > 28 && grade.slice(n - 7, n).every((c) => c.foraDoMes)) n -= 7
  const cells = grade.slice(0, n)
  const passo = (d: number) => setCur((c) => addMonthIndex(c.ano, c.mes0, d))
  return (
    <div style={{ padding: "4px 4px 2px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 6px" }}>
        <TkIconBtn icon="chevronLeft" title="Mês anterior" size={15} onClick={() => passo(-1)} />
        <span style={{ fontSize: 14, fontWeight: 500 }}>
          {MONTHS_LONG[cur.mes0]} {cur.ano}
        </span>
        <TkIconBtn icon="chevronRight" title="Próximo mês" size={15} onClick={() => passo(1)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 2 }}>
        {DIAS.map((d) => (
          <span key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 500, letterSpacing: "0.02em", color: "var(--text-muted)", padding: "2px 0 6px" }}>
            {d}
          </span>
        ))}
        {cells.map((c) => (
          <button
            type="button"
            key={c.iso}
            onClick={() => onPick(c.iso)}
            aria-label={dataLonga(c.iso)}
            className={"tk-calday" + (c.iso === value ? " sel" : "") + (c.hoje ? " today" : "") + (c.foraDoMes ? " out" : "")}
          >
            {c.dia}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── seletor de data ──────────────────────────────────────────────────────────
export function TkDatePop({
  value,
  onChange,
  late,
  align = "left",
  up,
  chip,
  fatal,
  onFatal,
}: {
  value: string
  onChange: (iso: string) => void
  late?: boolean
  align?: "left" | "right"
  up?: boolean
  /** Campo em pílula (detalhe estilo Trello): data + selo Vencida/Hoje/… */
  chip?: boolean
  /** Prazo fatal: a pílula ganha a bandeira vermelha e o menu, a opção de marcar. */
  fatal?: boolean
  onFatal?: (v: boolean) => void
}) {
  const { hoje } = useTk()
  const pop = usePop()
  const [txt, setTxt] = useState("")
  const preview = txt ? interpretarData(txt, hoje) : null
  const atalhos: [TfIconName, string, string][] = [
    ["sun", "Hoje", hoje],
    ["sunrise", "Amanhã", addDays(hoje, 1)],
    ["calendarDay", "Sexta", proximaSexta(hoje)],
    ["calendarRange", "Próx. semana", proximaSegunda(hoje)],
  ]
  const fechar = () => {
    pop.close()
    setTxt("")
  }
  const commit = (iso: string) => {
    onChange(iso)
    fechar()
  }
  const rel = rotuloPrazo(value, hoje)
  const hojeMesmo = value === hoje
  return (
    <span style={chip ? { display: "inline-flex", minWidth: 0 } : { flex: 1, minWidth: 0, display: "flex" }}>
      {chip ? (
        <button type="button" className={"tk-fchip" + (fatal ? " fatal" : "")} onClick={pop.toggle} title={fatal ? "Prazo fatal" : undefined}>
          <Icon name={fatal ? "flag" : "calendar"} size={14} style={{ flexShrink: 0, color: fatal ? undefined : "var(--text-muted)" }} />
          <span>{dataCurta(value)}</span>
          {late ? (
            <span className="tk-badge crit">Vencida</span>
          ) : hojeMesmo ? (
            <span className="tk-badge warn">Hoje</span>
          ) : (
            !/^\d/.test(rel) && <span className="tk-badge">{rel}</span>
          )}
          <Icon name="chevronDown" size={13} style={{ flexShrink: 0, color: "var(--text-muted)" }} />
        </button>
      ) : (
        <button
          type="button"
          className="tk-prop-val"
          onClick={pop.toggle}
          style={{ color: late ? "var(--crit)" : undefined, fontWeight: late ? 500 : 400 }}
        >
          <Icon name="calendar" size={13} style={{ flexShrink: 0, color: late ? undefined : "var(--text-muted)" }} />
          <span>{dataCurta(value)}</span>
          {!/^\d/.test(rel) && (
            <span style={{ fontSize: 12, color: late ? undefined : "var(--text-muted)", fontWeight: 400 }}>{rel}</span>
          )}
        </button>
      )}
      <TkPop open={pop.open} onClose={fechar} anchor={pop.anchor} width={300} align={align} up={up} alto>
        <div style={{ padding: 4 }}>
          <input
            autoFocus
            className="input"
            placeholder="Data"
            aria-label="Data"
            value={txt}
            onChange={(e) => setTxt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && preview) commit(preview)
            }}
          />
          {txt && (
            <div style={{ fontSize: 12, color: preview ? "var(--accent)" : "var(--text-muted)", padding: "6px 2px 0" }}>
              {preview ? `→ ${dataLonga(preview)}` : "Não reconhecido"}
            </div>
          )}
        </div>
        <div className="tk-atalhos">
          {atalhos.map(([ic, l, iso]) => (
            <button type="button" key={l} className={"tk-atalho" + (value === iso ? " on" : "")} onClick={() => commit(iso)}>
              <Icon name={ic} size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis" }}>{l}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{diaSemana3(iso)}</span>
            </button>
          ))}
        </div>
        <div style={{ height: 1, background: "var(--border)", margin: "6px -4px 6px" }} />
        <TkMiniCal value={value} onPick={commit} />
        {onFatal && (
          <>
            <TkMenuSep />
            <TkMenuItem icon="flag" checked={!!fatal} onClick={() => onFatal(!fatal)}>
              Prazo fatal
            </TkMenuItem>
          </>
        )}
      </TkPop>
    </span>
  )
}

// ── cliente ──────────────────────────────────────────────────────────────────
export function TkClientPicker({
  value,
  onChange,
  herdado,
  field,
  chip,
}: {
  value: number | null
  onChange: (id: number | null) => void
  herdado?: boolean
  field?: boolean
  chip?: boolean
}) {
  const { clientes, cliente } = useTk()
  const pop = usePop()
  const [q, setQ] = useState("")
  const c = cliente(value)
  if (herdado) {
    return (
      <span className={chip ? "tk-fchip ro" : "tk-prop-val ro"} title={c?.nome ?? ""}>
        <span>{c?.nome ?? "—"}</span>
        <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>pelo projeto</span>
      </span>
    )
  }
  const nq = normalizar(q)
  const lista = (nq ? clientes.filter((x) => normalizar(x.nome).includes(nq)) : clientes).slice(0, 60)
  const fechar = () => {
    pop.close()
    setQ("")
  }
  return (
    <span style={chip ? { display: "inline-flex", minWidth: 0 } : { flex: 1, minWidth: 0, display: "flex" }}>
      <button
        type="button"
        className={field ? "input tk-field-btn" : chip ? "tk-fchip" + (c ? "" : " muted") : "tk-prop-val" + (c ? "" : " muted")}
        onClick={pop.toggle}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", textAlign: "left", color: c ? "var(--text)" : "var(--text-muted)" }}>
          {c ? c.nome : "Sem cliente"}
        </span>
        {field && <Icon name="chevronDown" size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
      </button>
      <TkPop open={pop.open} onClose={fechar} anchor={pop.anchor} width={field ? 360 : 280}>
        <input className="input" autoFocus placeholder="Buscar" aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 3 }} />
        <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
          {lista.map((x) => (
            <TkMenuItem
              key={x.id}
              checked={x.id === value}
              onClick={() => {
                fechar()
                if (x.id !== value) onChange(x.id)
              }}
            >
              {x.nome}
            </TkMenuItem>
          ))}
          {!lista.length && <div style={{ padding: "6px 10px", fontSize: 12, color: "var(--text-muted)" }}>Nenhum cliente</div>}
          <TkMenuSep />
          <TkMenuItem
            checked={value == null}
            onClick={() => {
              fechar()
              if (value != null) onChange(null)
            }}
          >
            Sem cliente
          </TkMenuItem>
        </div>
      </TkPop>
    </span>
  )
}

// ── menu de propriedade genérico ─────────────────────────────────────────────
export interface OpcaoMenu<T> {
  id: T
  label: string
  dot?: string
}

export function TkPropMenu<T extends string | number | null>({
  value,
  options,
  onPick,
  muted,
  width = 220,
  chip,
  acao,
}: {
  value: T
  options: OpcaoMenu<T>[]
  onPick: (v: T) => void
  muted?: boolean
  width?: number
  chip?: boolean
  /** Item extra no fim do menu (ex.: "Novo projeto…"), abre uma janela de criação. */
  acao?: { label: string; onClick: () => void }
}) {
  const pop = usePop()
  const cur = options.find((o) => o.id === value)
  return (
    <span style={chip ? { display: "inline-flex", minWidth: 0 } : { position: "relative", minWidth: 0, flex: 1, display: "flex" }}>
      <button type="button" className={(chip ? "tk-fchip" : "tk-prop-val") + (muted || !cur ? " muted" : "")} onClick={pop.toggle}>
        {cur?.dot && <TkDot color={cur.dot} />}
        <span>{cur ? cur.label : "—"}</span>
      </button>
      <TkPop open={pop.open} onClose={pop.close} anchor={pop.anchor} width={width}>
        {options.map((o) => (
          <TkMenuItem
            key={String(o.id)}
            dot={o.dot}
            checked={o.id === value}
            onClick={() => {
              pop.close()
              if (o.id !== value) onPick(o.id)
            }}
          >
            {o.label}
          </TkMenuItem>
        ))}
        {acao && (
          <>
            <TkMenuSep />
            <TkMenuItem
              icon="plus"
              onClick={() => {
                pop.close()
                acao.onClick()
              }}
            >
              {acao.label}
            </TkMenuItem>
          </>
        )}
      </TkPop>
    </span>
  )
}

/** Grupos já usados no projeto (ordem natural: "Protocolo 2" antes de "Protocolo 10"). */
export function useGruposDoProjeto(projetoId: number | null): string[] {
  const { tarefas } = useTk()
  if (projetoId == null) return []
  return [...new Set(tarefas.filter((x) => x.projetoId === projetoId && x.grupo).map((x) => x.grupo!))].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { numeric: true }),
  )
}

/** Janela "Novo grupo": o grupo é só um nome dentro do projeto — sai já aplicado. */
export function TkGrupoDialog({ onClose, onSalvar }: { onClose: () => void; onSalvar: (nome: string) => void }) {
  const [nome, setNome] = useState("")
  const salvar = () => {
    if (!nome.trim()) return
    onSalvar(nome.trim())
    onClose()
  }
  return (
    <TkDialog
      title="Novo grupo"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" disabled={!nome.trim()} onClick={salvar}>
            Criar
          </button>
        </>
      }
    >
      <input
        className="input"
        autoFocus
        placeholder="Grupo"
        aria-label="Grupo"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        style={{ color: "var(--text)" }}
        onKeyDown={(e) => {
          if (e.key === "Enter") salvar()
        }}
      />
    </TkDialog>
  )
}

/** Opções de responsável: pessoas + "Sem responsável" (id null). `eu` marca "(eu)". */
export function useOpcoesPessoa(marcarEu = false): OpcaoMenu<number | null>[] {
  const { pessoas, meId } = useTk()
  return [
    ...pessoas.map((p) => ({ id: p.id as number | null, label: marcarEu && p.id === meId ? `${p.first} (eu)` : p.nome })),
    { id: null, label: "Sem responsável" },
  ]
}

/** Opções de projeto (ativos) + "Sem projeto". */
export function useOpcoesProjeto(): OpcaoMenu<number | null>[] {
  const { projetosAtivos } = useTk()
  return [
    ...projetosAtivos.map((p) => ({ id: p.id as number | null, label: p.nomeCurto, dot: p.cor })),
    { id: null, label: "Sem projeto", dot: "var(--text-subtle)" },
  ]
}

// ── repetir ──────────────────────────────────────────────────────────────────
export function TkRecurMenu({
  value,
  prazo,
  onChange,
  chip,
}: {
  value: string | null
  prazo: string
  onChange: (v: string | null) => void
  chip?: boolean
}) {
  const opcoes = recorrenciaOptions(prazo).map((l) => ({ id: l === "Não repete" ? null : l, label: l }))
  const atual = value && !opcoes.some((o) => o.id === value) ? [{ id: value, label: value }] : []
  return (
    <TkPropMenu<string | null>
      value={value}
      options={[...atual, ...opcoes]}
      onPick={onChange}
      muted={!value}
      width={200}
      chip={chip}
    />
  )
}
