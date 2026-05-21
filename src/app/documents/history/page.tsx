import Link from "next/link";
import { Search, Filter, Calendar, Plus, Download, MoreHorizontal, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { btn, card } from "@/styles/components.css";
import { tokens } from "@/styles/tokens.css";

const DOCS = [
  { name: "Contrato de Honorários — Helena Vargas", type: "Contrato", client: "Helena Vargas", author: "Rafael Moraes", date: "há 4 min", status: "Finalizado", size: "324 KB", source: "ai" },
  { name: "Procuração ad judicia — Construtora Aurora S/A", type: "Procuração", client: "Aurora S/A", author: "Camila Reis", date: "ontem · 17:42", status: "Assinado", size: "118 KB", source: "manual" },
  { name: "Parecer — Cláusula 4.2 do contrato Mendonça", type: "Parecer Jurídico", client: "Mendonça & Filhos", author: "Rafael Moraes", date: "3 mar 2026", status: "Finalizado", size: "446 KB", source: "ai" },
  { name: "Proposta de honorários — Tech Holding LTDA", type: "Proposta", client: "Tech Holding", author: "Camila Reis", date: "2 mar 2026", status: "Rascunho", size: "86 KB", source: "manual" },
  { name: "Contrato de cessão — Editora Linhares", type: "Contrato", client: "Editora Linhares", author: "Rafael Moraes", date: "28 fev 2026", status: "Assinado", size: "512 KB", source: "ai" },
  { name: "Procuração específica — Imóvel Vila Madalena", type: "Procuração", client: "Família Soares", author: "Diego Tomé", date: "26 fev 2026", status: "Finalizado", size: "94 KB", source: "manual" },
  { name: "Parecer — Impacto LGPD em sistema CRM", type: "Parecer Jurídico", client: "HelpFlow Brasil", author: "Camila Reis", date: "22 fev 2026", status: "Em revisão", size: "612 KB", source: "ai" },
];

const STATS = [
  { label: "Contratos", count: 76, trend: "+12%" },
  { label: "Procurações", count: 38, trend: "+4%" },
  { label: "Pareceres", count: 19, trend: "−2%" },
  { label: "Propostas", count: 9, trend: "+22%" },
];

const TYPE_ABBR: Record<string, string> = { Contrato: "CT", Procuração: "PR", Proposta: "PP", "Parecer Jurídico": "PJ" };

function statusStyle(s: string) {
  if (s === "Finalizado") return { bg: "rgba(46,160,67,0.12)", color: "#2ea043" };
  if (s === "Assinado") return { bg: tokens.color.accentSoft, color: tokens.color.accent };
  if (s === "Rascunho") return { bg: tokens.color.bgSunken, color: tokens.color.textMuted };
  return { bg: "rgba(2,13,37,0.06)", color: tokens.color.textMuted };
}

export default function HistoryPage() {
  return (
    <AppShell
      active="documentos"
      breadcrumb={["Documentos", "Histórico"]}
      actions={
        <Link href="/documents/new" className={btn({ variant: "primary" })} style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 4 }}>
          <Plus size={13} />Novo
        </Link>
      }
    >
      <div style={{ padding: "28px 40px 40px", maxWidth: 1200 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em", color: tokens.color.text }}>Histórico</h1>
          <p style={{ margin: "6px 0 0", fontSize: "13.5px", color: tokens.color.textMuted }}>
            142 documentos · 38 nos últimos 30 dias
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {STATS.map((s) => (
            <div key={s.label} className={card} style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: "11.5px", color: tokens.color.textMuted }}>{s.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 600, color: tokens.color.text, letterSpacing: "-0.02em" }}>{s.count}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: s.trend.startsWith("+") ? "#2ea043" : "#d97706" }}>{s.trend}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: tokens.color.textSubtle }}>
              <Search size={14} />
            </div>
            <input placeholder="Buscar por nome, cliente, número..." style={{
              width: "100%", height: 34, paddingLeft: 36, paddingRight: 12, paddingTop: 0, paddingBottom: 0,
              background: tokens.color.surface, border: `1px solid ${tokens.color.borderStrong}`,
              borderRadius: tokens.radius.sm, fontFamily: tokens.font.sans, fontSize: 13, color: tokens.color.text, outline: "none",
            }} />
          </div>
          <div style={{ display: "flex", gap: 4, background: tokens.color.bgSoft, borderRadius: 8, padding: 3 }}>
            {["Todos", "Contratos", "Procurações", "Propostas", "Pareceres"].map((t, i) => (
              <button key={t} style={{
                height: 26, padding: "0 10px", borderRadius: 6, border: "none",
                background: i === 0 ? tokens.color.surface : "transparent",
                color: i === 0 ? tokens.color.text : tokens.color.textMuted,
                fontSize: "11.5px", fontWeight: 500, cursor: "pointer",
                boxShadow: i === 0 ? tokens.color.shadowSm : "none",
              }}>{t}</button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <button className={btn({ variant: "secondary" })} style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 6 }}>
            <Filter size={13} />Filtros
          </button>
          <button className={btn({ variant: "secondary" })} style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 6 }}>
            <Calendar size={13} />Últimos 30 dias
          </button>
        </div>

        {/* Table */}
        <div className={card} style={{ overflow: "hidden", padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: tokens.color.bgSoft }}>
                {["Documento", "Cliente", "Autor", "Atualizado", "Status", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: "10.5px", fontWeight: 600, color: tokens.color.textSubtle, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DOCS.map((doc) => {
                const s = statusStyle(doc.status);
                const initials = doc.author.split(" ").map((n) => n[0]).join("").slice(0, 2);
                return (
                  <tr key={doc.name} style={{ borderTop: `1px solid ${tokens.color.border}` }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 28, height: 36, borderRadius: 4, background: "#FFFFFF",
                          border: `1px solid ${tokens.color.borderStrong}`,
                          display: "flex", alignItems: "flex-end", justifyContent: "center",
                          paddingBottom: 4, flexShrink: 0, position: "relative",
                        }}>
                          <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.04em", color: "#020D25", fontFamily: tokens.font.mono }}>
                            {TYPE_ABBR[doc.type] ?? "??"}
                          </span>
                          <span style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#C0A147", borderRadius: "4px 4px 0 0" }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: tokens.color.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: tokens.color.textSubtle, marginTop: 2 }}>
                            <span>{doc.type}</span>
                            <span style={{ width: 2, height: 2, borderRadius: "50%", background: "currentColor", opacity: 0.5, display: "inline-block" }} />
                            <span>{doc.size}</span>
                            {doc.source === "ai" && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: tokens.color.accent }}>
                                <Sparkles size={9} strokeWidth={2} />IA
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "12.5px", color: tokens.color.textMuted }}>{doc.client}</td>
                    <td style={{ padding: "12px 16px", fontSize: "12.5px", color: tokens.color.textMuted }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: "50%", background: tokens.color.bgSunken,
                          color: tokens.color.text, display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "9.5px", fontWeight: 600,
                        }}>{initials}</div>
                        {doc.author}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "12.5px", color: tokens.color.textSubtle }}>{doc.date}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 999,
                        background: s.bg, color: s.color,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                        {doc.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <button className={btn({ variant: "ghost" })} style={{ width: 28, height: 28, padding: 0 }}><Download size={14} /></button>
                        <button className={btn({ variant: "ghost" })} style={{ width: 28, height: 28, padding: 0 }}><MoreHorizontal size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 16px", borderTop: `1px solid ${tokens.color.border}`,
            background: tokens.color.bgSoft, fontSize: "11.5px", color: tokens.color.textMuted,
          }}>
            <span>Mostrando 7 de 142 documentos</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button className={btn({ variant: "ghost" })} style={{ width: 24, height: 24, padding: 0 }}><ChevronLeft size={13} /></button>
              <button className={btn({ variant: "ghost" })} style={{ width: 24, height: 24, padding: 0 }}><ChevronRight size={13} /></button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
