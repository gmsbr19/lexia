"use client"

// LexIA · Chat — popover de menção "@" (Fase 7, D10). Busca via GET /api/search;
// agrupado por tipo (Clientes/Processos/Contratos — os grupos que a busca global
// cobre). Componente CONTROLADO: o LexiaComposer é dono do texto de busca, do
// índice ativo (teclado) e do debounce; este componente só busca+renderiza a
// lista para o `query` recebido.
import { useEffect, useRef, useState } from "react"
import { Icon, type CrmIconName } from "@/components/crm/crm-icons"
import { MenuPanel } from "./LexiaKit"

export interface MentionEntidade {
  tipo: "cliente" | "processo" | "contrato"
  id: number
  nome: string
  rota: string
}

export interface MentionGrupo {
  label: string
  icon: CrmIconName
  itens: MentionEntidade[]
}

interface SearchApiShape {
  clientes?: { id: number; nome: string }[]
  processos?: { id: number; numeroCnj: string | null; classe: string | null }[]
  contratos?: { id: number; descricao: string }[]
}

export async function buscarEntidades(q: string): Promise<MentionGrupo[]> {
  if (q.trim().length < 2) return []
  let r: SearchApiShape
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
    if (!res.ok) return []
    r = await res.json()
  } catch {
    return []
  }
  const grupos: MentionGrupo[] = [
    { label: "Contatos", icon: "user", itens: (r.clientes ?? []).map((c) => ({ tipo: "cliente" as const, id: c.id, nome: c.nome, rota: `/contatos/${c.id}` })) },
    {
      label: "Processos",
      icon: "briefcase",
      itens: (r.processos ?? []).map((p) => ({ tipo: "processo" as const, id: p.id, nome: p.numeroCnj ?? p.classe ?? `Processo #${p.id}`, rota: `/processos/${p.id}` })),
    },
    { label: "Contratos", icon: "fileCheck", itens: (r.contratos ?? []).map((c) => ({ tipo: "contrato" as const, id: c.id, nome: c.descricao, rota: "/financeiro" })) },
  ]
  return grupos.filter((g) => g.itens.length > 0)
}

/** Hook de busca debounced (~200ms) — devolve os grupos para o `query` atual.
 * Enquanto uma busca mais nova está pendente, devolve [] (nunca mostra
 * resultado STALE de uma query anterior) sem precisar "limpar" via setState
 * síncrono dentro do efeito. */
export function useMentionSearch(query: string | null): MentionGrupo[] {
  const [resultado, setResultado] = useState<{ query: string; grupos: MentionGrupo[] } | null>(null)
  const seq = useRef(0)
  useEffect(() => {
    if (query == null) return
    const meu = ++seq.current
    const t = setTimeout(() => {
      void buscarEntidades(query).then((g) => {
        if (seq.current === meu) setResultado({ query, grupos: g })
      })
    }, 200)
    return () => clearTimeout(t)
  }, [query])
  if (query == null || resultado?.query !== query) return []
  return resultado.grupos
}

export function MentionPopover({
  query,
  grupos,
  active,
  onHover,
  onPick,
}: {
  query: string
  grupos: MentionGrupo[]
  active: number
  onHover: (i: number) => void
  onPick: (e: MentionEntidade) => void
}) {
  const vazio = query.trim().length < 2
  let gi = -1
  return (
    <MenuPanel style={{ position: "absolute", bottom: 44, left: 0, width: 300, maxHeight: 260, overflowY: "auto", zIndex: 2, padding: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", padding: "4px 8px 6px" }}>
        <Icon name="at" size={12} />
        Mencionar
      </div>
      {vazio ? (
        <div style={{ fontSize: 12.5, color: "var(--text-subtle)", padding: "6px 8px 8px" }}>Digite ao menos 2 letras…</div>
      ) : grupos.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--text-subtle)", padding: "6px 8px 8px" }}>Nada encontrado</div>
      ) : (
        grupos.map((g) => (
          <div key={g.label}>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", padding: "6px 8px 4px" }}>{g.label}</div>
            {g.itens.map((it) => {
              gi += 1
              const idx = gi
              return (
                <button
                  key={`${it.tipo}-${it.id}`}
                  className="fx-menu-item"
                  style={{ width: "100%", background: idx === active ? "var(--surface-hover)" : "transparent" }}
                  onMouseEnter={() => onHover(idx)}
                  onClick={() => onPick(it)}
                >
                  <Icon name={g.icon} size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.nome}</span>
                </button>
              )
            })}
          </div>
        ))
      )}
    </MenuPanel>
  )
}
