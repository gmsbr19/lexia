import { create } from 'zustand'

export type DocType = 'Contrato' | 'Procuração' | 'Proposta' | 'Parecer Jurídico'
export type WizardMode = 'ai' | 'manual'

export type ChatRole = 'user' | 'assistant' | 'system'
export interface ChatMessage {
  id?: string
  role: ChatRole
  content: string
  createdAt?: string
}

interface DocumentWizard {
  docType: DocType | null
  mode: WizardMode | null
  formData: Record<string, string>
  messages: ChatMessage[]
  generatedContent: string | null
  documentId: string | null

  setDocType(t: DocType | null): void
  setMode(m: WizardMode | null): void
  setField(key: string, value: string): void
  addMessage(msg: ChatMessage): void
  setGeneratedContent(text: string | null): void
  reset(): void
}

const initialState = {
  docType: null as DocType | null,
  mode: null as WizardMode | null,
  formData: {} as Record<string, string>,
  messages: [] as ChatMessage[],
  generatedContent: null as string | null,
  documentId: null as string | null,
}

export const useDocumentStore = create<DocumentWizard>((set, get) => ({
  docType: initialState.docType,
  mode: initialState.mode,
  formData: initialState.formData,
  messages: initialState.messages,
  generatedContent: initialState.generatedContent,
  documentId: initialState.documentId,

  setDocType(t) {
    set(() => ({ docType: t }))
  },

  setMode(m) {
    set(() => ({ mode: m }))
  },

  setField(key, value) {
    set((state) => ({ formData: { ...state.formData, [key]: value } }))
  },

  addMessage(msg) {
    set((state) => ({ messages: [...state.messages, msg] }))
  },

  setGeneratedContent(text) {
    set(() => ({ generatedContent: text }))
  },

  reset() {
    set(() => ({
      docType: null,
      mode: null,
      formData: {},
      messages: [],
      generatedContent: null,
      documentId: null,
    }))
  },
}))

export default useDocumentStore
