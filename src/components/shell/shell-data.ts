import type { LucideIcon } from "lucide-react"
import { Briefcase, Calendar, FileText, Home, Users } from "lucide-react"

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
    { id: "casos", label: "Casos", icon: Briefcase, href: "#" },
    { id: "clientes", label: "Clientes", icon: Users, href: "#" },
    { id: "agenda", label: "Agenda", icon: Calendar, href: "#" },
]