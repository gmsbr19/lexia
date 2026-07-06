"use client"

// Welcome state: gold orb, greeting, and contextual suggestion chips. The chip
// set is page-aware (cliente detail wins). Fase 8 (Welcome v2): cada página tem
// um POOL maior que os 3 mostrados por vez — "↻ renovar" sorteia outro trio; a
// 1ª sugestão exibida é sempre destacada como "Sugerido pra você".
import { useState } from "react"
import { Icon } from "@/components/crm/crm-icons"

const GOLD_GRAD = "var(--brand-gold)"

export function contextChips(page: string, hasCliente: boolean): string[] {
  if (hasCliente) {
    return ["Resuma a situação deste cliente", "Há valores vencidos?", "Criar tarefa para este cliente", "Últimos casos e processos", "Histórico de cobrança"]
  }
  switch (page) {
    case "financeiro":
      return ["Quem está devendo há mais de 60 dias?", "Qual o total a receber este mês?", "Resumo do fluxo de caixa", "Lançamentos pendentes de hoje", "Como está o acerto entre sócios?"]
    case "casos":
      return ["Casos sem rateio definido", "Como funciona o rateio entre sócios?", "Audiências desta semana", "Casos parados há mais tempo", "Criar um novo caso"]
    case "contratos":
      return ["Contratos vencidos", "Qual o ticket médio?", "Recorrentes a vencer", "Contratos sem honorário lançado", "Quantos contratos fechamos este mês?"]
    case "documents":
    case "documentos":
      return ["Minutar contrato de honorários", "Procuração ad judicia para um cliente", "Quais documentos estão em rascunho?", "Importar um .docx existente", "Meus modelos de documento"]
    case "documents-editor":
      return ["Limite o contrato à 1ª instância", "Escreva o objeto para matéria cível", "Defina o foro de São Paulo", "Detecte os campos deste documento", "Deixe o texto mais formal"]
    case "agenda":
      return ["O que tenho hoje?", "Próximas audiências", "Criar um evento", "Compromissos desta semana", "Tenho algum conflito de horário?"]
    case "comercial":
      return ["Quantos leads este mês?", "Qual o ROAS?", "Leads em proposta", "Campanhas com melhor conversão", "Leads parados há mais de 7 dias"]
    case "processos":
      return [
        "Processos com prazo essa semana",
        "Processos parados há +30 dias",
        "Publicações a triar",
        "Quem é o responsável do caso …",
        "Há movimentos novos para revisar?",
        "Prazos propostos aguardando confirmação",
      ]
    case "tarefas":
      return ["O que tenho para fazer?", "Tarefas atrasadas", "Criar uma tarefa", "Minhas tarefas de hoje", "Tarefas sem responsável"]
    case "clientes":
    case "cliente":
      return ["Clientes com mais casos", "Buscar um cliente", "Criar novo cliente", "Clientes inadimplentes", "Clientes sem contato recente"]
    default:
      return ["O que tenho hoje?", "Quem está devendo?", "Criar uma tarefa", "O que mudou nos meus processos?", "Resumo do escritório hoje"]
  }
}

/** Sorteia 3 do pool, evitando repetir o trio anterior quando possível. */
function escolher3(pool: string[], evitar: string[] = []): string[] {
  if (pool.length <= 3) return pool
  const disponiveis = pool.filter((c) => !evitar.includes(c))
  const fonte = disponiveis.length >= 3 ? disponiveis : pool
  return [...fonte].sort(() => Math.random() - 0.5).slice(0, 3)
}

/** Estado do trio visível + "↻ renovar" — `key` (ex.: a página atual) reajusta o
 * trio durante o RENDER quando muda, sem efeito+setState em cascata. */
export function useSuggestionPool(pool: string[], key: string): { visiveis: string[]; renovar: () => void } {
  const [state, setState] = useState(() => ({ key, visiveis: escolher3(pool) }))
  if (state.key !== key) {
    setState({ key, visiveis: escolher3(pool) })
  }
  const renovar = () => setState((s) => ({ ...s, visiveis: escolher3(pool, s.visiveis) }))
  return { visiveis: state.visiveis, renovar }
}

// Contextual placeholder for the LexIA bar — reads the current page so the bar
// advertises what it can do here. Início stays generic.
export function contextPlaceholder(page: string, hasCliente: boolean): string {
  if (hasCliente) return "Pergunte sobre este cliente — situação, valores, próximos passos…"
  switch (page) {
    case "financeiro":
      return "Pergunte sobre o financeiro — quem deve, fluxo de caixa, lançar…"
    case "casos":
      return "Pergunte sobre os casos — rateio, audiências, status…"
    case "contratos":
      return "Pergunte sobre contratos — vencidos, ticket médio, recorrentes…"
    case "documents":
    case "documentos":
      return "Descreva o documento e a LexIA redige a minuta…"
    case "documents-editor":
      return "Peça um ajuste no contrato — objeto, foro, valores, cláusulas…"
    case "agenda":
      return "Pergunte sobre a agenda ou marque um compromisso…"
    case "comercial":
      return "Pergunte sobre o comercial — leads, ROAS, campanhas…"
    case "processos":
      return "Pergunte sobre casos e processos — prazos, publicações, responsáveis, andamentos…"
    case "tarefas":
      return "Pergunte sobre tarefas ou crie uma nova…"
    case "clientes":
    case "cliente":
      return "Busque um cliente ou cadastre um novo…"
    default:
      return "Pergunte, busque ou diga o que fazer…"
  }
}

export function Suggestions({ chips, onPick, pageKey = "lexia" }: { chips: string[]; onPick: (c: string) => void; pageKey?: string }) {
  const { visiveis, renovar } = useSuggestionPool(chips, pageKey)
  return (
    <div>
      <div style={{ textAlign: "center", padding: "8px 0 22px" }}>
        <div
          className="crm-orb-float"
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            margin: "0 auto 14px",
            background: GOLD_GRAD,
            color: "#020D25",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          <Icon name="sparkles" size={24} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.02em" }}>Olá 👋</div>
        <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 5, lineHeight: 1.5, maxWidth: 320, marginInline: "auto" }}>
          Sou a LexIA. Posso consultar o financeiro, clientes, casos e processos (prazos/publicações), abrir telas, criar tarefas,
          lançamentos e prazos — e o que mais você precisar do escritório.
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px 8px" }}>
        <span style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)" }}>Sugestões</span>
        {chips.length > 3 && (
          <button
            onClick={renovar}
            title="Ver outras sugestões"
            className="btn btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 24, padding: "0 8px", borderRadius: 6, fontSize: 11.5, color: "var(--text-subtle)" }}
          >
            <Icon name="refreshCw" size={11} />
            Renovar
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visiveis.map((c, i) => {
          const destaque = i === 0
          return (
            <button
              key={c}
              onClick={() => onPick(c)}
              className="crm-chip"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                textAlign: "left",
                padding: "11px 13px",
                borderRadius: 10,
                border: destaque ? "1px solid var(--border-gold, var(--accent))" : "1px solid var(--border)",
                background: destaque ? "var(--accent-soft)" : "var(--surface)",
                cursor: "pointer",
                fontSize: 14,
                color: "var(--text)",
                fontFamily: "var(--font-sans)",
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              <Icon name="sparkles" size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                {destaque && <span style={{ display: "block", fontSize: 10.5, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 1 }}>Sugerido pra você</span>}
                {c}
              </span>
              <Icon name="arrowRight" size={14} style={{ color: "var(--text-subtle)" }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
