import Link from "next/link";
import { Scroll, Sparkles, Edit, Check } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { btn } from "@/styles/components.css";
import { tokens } from "@/styles/tokens.css";

const AI_FEATURES = [
  "Conversa natural — sem formulários",
  "Personaliza templates pré-aprovados",
  "Sugere cláusulas relevantes ao caso",
  "Pronto em ~30 segundos",
];

const MANUAL_FEATURES = [
  "Formulário guiado com campos pré-definidos",
  "Templates do escritório com placeholders",
  "Preview em tempo real do documento",
  "Salvamento automático de rascunho",
];

const STEPS = ["Tipo", "Método", "Conteúdo", "Revisão"];

export default function ModeSelectPage() {
  return (
    <AppShell active="documentos" breadcrumb={["Documentos", "Novo contrato"]}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "48px 40px" }}>
        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 36, fontSize: 12, color: tokens.color.textSubtle }}>
          {STEPS.map((step, i) => {
            const isDone = i === 0;
            const isCurrent = i === 1;
            return (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {i > 0 && <span style={{ width: 24, height: 1, background: i <= 1 ? tokens.color.borderStrong : tokens.color.border, display: "inline-block" }} />}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: isDone ? tokens.color.accent : isCurrent ? tokens.color.text : tokens.color.textSubtle, fontWeight: isCurrent ? 500 : 400 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: isDone ? tokens.color.accent : isCurrent ? tokens.color.text : tokens.color.bgSunken,
                    color: isDone || isCurrent ? tokens.color.bg : tokens.color.textSubtle,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 600,
                  }}>{i + 1}</span>
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        {/* Heading */}
        <div style={{ marginBottom: 36, textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: tokens.color.accentSoft, color: tokens.color.accent,
            padding: "4px 10px", borderRadius: 999, fontSize: "11.5px", fontWeight: 500, marginBottom: 16,
          }}>
            <Scroll size={13} />
            Contrato
          </div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: "-0.025em", color: tokens.color.text }}>
            Como prefere criar?
          </h1>
          <p style={{ margin: "10px auto 0", fontSize: "14.5px", color: tokens.color.textMuted, maxWidth: 500, lineHeight: 1.55 }}>
            Ambos os caminhos produzem um documento final pronto para assinatura.
          </p>
        </div>

        {/* Mode cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Manual */}
          <div style={{
            background: tokens.color.surface, border: `1px solid ${tokens.color.border}`,
            borderRadius: 20, padding: "28px 28px 24px",
            boxShadow: tokens.color.shadowSm, cursor: "pointer",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, background: tokens.color.bgSunken,
              color: tokens.color.text, display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 22,
            }}>
              <Edit size={26} strokeWidth={1.6} />
            </div>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: tokens.color.text }}>Manual</h3>
            <p style={{ margin: "8px 0 22px", fontSize: 14, lineHeight: 1.55, color: tokens.color.textMuted }}>
              Preencha um formulário com os campos do contrato. Útil quando você já sabe exatamente o que precisa.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, paddingBottom: 24 }}>
              {MANUAL_FEATURES.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: tokens.color.textMuted }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", background: tokens.color.accentSoft,
                    color: tokens.color.accent, display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 1,
                  }}><Check size={11} strokeWidth={2.4} /></div>
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/documents/new/manual" className={btn({ variant: "secondary" })} style={{ width: "100%", height: 40, fontSize: "13.5px", justifyContent: "center" }}>
              Preencher manualmente
            </Link>
          </div>

          {/* AI */}
          <div style={{
            background: tokens.color.surface, border: `1px solid ${tokens.brand.gold}`,
            borderRadius: 20, padding: "28px 28px 24px", position: "relative",
            boxShadow: tokens.color.shadowMd, cursor: "pointer", overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{
              position: "absolute", top: 16, right: 16, fontSize: "10.5px", fontWeight: 600,
              padding: "4px 9px", borderRadius: 999, background: tokens.brand.gold, color: tokens.brand.navy,
            }}>RECOMENDADO</div>
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "radial-gradient(circle at 100% 0%, var(--accent-soft, rgba(192,161,71,0.14)) 0%, transparent 60%)",
            }} />
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "linear-gradient(135deg, #C0A147, #9a7f2e)",
              color: "#020D25", display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 22, position: "relative",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
            }}>
              <Sparkles size={26} strokeWidth={1.6} />
            </div>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: tokens.color.text, position: "relative" }}>Com IA</h3>
            <p style={{ margin: "8px 0 22px", fontSize: 14, lineHeight: 1.55, color: tokens.color.textMuted, position: "relative" }}>
              Descreva a situação em linguagem natural. A IA monta o documento com base nos templates do escritório.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, paddingBottom: 24, position: "relative" }}>
              {AI_FEATURES.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: tokens.color.textMuted }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", background: tokens.color.accentSoft,
                    color: tokens.color.accent, display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 1,
                  }}><Check size={11} strokeWidth={2.4} /></div>
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/documents/new/ai" className={btn({ variant: "gold" })} style={{ width: "100%", height: 40, fontSize: "13.5px", justifyContent: "center", position: "relative" }}>
              Começar com IA
            </Link>
          </div>
        </div>

        {/* Footer hint */}
        <div style={{
          marginTop: 32, padding: 16, background: tokens.color.bgSoft,
          borderRadius: 12, border: `1px solid ${tokens.color.border}`,
          display: "flex", alignItems: "center", gap: 12,
          fontSize: "12.5px", color: tokens.color.textMuted,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: tokens.color.surface,
            color: tokens.color.textMuted, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, border: `1px solid ${tokens.color.border}`,
          }}>
            <Scroll size={14} />
          </div>
          Todos os contratos são gerados sobre o papel timbrado do escritório, com numeração sequencial e arquivamento automático na pasta do cliente.
        </div>
      </div>
    </AppShell>
  );
}
