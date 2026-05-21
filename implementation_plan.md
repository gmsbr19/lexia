# LexIA — Functionality Implementation Plan

## Context

The UI for all 7 screens is complete and committed. Every screen is a **visual prototype** — the layout, tokens, and component library are done. This plan covers making the module actually work: wiring up the document creation wizard, connecting real AI, generating downloadable files, and persisting history.

**What currently works:** sidebar collapse, dark-mode toggle (in-memory), format selector, accordion sections, Switch toggles.  
**What needs building:** wizard state across steps, form data binding, AI chat, document generation (DOCX/PDF), file download, history persistence, search/filter, theme persistence, toast feedback.

---

## Key decisions

| Concern | Choice | Rationale |
|---|---|---|
| Wizard state | **Zustand** | Survives navigation between wizard steps; no backend needed for MVP; easy to extend |
| AI chat | **Anthropic SDK (`@ai-sdk/anthropic` + `ai`)** | Streaming responses in Server Actions; matches "LexIA" branding |
| DOCX generation | **`docx` npm package** | Pure JS, runs in a Server Action, no headless browser |
| PDF generation | **`@react-pdf/renderer`** | Renders JSX to PDF in a Route Handler; reuses existing React document components |
| History persistence | **`localStorage` via `idb-keyval`** | Zero backend for MVP; trivially swappable for DB later |
| Toasts | **`sonner`** | Lightweight, already used in many Next.js starters, works with App Router |
| Dark mode persistence | **`localStorage` + `next-themes`** | No flash of wrong theme on load; zero config |

---

## Milestone 1 — Wizard state & navigation flow

**Goal:** clicking through all 7 screens end-to-end without manual URL changes.

### New files
- `src/lib/store.ts` — Zustand store with:
  ```ts
  type DocType = 'Contrato' | 'Procuração' | 'Proposta' | 'Parecer Jurídico'
  type WizardMode = 'ai' | 'manual'

  interface DocumentWizard {
    docType: DocType | null
    mode: WizardMode | null
    formData: Record<string, string>       // manual form fields
    messages: ChatMessage[]                // AI chat history
    generatedContent: string | null        // AI-produced contract text
    documentId: string | null             // set after first save

    setDocType(t: DocType): void
    setMode(m: WizardMode): void
    setField(key: string, value: string): void
    addMessage(msg: ChatMessage): void
    setGeneratedContent(text: string): void
    reset(): void
  }
  ```

### Files to modify

| File | Change |
|---|---|
| `src/app/documents/page.tsx` | DocTypeCard `onClick` → `store.setDocType(name)` then `router.push('/documents/new')` |
| `src/app/documents/new/page.tsx` | ModeCard buttons → `store.setMode(…)` then `router.push('/documents/new/ai')` or `/manual` |
| `src/app/documents/new/manual/page.tsx` | "Continuar" → `router.push('/documents/preview')` |
| `src/app/documents/new/ai/page.tsx` | "Finalizar" → `router.push('/documents/preview')` |
| `src/app/documents/preview/page.tsx` | "Baixar" → `router.push('/documents/download')` |
| `src/app/documents/new/page.tsx` | Stepper highlights correct active step from `store.docType` |

**Install:** `npm install zustand`

---

## Milestone 2 — Manual form (controlled fields + live preview)

**Goal:** every form field is editable; preview updates as you type; progress bar tracks completion.

### Files to modify

**`src/app/documents/new/manual/page.tsx`**
- Convert all `<input readOnly>` to controlled: `value={store.formData[key] ?? ''}` + `onChange={(e) => store.setField(key, e.target.value)}`
- Progress = sections with ≥1 filled field / total sections (computed, not hardcoded)
- "Continuar" disabled until required fields (name, CPF, objeto, vigência) are filled

**`src/components/documents/DraftPreview.tsx`**
- Accept a `formData` prop instead of hardcoded strings
- Replace static text with `formData.contratante ?? '{{NOME}}'`, etc.
- Placeholder spans only shown for unfilled fields

