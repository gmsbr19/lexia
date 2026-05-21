"use client";

import { useState, useCallback } from "react";
import { FileText, ChevronDown, ChevronRight, Check, Eye, ArrowRight, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { ContratoHonorariosPreview } from "@/components/documents/ContratoHonorariosPreview";
import { btn } from "@/styles/components.css";
import { tokens } from "@/styles/tokens.css";
import type {
  ContratoHonorariosData,
  Contratante,
  ContratantePF,
  ContratantePJ,
  SocioPJ,
  TipoHonorarios,
  Parcela,
} from "@/lib/types/contrato-honorarios";
import {
  newContratantePF,
  newContratantePJ,
  newSocioPJ,
  newHonorarios,
  newContratoData,
} from "@/lib/types/contrato-honorarios";

// ── date utilities ─────────────────────────────────────────────────────────────

const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isoToExtensa(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

// ── address helpers ────────────────────────────────────────────────────────────

interface AddrState {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

const emptyAddr: AddrState = { logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", cep: "" };

function composeEndereco(a: AddrState): string {
  const parts: string[] = [];
  if (a.logradouro) parts.push(a.logradouro);
  if (a.numero) parts.push(`nº ${a.numero}`);
  if (a.complemento) parts.push(a.complemento);
  if (a.bairro) parts.push(a.bairro);
  const cidadeUf = [a.cidade, a.uf].filter(Boolean).join("/");
  if (cidadeUf) parts.push(cidadeUf);
  if (a.cep) parts.push(`CEP ${a.cep}`);
  return parts.join(", ");
}

// ── estado civil options ───────────────────────────────────────────────────────

const ESTADOS_CIVIS: Record<string, string[]> = {
  masculino: ["solteiro", "casado", "separado judicialmente", "divorciado", "viúvo", "em união estável"],
  feminino: ["solteira", "casada", "separada judicialmente", "divorciada", "viúva", "em união estável"],
};

// ── UI primitives ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 34,
  paddingLeft: 10,
  paddingRight: 10,
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.borderStrong}`,
  borderRadius: tokens.radius.sm,
  fontFamily: tokens.font.sans,
  fontSize: "13px",
  color: tokens.color.text,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: tokens.color.textMuted,
  marginBottom: 5,
  letterSpacing: "0.01em",
};

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  suffix?: string;
  type?: string;
}

function FormField({ label, value, onChange, placeholder, hint, suffix, type }: FieldProps) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={type || "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...inputStyle, paddingRight: suffix ? 52 : 10 }}
        />
        {suffix && (
          <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", fontSize: "11px", color: tokens.color.textSubtle, fontFamily: tokens.font.mono }}>
            {suffix}
          </span>
        )}
      </div>
      {hint && <div style={{ fontSize: 11, color: tokens.color.textSubtle, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            ...inputStyle,
            paddingRight: 28,
            appearance: "none",
            cursor: "pointer",
            color: value ? tokens.color.text : tokens.color.textSubtle,
          } as React.CSSProperties}
        >
          <option value="">Selecione...</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown size={12} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: tokens.color.textSubtle, pointerEvents: "none" }} />
      </div>
    </div>
  );
}

function AddressForm({ addr, onChange }: {
  addr: AddrState;
  onChange: (field: keyof AddrState, val: string) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontSize: "10.5px", fontWeight: 600, color: tokens.color.textSubtle, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Endereço
      </div>
      <FormField label="Logradouro" value={addr.logradouro} onChange={(v) => onChange("logradouro", v)} placeholder="Rua, Av., Alameda..." />
      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 10 }}>
        <FormField label="Número" value={addr.numero} onChange={(v) => onChange("numero", v)} placeholder="123" />
        <FormField label="Complemento" value={addr.complemento} onChange={(v) => onChange("complemento", v)} placeholder="Apto 45, Sala 3..." />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 10 }}>
        <FormField label="Bairro" value={addr.bairro} onChange={(v) => onChange("bairro", v)} placeholder="Jardins" />
        <FormField label="CEP" value={addr.cep} onChange={(v) => onChange("cep", v)} placeholder="00000-000" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 56px", gap: 10 }}>
        <FormField label="Cidade" value={addr.cidade} onChange={(v) => onChange("cidade", v)} placeholder="São Paulo" />
        <FormField label="UF" value={addr.uf} onChange={(v) => onChange("uf", v.toUpperCase().slice(0, 2))} placeholder="SP" />
      </div>
    </div>
  );
}

const ASSINATURA_VALUE = "na data de assinatura do contrato";

function DateOrAssinaturaField({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const isAssinatura = value === ASSINATURA_VALUE;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>{label}</label>
        <button
          onClick={() => onChange(isAssinatura ? "" : ASSINATURA_VALUE)}
          style={{
            fontSize: "10px",
            fontWeight: 500,
            color: isAssinatura ? tokens.color.accent : tokens.color.textSubtle,
            background: isAssinatura ? tokens.color.accentSoft : "transparent",
            border: `1px solid ${isAssinatura ? "rgba(192,161,71,0.35)" : tokens.color.border}`,
            borderRadius: 4,
            cursor: "pointer",
            padding: "1px 7px",
            fontFamily: tokens.font.sans,
            lineHeight: "1.6",
          }}
        >
          Na assinatura
        </button>
      </div>
      {isAssinatura ? (
        <div style={{
          height: 34,
          display: "flex",
          alignItems: "center",
          paddingLeft: 10,
          background: tokens.color.accentSoft,
          border: "1px solid rgba(192,161,71,0.25)",
          borderRadius: tokens.radius.sm,
          fontSize: "12px",
          color: tokens.color.accent,
          fontStyle: "italic",
        }}>
          na data de assinatura do contrato
        </div>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
        />
      )}
    </div>
  );
}

function DateSignatureField({ onChange }: { onChange: (v: string) => void }) {
  const [iso, setIso] = useState<string>(todayISO);
  return (
    <div>
      <label style={labelStyle}>Data de assinatura</label>
      <input
        type="date"
        value={iso}
        onChange={(e) => {
          setIso(e.target.value);
          onChange(isoToExtensa(e.target.value));
        }}
        style={{ ...inputStyle, colorScheme: "light" } as React.CSSProperties}
      />
      {iso && (
        <div style={{ fontSize: 11, color: tokens.color.textSubtle, marginTop: 4 }}>
          {isoToExtensa(iso)}
        </div>
      )}
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{
          width: "100%",
          padding: "8px 10px",
          background: tokens.color.surface,
          border: `1px solid ${tokens.color.borderStrong}`,
          borderRadius: tokens.radius.sm,
          fontFamily: tokens.font.sans,
          fontSize: "13px",
          color: tokens.color.text,
          outline: "none",
          resize: "vertical",
          lineHeight: 1.5,
          boxSizing: "border-box",
        }}
      />
      {hint && <div style={{ fontSize: 11, color: tokens.color.textSubtle, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function TogglePill({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "inline-flex", background: tokens.color.bgSunken, borderRadius: tokens.radius.sm, padding: 2, gap: 2 }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: "4px 12px",
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 500,
            fontFamily: tokens.font.sans,
            background: value === o.value ? tokens.color.surface : "transparent",
            color: value === o.value ? tokens.color.text : tokens.color.textMuted,
            boxShadow: value === o.value ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.1s",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
      {children}
    </div>
  );
}

interface SectionProps { title: string; number: number; complete?: boolean; open?: boolean; children?: React.ReactNode }

function FormSection({ title, number, complete, open, children }: SectionProps) {
  const [expanded, setExpanded] = useState(!!open);
  return (
    <div style={{ background: tokens.color.surface, border: `1px solid ${tokens.color.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
          borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0,
          borderTopStyle: "solid", borderLeftStyle: "solid", borderRightStyle: "solid",
          borderBottomStyle: "solid",
          borderBottomWidth: expanded ? 1 : 0,
          borderBottomColor: tokens.color.border,
          width: "100%", background: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
          background: complete ? tokens.color.accent : expanded ? tokens.color.text : tokens.color.bgSunken,
          color: complete || expanded ? tokens.color.bg : tokens.color.textSubtle,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 600,
        }}>
          {complete ? <Check size={10} strokeWidth={2.5} /> : number}
        </div>
        <div style={{ flex: 1, fontSize: "13.5px", fontWeight: 600, color: tokens.color.text }}>{title}</div>
        {expanded ? <ChevronDown size={14} color={tokens.color.textSubtle} /> : <ChevronRight size={14} color={tokens.color.textSubtle} />}
      </button>
      {expanded && children && (
        <div style={{ padding: "16px 14px", display: "grid", gap: 12 }}>{children}</div>
      )}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: tokens.color.border }} />
      <span style={{ fontSize: "10.5px", color: tokens.color.textSubtle, fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: tokens.color.border }} />
    </div>
  );
}

