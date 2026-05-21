import { create } from 'zustand'
import type { DocCategory } from './documents/registry'

// Re-export for backward compatibility with existing imports
export type DocType = DocCategory

export type ChatRole = 'user' | 'assistant' | 'system'
export interface ChatMessage {
  id?: string
  role: ChatRole
  content: string
  createdAt?: string
}

interface DocumentWizard {
  docType: DocType | null
  templateId: string | null
  formData: Record<string, string>
  messages: ChatMessage[]
  generatedContent: string | null
  documentId: string | null

  setDocType(t: DocType | null): void
  setTemplateId(id: string | null): void
  setField(key: string, value: string): void
  addMessage(msg: ChatMessage): void
  setGeneratedContent(text: string | null): void
  reset(): void
}

const initialState = {
  docType: null as DocType | null,
  templateId: null as string | null,
  formData: {} as Record<string, string>,
  messages: [] as ChatMessage[],
  generatedContent: null as string | null,
  documentId: null as string | null,
}

export const useDocumentStore = create<DocumentWizard>((set) => ({
  ...initialState,

  setDocType(t) {
    set(() => ({ docType: t }))
  },

  setTemplateId(id) {
    set(() => ({ templateId: id }))
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
    set(() => ({ ...initialState }))
  },
}))

export default useDocumentStore
