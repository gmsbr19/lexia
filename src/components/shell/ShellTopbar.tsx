"use client"

import { Bell, ChevronRight, Moon, PanelLeft, Sun } from "lucide-react"
import type { ReactNode } from "react"
import { btn } from "@/styles/components.css"
import { tokens } from "@/styles/tokens.css"
import { topbar } from "./shell.css"

interface ShellTopbarProps {
    breadcrumb: string[]
    actions?: ReactNode
    dark: boolean
    onToggleCollapsed: () => void
    onToggleDark: () => void
}

export function ShellTopbar({
    breadcrumb,
    actions,
    dark,
    onToggleCollapsed,
    onToggleDark,
}: ShellTopbarProps) {
    return (
        <header className={topbar}>
            <button
                onClick={onToggleCollapsed}
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: "none",
                    background: "transparent",
                    color: tokens.color.textMuted,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                }}
            >
                <PanelLeft size={16} />
            </button>

            <nav
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "12.5px",
                    color: tokens.color.textMuted,
                }}
            >
                {breadcrumb.map((item, index) => (
                    <span
                        key={index}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        {index > 0 && (
                            <ChevronRight size={12} color={tokens.color.textSubtle} />
                        )}
                        <span
                            style={{
                                color:
                                    index === breadcrumb.length - 1
                                        ? tokens.color.text
                                        : tokens.color.textMuted,
                                fontWeight:
                                    index === breadcrumb.length - 1 ? 500 : 400,
                            }}
                        >
                            {item}
                        </span>
                    </span>
                ))}
            </nav>

            <div
                style={{
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }}
            >
                

                <button
                    onClick={onToggleDark}
                    className={btn({ variant: "ghost" })}
                    style={{ width: 32, height: 32, padding: 0 }}
                    title="Alternar tema"
                >
                    {dark ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <button
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: "none",
                        background: "transparent",
                        color: tokens.color.textMuted,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        position: "relative",
                    }}
                >
                    <Bell size={16} />
                    <span
                        style={{
                            position: "absolute",
                            top: 7,
                            right: 8,
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: tokens.brand.gold,
                        }}
                    />
                </button>
            </div>
        </header>
    )
}