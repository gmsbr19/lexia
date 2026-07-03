"use client"

// Contencioso · Consistência — superfície de saúde de dados (AI-first): pendências
// de integração que a IA ajuda a resolver (processos sem partes/cliente, prazos sem
// responsável, publicações a vincular, honorários sem processo). Cada linha tem
// deep-link para onde se conserta e pode ser dispensada (soneca 30d / "nunca mais").
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { ApiError } from "@/lib/client/api"
import { CrmEmpty, FxFrame, useCrmToast } from "@/components/crm/crm-kit"
import { Icon, type CrmIconName } from "@/components/crm/crm-icons"
import { dispensarSugestao, getSaude } from "../proc-api"
import { ProcSecTitle } from "../proc-kit"
import type { SaudeItem, SaudeProcessos } from "@/lib/processos/saude"
import { lexGlassStrong } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"

export function ProcSaude() {
  const router = useRouter()
  const { toast } = useCrmToast()
  const [data, setData] = useState<SaudeProcessos | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    getSaude()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => load(), [load])

  const dispensar = async (it: SaudeItem, dias: number | null) => {
    setData((d) =>
      d
        ? {
            ...d,
            grupos: d.grupos.map((g) => ({ ...g, itens: g.itens.filter((x) => x.chave !== it.chave) })).filter((g) => g.itens.length),
            total: Math.max(0, d.total - 1),
          }
        : d,
    )
    try {
      await dispensarSugestao(it.chave, dias)
      toast(dias ? "Adiado por 30 dias" : "Não será mais sugerido", { icon: "check" })
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao dispensar", { icon: "alertTriangle" })
      load()
    }
  }

  return (
    <FxFrame pad="24px 40px 56px">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Contencioso</span>
          <h1 style={{ margin: "6px 0 0", fontSize: 25, fontWeight: 500, letterSpacing: "-0.03em", color: "var(--text)" }}>Consistência de dados</h1>
          <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 5 }}>
            Pendências de integração que mantêm processo ↔ cliente ↔ caso ↔ honorário alinhados.
          </div>
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>
          <Icon name="refreshCw" size={15} />
          {loading ? "Verificando…" : "Reverificar"}
        </button>
      </div>

      {loading && !data ? (
        <div style={{ fontSize: 13, color: "var(--text-subtle)", padding: 8 }}>Verificando consistência…</div>
      ) : !data || data.total === 0 ? (
        <CrmEmpty icon="checkCircle" title="Tudo consistente" sub="Nenhuma pendência de integração de dados nos processos." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {data.grupos.map((g) => (
            <div key={g.id} className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
                <ProcSecTitle
                  icon={g.icon as CrmIconName}
                  title={g.titulo}
                  sub={`${g.itens.length}${g.mais ? "+" : ""} · ${g.descricao}`}
                />
              </div>
              {g.itens.map((it, i) => (
                <div
                  key={it.chave}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderTop: i ? "1px solid var(--border)" : "none" }}
                >
                  <button
                    onClick={() => router.push(it.href)}
                    style={{ flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.titulo}</div>
                    <div style={{ fontSize: 12, color: "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.sub}</div>
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => router.push(it.href)} style={{ fontSize: 12 }}>
                    Resolver
                  </button>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="btn btn-ghost btn-sm" title="Dispensar sugestão" style={{ fontSize: 12 }}>
                        Dispensar <Icon name="chevronDown" size={12} />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        align="end"
                        sideOffset={4}
                        className={lexGlassStrong}
                        style={{ minWidth: 200, borderRadius: 10, padding: 6, zIndex: 80, ...glassElevation("0 12px 28px rgba(2,13,37,0.16)") }}
                      >
                        <DropdownMenu.Item onSelect={() => void dispensar(it, 30)} style={{ fontSize: 12.5, color: "var(--text)", padding: "8px 10px", borderRadius: 6, cursor: "pointer", outline: "none" }}>
                          Adiar por 30 dias
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onSelect={() => void dispensar(it, null)} style={{ fontSize: 12.5, color: "var(--text)", padding: "8px 10px", borderRadius: 6, cursor: "pointer", outline: "none" }}>
                          Não sugerir novamente
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </FxFrame>
  )
}
