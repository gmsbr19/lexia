"use client";

import { useState } from "react";
import { FileText, ChevronDown, ChevronRight, Check, Eye, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { DraftPreview } from "@/components/documents/DraftPreview";
import { btn } from "@/styles/components.css";
import { tokens } from "@/styles/tokens.css";

interface FieldProps { label: string; value?: string; placeholder?: string; hint?: string; suffix?: string; }

function FormField({ label, value, placeholder, hint, suffix }: FieldProps) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: tokens.color.textMuted, marginBottom: 6, letterSpacing: "0.01em" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          defaultValue={value}
          placeholder={placeholder}
          readOnly={!!value}
          style={{
            width: "100%", height: 36, paddingLeft: 12, paddingRight: suffix ? 60 : 12,
            paddingTop: 0, paddingBottom: 0,
            background: tokens.color.surface, border: `1px solid ${tokens.color.borderStrong}`,
            borderRadius: tokens.radius.sm, fontFamily: tokens.font.sans,
            fontSize: "13.5px", color: tokens.color.text, outline: "none",
          }}
        />
        {suffix && (
          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: "11.5px", color: tokens.color.textSubtle, fontFamily: tokens.font.mono }}>
            {suffix}
          </span>
        )}
      </div>
      {hint && <div style={{ fontSize: 11, color: tokens.color.textSubtle, marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

interface SectionProps { title: string; number: number; complete?: boolean; open?: boolean; children?: React.ReactNode; }

function FormSection({ title, number, complete, open, children }: SectionProps) {
  const [expanded, setExpanded] = useState(open);
  return (
    <div style={{ background: tokens.color.surface, border: `1px solid ${tokens.color.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
          borderBottom: expanded ? `1px solid ${tokens.color.border}` : "none",
          width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left",
          borderRadius: 14,
        }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: complete ? tokens.color.accent : expanded ? tokens.color.text : tokens.color.bgSunken,
          color: complete || expanded ? tokens.color.bg : tokens.color.textSubtle,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "10.5px", fontWeight: 600, flexShrink: 0,
        }}>
          {complete ? <Check size={11} strokeWidth={2.5} /> : number}
        </div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: tokens.color.text }}>{title}</div>
        {expanded ? <ChevronDown size={15} color={tokens.color.textSubtle} /> : <ChevronRight size={15} color={tokens.color.textSubtle} />}
      </button>
      {expanded && children && (
        <div style={{ padding: "18px 16px", display: "grid", gap: 14 }}>{children}</div>
      )}
    </div>
  );
}

export default function ManualFormPage() {
  const [progress] = useState(40);

  return (
    <AppShell
      active="documentos"
      breadcrumb={["Documentos", "Novo contrato", "Manual"]}
      actions={
        <>
          <button className={btn({ variant: "ghost" })} style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2ea043", display: "inline-block" }} />
            Salvo automaticamente
          </button>
          <button className={btn({ variant: "secondary" })} style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 6 }}>
            <Eye size={14} />Pré-visualizar
          </button>
          <button className={btn({ variant: "primary" })} style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 6 }}>
            Continuar<ArrowRight size={13} />
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "440px 1fr", height: "100%", minHeight: 0 }}>
        {/* Form sidebar */}
        <section style={{ borderRight: `1px solid ${tokens.color.border}`, overflow: "auto", background: tokens.color.bg }}>
          <div style={{ padding: "20px 20px 12px", borderBottom: `1px solid ${tokens.color.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", color: tokens.color.textSubtle, textTransform: "uppercase", marginBottom: 8 }}>Template em uso</div>
            <div style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
              background: tokens.color.accentSoft, border: "1px solid rgba(192,161,71,0.25)",
            }}>
              <FileText size={16} color={tokens.color.accent} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12.5px", fontWeight: 600, color: tokens.color.text }}>HRA-02 · Honorários Recorrentes</div>
                <div style={{ fontSize: 11, color: tokens.color.textMuted }}>12 placeholders · Última revisão jan/2026</div>
              </div>
              <button className={btn({ variant: "ghost" })} style={{ height: 26, fontSize: 11, padding: "0 8px" }}>Trocar</button>
            </div>
          </div>

          <div style={{ padding: 16 }}>
            <FormSection title="Partes do contrato" number={1} complete>
              <FormField label="Nome do contratante" value="Helena Maria Vargas" />
              <FormField label="CPF" value="312.984.760-15" />
              <FormField label="Endereço completo" value="Rua Oscar Freire, 1.205 — ap. 92, São Paulo/SP" />
            </FormSection>

            <FormSection title="Objeto e prazo" number={2} open>
              <FormField label="Objeto dos serviços" value="Consultoria e assessoria jurídica em direito empresarial" hint="Texto livre — usado na cláusula 1ª" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormField label="Vigência" value="12 meses" />
                <FormField label="Início" value="01/04/2026" />
              </div>
              <FormField label="Renovação automática" value="Sim, por iguais períodos" />
            </FormSection>

            <FormSection title="Honorários" number={3} />
            <FormSection title="Cláusulas adicionais" number={4} />
            <FormSection title="Foro e assinaturas" number={5} />
          </div>

          <div style={{
            padding: "16px 20px 24px", borderTop: `1px solid ${tokens.color.border}`,
            background: tokens.color.bgSoft,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: tokens.color.textMuted, marginBottom: 6 }}>
              <span>Progresso</span><span>2 de 5 seções</span>
            </div>
            <div style={{ height: 4, borderRadius: 999, background: tokens.color.borderStrong, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #C0A147, #9a7f2e)", borderRadius: 999 }} />
            </div>
          </div>
        </section>

        {/* Preview */}
        <section style={{ background: tokens.color.bgSunken, padding: "20px 32px 28px", overflow: "auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: "13.5px", fontWeight: 600, color: tokens.color.text }}>Pré-visualização</div>
              <div style={{ fontSize: "11.5px", color: tokens.color.textSubtle }}>5 placeholders pendentes · Atualiza ao digitar</div>
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 4px 4px 12px",
              borderRadius: 999, background: tokens.color.surface, border: `1px solid ${tokens.color.border}`,
              fontSize: "11.5px", color: tokens.color.textMuted,
            }}>
              Zoom
              <span style={{ fontFamily: tokens.font.mono, fontSize: 11 }}>72%</span>
              <span style={{ width: 1, height: 16, background: tokens.color.border, margin: "0 4px", display: "inline-block" }} />
              <button className={btn({ variant: "ghost" })} style={{ width: 22, height: 22, padding: 0 }}>−</button>
              <button className={btn({ variant: "ghost" })} style={{ width: 22, height: 22, padding: 0 }}>+</button>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
            <div style={{ maxWidth: 460, width: "100%" }}>
              <DraftPreview showPlaceholders />
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