// ── sócio form ────────────────────────────────────────────────────────────────

function SocioForm({ socio, onChange, onRemove, index, canRemove }: {
  socio: SocioPJ;
  onChange: (patch: Partial<SocioPJ>) => void;
  onRemove: () => void;
  index: number;
  canRemove: boolean;
}) {
  return (
    <div style={{ border: `1px solid ${tokens.color.border}`, borderRadius: 8, padding: "12px 12px 10px", display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "11.5px", fontWeight: 600, color: tokens.color.textMuted }}>Sócio {index + 1}</span>
        {canRemove && (
          <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: tokens.color.textSubtle, padding: 2 }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <FormField
        label="Nome completo"
        value={socio.nome}
        onChange={(v) => onChange({ nome: v.toUpperCase() })}
        placeholder="NOME DO SÓCIO"
      />
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: tokens.color.textMuted, marginBottom: 5 }}>Gênero</div>
        <TogglePill
          options={[{ value: "masculino", label: "Masculino" }, { value: "feminino", label: "Feminino" }]}
          value={socio.genero}
          onChange={(v) => onChange({ genero: v as "masculino" | "feminino" })}
        />
      </div>
      <Grid cols={2}>
        <FormField label="Nacionalidade" value={socio.nacionalidade} onChange={(v) => onChange({ nacionalidade: v })} placeholder="brasileiro(a)" />
        <SelectField
          label="Estado civil"
          value={socio.estadoCivil}
          onChange={(v) => onChange({ estadoCivil: v })}
          options={ESTADOS_CIVIS[socio.genero]}
        />
      </Grid>
      <FormField label="Profissão" value={socio.profissao} onChange={(v) => onChange({ profissao: v })} placeholder="advogado(a)" />
      <Grid cols={2}>
        <FormField label="RG" value={socio.rg} onChange={(v) => onChange({ rg: v })} placeholder="00.000.000-0" />
        <FormField label="CPF" value={socio.cpf} onChange={(v) => onChange({ cpf: v })} placeholder="000.000.000-00" />
      </Grid>
    </div>
  );
}

