"use client";

import { useState } from "react";
import { Sparkles, History, Copy, Edit2, Check, Send, Mic, Paperclip, Folder, FileCheck } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { DraftPreview } from "@/components/documents/DraftPreview";
import { btn, pill } from "@/styles/components.css";
import { tokens } from "@/styles/tokens.css";

const MESSAGES = [
  { role: "ai" as const, text: "Olá, Rafael. Sobre qual contrato vamos trabalhar?" },
  { role: "user" as const, text: "Preciso de um contrato de honorários mensais para a Helena Vargas. R$ 8.500 por mês, consultoria geral em direito empresarial." },
  {
    role: "ai" as const,
    text: (<>Entendi. Vou usar o <strong>Template HRA-02</strong> (honorários recorrentes). Antes de gerar, qual a duração do contrato?</>),
    actions: ["12 meses", "24 meses", "Indeterminado"],
  },
  { role: "user" as const, text: "12 meses, com renovação automática." },
  {
    role: "ai" as const,
    text: (
      <>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10,
          background: tokens.color.bgSoft, border: `1px solid ${tokens.color.border}`, marginBottom: 8,
        }}>
          <FileCheck size={14} color={tokens.color.accent} />
          <span style={{ fontSize: "12.5px", color: tokens.color.textMuted }}>
            Gerando contrato no papel timbrado de Moraes &amp; Associados
          </span>
        </div>
        Documento à direita. Pode revisar e me pedir ajustes se preferir.
      </>
    ),
  },
] as const;

export default function AIChatPage() {
  const [draft, setDraft] = useState("Ajustar a cláusula de reajuste para IPCA...");

  return (
    <AppShell
      active="documentos"
      breadcrumb={["Documentos", "Novo contrato", "Com IA"]}
      actions={
        <>
          <button className={btn({ variant: "ghost" })} style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 6 }}>
            <History size={14} />Histórico
          </button>
          <button className={btn({ variant: "secondary" })} style={{ height: 32, fontSize: "12.5px" }}>
            Salvar rascunho
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%", minHeight: 0 }}>
        {/* Chat panel */}
        <section style={{ display: "flex", flexDirection: "column", borderRight: `1px solid ${tokens.color.border}`, minWidth: 0, minHeight: 0 }}>
          <div style={{ padding: "20px 28px 12px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "linear-gradient(135deg, #C0A147, #9a7f2e)",
              color: "#020D25", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
            }}>
              <Sparkles size={16} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: tokens.color.text }}>Assistente</div>
              <div style={{ fontSize: "11.5px", color: tokens.color.textSubtle }}>Baseado em 14 templates do escritório</div>
            </div>
            <div className={pill}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#2ea043", display: "inline-block" }} />
              Conectado
            </div>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "8px 28px 16px", minHeight: 0 }}>
            {MESSAGES.map((msg, i) => (
              <div key={i} style={{
                display: "flex", gap: 12,
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                alignItems: "flex-start", marginBottom: 18,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: msg.role === "user" ? "linear-gradient(135deg, #020D25, #1a2c5a)" : "linear-gradient(135deg, #C0A147, #9a7f2e)",
                  color: msg.role === "user" ? "#C0A147" : "#020D25",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 600,
                }}>
                  {msg.role === "user" ? "RM" : <Sparkles size={14} strokeWidth={1.8} />}
                </div>
                <div style={{
                  maxWidth: "78%",
                  background: msg.role === "user" ? tokens.color.surface : "transparent",
                  border: msg.role === "user" ? `1px solid ${tokens.color.border}` : "none",
                  borderRadius: 14, padding: msg.role === "user" ? "10px 14px" : "4px 0",
                  fontSize: "13.5px", lineHeight: 1.55, color: tokens.color.text,
                }}>
                  {msg.text}
                  {"actions" in msg && msg.actions && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      {msg.actions.map((a) => (
                        <button key={a} className={btn({ variant: "secondary" })} style={{ height: 30, fontSize: "12.5px", padding: "0 12px" }}>{a}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div style={{ padding: "12px 20px 20px" }}>
            <div style={{
              background: tokens.color.surface, border: `1px solid ${tokens.color.borderStrong}`,
              borderRadius: 14, padding: "10px 12px 8px", boxShadow: tokens.color.shadowSm,
            }}>
              <div
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setDraft((e.target as HTMLDivElement).textContent ?? "")}
                style={{ fontSize: "13.5px", color: tokens.color.textMuted, outline: "none", minHeight: 38, padding: "4px 2px" }}
              >
                {draft}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, borderTop: `1px solid ${tokens.color.border}`, paddingTop: 8 }}>
                <button className={btn({ variant: "ghost" })} style={{ height: 28, width: 28, padding: 0 }}><Paperclip size={14} /></button>
                <button className={btn({ variant: "ghost" })} style={{ height: 28, fontSize: 12, padding: "0 8px", display: "flex", alignItems: "center", gap: 4 }}>
                  <Folder size={13} />Anexar processo
                </button>
                <div style={{ flex: 1 }} />
                <button className={btn({ variant: "ghost" })} style={{ height: 28, width: 28, padding: 0 }}><Mic size={14} /></button>
                <button className={btn({ variant: "primary" })} style={{ height: 28, width: 32, padding: 0 }}><Send size={13} /></button>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: "10.5px", color: tokens.color.textSubtle, padding: "0 4px" }}>
              <span>Modelo: GPT-4 · Templates locais</span>
              <span>Enter para enviar · Shift+Enter para quebrar linha</span>
            </div>
          </div>
        </section>

        {/* Preview panel */}
        <section style={{
          background: tokens.color.bgSunken, padding: "20px 32px 28px",
          overflow: "auto", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: "13.5px", fontWeight: 600, color: tokens.color.text }}>Pré-visualização</div>
              <div style={{ fontSize: "11.5px", color: tokens.color.textSubtle }}>Atualizando em tempo real · Página 1 de 3</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className={btn({ variant: "ghost" })} style={{ height: 28, width: 28, padding: 0 }}><Edit2 size={14} /></button>
              <button className={btn({ variant: "ghost" })} style={{ height: 28, width: 28, padding: 0 }}><Copy size={14} /></button>
              <button className={btn({ variant: "primary" })} style={{ height: 28, fontSize: 12, padding: "0 12px", display: "flex", alignItems: "center", gap: 4 }}>
                <Check size={13} />Finalizar
              </button>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
            <div style={{ maxWidth: 460, width: "100%" }}>
              <DraftPreview pulse />
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