**`src/app/documents/new/manual/page.tsx`**
- Pass `formData={store.formData}` to `<DraftPreview showPlaceholders />`

### New file: `src/lib/templates.ts`
Maps `fieldKey → label + placeholder + required` for each template (starting with HRA-02).

---

## Milestone 3 — AI chat with streaming

**Goal:** user types a message, assistant streams a reply, preview panel updates with generated contract text.

### New files

**`src/app/api/chat/route.ts`** — POST Route Handler
```ts
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

// System prompt: Brazilian law firm assistant, uses HRA-02 template, replies in Portuguese
// Receives: { messages: ChatMessage[], docType: string }
// Streams back: text delta
```

**`src/lib/chat.ts`** — client helper
```ts
// sendMessage(messages, docType): AsyncIterable<string>
// Calls /api/chat, streams response chunks back to caller
```

### Files to modify

**`src/app/documents/new/ai/page.tsx`** (`'use client'`)
- Messages live in Zustand store (not local state)
- Send button: append user message → stream assistant reply → update store
- Stream chunks update a local `streamingText` state shown in the last AI bubble
- On stream end: `store.setGeneratedContent(fullText)`; preview panel re-renders
- Quick-action buttons (12 meses, 24 meses, etc.) append as user messages automatically
- Loading: spinner inside Send button while streaming; input disabled

**`src/components/documents/DraftPreview.tsx`**
- Accept `generatedText?: string` prop
- When present, render as formatted paragraphs instead of static content

**Install:** `npm install ai @ai-sdk/anthropic`  
**Env:** `ANTHROPIC_API_KEY` in `.env.local`

---

## Milestone 4 — Document generation & download

**Goal:** clicking "Baixar PDF" or "Baixar DOCX" triggers a real file download.

### New files

**`src/app/api/generate/docx/route.ts`** — GET/POST Route Handler
```ts
import { Document, Paragraph, TextRun, … } from 'docx'
// Builds a docx.Document from store formData / generatedContent
// Returns: Response with application/vnd.openxmlformats Content-Type + binary body
```

**`src/app/api/generate/pdf/route.ts`** — GET/POST Route Handler
```ts
import { renderToBuffer } from '@react-pdf/renderer'
import { ContractPDF } from '@/components/documents/ContractPDF'
// Returns: Response with application/pdf + buffer
```

**`src/components/documents/ContractPDF.tsx`**
- React PDF version of the existing contract layout (Letterhead, paragraphs)
- Accepts `formData` prop

### Files to modify

**`src/app/documents/download/page.tsx`**
- Download button: POST to `/api/generate/docx` or `/api/generate/pdf` with current store data → trigger browser download via `URL.createObjectURL`
- Loading spinner on button while generating
- On success: save document to history (Milestone 5), show toast

**Install:** `npm install docx @react-pdf/renderer`

---

## Milestone 5 — History persistence & search/filter

**Goal:** completed documents appear in history; search and filter work client-side.

### New files

**`src/lib/history.ts`**
```ts
interface HistoryEntry {
  id: string
  name: string
  type: DocType
  client: string
  author: string
  createdAt: string
  status: 'Rascunho' | 'Finalizado' | 'Assinado' | 'Em revisão'
  size: string
  source: 'ai' | 'manual'
}

// saveDocument(entry): void  — writes to idb-keyval
// getDocuments(): Promise<HistoryEntry[]>
// deleteDocument(id): void
```

### Files to modify

**`src/app/documents/history/page.tsx`** → convert to `'use client'`
- Load from `history.getDocuments()` on mount
- `filterType` state: all / Contratos / Procurações / Propostas / Pareceres
- `query` state: controlled search input, filters `name` + `client` + `id` (client-side, no debounce needed)
- Derived `filtered` array = filter(type) then filter(query)
- Pagination: slice filtered array by page (10 per page)
- Download button: re-generate from stored data
- "⋯" menu (RadixUI DropdownMenu): Duplicar, Excluir, Compartilhar

**`src/app/documents/page.tsx`**
- "Continuar editando" section: load last 3 from `history.getDocuments()` on client

