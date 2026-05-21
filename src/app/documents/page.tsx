"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Scroll, Feather, Briefcase, Scale, Sparkles, Search,
  Filter, Calendar, Plus, Download, MoreHorizontal,
  ChevronLeft, ChevronRight, FileText, Lock, Upload,
  ArrowRight, Send,
} from "lucide-react"
import { AppShell } from "@/components/shell/AppShell"
import { btn, card } from "@/styles/components.css"
import { tokens } from "@/styles/tokens.css"
import {
  DOCUMENT_TEMPLATES, DOC_CATEGORIES, getFeaturedTemplates,
  templateEditorPath, type DocCategory,
} from "@/lib/documents/registry"

// ── icon map ───────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Scroll, Feather, Briefcase, Scale,
}

// ── static mock data ───────────────────────────────────────────────────────────

const DRAFTS = [
  { name: "Contrato de Honorários — Helena Vargas", type: "Contrato", modified: "há 2 horas", progress: 72, templateId: "contrato-honorarios" },
  { name: "Procuração ad judicia — Construtora Aurora", type: "Procuração", modified: "ontem", progress: 45, templateId: "contrato-honorarios" },
  { name: "Parecer — Cláusula 4.2 (Mendonça)", type: "Parecer Jurídico", modified: "3 mai", progress: 90, templateId: "contrato-honorarios" },
]

const DOCS = [
  { name: "Contrato de Honorários — Helena Vargas", type: "Contrato", client: "Helena Vargas", author: "Rafael Moraes", date: "há 4 min", status: "Finalizado", size: "324 KB", source: "ai" },
  { name: "Procuração ad judicia — Construtora Aurora S/A", type: "Procuração", client: "Aurora S/A", author: "Camila Reis", date: "ontem · 17:42", status: "Assinado", size: "118 KB", source: "manual" },
  { name: "Parecer — Cláusula 4.2 do contrato Mendonça", type: "Parecer Jurídico", client: "Mendonça & Filhos", author: "Rafael Moraes", date: "3 mar 2026", status: "Finalizado", size: "446 KB", source: "ai" },
  { name: "Proposta de honorários — Tech Holding LTDA", type: "Proposta", client: "Tech Holding", author: "Camila Reis", date: "2 mar 2026", status: "Rascunho", size: "86 KB", source: "manual" },
  { name: "Contrato de cessão — Editora Linhares", type: "Contrato", client: "Editora Linhares", author: "Rafael Moraes", date: "28 fev 2026", status: "Assinado", size: "512 KB", source: "ai" },
  { name: "Procuração específica — Imóvel Vila Madalena", type: "Procuração", client: "Família Soares", author: "Diego Tomé", date: "26 fev 2026", status: "Finalizado", size: "94 KB", source: "manual" },
  { name: "Parecer — Impacto LGPD em sistema CRM", type: "Parecer Jurídico", client: "HelpFlow Brasil", author: "Camila Reis", date: "22 fev 2026", status: "Em revisão", size: "612 KB", source: "ai" },
]

const STATS = [
  { label: "Contratos", count: 76, trend: "+12%" },
  { label: "Procurações", count: 38, trend: "+4%" },
  { label: "Pareceres", count: 19, trend: "−2%" },
  { label: "Propostas", count: 9, trend: "+22%" },
]

const TYPE_ABBR: Record<string, string> = { Contrato: "CT", Procuração: "PR", Proposta: "PP", "Parecer Jurídico": "PJ" }

const EXAMPLE_PROMPTS = [
  "Contrato de honorários mensais R$ 8.500",
  "Procuração ad judicia para ação trabalhista",
  "Proposta de consultoria empresarial",
  "Parecer sobre impacto da LGPD",
]

// ── helpers ────────────────────────────────────────────────────────────────────

type Tab = "criar" | "meus-documentos" | "modelos"

function statusStyle(s: string) {
  if (s === "Finalizado") return { bg: "rgba(46,160,67,0.12)", color: "#2ea043" }
  if (s === "Assinado")   return { bg: tokens.color.accentSoft, color: tokens.color.accent }
  if (s === "Rascunho")   return { bg: tokens.color.bgSunken, color: tokens.color.textMuted }
  return { bg: "rgba(2,13,37,0.06)", color: tokens.color.textMuted }
}

