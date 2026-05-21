import { Edit2, Users, Download, Check, Sparkles } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { FullDocumentPreview } from "@/components/documents/DraftPreview";
import { btn } from "@/styles/components.css";
import { tokens } from "@/styles/tokens.css";

const CHECKS = [
  { label: "Partes identificadas", state: "ok", detail: "CPF e endereço completos" },
  { label: "Valores e datas", state: "ok", detail: "R$ 8.500/mês · 12 meses" },
  { label: "Cláusula de foro", state: "ok", detail: "Comarca de São Paulo/SP" },
  { label: "Assinatura digital", state: "pending", detail: "Aguardando configuração" },
];

const DETAILS = [
  ["Cliente", "Helena Vargas"],
  ["Caso", "Consultoria 2026/03"],
  ["Criado por", "Rafael Moraes"],
  ["Atualizado", "há 4 minutos"],
  ["Numeração", "CT-2026-0142"],
];

export default function PreviewPage() {
  return (
    <AppShell
      active="documentos"
      breadcrumb={["Documentos", "Novo contrato", "Revisão"]}
      actions={
        <>
          <button className={btn({ variant: "ghost" })} style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 6 }}>
            <Edit2 size={14} />Editar
          </button>
          <button className={btn({ variant: "secondary" })} style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={14} />Compartilhar
          </button>
          <button className={btn({ variant: "primary" })} style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 6 }}>
            <Download size={14} />Baixar
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: "100%", minHeight: 0 }}>
        {/* Document viewport */}
        <section style={{ background: tokens.color.bgSunken, overflow: "auto", padding: "32px 40px 48px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "100%", maxWidth: 720, marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: tokens.color.text }}>
                  Contrato de Honorários — Helena Vargas
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, fontSize: 12, color: tokens.color.textMuted }}>
                  <span>Gerado pela IA · Template HRA-02</span>
                  <span style={{ width: 3, height: 3, borderRadius: "50%", background: "currentColor", opacity: 0.5, display: "inline-block" }} />
                  <span>3 páginas · 1.247 palavras</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, background: tokens.color.surface, border: `1px solid ${tokens.color.border}`, borderRadius: 999, padding: 3 }}>
                {["Documento", "Comentários", "Histórico"].map((tab, i) => (
                  <button key={tab} style={{
                    height: 26, padding: "0 12px", borderRadius: 999, border: "none",
                    background: i === 0 ? tokens.color.text : "transparent",
                    color: i === 0 ? tokens.color.bg : tokens.color.textMuted,
                    fontSize: "11.5px", fontWeight: 500, cursor: "pointer",
                  }}>{tab}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ width: "100%", maxWidth: 720 }}>
            <FullDocumentPreview />
          </div>
          <div style={{ marginTop: 14, fontSize: "11.5px", color: tokens.color.textSubtle }}>Página 1 de 3</div>
        </section>

        {/* Review sidebar */}
        <aside style={{ borderLeft: `1px solid ${tokens.color.border}`, background: tokens.color.bg, overflow: "auto", padding: "24px 22px" }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: tokens.color.textSubtle, textTransform: "uppercase", marginBottom: 12 }}>Verificação</div>
            {CHECKS.map((c, i) => (
              <div key={c.label} style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0",
                borderBottom: i < CHECKS.length - 1 ? `1px solid ${tokens.color.border}` : "none",
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: c.state === "ok" ? "rgba(46, 160, 67, 0.14)" : tokens.color.accentSoft,
                  color: c.state === "ok" ? "#2ea043" : tokens.color.accent,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
                }}>
                  <Check size={11} strokeWidth={2.4} />
                </div>
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 500, color: tokens.color.text }}>{c.label}</div>
                  <div style={{ fontSize: "11.5px", color: tokens.color.textMuted, marginTop: 2 }}>{c.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: tokens.color.textSubtle, textTransform: "uppercase", marginBottom: 12 }}>Sugestões da IA</div>
            <div style={{ background: tokens.color.bgSoft, border: `1px solid ${tokens.color.border}`, borderRadius: 10, padding: "12px 12px 10px", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: tokens.color.accent, fontWeight: 600, marginBottom: 6 }}>
                <Sparkles size={12} />CLÁUSULA 2ª
              </div>
              <div style={{ fontSize: "12.5px", color: tokens.color.text, lineHeight: 1.5, marginBottom: 10 }}>
                Considerar incluir multa por atraso (2% + juros 1% a.m.) — padrão do escritório.
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className={btn({ variant: "secondary" })} style={{ height: 26, fontSize: "11.5px", padding: "0 10px" }}>Aplicar</button>
                <button className={btn({ variant: "ghost" })} style={{ height: 26, fontSize: "11.5px", padding: "0 10px" }}>Ignorar</button>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: tokens.color.textSubtle, textTransform: "uppercase", marginBottom: 12 }}>Detalhes</div>
            <div style={{ display: "grid", gap: 10, fontSize: "12.5px" }}>
              {DETAILS.map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ color: tokens.color.textMuted }}>{k}</span>
                  <span style={{ color: tokens.color.text, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
