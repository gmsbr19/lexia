import Link from "next/link";
import { FileText, Scroll, Briefcase, Scale, Feather, ArrowRight, MoreHorizontal } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { btn, card } from "@/styles/components.css";
import { tokens } from "@/styles/tokens.css";

const DOC_TYPES = [
  {
    icon: Scroll, name: "Contrato", count: 14, href: "/documents/new",
    description: "Prestação de serviços, locação, honorários e demais avenças.",
  },
  {
    icon: Feather, name: "Procuração", count: 6, href: "/documents/new",
    description: "Ad judicia, com poderes específicos ou cláusulas reservadas.",
  },
  {
    icon: Briefcase, name: "Proposta", count: 4, href: "/documents/new",
    description: "Carta-proposta de honorários e escopo de atuação técnica.",
  },
  {
    icon: Scale, name: "Parecer Jurídico", count: 8, href: "/documents/new",
    description: "Análise técnica fundamentada com conclusão e recomendações.",
  },
];

const RECENT_DOCS = [
  { name: "Contrato de Honorários — Helena Vargas", type: "Contrato", client: "Helena Vargas", modified: "há 2 horas", status: "Rascunho" },
  { name: "Procuração ad judicia — Construtora Aurora", type: "Procuração", client: "Aurora S/A", modified: "ontem", status: "Revisão" },
  { name: "Parecer sobre cláusula 4.2 — Caso Mendonça", type: "Parecer Jurídico", client: "Mendonça & Filhos", modified: "3 mar", status: "Finalizado" },
];

function statusStyle(status: string) {
  if (status === "Finalizado") return { bg: "rgba(46, 160, 67, 0.12)", color: "#2ea043" };
  if (status === "Revisão") return { bg: tokens.color.accentSoft, color: tokens.color.accent };
  return { bg: tokens.color.bgSunken, color: tokens.color.textMuted };
}

export default function DocumentsPage() {
  return (
    <AppShell
      active="documentos"
      breadcrumb={["Documentos"]}
      actions={
        <Link href="/documents/new" className={btn({ variant: "primary" })} style={{ height: 34, fontSize: 13 }}>
          Novo documento
        </Link>
      }
    >
      <div style={{ padding: "32px 40px 40px", maxWidth: 1200 }}>
        {/* Hero */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: "11.5px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: tokens.color.accent, marginBottom: 8 }}>
            Documentos
          </div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: "-0.025em", color: tokens.color.text }}>
            O que vamos criar hoje?
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: "14.5px", color: tokens.color.textMuted, letterSpacing: "-0.005em", maxWidth: 560, lineHeight: 1.55 }}>
            Escolha um modelo para começar. Cada documento sai pronto no papel timbrado do escritório.
          </p>
        </div>

        {/* Doc type cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 40 }}>
          {DOC_TYPES.map(({ icon: Icon, name, count, href, description }) => (
            <Link key={name} href={href} style={{ textDecoration: "none" }}>
              <div style={{
                background: tokens.color.surface, border: `1px solid ${tokens.color.border}`,
                borderRadius: 16, padding: "22px 22px 20px",
                cursor: "pointer", transition: "transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
                boxShadow: tokens.color.shadowSm, display: "flex", flexDirection: "column", gap: 16,
                position: "relative", overflow: "hidden", minHeight: 220,
              }}>
                <div style={{
                  position: "absolute", top: -40, right: -40, width: 140, height: 140,
                  borderRadius: "50%", background: tokens.color.accentSoft, opacity: 0.5, filter: "blur(2px)",
                }} />
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: tokens.color.bgSunken,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: tokens.color.accent, position: "relative",
                }}>
                  <Icon size={22} strokeWidth={1.6} />
                </div>
                <div style={{ position: "relative", flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: tokens.color.text, letterSpacing: "-0.02em", marginBottom: 6 }}>{name}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: tokens.color.textMuted }}>{description}</div>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  paddingTop: 14, borderTop: `1px solid ${tokens.color.border}`, position: "relative",
                }}>
                  <span style={{ fontSize: "11.5px", color: tokens.color.textSubtle }}>{count} templates</span>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", background: tokens.color.bgSunken,
                    display: "flex", alignItems: "center", justifyContent: "center", color: tokens.color.textMuted,
                  }}>
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent docs */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em", color: tokens.color.text }}>
              Continuar editando
            </h2>
            <Link href="/documents/history" style={{ fontSize: "12.5px", color: tokens.color.accent, fontWeight: 500, textDecoration: "none" }}>
              Ver todos →
            </Link>
          </div>

          <div className={card} style={{ padding: 4 }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1.6fr 0.9fr 1fr 0.7fr 0.4fr",
              gap: 16, padding: "10px 16px",
              fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.08em",
              color: tokens.color.textSubtle, textTransform: "uppercase",
              borderBottom: `1px solid ${tokens.color.border}`,
            }}>
              <div>Documento</div><div>Cliente</div><div>Atualizado</div><div>Status</div><div />
            </div>
            {RECENT_DOCS.map((doc) => {
              const s = statusStyle(doc.status);
              return (
                <div key={doc.name} style={{
                  display: "grid", gridTemplateColumns: "1.6fr 0.9fr 1fr 0.7fr 0.4fr",
                  alignItems: "center", gap: 16, padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: tokens.color.bgSunken,
                      display: "flex", alignItems: "center", justifyContent: "center", color: tokens.color.textMuted, flexShrink: 0,
                    }}><FileText size={15} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "13.5px", fontWeight: 500, color: tokens.color.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                      <div style={{ fontSize: "11.5px", color: tokens.color.textSubtle }}>{doc.type}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: "12.5px", color: tokens.color.textMuted }}>{doc.client}</div>
                  <div style={{ fontSize: "12.5px", color: tokens.color.textSubtle }}>{doc.modified}</div>
                  <div>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 999,
                      background: s.bg, color: s.color,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                      {doc.status}
                    </span>
                  </div>
                  <div style={{ textAlign: "right", color: tokens.color.textSubtle }}><MoreHorizontal size={16} /></div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
