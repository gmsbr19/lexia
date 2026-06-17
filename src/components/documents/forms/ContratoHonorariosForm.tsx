"use client"

import { useState, useCallback } from "react"
import { Plus, Trash2, Check, ChevronDown, RotateCcw } from "lucide-react"
import { tokens } from "@/styles/tokens.css"
import {
  CLAUSULAS_GERAIS, CLAUSULAS_COMPROMISSO, CLAUSULAS_EDITAVEIS,
  resolveClausula, isClausulaOverridden, setClausulaOverride, clearClausulaOverride,
} from "@/lib/documents/generators/contrato-honorarios/clausulas"
import * as styles from "./ContratoHonorariosForm.css"
import {
  FormField, SelectField, TextAreaField,
  Grid, Divider, AddressForm,
  inputStyle, labelStyle,
  ESTADOS_CIVIS, emptyAddr, composeEndereco, todayISO, isoToExtensa,
  type AddrState,
} from "./shared"
import * as Accordion from "@radix-ui/react-accordion"
import * as accStyles from "./Accordion.css"
import * as fieldStyles from "./Fields.css"
import { ClientePicker } from "./ClientePicker"
import type {
  ContratoHonorariosData, Contratante, ContratantePF, ContratantePJ,
  SocioPJ, TipoHonorarios, Parcela,
} from "@/lib/types/contrato-honorarios"
import {
  newContratantePF, newContratantePJ, newSocioPJ,
  newHonorarios, newContratoData,
} from "@/lib/types/contrato-honorarios"

export { newContratoData }

// ── field completion counter ───────────────────────────────────────────────────

export function countFields(data: ContratoHonorariosData): { total: number; filled: number } {
  const vals: string[] = []
  for (const c of data.contratantes) {
    if (c.tipo === "pf") {
      vals.push(c.nome, c.nacionalidade, c.estadoCivil, c.profissao, c.rg, c.cpf, c.endereco, c.email)
    } else {
      vals.push(c.razaoSocial, c.cnpj, c.endereco, c.email)
      for (const s of c.socios) vals.push(s.nome, s.nacionalidade, s.estadoCivil, s.profissao, s.rg, s.cpf)
    }
  }
  vals.push(data.objeto)
  const h = data.honorarios
  if (h.tipo === "avista") vals.push(h.valorTotal, h.dataPagamento)
  else if (h.tipo === "parcelado") vals.push(h.valorTotal, h.qtParcelas, h.valorParcelas, h.dataPrimeiraParcela)
  else if (h.tipo === "parcelas_diferentes") for (const p of h.parcelas) vals.push(p.valor, p.vencimento)
  else if (h.tipo === "exito") vals.push(h.percentual, h.baseCalculo)
  else if (h.tipo === "avista_exito") vals.push(h.valorTotal, h.dataPagamento, h.percentualExito, h.baseCalculoExito)
  else if (h.tipo === "parcelado_exito") vals.push(h.valorTotal, h.qtParcelas, h.valorParcelas, h.dataPrimeiraParcela, h.percentualExito, h.baseCalculoExito)
  vals.push(data.foro, data.data)
  return { total: vals.length, filled: vals.filter(Boolean).length }
}

// ── sub-components ─────────────────────────────────────────────────────────────

// Small presentational primitives ported from the design prototype
function AddButtonComp({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} style={styles.addButton}>
      {children}
    </button>
  )
}

function ContratanteStrip({ items, active = 0, onAdd, addLabel, onSelect }: { items: string[]; active?: number; onAdd?: () => void; addLabel?: string; onSelect?: (i: number) => void }) {
  return (
    <div style={styles.contratanteStrip}>
      {items.map((it, i) => {
        const isActive = i === active
        return (
          <div key={i} onClick={() => onSelect?.(i)} style={{ ...(styles.contratanteChip as React.CSSProperties), ...(isActive ? styles.contratanteChipActive : {}) }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: isActive ? tokens.color.accentStrong : tokens.color.surface, color: isActive ? "#fff" : tokens.color.textSubtle, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, fontFeatureSettings: '"tnum"' }}>{i + 1}</div>
            <div>{it}</div>
          </div>
        )
      })}
      <button type="button" onClick={onAdd} style={styles.contratanteAddButton}>
        <Plus size={12} /> {addLabel ?? "Adicionar contratante"}
      </button>
    </div>
  )
}

