// Intermediate content representation between data model and format renderers.
// Each renderer (DOCX, PDF, print) converts these blocks to its output format.

export interface TextChunk {
  text: string
  bold?: boolean
}

export interface ParagraphBlock {
  type: 'paragraph'
  chunks: TextChunk[]
  align?: 'left' | 'center' | 'justify' | 'right'
  indent?: boolean
}

export interface HeadingBlock {
  type: 'heading'
  text: string
  level: 'chapter' | 'clause'
}

export interface SignatureRow {
  label: string
  name?: string
}

export interface SignatureBlock {
  type: 'signatures'
  dateCity: string
  rows: SignatureRow[]
}

export type ContentBlock = ParagraphBlock | HeadingBlock | SignatureBlock

export interface DocumentGenerator<TData> {
  generateDocx(data: TData): Promise<Buffer>
}