// ── contratante form ──────────────────────────────────────────────────────────

function ContratanteForm({ contratante, onChange, onRemove, index, canRemove }: {
  contratante: Contratante;
  onChange: (c: Contratante) => void;
  onRemove: () => void;
  index: number;
  canRemove: boolean;
}) {
  const [addr, setAddr] = useState<AddrState>(emptyAddr);

  function patchPF(patch: Partial<ContratantePF>) {
    if (contratante.tipo === "pf") onChange({ ...contratante, ...patch });
  }
  function patchPJ(patch: Partial<ContratantePJ>) {
    if (contratante.tipo === "pj") onChange({ ...contratante, ...patch });
  }

  function updateAddr(field: keyof AddrState, val: string) {
    const newAddr = { ...addr, [field]: val };
    setAddr(newAddr);
    const endereco = composeEndereco(newAddr);
    onChange({ ...contratante, endereco });
  }

  return (
    <div style={{ border: `1px solid ${tokens.color.border}`, borderRadius: 10, padding: "14px 12px 12px", display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: tokens.color.textMuted }}>
          {index === 0 ? "Contratante" : `Contratante ${index + 1}`}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TogglePill
            options={[{ value: "pf", label: "Pessoa física" }, { value: "pj", label: "Pessoa jurídica" }]}
            value={contratante.tipo}
            onChange={(v) => {
              if (v !== contratante.tipo) {
                onChange(v === "pf" ? newContratantePF() : newContratantePJ());
              }
            }}
          />
          {canRemove && (
            <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: tokens.color.textSubtle, padding: 2 }}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {contratante.tipo === "pf" ? (
        <>
          <FormField
            label="Nome completo"
            value={contratante.nome}
            onChange={(v) => patchPF({ nome: v.toUpperCase() })}
            placeholder="NOME DO CONTRATANTE"
          />
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: tokens.color.textMuted, marginBottom: 5 }}>Gênero</div>
            <TogglePill
              options={[{ value: "masculino", label: "Masculino" }, { value: "feminino", label: "Feminino" }]}
              value={contratante.genero}
              onChange={(v) => patchPF({ genero: v as "masculino" | "feminino" })}
            />
          </div>
          <Grid cols={2}>
            <FormField label="Nacionalidade" value={contratante.nacionalidade} onChange={(v) => patchPF({ nacionalidade: v })} placeholder="brasileiro(a)" />
            <SelectField
              label="Estado civil"
              value={contratante.estadoCivil}
              onChange={(v) => patchPF({ estadoCivil: v })}
              options={ESTADOS_CIVIS[contratante.genero]}
            />
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
          <FormField
            label="Razão social"
            value={contratante.razaoSocial}
            onChange={(v) => patchPJ({ razaoSocial: v.toUpperCase() })}
            placeholder="EMPRESA LTDA."
          />
          <Grid cols={2}>
            <FormField label="CNPJ" value={contratante.cnpj} onChange={(v) => patchPJ({ cnpj: v })} placeholder="00.000.000/0001-00" />
            <FormField label="E-mail" value={contratante.email} onChange={(v) => patchPJ({ email: v })} placeholder="contato@empresa.com" type="email" />
          </Grid>
          <AddressForm addr={addr} onChange={updateAddr} />

          <Divider label="Sócios representantes" />
          {contratante.socios.map((s, si) => (
            <SocioForm
              key={si}
              index={si}
              socio={s}
              canRemove={contratante.socios.length > 1}
              onChange={(patch) => {
                const socios = contratante.socios.map((x, xi) => xi === si ? { ...x, ...patch } : x);
                patchPJ({ socios });
              }}
              onRemove={() => {
                const socios = contratante.socios.filter((_, xi) => xi !== si);
                patchPJ({ socios });
              }}
            />
          ))}
          <button
            onClick={() => patchPJ({ socios: [...contratante.socios, newSocioPJ()] })}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px", color: tokens.color.accent, background: "none", border: "none", cursor: "pointer", padding: "2px 0", fontFamily: tokens.font.sans }}
          >
            <Plus size={13} /> Adicionar sócio
          </button>
        </>
      )}
    </div>
  );
}