function MicroSeg({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={styles.microSegContainer}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <div key={opt.value} onClick={() => onChange(opt.value)} style={active ? styles.microSegOptionActive : styles.microSegOptionInactive}>
            {opt.label}
          </div>
        )
      })}
    </div>
  )
}


function RepeaterItemComp({ index, title, onRemove, removable = true, children }: { index: number; title: string; onRemove?: () => void; removable?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ paddingBottom: 16, marginBottom: 16, borderBottom: `1px solid ${tokens.color.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: tokens.color.accentSoft, color: tokens.color.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, fontFeatureSettings: '"tnum"' }}>{index}</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: tokens.color.text, letterSpacing: "-0.005em" }}>{title}</div>
        </div>
        {removable && (
          <button type="button" onClick={onRemove} style={styles.removeButton}><Trash2 size={11} /> Remover</button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </div>
  )
}

const ASSINATURA_VALUE = "na data de assinatura do contrato"

function DateOrAssinaturaField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const isAssinatura = value === ASSINATURA_VALUE
  return (
    <div>
      <label className={fieldStyles.label} style={{ marginBottom: 6 }}>{label}</label>
      <div style={styles.dateFieldRow}>
        {isAssinatura ? (
          <div style={styles.dateDisplayActive}>
            <Check size={12} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              No ato da assinatura
            </span>
          </div>
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={fieldStyles.input}
            style={{ flex: 1, width: "auto" }}
          />
        )}
        <button
          type="button"
          onClick={() => onChange(isAssinatura ? "" : ASSINATURA_VALUE)}
          style={isAssinatura ? styles.dateToggleActive : styles.dateToggleInactive}
        >Na assinatura</button>
      </div>
    </div>
  )
}

function DateSignatureField({ onChange }: { onChange: (v: string) => void }) {
  const [iso, setIso] = useState<string>(todayISO)
  return (
    <div>
      <label className={fieldStyles.label}>Data de assinatura</label>
      <input
        type="date" value={iso}
        onChange={(e) => { setIso(e.target.value); onChange(isoToExtensa(e.target.value)) }}
        style={styles.dateInput as React.CSSProperties}
      />
      {iso && <div style={styles.dateIsoText}>{isoToExtensa(iso)}</div>}
    </div>
  )
}

function SocioForm({ socio, onChange, onRemove, index, canRemove }: {
  socio: SocioPJ; onChange: (patch: Partial<SocioPJ>) => void
  onRemove: () => void; index: number; canRemove: boolean
}) {
  return (
    <div style={styles.smallCard}>
      <div style={styles.repeaterHeader}>
        <div style={styles.repeaterHeaderLeft}>
          <div style={styles.repeaterBadge}>{index + 1}</div>
          <span style={styles.repeaterTitle}>Sócio {index + 1}</span>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} style={styles.removeButton}>
            <Trash2 size={11} /> Remover
          </button>
        )}
      </div>
      <FormField label="Nome completo" value={socio.nome} onChange={(v) => onChange({ nome: v.toUpperCase() })} placeholder="NOME DO SÓCIO" />
      <div>
        <div style={styles.subLabel}>Gênero</div>
        <MicroSeg
          options={[{ value: "masculino", label: "M" }, { value: "feminino", label: "F" }]}
          value={socio.genero} onChange={(v) => onChange({ genero: v as "masculino" | "feminino" })}
        />
      </div>
      <Grid cols={2}>
        <FormField label="Nacionalidade" value={socio.nacionalidade} onChange={(v) => onChange({ nacionalidade: v })} placeholder="brasileiro(a)" />
        <SelectField label="Estado civil" value={socio.estadoCivil} onChange={(v) => onChange({ estadoCivil: v })} options={ESTADOS_CIVIS[socio.genero]} />
      </Grid>
      <FormField label="Profissão" value={socio.profissao} onChange={(v) => onChange({ profissao: v })} placeholder="advogado(a)" />
      <Grid cols={2}>
        <FormField label="RG" value={socio.rg} onChange={(v) => onChange({ rg: v })} placeholder="00.000.000-0" />
        <FormField label="CPF" value={socio.cpf} onChange={(v) => onChange({ cpf: v })} placeholder="000.000.000-00" />
      </Grid>
    </div>
  )
}

function ContratanteForm({ contratante, onChange, onRemove, index, canRemove }: {
  contratante: Contratante; onChange: (c: Contratante) => void
  onRemove: () => void; index: number; canRemove: boolean
}) {
  const [addr, setAddr] = useState<AddrState>(emptyAddr)

  function patchPF(patch: Partial<ContratantePF>) {
    if (contratante.tipo === "pf") onChange({ ...contratante, ...patch })
  }
  function patchPJ(patch: Partial<ContratantePJ>) {
    if (contratante.tipo === "pj") onChange({ ...contratante, ...patch })
  }
  function updateAddr(field: keyof AddrState, val: string) {
    const newAddr = { ...addr, [field]: val }
    setAddr(newAddr)
    onChange({ ...contratante, endereco: composeEndereco(newAddr) })
  }

  return (
    <div style={styles.card}>
      <div style={styles.rowBetween}>
        <span style={styles.contratanteTitle}>
          {index === 0 ? "Contratante" : `Contratante ${index + 1}`}
        </span>
        {canRemove && (
          <button type="button" onClick={onRemove} style={styles.iconButton}>
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Identity row: Pessoa (F/J) + Gênero (M/F) for PF */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={styles.subLabel}>Pessoa</div>
          <MicroSeg
            options={[{ value: "pf", label: "F" }, { value: "pj", label: "J" }]}
            value={contratante.tipo}
            onChange={(v) => { if (v !== contratante.tipo) onChange(v === "pf" ? newContratantePF() : newContratantePJ()) }}
          />
        </div>
        {contratante.tipo === "pf" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={styles.subLabel}>Gênero</div>
            <MicroSeg
              options={[{ value: "masculino", label: "M" }, { value: "feminino", label: "F" }]}
              value={(contratante as ContratantePF).genero}
              onChange={(v) => patchPF({ genero: v as "masculino" | "feminino" })}
            />
          </div>
        )}
      </div>

      {contratante.tipo === "pf" ? (
        <>
          <FormField label="Nome completo" value={contratante.nome} onChange={(v) => patchPF({ nome: v.toUpperCase() })} placeholder="NOME DO CONTRATANTE" />
          <Grid cols={2}>
            <FormField label="Nacionalidade" value={contratante.nacionalidade} onChange={(v) => patchPF({ nacionalidade: v })} placeholder="brasileiro(a)" />
            <SelectField label="Estado civil" value={contratante.estadoCivil} onChange={(v) => patchPF({ estadoCivil: v })} options={ESTADOS_CIVIS[contratante.genero]} />
          </Grid>
          <FormField label="Profissão" value={contratante.profissao} onChange={(v) => patchPF({ profissao: v })} placeholder="empresário(a)" />
          <Grid cols={2}>
            <FormField label="RG" value={contratante.rg} onChange={(v) => patchPF({ rg: v })} placeholder="00.000.000-0" />
            <FormField label="CPF" value={contratante.cpf} onChange={(v) => patchPF({ cpf: v })} placeholder="000.000.000-00" />
          </Grid>
          <AddressForm addr={addr} onChange={updateAddr} />
          <FormField label="E-mail" value={contratante.email} onChange={(v) => patchPF({ email: v })} placeholder="contato@email.com" type="email" />
        </>
      ) : (
        <>
          <FormField label="Razão social" value={contratante.razaoSocial} onChange={(v) => patchPJ({ razaoSocial: v.toUpperCase() })} placeholder="EMPRESA LTDA." />
          <FormField label="CNPJ" value={contratante.cnpj} onChange={(v) => patchPJ({ cnpj: v })} placeholder="00.000.000/0001-00" />
          <FormField label="E-mail" value={contratante.email} onChange={(v) => patchPJ({ email: v })} placeholder="contato@empresa.com" type="email" />
          <AddressForm addr={addr} onChange={updateAddr} />
          <Divider label="Sócios representantes" />
          {contratante.socios.map((s, si) => (
            <SocioForm
              key={si} index={si} socio={s} canRemove={contratante.socios.length > 1}
              onChange={(patch) => patchPJ({ socios: contratante.socios.map((x, xi) => xi === si ? { ...x, ...patch } : x) })}
              onRemove={() => patchPJ({ socios: contratante.socios.filter((_, xi) => xi !== si) })}
            />
          ))}
          <AddButtonComp onClick={() => patchPJ({ socios: [...contratante.socios, newSocioPJ()] })}>
            <Plus size={13} /> Adicionar sócio
          </AddButtonComp>
        </>
      )}
    </div>
  )
}

const TIPO_LABELS: { value: TipoHonorarios; label: string }[] = [
  { value: "avista", label: "À vista" },
  { value: "parcelado", label: "Parcelado" },
  { value: "parcelas_diferentes", label: "Parcelas variadas" },
  { value: "exito", label: "Êxito puro" },
  { value: "avista_exito", label: "À vista + Êxito" },
  { value: "parcelado_exito", label: "Parcelado + Êxito" },
]

function HonorariosForm({ data, onChange }: { data: ContratoHonorariosData; onChange: (data: ContratoHonorariosData) => void }) {
  const h = data.honorarios
  function patch(p: object) {
    onChange({ ...data, honorarios: { ...h, ...p } as ContratoHonorariosData["honorarios"] })
  }
  function changeType(tipo: TipoHonorarios) {
    onChange({ ...data, honorarios: newHonorarios(tipo) })
  }

  const parceladoFields = (valorTotal: string, qtParcelas: string, valorParcelas: string, dataPrimeiraParcela: string) => (
    <>
      <FormField label="Valor total dos honorários" value={valorTotal} onChange={(v) => patch({ valorTotal: v })} placeholder="R$ 0,00" />
      <Grid cols={2}>
        <FormField label="Número de parcelas" value={qtParcelas} onChange={(v) => patch({ qtParcelas: v })} placeholder="3" />
        <FormField label="Valor por parcela" value={valorParcelas} onChange={(v) => patch({ valorParcelas: v })} placeholder="R$ 0,00" />
      </Grid>
      <DateOrAssinaturaField label="Data da primeira parcela" value={dataPrimeiraParcela} onChange={(v) => patch({ dataPrimeiraParcela: v })} placeholder="01/01/2026" />
    </>
  )
  const exitoFields = (percentualExito: string, baseCalculoExito: string) => (
    <>
      <Divider label="Êxito" />
      <Grid cols={2}>
        <FormField label="Percentual" value={percentualExito} onChange={(v) => patch({ percentualExito: v })} placeholder="20" suffix="%" />
        <FormField label="Base de cálculo" value={baseCalculoExito} onChange={(v) => patch({ baseCalculoExito: v })} placeholder="valor da condenação" />
      </Grid>
    </>
  )

  return (
    <div style={{ ...styles.card, gap: 16 }}>
      <div>
        <label className={fieldStyles.label}>Tipo de honorários</label>
        <div style={{ position: "relative" }}>
          <select
            value={h.tipo}
            onChange={(e) => changeType(e.target.value as TipoHonorarios)}
            className={fieldStyles.input}
            style={{ paddingRight: 28 }}
          >
            {TIPO_LABELS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      {h.tipo === "avista" && (
        <Grid cols={2}>
          <FormField label="Valor total dos honorários" value={h.valorTotal} onChange={(v) => patch({ valorTotal: v })} placeholder="R$ 0,00" />
          <DateOrAssinaturaField label="Data de pagamento" value={h.dataPagamento} onChange={(v) => patch({ dataPagamento: v })} placeholder="01/01/2026" />
        </Grid>
      )}
      {h.tipo === "parcelado" && parceladoFields(h.valorTotal, h.qtParcelas, h.valorParcelas, h.dataPrimeiraParcela)}
      {h.tipo === "parcelas_diferentes" && (
        <>
          {h.parcelas.map((p: Parcela, i: number) => (
            <RepeaterItemComp key={i} index={i + 1} title={`Parcela ${i + 1}`} onRemove={h.parcelas.length > 1 ? () => patch({ parcelas: h.parcelas.filter((_: Parcela, xi: number) => xi !== i) }) : undefined} removable={h.parcelas.length > 1}>
              <div style={styles.parcelRow}>
                <div style={styles.parcelFlex}>
                  <FormField label={`Parcela ${i + 1} — valor`} value={p.valor}
                    onChange={(v) => patch({ parcelas: h.parcelas.map((x, xi) => xi === i ? { ...x, valor: v } : x) })} placeholder="R$ 0,00" />
                </div>
                <div style={styles.parcelFlex}>
                  <FormField label="Vencimento" value={p.vencimento}
                    onChange={(v) => patch({ parcelas: h.parcelas.map((x, xi) => xi === i ? { ...x, vencimento: v } : x) })} placeholder="01/01/2026" />
                </div>
              </div>
            </RepeaterItemComp>
          ))}
          <button type="button" onClick={() => patch({ parcelas: [...h.parcelas, { valor: "", vencimento: "" }] })}
            style={styles.addButton}>
            <Plus size={13} /> Adicionar parcela
          </button>
        </>
      )}
      {h.tipo === "exito" && (
        <Grid cols={2}>
          <FormField label="Percentual de êxito" value={h.percentual} onChange={(v) => patch({ percentual: v })} placeholder="20" suffix="%" />
          <FormField label="Base de cálculo" value={h.baseCalculo} onChange={(v) => patch({ baseCalculo: v })} placeholder="valor da condenação" />
        </Grid>
      )}
      {h.tipo === "avista_exito" && (
        <>
          <Grid cols={2}>
            <FormField label="Valor dos honorários fixos" value={h.valorTotal} onChange={(v) => patch({ valorTotal: v })} placeholder="R$ 0,00" />
            <DateOrAssinaturaField label="Data de pagamento" value={h.dataPagamento} onChange={(v) => patch({ dataPagamento: v })} placeholder="01/01/2026" />
          </Grid>
          {exitoFields(h.percentualExito, h.baseCalculoExito)}
        </>
      )}
      {h.tipo === "parcelado_exito" && (
        <>
          {parceladoFields(h.valorTotal, h.qtParcelas, h.valorParcelas, h.dataPrimeiraParcela)}
          {exitoFields(h.percentualExito, h.baseCalculoExito)}
        </>
      )}
    </div>
  )
}

// ── clauses (free-text override of the standard prose clauses) ──────────────────

function ClausulasSection({ data, onChange }: { data: ContratoHonorariosData; onChange: (data: ContratoHonorariosData) => void }) {
  const groups = [
    { label: "Disposições gerais", defs: CLAUSULAS_GERAIS },
    { label: "Compromisso e despesas", defs: CLAUSULAS_COMPROMISSO },
  ]
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 11, color: tokens.color.textSubtle, lineHeight: 1.5 }}>
        Texto padrão do escritório. Edite para ajustar este contrato — a LexIA também pode reescrever as cláusulas.
      </div>
      {groups.map((g) => (
        <div key={g.label} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Divider label={g.label} />
          {g.defs.map((def) => {
            const overridden = isClausulaOverridden(data, def.id)
            return (
              <div key={def.id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                  <label className={fieldStyles.label}>{def.titulo}</label>
                  {overridden && (
                    <button
                      type="button"
                      onClick={() => onChange(clearClausulaOverride(data, def.id))}
                      style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 500, color: tokens.color.accent, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <RotateCcw size={11} /> Restaurar padrão
                    </button>
                  )}
                </div>
                <textarea
                  className={fieldStyles.textarea}
                  value={resolveClausula(data, def)}
                  onChange={(e) => onChange(setClausulaOverride(data, def.id, e.target.value))}
                  rows={4}
                />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── main form component ────────────────────────────────────────────────────────

export interface ContratoHonorariosFormProps {
  data: ContratoHonorariosData
  onChange: (data: ContratoHonorariosData) => void
  templateName?: string
  onChangeTemplate?: () => void
  /** Linked cliente id (from the picker), surfaced up to the editor for generate/fechar. */
  clienteId?: number | null
  onClienteChange?: (id: number | null, nome?: string) => void
}

export function ContratoHonorariosForm({ data, onChange, templateName, onChangeTemplate, clienteId = null, onClienteChange }: ContratoHonorariosFormProps) {
  const { total, filled } = countFields(data)
  const pending = total - filled
  const progress = Math.round((filled / total) * 100)

  const [activeContratante, setActiveContratante] = useState(0)

  function sec(vals: string[]) {
    const f = vals.filter(Boolean).length
    return { complete: f === vals.length, completion: `${f} / ${vals.length}` }
  }

  const partesVals: string[] = data.contratantes.flatMap((c) =>
    c.tipo === "pf"
      ? [c.nome, c.nacionalidade, c.estadoCivil, c.profissao, c.rg, c.cpf, c.endereco, c.email]
      : [c.razaoSocial, c.cnpj, c.endereco, c.email, ...c.socios.flatMap((s) => [s.nome, s.nacionalidade, s.estadoCivil, s.profissao, s.rg, s.cpf])]
  )
  const partesSec = sec(partesVals)

  const objetoSec = sec([data.objeto])

  const hVals = (() => {
    const h = data.honorarios
    if (h.tipo === "avista") return [h.valorTotal, h.dataPagamento]
    if (h.tipo === "parcelado") return [h.valorTotal, h.qtParcelas, h.valorParcelas, h.dataPrimeiraParcela]
    if (h.tipo === "parcelas_diferentes") return h.parcelas.flatMap((p: Parcela) => [p.valor, p.vencimento])
    if (h.tipo === "exito") return [h.percentual, h.baseCalculo]
    if (h.tipo === "avista_exito") return [h.valorTotal, h.dataPagamento, h.percentualExito, h.baseCalculoExito]
    if (h.tipo === "parcelado_exito") return [h.valorTotal, h.qtParcelas, h.valorParcelas, h.dataPrimeiraParcela, h.percentualExito, h.baseCalculoExito]
    return []
  })()
  const honorariosSec = sec(hVals)

  const foroSec = sec([data.foro, data.data])

  const clausulasEditadas = CLAUSULAS_EDITAVEIS.filter((c) => isClausulaOverridden(data, c.id)).length

  const updateContratante = useCallback((idx: number, c: Contratante) => {
    onChange({ ...data, contratantes: data.contratantes.map((x, i) => i === idx ? c : x) })
  }, [data, onChange])

  return (
    <div style={styles.containerRoot}>
      {/* Scrollable area: header + accordion */}
      <div style={styles.formBody}>
        {/* Model header (inside scroll) */}
        <div style={styles.header}>
          <div>
            <div style={styles.modelSubtitle}>Modelo ativo</div>
            <div style={styles.modelTitle}>{templateName ?? "Honorários — Padrão"}</div>
          </div>
          {onChangeTemplate && (
            <button type="button" onClick={onChangeTemplate} style={styles.changeModelButton}>
              Trocar modelo
            </button>
          )}
        </div>
        <div style={styles.headerHairline} />

        {/* Form sections as Radix accordion */}
        <Accordion.Root className={accStyles.root} type="single" defaultValue="cliente" collapsible>
          <Accordion.Item className={accStyles.item} value="cliente">
            <Accordion.Trigger className={accStyles.trigger}>
              <div className={accStyles.headerLeft}>
                <div className={accStyles.title}>Cliente</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {partesSec.completion && (
                  <div className={accStyles.badge} style={partesSec.complete ? { background: tokens.brand.gold, color: tokens.brand.navy, border: `1px solid ${tokens.brand.gold}` } : {}}>
                    {partesSec.complete && <Check size={9} strokeWidth={3} />}
                    {partesSec.completion}
                  </div>
                )}
                <ChevronDown size={14} className={accStyles.chevron} />
              </div>
            </Accordion.Trigger>
            <Accordion.Content className={accStyles.content}>
              <div className={accStyles.contentInner}>
                <ClientePicker
                  data={data}
                  onChange={onChange}
                  clienteId={clienteId}
                  onClienteChange={(id, nome) => onClienteChange?.(id, nome)}
                />
                <ContratanteStrip
                  items={data.contratantes.map((c, i) => c.tipo === "pf" ? (c.nome || `Contratante ${i + 1}`) : (c.razaoSocial || `Contratante ${i + 1}`))}
                  active={activeContratante}
                  onSelect={(i) => {
                    const idx = Math.min(Math.max(0, i), data.contratantes.length - 1)
                    setActiveContratante(idx)
                    const el = document.getElementById(`contratante-${idx}`)
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
                  }}
                  onAdd={() => onChange({ ...data, contratantes: [...data.contratantes, newContratantePF()] })}
                  addLabel="Adicionar contratante"
                />

                {data.contratantes.length > 0 && (() => {
                  const idx = Math.min(Math.max(0, activeContratante), data.contratantes.length - 1)
                  const c = data.contratantes[idx]
                  return (
                    <div id={`contratante-${idx}`} key={idx}>
                      <ContratanteForm
                        index={idx} contratante={c}
                        canRemove={data.contratantes.length > 1}
                        onChange={(updated) => updateContratante(idx, updated)}
                        onRemove={() => {
                          const next = data.contratantes.filter((_, fi) => fi !== idx)
                          onChange({ ...data, contratantes: next })
                          setActiveContratante(Math.max(0, Math.min(idx, next.length - 1)))
                        }}
                      />
                    </div>
                  )
                })()}
                <AddButtonComp onClick={() => onChange({ ...data, contratantes: [...data.contratantes, newContratantePF()] })}>
                  <Plus size={13} /> Adicionar contratante
                </AddButtonComp>
              </div>
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item className={accStyles.item} value="objeto">
            <Accordion.Trigger className={accStyles.trigger}>
              <div className={accStyles.headerLeft}><div className={accStyles.title}>Objeto e prazo</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {objetoSec.completion && (
                  <div className={accStyles.badge} style={objetoSec.complete ? { background: tokens.brand.gold, color: tokens.brand.navy, border: `1px solid ${tokens.brand.gold}` } : {}}>
                    {objetoSec.complete && <Check size={9} strokeWidth={3} />}
                    {objetoSec.completion}
                  </div>
                )}
                <ChevronDown size={14} className={accStyles.chevron} />
              </div>
            </Accordion.Trigger>
            <Accordion.Content className={accStyles.content}>
              <div className={accStyles.contentInner}>
                <TextAreaField
                  label="Objeto" value={data.objeto}
                  onChange={(v) => onChange({ ...data, objeto: v })}
                  placeholder="Ex: defesa em ação trabalhista nº 0001234-56.2026.5.02.0001, bem como em todos os recursos e incidentes dela decorrentes"
                  hint="Texto inserido diretamente na Cláusula Primeira"
                />
              </div>
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item className={accStyles.item} value="honorarios">
            <Accordion.Trigger className={accStyles.trigger}>
              <div className={accStyles.headerLeft}><div className={accStyles.title}>Honorários</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {honorariosSec.completion && (
                  <div className={accStyles.badge} style={honorariosSec.complete ? { background: tokens.brand.gold, color: tokens.brand.navy, border: `1px solid ${tokens.brand.gold}` } : {}}>
                    {honorariosSec.complete && <Check size={9} strokeWidth={3} />}
                    {honorariosSec.completion}
                  </div>
                )}
                <ChevronDown size={14} className={accStyles.chevron} />
              </div>
            </Accordion.Trigger>
            <Accordion.Content className={accStyles.content}>
              <div className={accStyles.contentInner}>
                <HonorariosForm data={data} onChange={onChange} />
              </div>
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item className={accStyles.item} value="foro">
            <Accordion.Trigger className={accStyles.trigger}>
              <div className={accStyles.headerLeft}><div className={accStyles.title}>Foro e data</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {foroSec.completion && (
                  <div className={accStyles.badge} style={foroSec.complete ? { background: tokens.brand.gold, color: tokens.brand.navy, border: `1px solid ${tokens.brand.gold}` } : {}}>
                    {foroSec.complete && <Check size={9} strokeWidth={3} />}
                    {foroSec.completion}
                  </div>
                )}
                <ChevronDown size={14} className={accStyles.chevron} />
              </div>
            </Accordion.Trigger>
            <Accordion.Content className={accStyles.content}>
              <div className={accStyles.contentInner}>
                <Grid cols={2}>
                  <FormField label="Cidade (foro)" value={data.foro} onChange={(v) => onChange({ ...data, foro: v })} placeholder="São Paulo" />
                  <DateSignatureField onChange={(v) => onChange({ ...data, data: v })} />
                </Grid>
              </div>
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item className={accStyles.item} value="clausulas">
            <Accordion.Trigger className={accStyles.trigger}>
              <div className={accStyles.headerLeft}><div className={accStyles.title}>Cláusulas</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {clausulasEditadas > 0 && (
                  <div className={accStyles.badge} style={{ background: tokens.color.accentSoft, color: tokens.color.accent }}>
                    {clausulasEditadas} editada{clausulasEditadas > 1 ? "s" : ""}
                  </div>
                )}
                <ChevronDown size={14} className={accStyles.chevron} />
              </div>
            </Accordion.Trigger>
            <Accordion.Content className={accStyles.content}>
              <div className={accStyles.contentInner}>
                <ClausulasSection data={data} onChange={onChange} />
              </div>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
      </div>

      {/* Progress footer (sticky at bottom, outside scroll) */}
      <div style={styles.progressContainer}>
        <div style={styles.progressTextRow}>
          <span>Progresso</span>
          <span>{pending > 0 ? `${pending} campo${pending !== 1 ? "s" : ""} pendente${pending !== 1 ? "s" : ""}` : "Pronto para gerar"}</span>
        </div>
        <div style={styles.progressBarOuter}>
          <div style={{ ...styles.progressBarInner, width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}
