// Unified shell navigation + route metadata (label + icon per route), shared by
// the sidebar and the route-based tab strip. Icons are crm-icon names.
import type { CrmIconName } from "@/components/crm/crm-icons"

export interface SidebarItem {
  id: string
  label: string
  icon: CrmIconName
  href: string
  badge?: number
  socioPlus?: boolean // financeiro: visível só p/ Sócio/Admin/Financeiro (ver verFinanceiro)
}

export const SIDEBAR: SidebarItem[] = [
  { id: "inicio", label: "Início", icon: "home", href: "/" },
  { id: "documentos", label: "Documentos", icon: "fileText", href: "/documents" },
  { id: "financeiro", label: "Financeiro", icon: "wallet", href: "/financeiro", socioPlus: true },
  { id: "comercial", label: "Comercial", icon: "megaphone", href: "/comercial" },
  { id: "tarefas", label: "Tarefas", icon: "listChecks", href: "/tarefas" },
  { id: "clientes", label: "Clientes", icon: "users", href: "/clientes" },
  { id: "contratos", label: "Contratos", icon: "receipt", href: "/contratos" },
  { id: "processos", label: "Casos & Processos", icon: "scale", href: "/processos" },
  { id: "agenda", label: "Agenda", icon: "calendar", href: "/agenda" },
  // LexIA is no longer a sidebar "place" — the global LexIA bar (⌘K / dock pill)
  // is the single AI surface. The /lexia full page stays reachable from the bar's
  // "Expandir" action (and still has tab metadata below).
]

const ROUTE_META: Record<string, { label: string; icon: CrmIconName }> = {
  "/": { label: "Início", icon: "home" },
  "/documents": { label: "Documentos", icon: "fileText" },
  "/financeiro": { label: "Financeiro", icon: "wallet" },
  "/comercial": { label: "Comercial", icon: "megaphone" },
  "/tarefas": { label: "Tarefas", icon: "listChecks" },
  "/projetos": { label: "Projetos", icon: "listChecks" },
  "/clientes": { label: "Clientes", icon: "users" },
  "/contratos": { label: "Contratos", icon: "receipt" },
  "/casos": { label: "Casos", icon: "briefcase" },
  "/processos": { label: "Casos & Processos", icon: "scale" },
  "/agenda": { label: "Agenda", icon: "calendar" },
  "/plano-acao": { label: "Plano de ação", icon: "target" },
  "/lexia": { label: "LexIA", icon: "sparkles" },
  "/notificacoes": { label: "Notificações", icon: "bell" },
}

/** Tab/label metadata for a pathname. Cliente detail is dynamic (label set by the page). */
export function metaForPath(pathname: string): { label: string; icon: CrmIconName } {
  if (/^\/clientes\/\d+/.test(pathname)) return { label: "Cliente", icon: "user" }
  if (/^\/processos\/\d+/.test(pathname)) return { label: "Processo", icon: "scale" }
  if (pathname.startsWith("/documents/")) return { label: "Documento", icon: "fileText" }
  return ROUTE_META[pathname] ?? { label: pathname.replace(/^\//, "") || "Início", icon: "fileText" }
}

/** The sidebar item id that should be highlighted for a given pathname. */
export function activeNavId(pathname: string): string {
  if (pathname === "/") return "inicio"
  const seg = "/" + (pathname.split("/")[1] ?? "")
  if (seg === "/projetos") return "tarefas" // Projetos é parte do módulo Tarefas
  const item = SIDEBAR.find((s) => s.href === seg)
  return item?.id ?? ""
}
