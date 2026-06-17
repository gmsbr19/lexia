// Shared document-editor type: an AI-proposed field edit. Lives in a neutral module
// (not tied to any one panel) so the editor page and the LexIA chat kit can import
// it freely.

/** A single proposed edit: a dotted path into ContratoHonorariosData + label + value. */
export interface AISuggestion {
  field: string
  label: string
  value: string
}