// ── honorários form ───────────────────────────────────────────────────────────

const TIPO_LABELS: { value: TipoHonorarios; label: string }[] = [
  { value: "avista", label: "À vista" },
  { value: "parcelado", label: "Parcelado" },
  { value: "parcelas_diferentes", label: "Parcelas variadas" },
  { value: "exito", label: "Êxito puro" },
  { value: "avista_exito", label: "À vista + Êxito" },
  { value: "parcelado_exito", label: "Parcelado + Êxito" },
];

function HonorariosForm({ data, onChange }: { data: ContratoHonorariosData; onChange: (data: ContratoHonorariosData) => void }) {
  const h = data.honorarios;

  function patch(p: object) {
    onChange({ ...data, honorarios: { ...h, ...p } as ContratoHonorariosData["honorarios"] });
  }

  function changeType(tipo: TipoHonorarios) {
    onChange({ ...data, honorarios: newHonorarios(tipo) });
  }

  const parceladoFields = (valorTotal: string, qtParcelas: string, valorParcelas: string, dataPrimeiraParcela: string) => (
    <>
      <FormField label="Valor total dos honorários" value={valorTotal} onChange={(v) => patch({ valorTotal: v })} placeholder="R$ 0,00" />
      <Grid cols={3}>
        <FormField label="Nº de parcelas" value={qtParcelas} onChange={(v) => patch({ qtParcelas: v })} placeholder="3" />
        <FormField label="Valor por parcela" value={valorParcelas} onChange={(v) => patch({ valorParcelas: v })} placeholder="R$ 0,00" />
        <DateOrAssinaturaField label="Data da 1ª parcela" value={dataPrimeiraParcela} onChange={(v) => patch({ dataPrimeiraParcela: v })} placeholder="01/01/2026" />
      </Grid>
    </>
  );

  const exitoFields = (percentualExito: string, baseCalculoExito: string) => (
    <>
      <Divider label="Honorários de êxito" />
      <Grid cols={2}>
        <FormField label="Percentual de êxito" value={percentualExito} onChange={(v) => patch({ percentualExito: v })} placeholder="20" suffix="%" />
        <FormField label="Base de cálculo" value={baseCalculoExito} onChange={(v) => patch({ baseCalculoExito: v })} placeholder="valor da condenação" />
      </Grid>
    </>
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: tokens.color.textMuted, marginBottom: 7 }}>Tipo de honorários</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {TIPO_LABELS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => changeType(value)}
              style={{
                padding: "5px 12px",
                borderRadius: 999,
                border: `1px solid ${h.tipo === value ? tokens.color.accent : tokens.color.border}`,
                background: h.tipo === value ? tokens.color.accentSoft : "transparent",
                color: h.tipo === value ? tokens.color.accent : tokens.color.textMuted,
                fontSize: "12px",
                fontWeight: h.tipo === value ? 600 : 400,
                cursor: "pointer",
                fontFamily: tokens.font.sans,
                transition: "all 0.1s",
              }}
            >
              {label}
            </button>
          ))}
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
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <FormField
                  label={`Parcela ${i + 1} — valor`}
                  value={p.valor}
                  onChange={(v) => {
                    const parcelas = h.parcelas.map((x, xi) => xi === i ? { ...x, valor: v } : x);
                    patch({ parcelas });
                  }}
                  placeholder="R$ 0,00"
                />
              </div>
              <div style={{ flex: 1 }}>
                <FormField
                  label="Vencimento"
                  value={p.vencimento}
                  onChange={(v) => {
                    const parcelas = h.parcelas.map((x, xi) => xi === i ? { ...x, vencimento: v } : x);
                    patch({ parcelas });
                  }}
                  placeholder="01/01/2026"
                />
              </div>
              {h.parcelas.length > 1 && (
                <button
                  onClick={() => patch({ parcelas: h.parcelas.filter((_: Parcela, xi: number) => xi !== i) })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: tokens.color.textSubtle, paddingBottom: 8 }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => patch({ parcelas: [...h.parcelas, { valor: "", vencimento: "" }] })}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px", color: tokens.color.accent, background: "none", border: "none", cursor: "pointer", padding: "2px 0", fontFamily: tokens.font.sans }}
          >
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
  );
}