// ── Tab strip ──────────────────────────────────────────────────────────────────

function TabStrip({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "criar",          label: "Criar" },
    { id: "meus-documentos",label: "Meus documentos (142)" },
    { id: "modelos",        label: "Modelos (32)" },
  ]
  return (
    <div style={{
      display: "flex", gap: 0,
      borderBottom: `1px solid ${tokens.color.border}`,
      padding: "0 40px",
      background: tokens.color.bg,
      flexShrink: 0,
    }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            height: 44, padding: "0 16px", border: "none", background: "transparent",
            cursor: "pointer", fontFamily: tokens.font.sans,
            fontSize: "13.5px", fontWeight: active === t.id ? 600 : 400,
            color: active === t.id ? tokens.color.text : tokens.color.textMuted,
            borderBottom: active === t.id ? `2px solid ${tokens.color.accent}` : "2px solid transparent",
            marginBottom: -1, transition: "color 0.15s",
          }}
        >{t.label}</button>
      ))}
    </div>
  )
}

// ── Tab: Criar ─────────────────────────────────────────────────────────────────

function CriarTab({ onNavigateToModelos }: { onNavigateToModelos: (filter?: DocCategory) => void }) {
  const router = useRouter()
  const [prompt, setPrompt] = useState("")
  const featured = getFeaturedTemplates()

  return (
    <div style={{ padding: "32px 40px 48px", maxWidth: 1100, overflowY: "auto", height: "100%" }}>
      {/* Hero: AI composer */}
      <div style={{
        background: tokens.color.surface, border: `1px solid ${tokens.color.border}`,
        borderRadius: 20, padding: "24px 28px 20px", marginBottom: 36,
        boxShadow: tokens.color.shadowSm,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 8,
            background: "linear-gradient(135deg, #C0A147, #9a7f2e)",
            color: "#020D25", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles size={13} strokeWidth={2} />
          </div>
          <span style={{ fontSize: "13px", fontWeight: 600, color: tokens.color.text }}>Criar com IA</span>
        </div>

        <div style={{
          background: tokens.color.bg, border: `1px solid ${tokens.color.borderStrong}`,
          borderRadius: 14, padding: "12px 14px 10px",
        }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Descreva o documento que precisa... Ex: Contrato de honorários mensais de R$ 8.500 para Helena Vargas, consultoria empresarial, 12 meses com renovação automática."
            rows={3}
            style={{
              width: "100%", border: "none", outline: "none", resize: "none",
              background: "transparent", fontFamily: tokens.font.sans,
              fontSize: "13.5px", color: tokens.color.text, lineHeight: 1.6,
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${tokens.color.border}` }}>
            <div style={{ fontSize: "11px", color: tokens.color.textSubtle }}>
              A IA usa os modelos do escritório e gera o documento em papel timbrado
            </div>
            <button
              onClick={() => router.push(templateEditorPath("contrato-honorarios"))}
              className={btn({ variant: "gold" })}
              style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Send size={13} />
              Criar com IA
            </button>
          </div>
        </div>

        {/* Example chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {EXAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => setPrompt(p)}
              style={{
                fontSize: "11.5px", padding: "4px 10px", borderRadius: 999,
                border: `1px solid ${tokens.color.border}`,
                background: tokens.color.bgSoft, color: tokens.color.textMuted,
                cursor: "pointer", fontFamily: tokens.font.sans,
              }}
            >{p}</button>
          ))}
        </div>
      </div>

      {/* 1. Continue de onde parou */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.015em", color: tokens.color.text }}>
            Continue de onde parou
          </h2>
          <button
            onClick={() => {}} // future: open meus-documentos filtered to rascunhos
            style={{ fontSize: "12px", color: tokens.color.accent, fontWeight: 500, background: "none", border: "none", cursor: "pointer", fontFamily: tokens.font.sans }}
          >Ver todos →</button>
        </div>
        <div className={card} style={{ padding: 4 }}>
          {DRAFTS.map((d) => (
            <Link
              key={d.name}
              href={templateEditorPath(d.templateId)}
              style={{
                display: "grid", gridTemplateColumns: "1fr auto 100px", alignItems: "center",
                gap: 16, padding: "12px 14px", borderRadius: 10,
                textDecoration: "none", cursor: "pointer",
                borderBottom: `1px solid ${tokens.color.border}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, background: tokens.color.bgSunken,
                  display: "flex", alignItems: "center", justifyContent: "center", color: tokens.color.textMuted, flexShrink: 0,
                }}><FileText size={14} /></div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: tokens.color.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                  <div style={{ fontSize: "11.5px", color: tokens.color.textSubtle }}>{d.type} · {d.modified}</div>
                </div>
              </div>
              <span style={{ fontSize: "11.5px", color: tokens.color.textMuted, whiteSpace: "nowrap" }}>{d.progress}% preenchido</span>
              <div style={{ height: 4, borderRadius: 999, background: tokens.color.borderStrong, overflow: "hidden" }}>
                <div style={{ width: `${d.progress}%`, height: "100%", background: "linear-gradient(90deg, #C0A147, #9a7f2e)", borderRadius: 999 }} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 2. Atalhos do escritório */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, letterSpacing: "-0.015em", color: tokens.color.text }}>
          Atalhos do escritório
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {featured.map((t) => (
            <Link
              key={t.id}
              href={templateEditorPath(t.id)}
              style={{
                background: tokens.color.surface, border: `1px solid ${tokens.color.border}`,
                borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column",
                gap: 10, textDecoration: "none", cursor: "pointer",
                boxShadow: tokens.color.shadowSm, position: "relative", overflow: "hidden",
              }}
            >
              <div style={{
                position: "absolute", top: -24, right: -24, width: 80, height: 80,
                borderRadius: "50%", background: tokens.color.accentSoft, opacity: 0.4,
              }} />
              <div style={{ fontSize: "13.5px", fontWeight: 600, color: tokens.color.text, lineHeight: 1.3 }}>
                {t.name}
              </div>
              <div style={{ fontSize: "11.5px", color: tokens.color.textMuted }}>{t.description}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: `1px solid ${tokens.color.border}` }}>
                <span style={{ fontSize: "11px", color: tokens.color.textSubtle }}>{t.usageCount} usos</span>
                <ArrowRight size={13} color={tokens.color.textSubtle} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Navegar por tipo */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.015em", color: tokens.color.text }}>
            Navegar por tipo
          </h2>
          <span style={{ fontSize: "11.5px", color: tokens.color.textSubtle }}>
            Clique para ver todos os modelos daquele tipo
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {DOC_CATEGORIES.map((cat) => {
            const Icon = ICON_MAP[cat.iconName] ?? FileText
            const count = DOCUMENT_TEMPLATES.filter((t) => t.category === cat.id).length
            return (
              <button
                key={cat.id}
                onClick={() => onNavigateToModelos(cat.id)}
                style={{
                  background: tokens.color.surface, border: `1px solid ${tokens.color.border}`,
                  borderRadius: 14, padding: "18px 18px 16px",
                  display: "flex", flexDirection: "column", gap: 10,
                  cursor: "pointer", textAlign: "left", fontFamily: tokens.font.sans,
                  boxShadow: tokens.color.shadowSm, position: "relative", overflow: "hidden",
                }}
              >
                <div style={{
                  position: "absolute", top: -24, right: -24, width: 80, height: 80,
                  borderRadius: "50%", background: tokens.color.accentSoft, opacity: 0.4,
                }} />
                <div style={{
                  width: 38, height: 38, borderRadius: 10, background: tokens.color.bgSunken,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: tokens.color.accent,
                }}>
                  <Icon size={18} strokeWidth={1.6} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: tokens.color.text, letterSpacing: "-0.015em", marginBottom: 4 }}>{cat.id}</div>
                  <div style={{ fontSize: "12px", color: tokens.color.textMuted, lineHeight: 1.45 }}>{cat.description}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${tokens.color.border}` }}>
                  <span style={{ fontSize: "11px", color: tokens.color.textSubtle }}>{count} modelos</span>
                  <ArrowRight size={13} color={tokens.color.textSubtle} />
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

// ── Tab: Meus documentos ───────────────────────────────────────────────────────

function MeusDocumentosTab() {
  const [filterType, setFilterType] = useState("Todos")

  return (
    <div style={{ padding: "28px 40px 40px", maxWidth: 1200, overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-0.025em", color: tokens.color.text }}>Meus documentos</h1>
        <p style={{ margin: "6px 0 0", fontSize: "13px", color: tokens.color.textMuted }}>
          142 documentos · 38 nos últimos 30 dias
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
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
            borderRadius: tokens.radius.sm, fontFamily: tokens.font.sans, fontSize: 13,
            color: tokens.color.text, outline: "none",
          }} />
        </div>
        <div style={{ display: "flex", gap: 4, background: tokens.color.bgSoft, borderRadius: 8, padding: 3 }}>
          {["Todos", "Contratos", "Procurações", "Propostas", "Pareceres"].map((t) => (
            <button key={t} onClick={() => setFilterType(t)} style={{
              height: 26, padding: "0 10px", borderRadius: 6, border: "none",
              background: filterType === t ? tokens.color.surface : "transparent",
              color: filterType === t ? tokens.color.text : tokens.color.textMuted,
              fontSize: "11.5px", fontWeight: 500, cursor: "pointer",
              boxShadow: filterType === t ? tokens.color.shadowSm : "none",
              fontFamily: tokens.font.sans,
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
              const s = statusStyle(doc.status)
              const initials = doc.author.split(" ").map((n) => n[0]).join("").slice(0, 2)
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
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: tokens.color.bgSunken, color: tokens.color.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9.5px", fontWeight: 600 }}>{initials}</div>
                      {doc.author}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "12.5px", color: tokens.color.textSubtle }}>{doc.date}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 999, background: s.bg, color: s.color }}>
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
              )
            })}
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: `1px solid ${tokens.color.border}`, background: tokens.color.bgSoft, fontSize: "11.5px", color: tokens.color.textMuted }}>
          <span>Mostrando 7 de 142 documentos</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button className={btn({ variant: "ghost" })} style={{ width: 24, height: 24, padding: 0 }}><ChevronLeft size={13} /></button>
            <button className={btn({ variant: "ghost" })} style={{ width: 24, height: 24, padding: 0 }}><ChevronRight size={13} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab: Modelos ───────────────────────────────────────────────────────────────

function ModelosTab({ initialFilter }: { initialFilter: string }) {
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter)

  // Sync when query param changes (e.g. navigating from home cards)
  useEffect(() => { setActiveFilter(initialFilter) }, [initialFilter])

  const filtered = activeFilter
    ? DOCUMENT_TEMPLATES.filter((t) => t.category === activeFilter)
    : DOCUMENT_TEMPLATES

  return (
    <div style={{ padding: "28px 40px 48px", maxWidth: 1100, overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-0.025em", color: tokens.color.text }}>Modelos</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={btn({ variant: "secondary" })} style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 6 }}>
            <Upload size={13} />Importar .docx
          </button>
          <button className={btn({ variant: "primary" })} style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={13} />Novo modelo
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {["", ...DOC_CATEGORIES.map((c) => c.id)].map((f) => (
          <button
            key={f || "todos"}
            onClick={() => setActiveFilter(f)}
            style={{
              height: 30, padding: "0 14px", borderRadius: 999,
              border: `1px solid ${activeFilter === f ? tokens.color.accent : tokens.color.border}`,
              background: activeFilter === f ? tokens.color.accentSoft : tokens.color.surface,
              color: activeFilter === f ? tokens.color.accent : tokens.color.textMuted,
              fontSize: "12.5px", fontWeight: activeFilter === f ? 600 : 400,
              cursor: "pointer", fontFamily: tokens.font.sans,
            }}
          >{f || "Todos"}</button>
        ))}
      </div>

      {/* Template grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {filtered.map((t) => {
          const cat = DOC_CATEGORIES.find((c) => c.id === t.category)
          const Icon = ICON_MAP[cat?.iconName ?? "Scroll"] ?? FileText

          if (!t.available) {
            return (
              <div key={t.id} style={{
                background: tokens.color.surface, border: `1px solid ${tokens.color.border}`,
                borderRadius: 16, padding: "20px 20px 16px",
                opacity: 0.55, position: "relative", overflow: "hidden",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: tokens.color.bgSunken, display: "flex", alignItems: "center", justifyContent: "center", color: tokens.color.textMuted }}>
                    <Icon size={18} strokeWidth={1.6} />
                  </div>
                  <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: tokens.color.bgSunken, color: tokens.color.textSubtle, display: "flex", alignItems: "center", gap: 4 }}>
                    <Lock size={9} />Em breve
                  </span>
                </div>
                <div style={{ fontSize: "13.5px", fontWeight: 600, color: tokens.color.text, marginBottom: 6, lineHeight: 1.3 }}>{t.name}</div>
                <div style={{ fontSize: "12px", color: tokens.color.textMuted, lineHeight: 1.45 }}>{t.description}</div>
              </div>
            )
          }

          return (
            <Link
              key={t.id}
              href={templateEditorPath(t.id)}
              style={{
                background: tokens.color.surface, border: `1px solid ${tokens.color.border}`,
                borderRadius: 16, padding: "20px 20px 16px",
                textDecoration: "none", display: "block",
                boxShadow: tokens.color.shadowSm, position: "relative", overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div style={{
                position: "absolute", top: -20, right: -20, width: 70, height: 70,
                borderRadius: "50%", background: tokens.color.accentSoft, opacity: 0.4,
              }} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: tokens.color.bgSunken, display: "flex", alignItems: "center", justifyContent: "center", color: tokens.color.accent }}>
                  <Icon size={18} strokeWidth={1.6} />
                </div>
                <span style={{
                  fontSize: "10.5px", fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                  background: tokens.color.accentSoft, color: tokens.color.accent,
                }}>{t.category}</span>
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: 600, color: tokens.color.text, marginBottom: 6, lineHeight: 1.3 }}>{t.name}</div>
              <div style={{ fontSize: "12px", color: tokens.color.textMuted, lineHeight: 1.45, marginBottom: 14 }}>{t.description}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${tokens.color.border}` }}>
                <div style={{ fontSize: "11px", color: tokens.color.textSubtle }}>
                  {t.clauseCount ? `${t.clauseCount} cláusulas` : ""}
                  {t.clauseCount && t.lastRevision ? " · " : ""}
                  {t.lastRevision ? `Rev. ${t.lastRevision}` : ""}
                </div>
                <ArrowRight size={13} color={tokens.color.accent} />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Page with URL-aware tabs ───────────────────────────────────────────────────

function DocumentsContent() {
  const params = useSearchParams()
  const router = useRouter()

  const initialTab = (params.get("tab") as Tab | null) ?? "criar"
  const initialFilter = params.get("filter") ?? ""

  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [modelosFilter, setModelosFilter] = useState(initialFilter)

  function handleTabChange(t: Tab) {
    setActiveTab(t)
    router.replace(`/documents?tab=${t}`, { scroll: false })
  }

  function handleNavigateToModelos(filter?: DocCategory) {
    setModelosFilter(filter ?? "")
    setActiveTab("modelos")
    router.replace(`/documents?tab=modelos${filter ? `&filter=${encodeURIComponent(filter)}` : ""}`, { scroll: false })
  }

  const tabActions =
    activeTab === "meus-documentos" ? (
      <Link href={templateEditorPath("contrato-honorarios")} className={btn({ variant: "primary" })} style={{ height: 32, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 4 }}>
        <Plus size={13} />Novo documento
      </Link>
    ) : undefined

  return (
    <AppShell active="documentos" breadcrumb={["Documentos"]} actions={tabActions}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <TabStrip active={activeTab} onChange={handleTabChange} />
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {activeTab === "criar" && <CriarTab onNavigateToModelos={handleNavigateToModelos} />}
          {activeTab === "meus-documentos" && <MeusDocumentosTab />}
          {activeTab === "modelos" && <ModelosTab initialFilter={modelosFilter} />}
        </div>
      </div>
    </AppShell>
  )
}

export default function DocumentsPage() {
  return (
    <Suspense>
      <DocumentsContent />
    </Suspense>
  )
}
