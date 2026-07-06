// LexIA · Chat — fontes citáveis (Fase 6, D9). Puro: dado o nome da tool + o
// MESMO resultado que o modelo já viu, devolve as fontes que embasam a
// resposta (rodapé "Fontes" no fim da mensagem) — 0 tokens extra. Espelha
// cardParaTool (Fase 3): uma falha aqui NUNCA derruba o turno (o loop chama
// isto dentro de um try/catch). SERVER ONLY (chamado só em loop.ts).
import type { Fonte } from "../cards-types"

const CAP = 5

export function fontesParaTool(toolName: string, resultado: unknown): Fonte[] {
  try {
    return dispatch(toolName, resultado)
  } catch {
    return []
  }
}

function dispatch(toolName: string, out: unknown): Fonte[] {
  if (out == null || typeof out !== "object") return []
  const o = out as Record<string, unknown>

  switch (toolName) {
    case "listar_publicacoes": {
      const itens = (o.itens as { id: number; processoId: number | null; diario?: string | null; dataPublicacao?: string | null }[]) ?? []
      return itens.slice(0, CAP).map((p) => ({
        tipo: "publicacao",
        titulo: p.diario ? `Publicação — ${p.diario}` : `Publicação #${p.id}`,
        rota: p.processoId ? `/processos/${p.processoId}` : "/processos",
        detalhe: p.dataPublicacao ?? undefined,
      }))
    }
    case "listar_movimentos_novos": {
      const itens = (o.itens as { processoId: number; numeroCnj?: string | null; caso?: string | null; totalNovos?: number }[]) ?? []
      return itens.slice(0, CAP).map((m) => ({
        tipo: "andamento",
        titulo: m.caso ?? m.numeroCnj ?? `Processo #${m.processoId}`,
        rota: `/processos/${m.processoId}`,
        detalhe: m.totalNovos ? `${m.totalNovos} movimento(s) novo(s)` : undefined,
      }))
    }
    case "detalhe_processo": {
      const p = o as { id: number; numeroCnj?: string | null; classe?: string | null }
      return [{ tipo: "andamento", titulo: p.numeroCnj ?? p.classe ?? `Processo #${p.id}`, rota: `/processos/${p.id}` }]
    }
    case "detalhe_honorario": {
      const h = o as { id: number; descricao?: string | null; cliente?: string | null }
      return [{ tipo: "contrato", titulo: h.descricao ?? h.cliente ?? `Honorário #${h.id}`, rota: "/financeiro" }]
    }
    case "listar_lancamentos": {
      const itens = Array.isArray(out) ? (out as { id: number; desc: string }[]) : []
      return itens.slice(0, CAP).map((l) => ({ tipo: "lancamento", titulo: l.desc, rota: "/financeiro" }))
    }
    default:
      return []
  }
}

/** Junta fontes de várias tools do mesmo turno sem repetir a mesma rota (a
 * MAIS específica/primeira encontrada vence — o rodapé não duplica links). */
export function dedupFontes(fontes: Fonte[]): Fonte[] {
  const vistos = new Set<string>()
  const out: Fonte[] = []
  for (const f of fontes) {
    if (vistos.has(f.rota)) continue
    vistos.add(f.rota)
    out.push(f)
  }
  return out.slice(0, CAP)
}
