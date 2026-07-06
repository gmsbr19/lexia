"use client"

// LexIA · Chat — ditado por voz do composer (Fase 7). Web Speech API (pt-BR);
// mesma tipagem mínima do RambleModal (Tarefas) — a API não está na lib DOM do
// TS. Devolve o texto FINAL consolidado a cada resultado; o chamador decide
// como concatenar no composer. Degrada (suportado=false) sem o navegador.
import { useCallback, useEffect, useRef, useState } from "react"

interface SpeechAlt {
  transcript: string
}
interface SpeechRes {
  isFinal: boolean
  0: SpeechAlt
}
interface SpeechResultEvent {
  resultIndex: number
  results: { length: number; [i: number]: SpeechRes }
}
interface SpeechErrorEvent {
  error: string
}
interface SpeechRec {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechResultEvent) => void) | null
  onerror: ((e: SpeechErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecCtor = new () => SpeechRec

function getSpeechRecognition(): SpeechRecCtor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export interface UseDitado {
  suportado: boolean
  ouvindo: boolean
  iniciar: () => void
  parar: () => void
}

export function useDitado(onTranscricao: (texto: string) => void): UseDitado {
  const [suportado] = useState(() => getSpeechRecognition() != null)
  const [ouvindo, setOuvindo] = useState(false)
  const recRef = useRef<SpeechRec | null>(null)
  // Ref evita recriar iniciar/parar a cada render quando o callback muda —
  // atualizado num efeito (não durante o render, que o React proíbe mutar refs).
  const onTranscricaoRef = useRef(onTranscricao)
  useEffect(() => {
    onTranscricaoRef.current = onTranscricao
  })

  const parar = useCallback(() => {
    recRef.current?.stop()
  }, [])

  const iniciar = useCallback(() => {
    const Ctor = getSpeechRecognition()
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = "pt-BR"
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => {
      let texto = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) texto += r[0].transcript
      }
      if (texto.trim()) onTranscricaoRef.current(texto.trim())
    }
    rec.onerror = () => setOuvindo(false)
    rec.onend = () => setOuvindo(false)
    recRef.current = rec
    setOuvindo(true)
    rec.start()
  }, [])

  // Para o microfone se o componente desmontar enquanto ouvindo (ex.: fechar o chat).
  useEffect(() => () => recRef.current?.stop(), [])

  return { suportado, ouvindo, iniciar, parar }
}
