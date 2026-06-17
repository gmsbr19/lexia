"use client"

// Welcome state: gold orb, greeting, and contextual suggestion chips. The chip
// set is page-aware (cliente detail wins).
import { Icon } from "@/components/crm/crm-icons"

const GOLD_GRAD = "var(--brand-gold)"

export function contextChips(page: string, hasCliente: boolean): string[] {
  if (hasCliente) return ["Resuma a situação deste cliente", "Há valores vencidos?", "Criar tarefa para este cliente"]
  switch (page) {
    case "financeiro":
      return ["Quem está devendo há mais de 60 dias?", "Qual o total a receber este mês?", "Resumo do fluxo de caixa"]
    case "casos":
      return ["Casos sem rateio definido", "Como funciona o rateio entre sócios?", "Audiências desta semana"]
    case "contratos":
      return ["Contratos vencidos", "Qual o ticket médio?", "Recorrentes a vencer"]
    case "documents":
    case "documentos":
      return ["Minutar contrato de honorários", "Procuração ad judicia para um cliente", "Quais documentos estão em rascunho?"]
    case "documents-editor":
      return ["Limite o contrato à 1ª instância", "Escreva o objeto para matéria cível", "Defina o foro de São Paulo"]
    case "agenda":
      return ["O que tenho hoje?", "Próximas audiências", "Criar um evento"]
    case "comercial":
      return ["Quantos leads este mês?", "Qual o ROAS?", "Leads em proposta"]
    case "processos":
      return [
        "Processos com prazo essa semana",
        "Processos parados há +30 dias",
        "Publicações a triar",
        "Quem é o responsável do caso …",
      ]
    case "tarefas":
      return ["O que tenho para fazer?", "Tarefas atrasadas", "Criar uma tarefa"]
    case "clientes":
    case "cliente":
      return ["Clientes com mais casos", "Buscar um cliente", "Criar novo cliente"]
    default:
      return ["O que tenho hoje?", "Quem está devendo?", "Criar uma tarefa"]
  }
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

export function Suggestions({ chips, onPick }: { chips: string[]; onPick: (c: string) => void }) {
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
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {chips.map((c, i) => (
          <button
            key={i}
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
              border: "1px solid var(--border)",
              background: "var(--surface)",
              cursor: "pointer",
              fontSize: 14,
              color: "var(--text)",
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            <Icon name="sparkles" size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{c}</span>
            <Icon name="arrowRight" size={14} style={{ color: "var(--text-subtle)" }} />
          </button>
        ))}
      </div>
    </div>
  )
}
