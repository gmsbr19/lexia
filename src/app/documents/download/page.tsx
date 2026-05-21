"use client";

import { useState } from "react";
import { CheckCircle, Download, Mail, Copy } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { FullDocumentPreview } from "@/components/documents/DraftPreview";
import { Switch } from "@/components/ui/Switch";
import { btn } from "@/styles/components.css";
import { tokens } from "@/styles/tokens.css";

const FORMATS = [
  { format: "PDF", description: "PDF para assinatura", size: "324 KB · A4 · 3 páginas · pronto para impressão" },
  { format: "DOCX", description: "DOCX editável", size: "118 KB · Compatível com Word e Pages" },
];

const TOGGLES = [
  { label: "Assinar digitalmente (ICP-Brasil)", defaultOn: true },
  { label: "Marca d'água \"CÓPIA\" nas demais páginas", defaultOn: false },
  { label: "Enviar por e-mail ao cliente após download", defaultOn: true },
];

export default function DownloadPage() {
  const [selectedFormat, setSelectedFormat] = useState("PDF");
  const [toggles, setToggles] = useState(TOGGLES.map((t) => t.defaultOn));

  return (
    <AppShell active="documentos" breadcrumb={["Documentos", "Novo contrato", "Concluído"]}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%", minHeight: 0 }}>
        {/* Left — success + options */}
        <section style={{ padding: "48px 56px", display: "flex", flexDirection: "column", justifyContent: "center", overflow: "auto" }}>
          <div style={{ maxWidth: 460 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 18, background: "rgba(46, 160, 67, 0.12)",
              color: "#2ea043", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22,
            }}>
              <CheckCircle size={28} strokeWidth={1.6} />
            </div>

            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em", color: tokens.color.text }}>
              Pronto para baixar.
            </h1>
            <p style={{ margin: "8px 0 28px", fontSize: "14.5px", color: tokens.color.textMuted, lineHeight: 1.55 }}>
              O documento foi gerado no papel timbrado e arquivado na pasta de Helena Vargas com a numeração{" "}
              <strong style={{ color: tokens.color.text, fontFamily: tokens.font.mono, fontWeight: 500 }}>CT-2026-0142</strong>.
            </p>

            {/* Format selector */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: tokens.color.textSubtle, textTransform: "uppercase", marginBottom: 10 }}>Formato</div>
              <div style={{ display: "grid", gap: 10 }}>
                {FORMATS.map(({ format, description, size }) => {
                  const selected = selectedFormat === format;
                  return (
                    <button
                      key={format}
                      onClick={() => setSelectedFormat(format)}
                      style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                        background: selected ? tokens.color.accentSoft : tokens.color.surface,
                        border: `1px solid ${selected ? tokens.brand.gold : tokens.color.border}`,
                        borderRadius: 12, cursor: "pointer", textAlign: "left", width: "100%",
                      }}
                    >
                      <div style={{
                        width: 40, height: 48, borderRadius: 6,
                        background: selected ? tokens.brand.gold : tokens.color.bgSunken,
                        color: selected ? tokens.brand.navy : tokens.color.textMuted,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 700, fontFamily: tokens.font.mono,
                        position: "relative", flexShrink: 0,
                      }}>
                        {format}
                        <div style={{
                          position: "absolute", top: 0, right: 0, width: 0, height: 0,
                          borderStyle: "solid", borderWidth: "0 8px 8px 0",
                          borderColor: `transparent ${selected ? "rgba(2,13,37,0.15)" : "rgba(2,13,37,0.06)"} transparent transparent`,
                        }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13.5px", fontWeight: 600, color: tokens.color.text }}>{description}</div>
                        <div style={{ fontSize: "11.5px", color: tokens.color.textMuted, marginTop: 2 }}>{size}</div>
                      </div>
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%",
                        border: `1.5px solid ${selected ? tokens.brand.gold : tokens.color.borderStrong}`,
                        background: selected ? tokens.brand.gold : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: tokens.brand.navy, flexShrink: 0,
                      }}>
                        {selected && <Download size={9} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Options */}
            <div style={{
              display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px",
              background: tokens.color.bgSoft, border: `1px solid ${tokens.color.border}`,
              borderRadius: 12, marginBottom: 24,
            }}>
              {TOGGLES.map((t, i) => (
                <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Switch checked={toggles[i]} onCheckedChange={(v) => setToggles((prev) => { const n = [...prev]; n[i] = v; return n; })} />
                  <span style={{ fontSize: 13, color: tokens.color.text }}>{t.label}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className={btn({ variant: "primary" })} style={{ height: 44, fontSize: 14, flex: 1, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Download size={16} />Baixar {selectedFormat} (324 KB)
              </button>
              <button className={btn({ variant: "secondary" })} style={{ height: 44, width: 44, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Mail size={16} />
              </button>
              <button className={btn({ variant: "secondary" })} style={{ height: 44, width: 44, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Copy size={16} />
              </button>
            </div>

            <div style={{ display: "flex", gap: 16, marginTop: 22, fontSize: "12.5px" }}>
              <a href="/documents/new" style={{ color: tokens.color.accent, fontWeight: 500, textDecoration: "none" }}>Criar novo documento</a>
              <span style={{ color: tokens.color.borderStrong }}>·</span>
              <a href="/documents/history" style={{ color: tokens.color.textMuted, textDecoration: "none" }}>Ver histórico</a>
            </div>
          </div>
        </section>

        {/* Right — document mockup */}
        <section style={{
          background: tokens.color.bgSunken, padding: "48px 56px",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", position: "relative",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(circle at 50% 30%, rgba(192,161,71,0.12) 0%, transparent 60%)",
            opacity: 0.6,
          }} />
          <div style={{ width: 360, position: "relative", transform: "rotate(-2deg)" }}>
            <div style={{ position: "absolute", inset: 0, background: "#FFFFFF", borderRadius: 6, transform: "translate(12px, 16px) rotate(3deg)", boxShadow: "0 4px 16px rgba(2, 13, 37, 0.08)", opacity: 0.7 }} />
            <div style={{ position: "absolute", inset: 0, background: "#FFFFFF", borderRadius: 6, transform: "translate(6px, 8px) rotate(1.5deg)", boxShadow: "0 4px 16px rgba(2, 13, 37, 0.1)", opacity: 0.85 }} />
            <div style={{ position: "relative" }}>
              <FullDocumentPreview />
              <div style={{
                position: "absolute", top: 16, right: 16, width: 64, height: 64, borderRadius: "50%",
                border: "1.5px solid #C0A147",
                display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
                color: "#C0A147", background: "rgba(255,255,255,0.92)",
                fontFamily: "Georgia, serif", fontSize: 7, fontWeight: 600, letterSpacing: "0.06em",
                textAlign: "center", lineHeight: 1.3, transform: "rotate(8deg)",
              }}>
                MORAES<br />&<br />ASSOC.
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