// ── completion counter ────────────────────────────────────────────────────────

function countFields(data: ContratoHonorariosData): { total: number; filled: number } {
  const vals: string[] = [];

  for (const c of data.contratantes) {
    if (c.tipo === "pf") {
      vals.push(c.nome, c.nacionalidade, c.estadoCivil, c.profissao, c.rg, c.cpf, c.endereco, c.email);
    } else {
      vals.push(c.razaoSocial, c.cnpj, c.endereco, c.email);
      for (const s of c.socios) {
        vals.push(s.nome, s.nacionalidade, s.estadoCivil, s.profissao, s.rg, s.cpf);
      }
    }
  }

  vals.push(data.objeto);

  const h = data.honorarios;
  if (h.tipo === "avista") vals.push(h.valorTotal, h.dataPagamento);
  else if (h.tipo === "parcelado") vals.push(h.valorTotal, h.qtParcelas, h.valorParcelas, h.dataPrimeiraParcela);
  else if (h.tipo === "parcelas_diferentes") for (const p of h.parcelas) vals.push(p.valor, p.vencimento);
  else if (h.tipo === "exito") vals.push(h.percentual, h.baseCalculo);
  else if (h.tipo === "avista_exito") vals.push(h.valorTotal, h.dataPagamento, h.percentualExito, h.baseCalculoExito);
  else if (h.tipo === "parcelado_exito") vals.push(h.valorTotal, h.qtParcelas, h.valorParcelas, h.dataPrimeiraParcela, h.percentualExito, h.baseCalculoExito);

  vals.push(data.foro, data.data);

  return { total: vals.length, filled: vals.filter(Boolean).length };
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function ManualFormPage() {
  const [data, setData] = useState<ContratoHonorariosData>(() => ({
    ...newContratoData(),
    data: isoToExtensa(todayISO()),
  }));

  const updateContratante = useCallback((idx: number, c: Contratante) => {
    setData((prev) => ({
      ...prev,
      contratantes: prev.contratantes.map((x, i) => (i === idx ? c : x)),
    }));
  }, []);

  const addContratante = () =>
    setData((prev) => ({ ...prev, contratantes: [...prev.contratantes, newContratantePF()] }));

  const removeContratante = (idx: number) =>
    setData((prev) => ({ ...prev, contratantes: prev.contratantes.filter((_, i) => i !== idx) }));

  const DEFAULT_ZOOM = 0.8;
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const { total, filled } = countFields(data);
  const pending = total - filled;
  const progress = Math.round((filled / total) * 100);

  const partesOk = data.contratantes.every((c) => {
    if (c.tipo === "pf") return c.nome && c.cpf;
    return c.razaoSocial && c.cnpj && c.socios[0]?.nome;
  });
  const objetoOk = !!data.objeto;
  const honorariosOk = (() => {
    const h = data.honorarios;
    if (h.tipo === "avista") return !!(h.valorTotal && h.dataPagamento);
    if (h.tipo === "parcelado") return !!(h.valorTotal && h.qtParcelas);
    if (h.tipo === "parcelas_diferentes") return h.parcelas.every((p) => p.valor && p.vencimento);
    if (h.tipo === "exito") return !!(h.percentual && h.baseCalculo);
    if (h.tipo === "avista_exito") return !!(h.valorTotal && h.percentualExito);
    if (h.tipo === "parcelado_exito") return !!(h.valorTotal && h.qtParcelas && h.percentualExito);
    return false;
  })();
  const foroOk = !!(data.foro && data.data);

  return (
    <AppShell
      active="documentos"
      breadcrumb={["Documentos", "Novo contrato", "Preenchimento manual"]}
      actions={
        <>
          <button className={btn({ variant: "ghost" })} style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2ea043", display: "inline-block" }} />
            Salvo automaticamente
          </button>
          <button className={btn({ variant: "secondary" })} style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 6 }}>
            <Eye size={14} /> Pré-visualizar
          </button>
          <button className={btn({ variant: "primary" })} style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 6 }}>
            Continuar <ArrowRight size={13} />
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "440px 1fr", height: "100%", minHeight: 0 }}>
        {/* Form sidebar */}
        <section style={{ borderRight: `1px solid ${tokens.color.border}`, overflow: "auto", background: tokens.color.bg, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${tokens.color.border}`, flexShrink: 0 }}>
            <div style={{ fontSize: "10.5px", fontWeight: 500, letterSpacing: "0.06em", color: tokens.color.textSubtle, textTransform: "uppercase", marginBottom: 7 }}>
              Template em uso
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: tokens.color.accentSoft, border: "1px solid rgba(192,161,71,0.25)" }}>
              <FileText size={15} color={tokens.color.accent} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.color.text }}>Contrato de Honorários Advocatícios</div>
                <div style={{ fontSize: "11px", color: tokens.color.textMuted }}>17 cláusulas · Última revisão mai/2026</div>
              </div>
              <button className={btn({ variant: "ghost" })} style={{ height: 26, fontSize: 11, padding: "0 8px" }}>Trocar</button>
            </div>
          </div>

          <div style={{ padding: 14, flex: 1 }}>
            <FormSection title="Partes do contrato" number={1} complete={partesOk} open>
              {data.contratantes.map((c, i) => (
                <ContratanteForm
                  key={i}
                  index={i}
                  contratante={c}
                  canRemove={data.contratantes.length > 1}
                  onChange={(updated) => updateContratante(i, updated)}
                  onRemove={() => removeContratante(i)}
                />
              ))}
              <button
                onClick={addContratante}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px", color: tokens.color.accent, background: "none", border: "none", cursor: "pointer", padding: "2px 0", fontFamily: tokens.font.sans }}
              >
                <Plus size={13} /> Adicionar contratante
              </button>
            </FormSection>

            <FormSection title="Objeto dos serviços" number={2} complete={objetoOk}>
              <TextAreaField
                label="Descrição dos serviços"
                value={data.objeto}
                onChange={(v) => setData((d) => ({ ...d, objeto: v }))}
                placeholder="Ex: defesa em ação trabalhista nº 0001234-56.2026.5.02.0001, bem como em todos os recursos e incidentes dela decorrentes"
                hint="Texto inserido diretamente na Cláusula Primeira"
              />
            </FormSection>

            <FormSection title="Honorários" number={3} complete={honorariosOk}>
              <HonorariosForm data={data} onChange={setData} />
            </FormSection>

            <FormSection title="Foro e data" number={4} complete={foroOk}>
              <Grid cols={2}>
                <FormField
                  label="Cidade (foro)"
                  value={data.foro}
                  onChange={(v) => setData((d) => ({ ...d, foro: v }))}
                  placeholder="São Paulo"
                />
                <DateSignatureField
                  onChange={(v) => setData((d) => ({ ...d, data: v }))}
                />
              </Grid>
            </FormSection>
          </div>

          <div style={{ padding: "12px 16px 20px", borderTop: `1px solid ${tokens.color.border}`, background: tokens.color.bgSoft, flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: tokens.color.textMuted, marginBottom: 5 }}>
              <span>Progresso</span>
              <span>{pending > 0 ? `${pending} campo${pending !== 1 ? "s" : ""} pendente${pending !== 1 ? "s" : ""}` : "Pronto para gerar"}</span>
            </div>
            <div style={{ height: 4, borderRadius: 999, background: tokens.color.borderStrong, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #C0A147, #9a7f2e)", borderRadius: 999, transition: "width 0.3s" }} />
            </div>
          </div>
        </section>

        {/* Live preview */}
        <section style={{ background: tokens.color.bgSunken, overflow: "auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 5,
              background: tokens.color.bgSunken,
              padding: "20px 32px 14px",
              borderBottom: `1px solid ${tokens.color.border}`,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: 600, color: tokens.color.text }}>Pré-visualização</div>
                <div style={{ fontSize: "11.5px", color: tokens.color.textSubtle }}>
                  {pending > 0 ? `${pending} campo${pending !== 1 ? "s" : ""} pendente${pending !== 1 ? "s" : ""} · Atualiza ao digitar` : "Contrato completo · pronto para gerar"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(1)))}
                  style={{ width: 28, height: 28, borderRadius: tokens.radius.sm, border: `1px solid ${tokens.color.border}`, background: tokens.color.surface, color: tokens.color.text, cursor: "pointer", fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: tokens.font.sans }}
                >−</button>
                <button
                  onClick={() => setZoom(DEFAULT_ZOOM)}
                  style={{ height: 28, padding: "0 7px", borderRadius: tokens.radius.sm, border: `1px solid ${tokens.color.border}`, background: tokens.color.surface, color: tokens.color.textMuted, cursor: "pointer", fontSize: "11px", fontFamily: tokens.font.mono, minWidth: 42, textAlign: "center" }}
                >{Math.round(zoom * 100)}%</button>
                <button
                  onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(1)))}
                  style={{ width: 28, height: 28, borderRadius: tokens.radius.sm, border: `1px solid ${tokens.color.border}`, background: tokens.color.surface, color: tokens.color.text, cursor: "pointer", fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: tokens.font.sans }}
                >+</button>
              </div>
            </div>
          </div>

          <div style={{ padding: "14px 32px 28px", display: "flex", justifyContent: "center" }}>
            <ContratoHonorariosPreview data={data} zoom={zoom} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
