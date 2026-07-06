"use client"

// LexIA · CRM — Configurações modal. UAC-gated section nav (admin sees all;
// 'admin' implicit-passes every check). Ported from the design prototype
// (crm-settings.jsx), wired to the real backend: section data is fetched lazily
// when a section opens. Money is centavos; dates are ISO strings.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { CrmAvatar, CrmBadge, FxInput, FxLabel, useCrmToast } from "../crm-kit"
import { useModalGuard } from "@/lib/client/modal-guard"
import { Icon, type CrmIconName } from "../crm-icons"
import { crmDate, crmMoney, crmTime } from "../crm-fmt"
import { lexGlass, lexGlassStrong } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"
import {
  createUser,
  deleteUser,
  enviarEmailTeste,
  type EmailTesteResult,
  getAudit,
  getConsumo,
  getConsumoInterno,
  getEscritorio,
  getImportacao,
  getModulosConfig,
  putModulosConfig,
  listUsers,
  listAreasComUso,
  createAreaAdmin,
  patchAreaAdmin,
  deleteAreaAdmin,
  type AreaComUsoResult,
  patchMe,
  patchUser,
  reenviarConvite,
  putEscritorio,
  putOrcamentoConsumo,
  type AuditRow,
} from "../crm-api"
import { useAreasStore } from "@/lib/areas/store"
import { useModulosStore } from "@/lib/modulos/store"
import type {
  CrmDataset,
  EscritorioConfig,
  ImportacaoInfo,
  ModulosConfig,
  Role,
  UserRow,
} from "../crm-types"
import type { ConsumoData, ConsumoInterno, ConsumoPeriodo } from "@/lib/consumo/types"
import { apiSend } from "@/lib/client/api"
import type { NotifPrefs } from "@/lib/notificacoes/preferencias-core"
import { type Modulo, MODULO_LABEL, MODULOS, type Prioridade } from "@/lib/notificacoes/types"

interface Props {
  role: Role
  realRole: Role
  dark: boolean
  onToggleTheme: () => void
  userName: string
  userEmail: string
  onClose: () => void
  onAnonimizar: () => void
  dataset: CrmDataset
}

type SecId =
  | "perfil"
  | "aparencia"
  | "notificacoes"
  | "usuarios"
  | "areas"
  | "financeiro"
  | "consumo"
  | "escritorio"
  | "modulos"
  | "importacao"
  | "lgpd"
  | "debug"

const SECTIONS: { id: SecId; label: string; icon: CrmIconName; roles: Role[] }[] = [
  { id: "perfil", label: "Perfil", icon: "user", roles: ["admin", "socio", "advogado", "estagiario", "financeiro", "staff"] },
  { id: "aparencia", label: "Aparência", icon: "sun", roles: ["admin", "socio", "advogado", "estagiario", "financeiro", "staff"] },
  { id: "notificacoes", label: "Notificações", icon: "bell", roles: ["admin", "socio", "advogado", "estagiario", "financeiro", "staff"] },
  { id: "usuarios", label: "Usuários & permissões", icon: "users", roles: ["admin"] },
  { id: "areas", label: "Áreas do Direito", icon: "scale", roles: ["admin"] },
  { id: "financeiro", label: "Financeiro", icon: "wallet", roles: ["admin", "socio"] },
  { id: "consumo", label: "Consumo (IA)", icon: "zap", roles: ["admin", "socio"] },
  { id: "escritorio", label: "Escritório & documentos", icon: "building", roles: ["admin"] },
  { id: "modulos", label: "Módulos", icon: "scale", roles: ["admin"] },
  { id: "importacao", label: "Importação & integrações", icon: "upload", roles: ["admin"] },
  { id: "lgpd", label: "LGPD & Auditoria", icon: "scale", roles: ["admin"] },
  { id: "debug", label: "Debug & simulação", icon: "zap", roles: ["admin"] },
]

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  socio: "Sócio",
  advogado: "Advogado(a)",
  estagiario: "Estagiário(a)",
  financeiro: "Financeiro",
  staff: "Equipe",
}
const ROLE_TONE: Record<Role, "gold" | "blue" | "neutral"> = {
  admin: "gold",
  socio: "blue",
  advogado: "blue",
  estagiario: "neutral",
  financeiro: "blue",
  staff: "neutral",
}

// ─────────────────────────── small atoms ───────────────────────────
function CrmField({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <FxLabel>{label}</FxLabel>
      {children}
    </div>
  )
}

function CrmSwitch({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 38, height: 22, borderRadius: 999, border: "none", cursor: disabled ? "default" : "pointer",
        padding: 2, background: on ? "var(--accent-strong)" : "var(--border-strong)", transition: "background .15s",
        flexShrink: 0, opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          display: "block", width: 18, height: 18, borderRadius: "50%", background: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)", transform: on ? "translateX(16px)" : "translateX(0)", transition: "transform .15s",
        }}
      />
    </button>
  )
}

