"use client"

// LexIA · Chat — botão de ditado por voz (Fase 7). Some inteiramente sem
// suporte no navegador (Web Speech API — Chrome/Edge); "Ouvindo…" reusa o
// glifo animado "bars" do motion kit (mesma linguagem visual do chat, sem CSS novo).
import { Icon } from "@/components/crm/crm-icons"
import { AnimatedIcon } from "./cc/motion"
import { useDitado } from "./useDitado"

export function MicButton({ onTranscricao, disabled }: { onTranscricao: (texto: string) => void; disabled?: boolean }) {
  const { suportado, ouvindo, iniciar, parar } = useDitado(onTranscricao)
  if (!suportado) return null
  return (
    <button
      type="button"
      onClick={ouvindo ? parar : iniciar}
      disabled={disabled}
      title={ouvindo ? "Parar ditado" : "Ditar por voz"}
      className="btn btn-ghost"
      style={{ width: 30, height: 30, padding: 0, borderRadius: 8, color: ouvindo ? "var(--crit)" : "var(--text-muted)", background: ouvindo ? "var(--crit-soft)" : undefined }}
    >
      {ouvindo ? <AnimatedIcon name="bars" size={15} /> : <Icon name="mic" size={16} />}
    </button>
  )
}