**Install:** `npm install idb-keyval`

---

## Milestone 6 — Theme persistence & ⌘K palette

**Goal:** dark mode survives page reload; ⌘K opens a command palette.

### Files to modify

**`src/app/layout.tsx`**
- Wrap with `ThemeProvider` from `next-themes` (sets `class` on `<html>`)
- Pass `attribute="class"` + map `darkTheme` class name

**`src/components/shell/AppShell.tsx`**
- Replace manual `dark` state with `useTheme()` from `next-themes`

**Install:** `npm install next-themes`

### New file: `src/components/ui/CommandPalette.tsx` (`'use client'`)
- RadixUI Dialog triggered by `⌘K` (global `keydown` listener)
- Search box filters: recent documents (from history store) + nav items
- Arrow key navigation + Enter to select
- Uses `@radix-ui/react-dialog`

**Install:** `npm install @radix-ui/react-dialog`

---

## Milestone 7 — Toast notifications & loading states

**Goal:** every user action has visible feedback.

### New file: `src/components/ui/Toaster.tsx`
```tsx
import { Toaster } from 'sonner'
// Themed to match LexIA tokens (navy + gold)
```

### Add to `src/app/layout.tsx`: `<Toaster />`

### Toasts to add (file by file)

| Trigger | Message |
|---|---|
| Manual form auto-save (3s debounce) | "Rascunho salvo" |
| Send AI message | — (inline streaming indicator is enough) |
| Generate DOCX/PDF success | "Documento gerado com sucesso" |
| Generate error | "Erro ao gerar documento. Tente novamente." |
| Delete from history | "Documento excluído" + Undo action |
| Copy link | "Link copiado" |

**Install:** `npm install sonner`

---

## Dependency install summary

All milestones combined — one install command:

```bash
npm install zustand ai @ai-sdk/anthropic docx @react-pdf/renderer \
  idb-keyval next-themes sonner \
  @radix-ui/react-dialog
```

`.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## File change map

| File | Milestone | Type |
|---|---|---|
| `src/lib/store.ts` | 1 | New |
| `src/lib/templates.ts` | 2 | New |
| `src/lib/chat.ts` | 3 | New |
| `src/lib/history.ts` | 5 | New |
| `src/app/api/chat/route.ts` | 3 | New |
| `src/app/api/generate/docx/route.ts` | 4 | New |
| `src/app/api/generate/pdf/route.ts` | 4 | New |
| `src/components/documents/ContractPDF.tsx` | 4 | New |
| `src/components/documents/DraftPreview.tsx` | 2, 3 | Modify |
| `src/components/ui/CommandPalette.tsx` | 6 | New |
| `src/components/ui/Toaster.tsx` | 7 | New |
| `src/app/layout.tsx` | 6, 7 | Modify |
| `src/app/documents/page.tsx` | 1, 5 | Modify |
| `src/app/documents/new/page.tsx` | 1 | Modify |
| `src/app/documents/new/ai/page.tsx` | 1, 3 | Modify |
| `src/app/documents/new/manual/page.tsx` | 1, 2 | Modify |
| `src/app/documents/preview/page.tsx` | 1 | Modify |
| `src/app/documents/download/page.tsx` | 1, 4, 7 | Modify |
| `src/app/documents/history/page.tsx` | 5 | Modify |
| `src/components/shell/AppShell.tsx` | 6 | Modify |

---

## Verification (end-to-end)

1. **Full wizard flow**: Home → click "Contrato" → Mode Select → "Com IA" → chat → "Finalizar" → Preview → "Baixar" → Download → file appears in browser
2. **Manual flow**: Home → "Procuração" → "Manual" → fill form fields → preview updates live → progress reaches 100% → Continue → Preview → Download
3. **History**: complete a doc → open `/documents/history` → appears at top; search by client name → row appears
4. **Dark mode**: toggle dark → reload → stays dark
5. **⌘K**: press on any screen → palette opens → type "helena" → matching doc appears
6. `npm run build` — no TS errors, no missing env warnings