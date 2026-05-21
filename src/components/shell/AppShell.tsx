"use client"

import { useState } from "react"
import { mainContent, appShell, mainArea } from "./shell.css"
import { darkTheme } from "@/styles/theme.css"
import { ShellSidebar } from "./ShellSidebar"
import { ShellTopbar } from "./ShellTopbar"

interface AppShellProps {
    children: React.ReactNode
    active?: string
    breadcrumb?: string[]
    actions?: React.ReactNode
}

export function AppShell({
    children,
    active = "documentos",
    breadcrumb = [],
    actions,
}: AppShellProps) {
    const [collapsed, setCollapsed] = useState(false)
    const [dark, setDark] = useState(false)

    return (
        <div className={appShell + (dark ? ` ${darkTheme}` : "")}>
            <ShellSidebar active={active} collapsed={collapsed} />

            <main className={mainArea}>
                <ShellTopbar
                    breadcrumb={breadcrumb}
                    actions={actions}
                    dark={dark}
                    onToggleCollapsed={() => setCollapsed((value) => !value)}
                    onToggleDark={() => setDark((value) => !value)}
                />

                <div className={mainContent}>{children}</div>
            </main>
        </div>
    )
}
