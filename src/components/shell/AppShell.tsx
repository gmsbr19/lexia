"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText, Home, Briefcase, Users, Calendar,
  Folder, Sigma, Settings, ChevronRight, Bell,
  Search, PanelLeft, Moon, Sun,
} from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  sidebar, navItem, navItemActive, navBadge,
  topbar, mainContent, appShell, mainArea,
} from "./shell.css";
import { tokens } from "@/styles/tokens.css";
import { darkTheme } from "@/styles/theme.css";
import { btn } from "@/styles/components.css";

const NAV_ITEMS = [
  { id: "inicio", label: "Início", icon: Home, href: "/" },
  { id: "documentos", label: "Documentos", icon: FileText, href: "/documents", badge: "12" },
  { id: "casos", label: "Casos", icon: Briefcase, href: "#" },
  { id: "clientes", label: "Clientes", icon: Users, href: "#" },
  { id: "agenda", label: "Agenda", icon: Calendar, href: "#" },
];

const LIB_ITEMS = [
  { id: "templates", label: "Templates", icon: Folder, href: "#" },
  { id: "clausulas", label: "Cláusulas", icon: Sigma, href: "#" },
];

function NavItemEl({
  icon: Icon, label, active, badge, collapsed, href,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  badge?: string;
  collapsed: boolean;
  href: string;
}) {
  const cls = [navItem, active ? navItemActive : ""].filter(Boolean).join(" ");
  const inner = (
    <Link
      href={href}
      className={cls}
      style={{ justifyContent: collapsed ? "center" : "flex-start", padding: collapsed ? "8px" : "7px 10px" }}
    >
      <Icon size={17} strokeWidth={active ? 2 : 1.75} />
      {!collapsed && <span>{label}</span>}
      {!collapsed && badge && <span className={navBadge}>{badge}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip.Root delayDuration={300}>
        <Tooltip.Trigger asChild>{inner}</Tooltip.Trigger>
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
    );
  }
  return inner;
}

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px", minHeight: 36 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: "linear-gradient(135deg, #C0A147 0%, #9a7f2e 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 14, color: "#020D25", letterSpacing: "-0.02em" }}>L</span>
      </div>
      {!collapsed && (
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.02em", color: tokens.color.text }}>Lex</span>
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.02em", color: tokens.color.accent }}>IA</span>
        </div>
      )}
    </div>
  );
}

interface AppShellProps {
  children: React.ReactNode;
  active?: string;
  breadcrumb?: string[];
  actions?: React.ReactNode;
}

export function AppShell({ children, active = "documentos", breadcrumb = [], actions }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);

  return (
    <Tooltip.Provider>
      <div className={appShell + (dark ? ` ${darkTheme}` : "")}>
        {/* Sidebar */}
        <aside className={sidebar} style={{ width: collapsed ? 64 : 232 }}>
          <div style={{ padding: "4px 4px 14px" }}>
            <Logo collapsed={collapsed} />
          </div>

          {!collapsed && (
            <div style={{ position: "relative", marginBottom: 8 }}>
              <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: tokens.color.textSubtle }}>
                <Search size={14} />
              </div>
              <input
                placeholder="Buscar..."
                style={{
                  width: "100%", height: 32, paddingLeft: 32, paddingRight: 40,
                  paddingTop: 0, paddingBottom: 0,
                  background: tokens.color.surface,
                  border: `1px solid ${tokens.color.borderStrong}`,
                  borderRadius: tokens.radius.sm,
                  fontFamily: tokens.font.sans, fontSize: "12.5px",
                  color: tokens.color.text, outline: "none",
                }}
              />
              <span style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                fontSize: "10.5px", color: tokens.color.textSubtle,
                background: tokens.color.bgSunken, padding: "2px 5px",
                borderRadius: 4, fontFamily: tokens.font.mono,
              }}>⌘K</span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV_ITEMS.map((item) => (
              <NavItemEl key={item.id} {...item} active={active === item.id} collapsed={collapsed} />
            ))}
          </div>

          {!collapsed && (
            <div style={{
              marginTop: 16, padding: "0 8px",
              fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em",
              color: tokens.color.textSubtle, textTransform: "uppercase",
            }}>Biblioteca</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: !collapsed ? 8 : 12 }}>
            {LIB_ITEMS.map((item) => (
              <NavItemEl key={item.id} {...item} active={active === item.id} collapsed={collapsed} />
            ))}
          </div>

          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
            <NavItemEl icon={Settings} label="Configurações" active={false} collapsed={collapsed} href="#" id="settings" badge={undefined} />
            {!collapsed && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 8, marginTop: 6,
                background: tokens.color.surface, border: `1px solid ${tokens.color.border}`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "linear-gradient(135deg, #020D25, #1a2c5a)",
                  color: "#C0A147", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 600, flexShrink: 0,
                }}>RM</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 500, color: tokens.color.text, letterSpacing: "-0.01em" }}>Rafael Moraes</div>
                  <div style={{ fontSize: 11, color: tokens.color.textSubtle }}>Sócio</div>
                </div>
                <ChevronRight size={14} color={tokens.color.textSubtle} />
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className={mainArea}>
          {/* Topbar */}
          <header className={topbar}>
            <button
              onClick={() => setCollapsed((c) => !c)}
              style={{
                width: 28, height: 28, borderRadius: 6, border: "none",
                background: "transparent", color: tokens.color.textMuted,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <PanelLeft size={16} />
            </button>

            {/* Breadcrumb */}
            <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12.5px", color: tokens.color.textMuted }}>
              {breadcrumb.map((item, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {i > 0 && <ChevronRight size={12} color={tokens.color.textSubtle} />}
                  <span style={{
                    color: i === breadcrumb.length - 1 ? tokens.color.text : tokens.color.textMuted,
                    fontWeight: i === breadcrumb.length - 1 ? 500 : 400,
                  }}>{item}</span>
                </span>
              ))}
            </nav>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              {actions}

              <button
                onClick={() => setDark((d) => !d)}
                className={btn({ variant: "ghost" })}
                style={{ width: 32, height: 32, padding: 0 }}
                title="Alternar tema"
              >
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <button style={{
                width: 32, height: 32, borderRadius: 8, border: "none",
                background: "transparent", color: tokens.color.textMuted,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", position: "relative",
              }}>
                <Bell size={16} />
                <span style={{
                  position: "absolute", top: 7, right: 8,
                  width: 6, height: 6, borderRadius: "50%",
                  background: tokens.brand.gold,
                }} />
              </button>
            </div>
          </header>

          <div className={mainContent}>{children}</div>
        </main>
      </div>
    </Tooltip.Provider>
  );
}
