"use client"

import Link from "next/link"
import * as Tooltip from "@radix-ui/react-tooltip"
import { ChevronRight, Search, Settings } from "lucide-react"
import { NAV_ITEMS, LIB_ITEMS, type ShellNavItem } from "./shell-data"
import { navBadge, navItem, navItemActive, sidebar } from "./shell.css"
import { tokens } from "@/styles/tokens.css"

interface ShellSidebarProps {
    active: string
    collapsed: boolean
}

function NavItemLink({
    icon: Icon,
    label,
    active,
    badge,
    collapsed,
    href,
}: ShellNavItem & { active: boolean; collapsed: boolean }) {
    const className = [navItem, active ? navItemActive : ""]
        .filter(Boolean)
        .join(" ")

    const link = (
        <Link
            href={href}
            className={className}
            style={{
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "8px" : "7px 10px",
            }}
        >
            <Icon size={17} strokeWidth={active ? 2 : 1.75} />
            {!collapsed && <span>{label}</span>}
            {!collapsed && badge && <span className={navBadge}>{badge}</span>}
        </Link>
    )

    if (collapsed) {
        return (
            <Tooltip.Root delayDuration={300}>
                <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
                <Tooltip.Portal>
                    <Tooltip.Content
                        side="right"
                        sideOffset={8}
                        style={{
                            background: tokens.color.text,
                            color: tokens.color.bg,
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 500,
                        }}
                    >
                        {label}
                    </Tooltip.Content>
                </Tooltip.Portal>
            </Tooltip.Root>
        )
    }

    return link
}

function LogoMark({ collapsed }: { collapsed: boolean }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 4px",
                minHeight: 36,
            }}
        >
            <div
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background:
                        "linear-gradient(135deg, #C0A147 0%, #9a7f2e 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
                    flexShrink: 0,
                }}
            >
                <span
                    style={{
                        fontFamily: "Georgia, serif",
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#020D25",
                        letterSpacing: "-0.02em",
                    }}
                >
                    L
                </span>
            </div>
            {!collapsed && (
                <div style={{ display: "flex", alignItems: "baseline" }}>
                    <span
                        style={{
                            fontWeight: 600,
                            fontSize: 15,
                            letterSpacing: "-0.02em",
                            color: tokens.color.text,
                        }}
                    >
                        Lex
                    </span>
                    <span
                        style={{
                            fontWeight: 600,
                            fontSize: 15,
                            letterSpacing: "-0.02em",
                            color: tokens.color.accent,
                        }}
                    >
                        IA
                    </span>
                </div>
            )}
        </div>
    )
}

function UserCard({ collapsed }: { collapsed: boolean }) {
    if (collapsed) {
        return null
    }

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                marginTop: 6,
                background: tokens.color.surface,
                border: `1px solid ${tokens.color.border}`,
            }}
        >
            <div
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #020D25, #1a2c5a)",
                    color: "#C0A147",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 600,
                    flexShrink: 0,
                }}
            >
                TP
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
                <div
                    style={{
                        fontSize: "12.5px",
                        fontWeight: 500,
                        color: tokens.color.text,
                        letterSpacing: "-0.01em",
                    }}
                >
                    Thiago Portela
                </div>
                <div
                    style={{
                        fontSize: 11,
                        color: tokens.color.textSubtle,
                    }}
                >
                    Gestor
                </div>
            </div>
            <ChevronRight size={14} color={tokens.color.textSubtle} />
        </div>
    )
}

export function ShellSidebar({ active, collapsed }: ShellSidebarProps) {
    return (
        <Tooltip.Provider>
            <aside className={sidebar} style={{ width: collapsed ? 64 : 232 }}>
                <div style={{ padding: "4px 4px 14px" }}>
                    <LogoMark collapsed={collapsed} />
                </div>

                {!collapsed && (
                    <div style={{ position: "relative", marginBottom: 8 }}>
                        <div
                            style={{
                                position: "absolute",
                                left: 10,
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: tokens.color.textSubtle,
                            }}
                        >
                            <Search size={14} />
                        </div>
                        <input
                            placeholder="Buscar..."
                            style={{
                                width: "100%",
                                height: 32,
                                paddingLeft: 32,
                                paddingRight: 40,
                                paddingTop: 0,
                                paddingBottom: 0,
                                background: tokens.color.surface,
                                border: `1px solid ${tokens.color.borderStrong}`,
                                borderRadius: tokens.radius.sm,
                                fontFamily: tokens.font.sans,
                                fontSize: "12.5px",
                                color: tokens.color.text,
                                outline: "none",
                            }}
                        />
                        <span
                            style={{
                                position: "absolute",
                                right: 8,
                                top: "50%",
                                transform: "translateY(-50%)",
                                fontSize: "10.5px",
                                color: tokens.color.textSubtle,
                                background: tokens.color.bgSunken,
                                padding: "2px 5px",
                                borderRadius: 4,
                                fontFamily: tokens.font.mono,
                            }}
                        >
                            ⌘K
                        </span>
                    </div>
                )}

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                    }}
                >
                    {NAV_ITEMS.map((item) => (
                        <NavItemLink
                            key={item.id}
                            {...item}
                            active={active === item.id}
                            collapsed={collapsed}
                        />
                    ))}
                </div>

                {!collapsed && (
                    <div
                        style={{
                            marginTop: 16,
                            padding: "0 8px",
                            fontSize: "10.5px",
                            fontWeight: 600,
                            letterSpacing: "0.06em",
                            color: tokens.color.textSubtle,
                            textTransform: "uppercase",
                        }}
                    >
                        Biblioteca
                    </div>
                )}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        marginTop: !collapsed ? 8 : 12,
                    }}
                >
                    {LIB_ITEMS.map((item) => (
                        <NavItemLink
                            key={item.id}
                            {...item}
                            active={active === item.id}
                            collapsed={collapsed}
                        />
                    ))}
                </div>

                <div
                    style={{
                        marginTop: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                    }}
                >
                    <NavItemLink
                        icon={Settings}
                        label="Configurações"
                        active={false}
                        collapsed={collapsed}
                        href="#"
                        id="Configurações"
                        badge={undefined}
                    />
                    <UserCard collapsed={collapsed} />
                </div>
            </aside>
        </Tooltip.Provider>
    )
}