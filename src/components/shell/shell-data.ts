import type { LucideIcon } from "lucide-react"
import { Briefcase, Calendar, FileText, Home, ListTodo, Megaphone, Receipt, Users, Wallet } from "lucide-react"

export interface ShellNavItem {
    id: string
    label: string
    icon: LucideIcon
    href: string
    badge?: string
}

export const NAV_ITEMS: ShellNavItem[] = [
    { id: "inicio", label: "Início", icon: Home, href: "/" },
    {
        id: "documentos",
        label: "Documentos",
        icon: FileText,
        href: "/documents",
        badge: "12",
    },
    { id: "financeiro", label: "Financeiro", icon: Wallet, href: "/financeiro" },
    { id: "comercial", label: "Comercial", icon: Megaphone, href: "/comercial" },
    { id: "tarefas", label: "Tarefas", icon: ListTodo, href: "/tarefas" },
    { id: "clientes", label: "Clientes", icon: Users, href: "/clientes" },
    { id: "contratos", label: "Contratos", icon: Receipt, href: "/contratos" },
    { id: "casos", label: "Casos", icon: Briefcase, href: "/casos" },
    { id: "agenda", label: "Agenda", icon: Calendar, href: "/agenda" },
]