function SectionTitle({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 4, ...style }}>{children}</div>
}
function SectionSub({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>{children}</div>
}

export function CrmSettings({
  role,
  realRole: _realRole,
  dark,
  onToggleTheme,
  userName,
  userEmail,
  onClose,
  onAnonimizar,
  dataset: _dataset,
}: Props) {
  const { toast } = useCrmToast()
  const visible = useMemo(() => SECTIONS.filter((s) => s.roles.includes(role)), [role])
  const [sec, setSec] = useState<SecId>("perfil")

  useEffect(() => {
    if (!visible.find((v) => v.id === sec)) setSec("perfil")
  }, [role, sec, visible])

  useModalGuard()
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])

  const current = visible.find((v) => v.id === sec) ?? visible[0]

  return (
    <div
      onMouseDown={onClose}
      className="crm-scope"
      style={{
        position: "fixed", inset: 0, zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center",
        background: "transparent", padding: 24,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`crm-pop-in ${lexGlass}`}
        style={{
          width: 820, maxWidth: "100%", height: 580, maxHeight: "92%", display: "flex",
          borderRadius: 14,
          ...glassElevation("0 40px 100px rgba(2,13,37,0.42), 0 12px 32px rgba(2,13,37,0.24)"),
        }}
      >
        {/* nav */}
        <div style={{ width: 232, flexShrink: 0, background: "color-mix(in srgb, var(--bg-soft) 55%, transparent)", borderRight: "1px solid var(--border)", padding: "18px 12px", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)", padding: "0 8px 14px" }}>Configurações</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {visible.map((s) => (
              <button
                key={s.id}
                onClick={() => setSec(s.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left",
                  background: sec === s.id ? "var(--accent-soft)" : "transparent", color: sec === s.id ? "var(--accent)" : "var(--text-muted)",
                  fontSize: 13, fontWeight: 500, fontFamily: "var(--font-sans)", letterSpacing: "-0.01em",
                }}
              >
                <Icon name={s.icon} size={16} />
                {s.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: "auto", fontSize: 11, color: "var(--text-subtle)", padding: "0 8px", lineHeight: 1.5 }}>
            Seções visíveis conforme seu papel ({ROLE_LABEL[role]}).
          </div>
        </div>

        {/* content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{current?.label}</div>
            <button onClick={onClose} className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}>
              <Icon name="x" size={16} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "22px" }}>
            {sec === "perfil" && <PerfilSection userName={userName} userEmail={userEmail} />}
            {sec === "aparencia" && <AparenciaSection dark={dark} onToggleTheme={onToggleTheme} />}
            {sec === "notificacoes" && <NotificacoesSection />}
            {sec === "usuarios" && <UsuariosSection />}
            {sec === "areas" && <AreasSection />}
            {sec === "financeiro" && <FinanceiroSection />}
            {sec === "consumo" && <ConsumoSection />}
            {sec === "escritorio" && <EscritorioSection />}
            {sec === "modulos" && <ModulosSection />}
            {sec === "importacao" && <ImportacaoSection />}
            {sec === "lgpd" && <LgpdSection onClose={onClose} onAnonimizar={onAnonimizar} />}
            {sec === "debug" && <DebugSection meEmail={userEmail} />}
          </div>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────── Perfil ───────────────────────────
  function PerfilSection({ userName, userEmail }: { userName: string; userEmail: string }) {
    const [nome, setNome] = useState(userName)
    const [senhaAtual, setSenhaAtual] = useState("")
    const [novaSenha, setNovaSenha] = useState("")
    const [busy, setBusy] = useState(false)

    const save = async () => {
      setBusy(true)
      try {
        const body: { nome?: string; senha?: string; senhaAtual?: string } = {}
        if (nome.trim() && nome.trim() !== userName) body.nome = nome.trim()
        if (novaSenha) {
          body.senha = novaSenha
          body.senhaAtual = senhaAtual
        }
        if (!body.nome && !body.senha) {
          toast("Nada para salvar", { tone: "neg", icon: "alertTriangle" })
          return
        }
        await patchMe(body)
        setSenhaAtual("")
        setNovaSenha("")
        toast("Perfil atualizado")
      } catch (err) {
        toast(err instanceof Error ? err.message : "Erro", { tone: "neg", icon: "alertTriangle" })
      } finally {
        setBusy(false)
      }
    }

    return (
      <div style={{ maxWidth: 420 }}>
        <CrmField label="Nome">
          <FxInput value={nome} onChange={(e) => setNome(e.target.value)} />
        </CrmField>
        <CrmField label="E-mail">
          <FxInput value={userEmail} disabled readOnly style={{ opacity: 0.7 }} />
        </CrmField>
        <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0 16px" }} />
        <CrmField label="Senha atual">
          <FxInput type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} placeholder="Necessária para trocar a senha" />
        </CrmField>
        <CrmField label="Nova senha">
          <FxInput type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Mín. 8 caracteres" />
        </CrmField>
        <button className="btn btn-primary" onClick={save} disabled={busy} style={{ marginTop: 6 }}>
          Salvar alterações
        </button>
      </div>
    )
  }

  // ─────────────────────────── Aparência ───────────────────────────
  function AparenciaSection({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
    const themes: { id: "light" | "dark"; label: string; icon: CrmIconName }[] = [
      { id: "light", label: "Claro", icon: "sun" },
      { id: "dark", label: "Escuro", icon: "moon" },
    ]
    const cur = dark ? "dark" : "light"
    return (
      <div style={{ maxWidth: 460 }}>
        <FxLabel>Tema</FxLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4, maxWidth: 320 }}>
          {themes.map((t) => {
            const on = cur === t.id
            return (
              <button
                key={t.id}
                onClick={() => { if (!on) onToggleTheme(); toast(`Tema: ${t.label}`) }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 9, padding: "18px 10px", borderRadius: 10, cursor: "pointer",
                  border: `1.5px solid ${on ? "var(--accent)" : "var(--border-strong)"}`, background: on ? "var(--accent-soft)" : "var(--surface)",
                  color: on ? "var(--accent)" : "var(--text-muted)", fontFamily: "var(--font-sans)",
                }}
              >
                <Icon name={t.icon} size={20} />
                <span style={{ fontSize: 12, fontWeight: 500 }}>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ─────────────────────────── Notificações (preferências do usuário) ───────────────────────────
  function NotificacoesSection() {
    const [prefs, setPrefsState] = useState<NotifPrefs | null>(null)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
      let alive = true
      apiSend<NotifPrefs>("/api/notificacoes/preferencias", "GET")
        .then((p) => { if (alive) setPrefsState(p ?? {}) })
        .catch(() => { if (alive) setPrefsState({}) })
      return () => { alive = false }
    }, [])

    if (!prefs) return <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>Carregando…</div>

    const appOn = (m: Modulo) => prefs.app?.[m] !== false
    const emailOn = (m: Modulo) => prefs.email?.[m] !== false
    const setApp = (m: Modulo, v: boolean) => setPrefsState((p) => ({ ...(p ?? {}), app: { ...(p?.app ?? {}), [m]: v } }))
    const setEmail = (m: Modulo, v: boolean) => setPrefsState((p) => ({ ...(p ?? {}), email: { ...(p?.email ?? {}), [m]: v } }))

    const toggleNavegador = async () => {
      const next = !prefs.navegador
      if (next && typeof Notification !== "undefined" && Notification.permission !== "granted") {
        try {
          const perm = await Notification.requestPermission()
          if (perm !== "granted") {
            toast("Permissão negada pelo navegador", { tone: "neg", icon: "alertTriangle" })
            return
          }
        } catch {
          /* navegador sem suporte */
        }
      }
      setPrefsState((p) => ({ ...(p ?? {}), navegador: next }))
    }

    const save = async () => {
      setBusy(true)
      try {
        await apiSend("/api/notificacoes/preferencias", "PATCH", prefs)
        toast("Preferências salvas")
      } catch (e) {
        toast(e instanceof Error ? e.message : "Erro", { tone: "neg", icon: "alertTriangle" })
      } finally {
        setBusy(false)
      }
    }

    return (
      <div style={{ maxWidth: 520 }}>
        <SectionSub>Escolha como cada módulo te avisa. O app (toast + sino) e o e-mail (para {userEmail}) já vêm ligados; desative o que não quiser receber.</SectionSub>
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", padding: "9px 14px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-subtle)" }}>
            <span style={{ flex: 1 }}>Módulo</span>
            <span style={{ width: 64, textAlign: "center" }}>App</span>
            <span style={{ width: 64, textAlign: "center" }}>E-mail</span>
          </div>
          {MODULOS.map((m, i) => (
            <div key={m} style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderTop: i ? "1px solid var(--border)" : "none" }}>
              <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>{MODULO_LABEL[m]}</span>
              <span style={{ width: 64, display: "flex", justifyContent: "center" }}>
                <CrmSwitch on={appOn(m)} onChange={() => setApp(m, !appOn(m))} />
              </span>
              <span style={{ width: 64, display: "flex", justifyContent: "center" }}>
                <CrmSwitch on={emailOn(m)} onChange={() => setEmail(m, !emailOn(m))} />
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CrmSwitch on={!!prefs.navegador} onChange={() => void toggleNavegador()} />
            <div>
              <div style={{ fontSize: 13, color: "var(--text)" }}>Notificações do navegador</div>
              <div style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>Alerta na área de trabalho quando a aba está em segundo plano.</div>
            </div>
          </div>
          <CrmField label="Enviar e-mail só a partir de">
            <select
              className="input"
              value={prefs.emailMinPrioridade ?? "normal"}
              onChange={(e) => setPrefsState((p) => ({ ...(p ?? {}), emailMinPrioridade: e.target.value as "normal" | "alta" | "critica" }))}
              style={{ height: 36, maxWidth: 240 }}
            >
              <option value="normal">Qualquer prioridade</option>
              <option value="alta">Alta ou crítica</option>
              <option value="critica">Apenas crítica</option>
            </select>
          </CrmField>
        </div>

        <button className="btn btn-primary" onClick={save} disabled={busy} style={{ marginTop: 16 }}>
          {busy ? "Salvando…" : "Salvar preferências"}
        </button>
      </div>
    )
  }

  // ─────────────────────────── Debug & simulação (admin) ───────────────────────────
  function DebugSection({ meEmail }: { meEmail: string }) {
    const [users, setUsers] = useState<UserRow[]>([])
    const [destinatario, setDestinatario] = useState("me")
    const [modulo, setModulo] = useState<Modulo>("sistema")
    const [prioridade, setPrioridade] = useState<Prioridade>("normal")
    const [mensagem, setMensagem] = useState("Notificação de teste da LexIA")
    const [link, setLink] = useState("")
    const [enviarEmail, setEnviarEmail] = useState(false)
    const [busy, setBusy] = useState(false)
    const [emailTo, setEmailTo] = useState("")
    const [emailBusy, setEmailBusy] = useState(false)
    const [emailRes, setEmailRes] = useState<EmailTesteResult | null>(null)

    useEffect(() => {
      listUsers().then(setUsers).catch(() => {})
    }, [])

    const testarEmail = async () => {
      setEmailBusy(true)
      setEmailRes(null)
      try {
        setEmailRes(await enviarEmailTeste(emailTo.trim() || undefined))
      } catch (e) {
        setEmailRes({ ok: false, backend: "noop", detalhe: e instanceof Error ? e.message : "Erro" })
      } finally {
        setEmailBusy(false)
      }
    }

    const enviar = async () => {
      if (!mensagem.trim()) {
        toast("Escreva a mensagem", { tone: "neg", icon: "alertTriangle" })
        return
      }
      setBusy(true)
      try {
        await apiSend("/api/notificacoes/simular", "POST", {
          destinatario,
          modulo,
          prioridade,
          mensagem: mensagem.trim(),
          link: link.trim() || undefined,
          enviarEmail,
        })
        toast("Notificação simulada enviada")
      } catch (e) {
        toast(e instanceof Error ? e.message : "Erro", { tone: "neg", icon: "alertTriangle" })
      } finally {
        setBusy(false)
      }
    }

    return (
      <div style={{ maxWidth: 460 }}>
        <SectionSub>Dispara uma notificação REAL (sino + toast + e-mail) para testar o sistema ponta a ponta. Visível só para administradores.</SectionSub>
        <CrmField label="Destinatário">
          <select className="input" value={destinatario} onChange={(e) => setDestinatario(e.target.value)} style={{ height: 36, width: "100%" }}>
            <option value="me">Eu mesmo ({meEmail})</option>
            {users.filter((u) => u.ativo).map((u) => (
              <option key={u.id} value={u.email}>
                {u.nome} ({u.email})
              </option>
            ))}
          </select>
        </CrmField>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <CrmField label="Módulo">
            <select className="input" value={modulo} onChange={(e) => setModulo(e.target.value as Modulo)} style={{ height: 36, width: "100%" }}>
              {MODULOS.map((m) => (
                <option key={m} value={m}>
                  {MODULO_LABEL[m]}
                </option>
              ))}
            </select>
          </CrmField>
          <CrmField label="Prioridade">
            <select className="input" value={prioridade} onChange={(e) => setPrioridade(e.target.value as Prioridade)} style={{ height: 36, width: "100%" }}>
              <option value="baixa">Baixa</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </CrmField>
        </div>
        <CrmField label="Mensagem">
          <FxInput value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
        </CrmField>
        <CrmField label="Link (opcional)">
          <FxInput value={link} onChange={(e) => setLink(e.target.value)} placeholder="/tarefas?tarefa=12" />
        </CrmField>
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 16px" }}>
          <CrmSwitch on={enviarEmail} onChange={() => setEnviarEmail((v) => !v)} />
          <span style={{ fontSize: 13, color: "var(--text)" }}>Enviar também por e-mail</span>
        </div>
        <button className="btn btn-primary" onClick={enviar} disabled={busy}>
          {busy ? "Enviando…" : "Disparar notificação"}
        </button>

        <div style={{ borderTop: "1px solid var(--border)", margin: "22px 0 16px" }} />
        <SectionSub>
          Dispara um e-mail REAL pelo backend configurado (Graph/SMTP) e mostra o erro do provedor aqui — para diagnosticar o canal de e-mail. Em branco = envia para você.
        </SectionSub>
        <CrmField label="Destinatário do teste">
          <FxInput type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder={`Padrão: ${meEmail}`} />
        </CrmField>
        <button className="btn btn-secondary" onClick={testarEmail} disabled={emailBusy}>
          <Icon name="mail" size={14} />
          {emailBusy ? "Enviando…" : "Enviar e-mail de teste"}
        </button>
        {emailRes && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.6,
              border: `1px solid ${emailRes.ok ? "rgba(46,158,91,0.25)" : "rgba(192,73,47,0.25)"}`,
              background: emailRes.ok ? "rgba(46,158,91,0.08)" : "rgba(192,73,47,0.08)",
              color: "var(--text)",
            }}
          >
            <div style={{ fontWeight: 600, color: emailRes.ok ? "var(--fin-pos,#2E9E5B)" : "var(--fin-neg,#C0492F)" }}>
              {emailRes.ok ? "E-mail enviado" : "Falha no envio"} · backend: {emailRes.backend}
            </div>
            {emailRes.ok ? (
              <div style={{ color: "var(--text-muted)" }}>Enviado para {emailRes.to}. Verifique a caixa (e o spam).</div>
            ) : (
              <div style={{ color: "var(--text-muted)", wordBreak: "break-word" }}>{emailRes.detalhe}</div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────── Usuários & permissões ───────────────────────────
  function UsuariosSection() {
    const [users, setUsers] = useState<UserRow[] | null>(null)
    const [err, setErr] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)
    const [menu, setMenu] = useState<number | null>(null)
    const [excluir, setExcluir] = useState<UserRow | null>(null)

    const load = useCallback(async () => {
      try {
        setUsers(await listUsers())
        setErr(null)
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Erro ao carregar usuários")
      }
    }, [])

    useEffect(() => { void load() }, [load])

    const mutateUser = async (id: number, body: { role?: Role; ativo?: boolean; senha?: string }, msg: string) => {
      try {
        await patchUser(id, body)
        toast(msg)
        await load()
      } catch (e) {
        toast(e instanceof Error ? e.message : "Erro", { tone: "neg", icon: "alertTriangle" })
      } finally {
        setMenu(null)
      }
    }

    const resetSenha = (u: UserRow) => {
      const senha = window.prompt(`Nova senha para ${u.nome}:`)
      if (senha) void mutateUser(u.id, { senha }, "Senha redefinida")
      else setMenu(null)
    }

    const copiarLink = async (link: string | null): Promise<boolean> => {
      if (!link) {
        toast("Defina APP_BASE_URL para gerar o link de acesso", { tone: "neg", icon: "alertTriangle" })
        return false
      }
      try {
        await navigator.clipboard.writeText(link)
      } catch {
        window.prompt("Copie o link de acesso:", link)
      }
      return true
    }

    const reenviar = async (u: UserRow) => {
      try {
        const r = await reenviarConvite(u.id)
        if (r.emailEnviado) toast(`Convite reenviado para ${u.email}`)
        else if (await copiarLink(r.conviteLink)) toast("Link de acesso copiado")
      } catch (e) {
        toast(e instanceof Error ? e.message : "Erro", { tone: "neg", icon: "alertTriangle" })
      } finally {
        setMenu(null)
      }
    }

    const removeUser = async (u: UserRow) => {
      try {
        await deleteUser(u.id)
        toast("Usuário excluído")
        setExcluir(null)
        await load()
      } catch (e) {
        toast(e instanceof Error ? e.message : "Erro", { tone: "neg", icon: "alertTriangle" })
      }
    }

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {users ? `${users.length} usuário${users.length === 1 ? "" : "s"}` : "Carregando…"}
          </div>
          <button className="btn btn-primary" onClick={() => setCreating(true)} style={{ height: 32, fontSize: 12 }}>
            <Icon name="userPlus" size={14} />
            Novo usuário
          </button>
        </div>

        {err && <div style={{ fontSize: 12, color: "var(--fin-neg,#C0492F)", marginBottom: 12 }}>{err}</div>}

        <div className="card" style={{ overflow: "visible" }}>
          {(users ?? []).map((u, i) => (
            <div key={u.id} style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderTop: i ? "1px solid var(--border)" : "none" }}>
              <CrmAvatar name={u.nome} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{u.nome}</div>
                <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>{u.email}</div>
              </div>
              <CrmBadge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</CrmBadge>
              {u.pendente ? (
                <CrmBadge tone="gold" dot>Convite pendente</CrmBadge>
              ) : (
                <CrmBadge tone={u.ativo ? "pos" : "neg"} dot>{u.ativo ? "Ativo" : "Inativo"}</CrmBadge>
              )}
              <button className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }} onClick={() => setMenu(menu === u.id ? null : u.id)}>
                <Icon name="moreHorizontal" size={16} />
              </button>
              {menu === u.id && (
                <>
                  <div onClick={() => setMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                  <div
                    className={`card ${lexGlassStrong}`}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 44,
                      zIndex: 50,
                      width: 196,
                      padding: 6,
                      ...glassElevation("0 12px 28px rgba(2,13,37,0.16)"),
                    }}
                  >
                    <UserMenuRow label="Papel" />
                    {(["admin", "socio", "staff"] as Role[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => void mutateUser(u.id, { role: r }, `Papel: ${ROLE_LABEL[r]}`)}
                        style={menuItemStyle(u.role === r)}
                      >
                        <Icon name={u.role === r ? "check" : "circleDot"} size={13} />
                        {ROLE_LABEL[r]}
                      </button>
                    ))}
                    <div style={{ borderTop: "1px solid var(--border)", margin: "5px 0" }} />
                    <button onClick={() => void mutateUser(u.id, { ativo: !u.ativo }, u.ativo ? "Usuário desativado" : "Usuário ativado")} style={menuItemStyle(false)}>
                      <Icon name={u.ativo ? "minusCircle" : "checkCircle"} size={13} />
                      {u.ativo ? "Desativar" : "Ativar"}
                    </button>
                    {u.pendente ? (
                      <button onClick={() => void reenviar(u)} style={menuItemStyle(false)}>
                        <Icon name="mail" size={13} />
                        Reenviar convite
                      </button>
                    ) : (
                      <button onClick={() => resetSenha(u)} style={menuItemStyle(false)}>
                        <Icon name="refreshCw" size={13} />
                        Redefinir senha
                      </button>
                    )}
                    <div style={{ borderTop: "1px solid var(--border)", margin: "5px 0" }} />
                    <button
                      onClick={() => { setMenu(null); setExcluir(u) }}
                      style={{ ...menuItemStyle(false), color: "var(--fin-neg,#C0492F)" }}
                    >
                      <Icon name="trash2" size={13} />
                      Excluir usuário
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {users && users.length === 0 && (
            <div style={{ padding: "20px 14px", fontSize: 12, color: "var(--text-subtle)" }}>Nenhum usuário.</div>
          )}
        </div>

        {creating && <NovoUsuarioModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); void load() }} />}
        {excluir && <ExcluirUsuarioModal user={excluir} onClose={() => setExcluir(null)} onConfirm={() => removeUser(excluir)} />}
      </div>
    )
  }

  function ExcluirUsuarioModal({ user, onClose, onConfirm }: { user: UserRow; onClose: () => void; onConfirm: () => void | Promise<void> }) {
    const [busy, setBusy] = useState(false)
    const go = async () => {
      setBusy(true)
      try { await onConfirm() } finally { setBusy(false) }
    }
    return (
      <div
        onMouseDown={onClose}
        className="crm-scope"
        style={{ position: "fixed", inset: 0, zIndex: 1300, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", padding: 24 }}
      >
        <div onMouseDown={(e) => e.stopPropagation()} className={`crm-pop-in ${lexGlass}`} style={{ width: 420, maxWidth: "100%", borderRadius: "var(--r-lg)", ...glassElevation("0 40px 100px rgba(2,13,37,0.42), 0 12px 32px rgba(2,13,37,0.24)") }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.02em" }}>Excluir usuário</div>
            <button onClick={onClose} className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}>
              <Icon name="x" size={16} />
            </button>
          </div>
          <div style={{ padding: "20px 22px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Excluir <strong style={{ color: "var(--text)" }}>{user.nome}</strong> ({user.email})? Esta ação é{" "}
            <strong style={{ color: "var(--text)" }}>irreversível</strong>. Tarefas, casos, processos, prazos e eventos atribuídos a esta pessoa permanecem, mas ficam <strong style={{ color: "var(--text)" }}>sem responsável</strong>.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px", borderTop: "1px solid var(--border)", background: "color-mix(in srgb, var(--bg-soft) 55%, transparent)" }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-danger" onClick={go} disabled={busy}>{busy ? "Excluindo…" : "Excluir"}</button>
          </div>
        </div>
      </div>
    )
  }

  function NovoUsuarioModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [email, setEmail] = useState("")
    const [nome, setNome] = useState("")
    const [newRole, setNewRole] = useState<Role>("staff")
    const [busy, setBusy] = useState(false)
    const [criado, setCriado] = useState<{ email: string; conviteLink: string | null; emailEnviado: boolean } | null>(null)

    const submit = async () => {
      if (!email.trim() || !nome.trim()) {
        toast("Preencha nome e e-mail", { tone: "neg", icon: "alertTriangle" })
        return
      }
      setBusy(true)
      try {
        const r = await createUser({ email: email.trim(), nome: nome.trim(), role: newRole })
        setCriado({ email: r.email, conviteLink: r.conviteLink, emailEnviado: r.emailEnviado })
        if (r.emailEnviado) toast(`Convite enviado para ${r.email}`)
      } catch (e) {
        toast(e instanceof Error ? e.message : "Erro", { tone: "neg", icon: "alertTriangle" })
      } finally {
        setBusy(false)
      }
    }

    const copiar = async () => {
      const link = criado?.conviteLink
      if (!link) {
        toast("Defina APP_BASE_URL para gerar o link de acesso", { tone: "neg", icon: "alertTriangle" })
        return
      }
      try {
        await navigator.clipboard.writeText(link)
      } catch {
        window.prompt("Copie o link de acesso:", link)
      }
      toast("Link de acesso copiado")
    }

    return (
      <div
        onMouseDown={onClose}
        className="crm-scope"
        style={{ position: "fixed", inset: 0, zIndex: 1300, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", padding: 24 }}
      >
        <div onMouseDown={(e) => e.stopPropagation()} className={`crm-pop-in ${lexGlass}`} style={{ width: 420, maxWidth: "100%", borderRadius: "var(--r-lg)", ...glassElevation("0 40px 100px rgba(2,13,37,0.42), 0 12px 32px rgba(2,13,37,0.24)") }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.02em" }}>Novo usuário</div>
            <button onClick={onClose} className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}>
              <Icon name="x" size={16} />
            </button>
          </div>
          {criado ? (
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                {criado.emailEnviado ? (
                  <>Convite enviado para <strong style={{ color: "var(--text)" }}>{criado.email}</strong>. A pessoa define a própria senha pelo link.</>
                ) : (
                  <>Usuário criado. Copie o link de acesso e envie para <strong style={{ color: "var(--text)" }}>{criado.email}</strong> — o e-mail automático não está configurado.</>
                )}
              </div>
              {criado.conviteLink && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    readOnly
                    value={criado.conviteLink}
                    onFocus={(e) => e.currentTarget.select()}
                    style={{ flex: 1, minWidth: 0, fontSize: 12, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--bg-sunken)", color: "var(--text)", fontFamily: "var(--font-mono)" }}
                  />
                  <button className="btn btn-secondary" onClick={() => void copiar()} style={{ height: 34 }}>
                    <Icon name="copy" size={14} />
                    Copiar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "20px 22px" }}>
              <CrmField label="Nome">
                <FxInput value={nome} onChange={(e) => setNome(e.target.value)} />
              </CrmField>
              <CrmField label="E-mail">
                <FxInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </CrmField>
              <CrmField label="Papel">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {(["admin", "socio", "staff"] as Role[]).map((r) => {
                    const on = newRole === r
                    return (
                      <button
                        key={r}
                        onClick={() => setNewRole(r)}
                        style={{
                          padding: "8px 6px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "var(--font-sans)",
                          border: `1.5px solid ${on ? "var(--accent)" : "var(--border-strong)"}`, background: on ? "var(--accent-soft)" : "var(--surface)",
                          color: on ? "var(--accent)" : "var(--text-muted)",
                        }}
                      >
                        {ROLE_LABEL[r]}
                      </button>
                    )
                  })}
                </div>
              </CrmField>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px", borderTop: "1px solid var(--border)", background: "color-mix(in srgb, var(--bg-soft) 55%, transparent)" }}>
            {criado ? (
              <button className="btn btn-primary" onClick={onCreated}>Concluir</button>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "Criando…" : "Criar e convidar"}</button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────── Áreas do Direito ───────────────────────────
  function AreasSection() {
    const [areas, setAreas] = useState<AreaComUsoResult[] | null>(null)
    const [err, setErr] = useState<string | null>(null)
    const [editing, setEditing] = useState<AreaComUsoResult | null | "new">(null)
    const [formNome, setFormNome] = useState("")
    const [formCor, setFormCor] = useState("")
    const [saving, setSaving] = useState(false)
    const reloadStore = useAreasStore((s) => s.reload)

    const load = useCallback(async () => {
      try {
        setAreas(await listAreasComUso())
        setErr(null)
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Erro ao carregar áreas")
      }
    }, [])

    useEffect(() => { void load() }, [load])

    const openNew = () => { setFormNome(""); setFormCor(""); setEditing("new") }
    const openEdit = (a: AreaComUsoResult) => { setFormNome(a.nome); setFormCor(a.cor ?? ""); setEditing(a) }
    const cancelEdit = () => setEditing(null)

    const save = async () => {
      const nome = formNome.trim()
      if (!nome) return
      setSaving(true)
      try {
        if (editing === "new") {
          await createAreaAdmin({ nome, cor: formCor || null })
        } else if (editing) {
          await patchAreaAdmin(editing.id, { nome, cor: formCor || null })
        }
        toast(editing === "new" ? "Área criada" : "Área atualizada")
        setEditing(null)
        await load()
        void reloadStore()
      } catch (e) {
        toast(e instanceof Error ? e.message : "Erro", { tone: "neg", icon: "alertTriangle" })
      } finally {
        setSaving(false)
      }
    }

    const del = async (a: AreaComUsoResult) => {
      if (!window.confirm(`Excluir área "${a.nome}"? Projetos e casos existentes mantêm o vínculo.`)) return
      try {
        await deleteAreaAdmin(a.id)
        toast("Área excluída")
        await load()
        void reloadStore()
      } catch (e) {
        toast(e instanceof Error ? e.message : "Erro", { tone: "neg", icon: "alertTriangle" })
      }
    }

    const COR_PRESETS = ["#1F3A6E", "#2E7D52", "#7C3AED", "#C0392B", "#B45309", "#0E7490", "#374151"]

    return (
      <div style={{ maxWidth: 600 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <SectionTitle>Áreas do Direito</SectionTitle>
            <SectionSub>Taxonomia de áreas compartilhada por Projetos, Casos, Leads e Campanhas.</SectionSub>
          </div>
          {!editing && (
            <button className="btn btn-primary" onClick={openNew} style={{ height: 32, fontSize: 12 }}>
              <Icon name="plus" size={13} />Nova área
            </button>
          )}
        </div>

        {err && <div style={{ color: "var(--crit)", fontSize: 12, marginBottom: 12 }}>{err}</div>}

        {editing && (
          <div className="card" style={{ padding: 16, marginBottom: 16, background: "var(--bg-soft)" }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>{editing === "new" ? "Nova área" : `Editar: ${editing ? editing.nome : ""}`}</div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: "2 1 180px" }}>
                <FxLabel>Nome</FxLabel>
                <FxInput value={formNome} onChange={(e) => setFormNome(e.target.value)} placeholder="Ex.: Societário & M&A" autoFocus />
              </div>
              <div style={{ flex: "1 1 120px" }}>
                <FxLabel>Cor (hex)</FxLabel>
                <FxInput value={formCor} onChange={(e) => setFormCor(e.target.value)} placeholder="#1F3A6E" maxLength={7} style={{ fontFamily: "var(--font-mono)" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {COR_PRESETS.map((c) => (
                <button key={c} onClick={() => setFormCor(c)} title={c} style={{ width: 22, height: 22, borderRadius: 6, background: c, border: formCor === c ? "2px solid var(--accent)" : "2px solid transparent", cursor: "pointer", padding: 0 }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="btn btn-ghost" onClick={cancelEdit} disabled={saving} style={{ height: 30, fontSize: 12 }}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !formNome.trim()} style={{ height: 30, fontSize: 12 }}>{saving ? "Salvando…" : "Salvar"}</button>
            </div>
          </div>
        )}

        {!areas ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-subtle)", fontSize: 13 }}>Carregando…</div>
        ) : areas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-subtle)", fontSize: 13 }}>Nenhuma área cadastrada. Crie a primeira.</div>
        ) : (
          <div className="card" style={{ overflow: "hidden" }}>
            {areas.map((a, i) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: a.cor ?? "var(--text-muted)", flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{a.nome}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8, fontFamily: "var(--font-mono)" }}>{a.chave}</span>
                </span>
                <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--text-subtle)" }}>
                  {a.projetos > 0 && <span title="Projetos">{a.projetos}p</span>}
                  {a.casos > 0 && <span title="Casos">{a.casos}c</span>}
                  {a.leads > 0 && <span title="Leads">{a.leads}l</span>}
                  {a.campanhas > 0 && <span title="Campanhas">{a.campanhas}cam</span>}
                  {a.projetos + a.casos + a.leads + a.campanhas === 0 && <span>sem uso</span>}
                </div>
                {!a.ativo && <CrmBadge tone="neutral">Inativo</CrmBadge>}
                <button className="btn btn-ghost" onClick={() => openEdit(a)} style={{ height: 28, fontSize: 12, padding: "0 10px" }}><Icon name="edit" size={13} /></button>
                <button className="btn btn-ghost" onClick={() => del(a)} style={{ height: 28, fontSize: 12, padding: "0 10px", color: "var(--crit)" }}><Icon name="trash" size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────── Financeiro (lightweight) ───────────────────────────
  function FinanceiroSection() {
    return (
      <div style={{ maxWidth: 520 }}>
        <div className="card" style={{ padding: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="wallet" size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>Custos fixos & contas</div>
            <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 2 }}>
              Custos fixos, pró-labore e contas (que alimentam o DRE e o ponto de equilíbrio) são geridos no módulo Financeiro.
            </div>
          </div>
          <a href="/financeiro" className="btn btn-secondary" style={{ height: 32, textDecoration: "none", whiteSpace: "nowrap" }}>
            <Icon name="externalLink" size={14} />
            Abrir Financeiro
          </a>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
          A aba <strong style={{ color: "var(--text)" }}>Custos &amp; DRE</strong> permite cadastrar custos fixos e pró-labore; a aba{" "}
          <strong style={{ color: "var(--text)" }}>Contas &amp; Balanço</strong> gerencia as contas e o acerto entre sócios.
        </div>
      </div>
    )
  }

  // ─────────────────────────── Consumo (IA) ───────────────────────────
  function ConsumoSection() {
    const [periodo, setPeriodo] = useState<ConsumoPeriodo>("mes")
    const [data, setData] = useState<ConsumoData | null>(null)
    const [interno, setInterno] = useState<ConsumoInterno | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [err, setErr] = useState<string | null>(null)
    const [orcInput, setOrcInput] = useState("")
    const [brlInput, setBrlInput] = useState("")
    const [autoDown, setAutoDown] = useState(false)
    const [limiarInput, setLimiarInput] = useState("90")
    const [savingOrc, setSavingOrc] = useState(false)
    const synced = useRef(false)

    const load = useCallback(async (p: ConsumoPeriodo, force = false) => {
      if (force) setRefreshing(true)
      else setLoading(true)
      try {
        // Internal ledger is self-sourced (never throws-disconnected); the Admin
        // Cost API may be unconfigured — tolerate its absence independently.
        const [d, i] = await Promise.all([getConsumo(p, force), getConsumoInterno(p).catch(() => null)])
        setData(d)
        setInterno(i)
        setErr(null)
        if (!synced.current) {
          setOrcInput(d.orcamento.orcamentoUsd != null ? String(d.orcamento.orcamentoUsd) : "")
          setBrlInput(d.orcamento.brlRate != null ? String(d.orcamento.brlRate) : "")
          setAutoDown(d.orcamento.autoDowngrade)
          setLimiarInput(String(d.orcamento.limiarPct ?? 90))
          synced.current = true
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Erro ao carregar consumo")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }, [])

    useEffect(() => { void load(periodo) }, [periodo, load])

    const saveOrc = async () => {
      const orcamentoUsd = orcInput.trim() === "" ? null : Number(orcInput.replace(",", "."))
      const brlRate = brlInput.trim() === "" ? null : Number(brlInput.replace(",", "."))
      const limiarPct = Math.min(100, Math.max(50, Math.round(Number(limiarInput.replace(",", ".")) || 90)))
      if (orcamentoUsd != null && (!Number.isFinite(orcamentoUsd) || orcamentoUsd < 0)) {
        toast("Orçamento inválido", { tone: "neg", icon: "alertTriangle" }); return
      }
      if (brlRate != null && (!Number.isFinite(brlRate) || brlRate <= 0)) {
        toast("Cotação inválida", { tone: "neg", icon: "alertTriangle" }); return
      }
      setSavingOrc(true)
      try {
        await putOrcamentoConsumo({ orcamentoUsd, brlRate, autoDowngrade: autoDown, limiarPct })
        toast("Orçamento salvo")
        await load(periodo, false)
      } catch (e) {
        toast(e instanceof Error ? e.message : "Erro", { tone: "neg", icon: "alertTriangle" })
      } finally {
        setSavingOrc(false)
      }
    }

    const usd = (n: number) =>
      n > 0 && n < 0.01 ? `US$ ${n.toFixed(4)}` : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" }).format(n)
    const brl = (n: number, rate: number | null) => (rate ? crmMoney(Math.round(n * rate * 100)) : null)
    const fmtAtualizado = (iso: string) => { const t = crmTime(iso); return t ? `${crmDate(iso)} ${t}` : crmDate(iso) }
    const track = "var(--bg-soft)"

    const periodos: { id: ConsumoPeriodo; label: string }[] = [
      { id: "mes", label: "Este mês" },
      { id: "30d", label: "Últimos 30 dias" },
      { id: "mes_passado", label: "Mês passado" },
    ]

    return (
      <div style={{ maxWidth: 560 }}>
        {/* period selector + refresh */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", gap: 2, background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 8, padding: 2 }}>
            {periodos.map((p) => {
              const on = periodo === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setPeriodo(p.id)}
                  style={{
                    height: 28, padding: "0 12px", borderRadius: 6, border: "none", cursor: "pointer",
                    background: on ? "var(--surface)" : "transparent", color: on ? "var(--accent)" : "var(--text-muted)",
                    fontSize: 12, fontWeight: 500, fontFamily: "var(--font-sans)",
                    boxShadow: on ? "0 1px 2px rgba(2,13,37,0.08)" : "none",
                  }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
          <button className="btn btn-secondary" onClick={() => void load(periodo, true)} disabled={refreshing} style={{ height: 32, fontSize: 12 }}>
            <Icon name="refreshCw" size={14} />
            {refreshing ? "Atualizando…" : "Atualizar"}
          </button>
        </div>

        {err && <div style={{ fontSize: 12, color: "var(--fin-neg,#C0492F)", marginBottom: 12 }}>{err}</div>}
        {loading && !data && <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>Carregando…</div>}

        {/* PRIMARY: real-time internal ledger — reflects reality NOW, per feature. */}
        {interno && (
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <SectionTitle style={{ marginBottom: 0 }}>Em tempo real (estimado)</SectionTitle>
              <span style={{ fontSize: 10, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {interno.chamadas} chamada{interno.chamadas === 1 ? "" : "s"}
              </span>
            </div>
            <div style={{ fontSize: 25, fontWeight: 500, color: "var(--text)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", marginTop: 6 }}>
              {usd(interno.totalUsd)}
            </div>
            {brl(interno.totalUsd, data?.orcamento.brlRate ?? null) && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>≈ {brl(interno.totalUsd, data?.orcamento.brlRate ?? null)}</div>
            )}

            {interno.porRecurso.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Por recurso</div>
                {(() => {
                  const max = Math.max(...interno.porRecurso.map((m) => m.usd), 0.000001)
                  return interno.porRecurso.map((m) => (
                    <div key={m.rotulo} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "var(--text)" }}>{m.rotulo}</span>
                        <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{usd(m.usd)}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: track, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(m.usd / max) * 100}%`, background: "var(--accent-strong)", borderRadius: 999 }} />
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}

            {interno.porModelo.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {interno.porModelo.map((m) => (
                  <span key={m.rotulo} style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px", fontVariantNumeric: "tabular-nums" }}>
                    {m.rotulo.replace("claude-", "")} · {usd(m.usd)}
                  </span>
                ))}
              </div>
            )}

            {interno.chamadas === 0 && (
              <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 6 }}>Nenhuma chamada à IA registrada no período.</div>
            )}
            <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 12, lineHeight: 1.6 }}>
              Estimativa local da LexIA — todas as chamadas, na hora, com preço por modelo · atualizado {fmtAtualizado(interno.atualizadoISO)}
            </div>
          </div>
        )}

        {data && (
          <>
            {!data.conectado ? (
              <div className="card" style={{ padding: 16, marginBottom: 16, display: "flex", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name="zap" size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>Relatório de custo não conectado</div>
                  <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 4, lineHeight: 1.6 }}>
                    {data.aviso}
                    <br />
                    Gere uma <strong style={{ color: "var(--text)" }}>Admin API key</strong> (sk-ant-admin…) no Console da Anthropic e defina <code>ANTHROPIC_ADMIN_KEY</code> no servidor. Requer conta de organização (não funciona em conta individual).
                  </div>
                </div>
              </div>
            ) : (
              <>
                <SectionTitle style={{ marginBottom: 8 }}>Faturado pela Anthropic (com atraso)</SectionTitle>
                {/* total + budget */}
                <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Gasto no período</div>
                  <div style={{ fontSize: 25, fontWeight: 500, color: "var(--text)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", marginTop: 2 }}>{usd(data.totalUsd)}</div>
                  {brl(data.totalUsd, data.orcamento.brlRate) && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>≈ {brl(data.totalUsd, data.orcamento.brlRate)}</div>
                  )}
                  {data.orcamento.orcamentoUsd != null && data.orcamento.orcamentoUsd > 0 && (() => {
                    const pct = Math.min(1, data.totalUsd / data.orcamento.orcamentoUsd)
                    const over = data.totalUsd > data.orcamento.orcamentoUsd
                    const warn = pct >= 0.8
                    const color = over ? "var(--fin-neg,#C0492F)" : warn ? "var(--warn,#B7791F)" : "var(--accent-strong)"
                    const restante = data.orcamento.orcamentoUsd - data.totalUsd
                    return (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>
                          <span>{Math.round(pct * 100)}% de {usd(data.orcamento.orcamentoUsd)}</span>
                          <span style={{ color: over ? color : "var(--text-muted)" }}>{over ? `${usd(-restante)} acima` : `${usd(restante)} restante`}</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 999, background: track, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct * 100}%`, background: color, borderRadius: 999, transition: "width .3s" }} />
                        </div>
                        {warn && (
                          <div style={{ fontSize: 11, color, marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
                            <Icon name="alertTriangle" size={12} />
                            {over ? "Orçamento do mês ultrapassado." : "Você já usou mais de 80% do orçamento."}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>

                {/* by model */}
                {data.porModelo.length > 0 && (
                  <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                    <SectionTitle style={{ marginBottom: 12 }}>Por modelo</SectionTitle>
                    {(() => {
                      const max = Math.max(...data.porModelo.map((m) => m.usd), 0.000001)
                      return data.porModelo.map((m) => (
                        <div key={m.rotulo} style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: "var(--text)" }}>{m.rotulo}</span>
                            <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{usd(m.usd)}</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 999, background: track, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(m.usd / max) * 100}%`, background: "var(--accent)", borderRadius: 999 }} />
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                )}

                {/* daily trend */}
                {data.porDia.length > 0 && (
                  <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                    <SectionTitle style={{ marginBottom: 12 }}>Por dia</SectionTitle>
                    {(() => {
                      const max = Math.max(...data.porDia.map((d) => d.usd), 0.000001)
                      return (
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80 }}>
                          {data.porDia.map((d) => (
                            <div key={d.dia} title={`${d.dia} · ${usd(d.usd)}`} style={{ flex: 1, minWidth: 2, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                              <div style={{ height: `${Math.max(2, (d.usd / max) * 100)}%`, background: "var(--accent)", borderRadius: 2, opacity: 0.85 }} />
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-subtle)", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                      <span>{data.porDia[0]?.dia.slice(5)}</span>
                      <span>{data.porDia[data.porDia.length - 1]?.dia.slice(5)}</span>
                    </div>
                  </div>
                )}

                {data.porModelo.length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--text-subtle)", marginBottom: 16 }}>Nenhum gasto registrado no período.</div>
                )}

                <div style={{ fontSize: 11, color: "var(--text-subtle)", marginBottom: 16, lineHeight: 1.6 }}>
                  Fonte oficial de cobrança da organização (todas as chaves), em US$ · atualiza com atraso de horas e em fuso UTC — concilia o estimado acima · atualizado {fmtAtualizado(data.atualizadoISO)}
                </div>
              </>
            )}

            {/* budget editor — available even before connecting */}
            <div className="card" style={{ padding: 16 }}>
              <SectionTitle style={{ marginBottom: 4 }}>Orçamento mensal</SectionTitle>
              <SectionSub>A Anthropic não expõe saldo de créditos; informe seu limite para ver “consumido X de Y”.</SectionSub>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <CrmField label="Orçamento (US$/mês)">
                  <FxInput value={orcInput} onChange={(e) => setOrcInput(e.target.value)} placeholder="ex.: 100" inputMode="decimal" />
                </CrmField>
                <CrmField label="Cotação US$→R$ (opcional)">
                  <FxInput value={brlInput} onChange={(e) => setBrlInput(e.target.value)} placeholder="ex.: 5,40" inputMode="decimal" />
                </CrmField>
              </div>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 6, fontSize: 13, color: "var(--text)", cursor: "pointer", lineHeight: 1.5 }}>
                <input type="checkbox" checked={autoDown} onChange={(e) => setAutoDown(e.target.checked)} style={{ marginTop: 2, accentColor: "var(--accent)" }} />
                <span>
                  Modo econômico automático
                  <span style={{ display: "block", fontSize: 11, color: "var(--text-subtle)" }}>
                    Ao se aproximar do limite, a LexIA responde com Sonnet no lugar do Opus (evita estourar o saldo).
                  </span>
                </span>
              </label>
              {autoDown && (
                <div style={{ maxWidth: 260, marginTop: 10 }}>
                  <CrmField label="Acionar a partir de (% do orçamento)">
                    <FxInput value={limiarInput} onChange={(e) => setLimiarInput(e.target.value)} placeholder="90" inputMode="numeric" />
                  </CrmField>
                </div>
              )}

              <button className="btn btn-primary" onClick={saveOrc} disabled={savingOrc} style={{ marginTop: 4 }}>
                {savingOrc ? "Salvando…" : "Salvar orçamento"}
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // ─────────────────────────── Escritório & documentos ───────────────────────────
  function EscritorioSection() {
    const [cfg, setCfg] = useState<EscritorioConfig | null>(null)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
      let alive = true
      getEscritorio()
        .then((c) => { if (alive) setCfg(c ?? {}) })
        .catch((e) => { if (alive) { setCfg({}); toast(e instanceof Error ? e.message : "Erro", { tone: "neg", icon: "alertTriangle" }) } })
      return () => { alive = false }
    }, [])

    const field = (k: keyof EscritorioConfig) => cfg?.[k] ?? ""
    const set = (k: keyof EscritorioConfig, v: string) => setCfg((c) => ({ ...(c ?? {}), [k]: v }))

    const save = async () => {
      if (!cfg) return
      setBusy(true)
      try {
        await putEscritorio(cfg)
        toast("Dados do escritório salvos")
      } catch (e) {
        toast(e instanceof Error ? e.message : "Erro", { tone: "neg", icon: "alertTriangle" })
      } finally {
        setBusy(false)
      }
    }

    if (!cfg) return <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>Carregando…</div>

    return (
      <div style={{ maxWidth: 460 }}>
        <CrmField label="Razão social">
          <FxInput value={field("razaoSocial")} onChange={(e) => set("razaoSocial", e.target.value)} placeholder="Moraes & Prado Advogados Associados" />
        </CrmField>
        <CrmField label="CNPJ">
          <FxInput value={field("cnpj")} onChange={(e) => set("cnpj", e.target.value)} />
        </CrmField>
        <CrmField label="OAB">
          <FxInput value={field("oab")} onChange={(e) => set("oab", e.target.value)} />
        </CrmField>
        <CrmField label="Endereço">
          <FxInput value={field("endereco")} onChange={(e) => set("endereco", e.target.value)} />
        </CrmField>
        <CrmField label="Telefone">
          <FxInput value={field("telefone")} onChange={(e) => set("telefone", e.target.value)} />
        </CrmField>
        <CrmField label="E-mail">
          <FxInput type="email" value={field("email")} onChange={(e) => set("email", e.target.value)} />
        </CrmField>
        <CrmField label="Dados bancários (documentos)">
          <FxInput value={field("bancoInfo")} onChange={(e) => set("bancoInfo", e.target.value)} placeholder="Itaú · Ag. 0182 · CC 45821-0" />
        </CrmField>
        <button className="btn btn-primary" onClick={save} disabled={busy} style={{ marginTop: 6 }}>Salvar</button>
      </div>
    )
  }

  // ─────────────────────────── Módulos (kill-switches temporários) ───────────────────────────
  function ModulosSection() {
    const [cfg, setCfg] = useState<ModulosConfig | null>(null)
    const [busy, setBusy] = useState(false)
    const reloadStore = useModulosStore((s) => s.reload)

    useEffect(() => {
      let alive = true
      getModulosConfig()
        .then((c) => { if (alive) setCfg(c ?? {}) })
        .catch((e) => { if (alive) { setCfg({}); toast(e instanceof Error ? e.message : "Erro", { tone: "neg", icon: "alertTriangle" }) } })
      return () => { alive = false }
    }, [])

    if (!cfg) return <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>Carregando…</div>

    const processosOn = cfg.processos !== false

    const save = async (next: ModulosConfig) => {
      setBusy(true)
      try {
        await putModulosConfig(next)
        await reloadStore()
        toast(processosOn ? "Módulo desativado" : "Módulo reativado")
      } catch (e) {
        setCfg(cfg) // reverte em caso de erro
        toast(e instanceof Error ? e.message : "Erro", { tone: "neg", icon: "alertTriangle" })
      } finally {
        setBusy(false)
      }
    }

    const toggle = () => {
      const next = { ...cfg, processos: !processosOn }
      setCfg(next)
      void save(next)
    }

    return (
      <div style={{ maxWidth: 520 }}>
        <SectionSub>Desative temporariamente um módulo: ele some do menu e das telas, e a LexIA deixa de agir sobre ele — reative quando quiser, sem precisar mexer no código.</SectionSub>
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
            <Icon name="scale" size={16} style={{ color: "var(--text-muted)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Casos & Processos</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Oculta o menu, bloqueia as telas e impede a LexIA de consultar/agir sobre casos e processos.</div>
            </div>
            <CrmSwitch on={processosOn} onChange={toggle} disabled={busy} />
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────── Importação & integrações ───────────────────────────
  function ImportacaoSection() {
    const [info, setInfo] = useState<ImportacaoInfo | null>(null)
    const [err, setErr] = useState<string | null>(null)

    useEffect(() => {
      let alive = true
      getImportacao()
        .then((i) => { if (alive) setInfo(i) })
        .catch((e) => { if (alive) setErr(e instanceof Error ? e.message : "Erro ao carregar status") })
      return () => { alive = false }
    }, [])

    if (err) return <div style={{ fontSize: 12, color: "var(--fin-neg,#C0492F)" }}>{err}</div>
    if (!info) return <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>Carregando…</div>

    const fmtDate = (iso: string | null) => (iso ? crmDate(iso) : "—")
    const r = info.resumo
    const cards = [
      {
        t: "Backup Astrea",
        s: `Última reimportação: ${fmtDate(info.ultimaReimportacaoAstrea)} · ${r.clientes} clientes, ${r.casos} casos`,
        ic: "refreshCw" as CrmIconName,
      },
      {
        t: "Leads · CSV Genions",
        s: `Última importação: ${fmtDate(info.ultimaImportacaoLeads)}`,
        ic: "upload" as CrmIconName,
      },
    ]

    return (
      <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: 14 }}>
        {cards.map((x, i) => (
          <div key={i} className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={x.ic} size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{x.t}</div>
              <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 2 }}>{x.s}</div>
            </div>
          </div>
        ))}
        <div className="card" style={{ padding: 16 }}>
          <SectionTitle style={{ marginBottom: 10 }}>Resumo importado</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {([
              ["Contatos", r.clientes],
              ["Casos", r.casos],
              ["Honorários", r.honorarios],
              ["Lançamentos", r.lancamentos],
              ["Contas", r.contas],
              ["Anomalias", r.anomalias],
            ] as [string, number][]).map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 20, fontWeight: 500, color: "var(--text)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{val}</div>
                <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────── LGPD & Auditoria ───────────────────────────
  function LgpdSection({ onClose, onAnonimizar }: { onClose: () => void; onAnonimizar: () => void }) {
    const [rows, setRows] = useState<AuditRow[] | null>(null)
    const [q, setQ] = useState("")
    const [err, setErr] = useState<string | null>(null)
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

    const load = useCallback(async (query: string) => {
      try {
        setRows(await getAudit(query.trim() || undefined))
        setErr(null)
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Erro ao carregar auditoria")
      }
    }, [])

    useEffect(() => { void load("") }, [load])

    const onSearch = (v: string) => {
      setQ(v)
      if (debounce.current) clearTimeout(debounce.current)
      debounce.current = setTimeout(() => void load(v), 260)
    }

    const fmtTs = (iso: string) => {
      const t = crmTime(iso)
      return t ? `${crmDate(iso)} ${t}` : crmDate(iso)
    }

    return (
      <div>
        <div className="card" style={{ padding: 16, marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(192,73,47,0.12)", color: "var(--fin-neg,#C0492F)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="alertTriangle" size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>Anonimização de cliente (LGPD)</div>
            <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 2 }}>Apaga dados pessoais mantendo o histórico financeiro. Ação irreversível.</div>
          </div>
          <button className="btn btn-secondary" onClick={() => { onClose(); onAnonimizar() }} style={{ height: 32 }}>Selecionar cliente</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <SectionTitle style={{ marginBottom: 0 }}>Trilha de auditoria</SectionTitle>
          <div style={{ position: "relative", width: 220 }}>
            <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)" }}>
              <Icon name="search" size={14} />
            </div>
            <input
              className="input"
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Filtrar por e-mail, ação…"
              style={{ height: 34, fontSize: 12, paddingLeft: 32, background: "var(--surface)" }}
            />
          </div>
        </div>

        {err && <div style={{ fontSize: 12, color: "var(--fin-neg,#C0492F)", marginBottom: 10 }}>{err}</div>}

        <div className="card" style={{ overflow: "hidden" }}>
          {(rows ?? []).map((a, i) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderTop: i ? "1px solid var(--border)" : "none" }}>
              <div style={{ fontSize: 12, color: "var(--text-subtle)", width: 96, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{fmtTs(a.ts)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "var(--text)" }}>
                  <strong style={{ fontWeight: 500 }}>{a.actorEmail}</strong> · {a.action}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                  {a.entity ?? "—"}{a.entityId ? ` · ${a.entityId}` : ""}
                </div>
              </div>
            </div>
          ))}
          {rows && rows.length === 0 && (
            <div style={{ padding: "20px 14px", fontSize: 12, color: "var(--text-subtle)" }}>Nenhum registro de auditoria.</div>
          )}
          {!rows && <div style={{ padding: "20px 14px", fontSize: 12, color: "var(--text-subtle)" }}>Carregando…</div>}
        </div>
      </div>
    )
  }
}

// ─────────────────────────── menu helpers ───────────────────────────
function UserMenuRow({ label }: { label: string }) {
  return <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-subtle)", padding: "6px 10px 3px" }}>{label}</div>
}
function menuItemStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "7px 10px", borderRadius: 6, border: "none", cursor: "pointer", textAlign: "left",
    background: active ? "var(--accent-soft)" : "transparent", color: active ? "var(--accent)" : "var(--text)",
    fontSize: 12, fontWeight: 500, fontFamily: "var(--font-sans)",
  }
}
