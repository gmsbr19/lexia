// LexDoc → DOCX renderer. Maps the portable document model node-by-node onto the
// `docx` library. Honest fidelity note: DOCX reflows in Word's own layout engine,
// so it is faithful (same content, fonts, margins, letterhead, styles) but NOT
// guaranteed pixel-identical to the HTML/PDF preview — that guarantee holds for
// the PDF path. SERVER ONLY (uses Buffer + the docx packer).
import {
  AlignmentType,
  Document,
  Header,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
  TextWrappingSide,
  TextWrappingType,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  convertMillimetersToTwip,
} from 'docx'
import type { LexAlign, LexBlock, LexDoc, LexInline, LexListItem, MarginsMm } from '../model/types'
import { DEFAULT_MARGINS_MM } from '../model/types'
import { resolvePlaceholder } from '../model/placeholders'

// ── constants ─────────────────────────────────────────────────────────────────

const MM = convertMillimetersToTwip
const FONT = 'Arial'
const FONT_SIZE_HP = 24 // half-points (12pt × 2)
const LINE_SPACING = 360 // 1.5 lines
const INDENT_FIRST_LINE = MM(12.5)
const PARA_SPACING_AFTER = MM(3.5)
const OL_REF = 'lex-ordered'

const ALIGN: Record<LexAlign, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  justify: AlignmentType.BOTH,
  right: AlignmentType.RIGHT,
}

const HEADING_SIZE_HP: Record<number, number> = { 1: 28, 2: 26, 3: 24 }

export interface DocxRenderOptions {
  /** Raw letterhead image bytes (PNG/JPG) — drawn full-page behind the text. */
  letterhead?: { data: Buffer; type: 'png' | 'jpg' }
  /** Content margins (the letterhead safe area). Defaults to 3cm/2.5cm. */
  marginsMm?: MarginsMm
  /** Field values keyed by placeholder `name`. */
  valores?: Record<string, string>
}

// Mutable walk state: `olInstance` gives each ordered list a distinct numbering
// instance so it restarts at 1.
interface RenderState {
  valores?: Record<string, string>
  olInstance: number
}

interface RunOverride {
  size?: number
  forceBold?: boolean
}

// ── inline ─────────────────────────────────────────────────────────────────────

function inlineToRuns(nodes: LexInline[] | undefined, st: RenderState, ov?: RunOverride): TextRun[] {
  if (!nodes?.length) return []
  const runs: TextRun[] = []
  for (const n of nodes) {
    if (n.type === 'hardBreak') {
      runs.push(new TextRun({ break: 1 }))
      continue
    }
    let text: string
    let marks: { type: string }[] | undefined
    if (n.type === 'text') {
      text = n.text
      marks = n.marks
    } else if (n.type === 'placeholder') {
      text = resolvePlaceholder(n.attrs, st.valores).text
      marks = undefined
    } else {
      continue
    }
    const has = (t: string) => !!marks?.some((m) => m.type === t)
    runs.push(
      new TextRun({
        text,
        font: FONT,
        size: ov?.size ?? FONT_SIZE_HP,
        bold: ov?.forceBold || has('bold'),
        italics: has('italic'),
        strike: has('strike'),
        underline: has('underline') ? {} : undefined,
      }),
    )
  }
  return runs
}

// ── blocks ─────────────────────────────────────────────────────────────────────

function paragraphFrom(
  block: Extract<LexBlock, { type: 'paragraph' }>,
  st: RenderState,
  extra?: {
    bullet?: { level: number }
    numbering?: { reference: string; level: number; instance: number }
    indentLeft?: number
  },
): Paragraph {
  return new Paragraph({
    children: inlineToRuns(block.content, st),
    alignment: block.attrs?.align ? ALIGN[block.attrs.align] : ALIGN.justify,
    indent: {
      ...(block.attrs?.indent ? { firstLine: INDENT_FIRST_LINE } : {}),
      ...(extra?.indentLeft ? { left: extra.indentLeft } : {}),
    },
    spacing: { line: LINE_SPACING, after: PARA_SPACING_AFTER },
    ...(extra?.bullet ? { bullet: extra.bullet } : {}),
    ...(extra?.numbering ? { numbering: extra.numbering } : {}),
  })
}

function headingFrom(block: Extract<LexBlock, { type: 'heading' }>, st: RenderState): Paragraph {
  const level = block.attrs?.level ?? 1
  const size = HEADING_SIZE_HP[level] ?? 24
  return new Paragraph({
    children: inlineToRuns(block.content, st, { size, forceBold: true }),
    alignment: block.attrs?.align ? ALIGN[block.attrs.align] : ALIGN.left,
    spacing: { before: MM(level === 1 ? 5 : 4), after: MM(3), line: LINE_SPACING },
  })
}

function listItemsToParagraphs(
  items: LexListItem[] | undefined,
  st: RenderState,
  kind: 'bullet' | 'ordered',
  level: number,
): Paragraph[] {
  if (!items?.length) return []
  const instance = kind === 'ordered' ? st.olInstance++ : 0
  const out: Paragraph[] = []
  for (const li of items) {
    for (const child of li.content ?? []) {
      if (child.type === 'paragraph') {
        out.push(
          paragraphFrom(child, st, {
            indentLeft: MM(8 * (level + 1)),
            ...(kind === 'bullet'
              ? { bullet: { level } }
              : { numbering: { reference: OL_REF, level, instance } }),
          }),
        )
      } else {
        // Nested list or other block inside a list item.
        out.push(...blockToParagraphs(child, st))
      }
    }
  }
  return out
}

function blockToParagraphs(block: LexBlock, st: RenderState): Paragraph[] {
  switch (block.type) {
    case 'paragraph':
      return [paragraphFrom(block, st)]
    case 'heading':
      return [headingFrom(block, st)]
    case 'bulletList':
      return listItemsToParagraphs(block.content, st, 'bullet', 0)
    case 'orderedList':
      return listItemsToParagraphs(block.content, st, 'ordered', 0)
    case 'blockquote':
      return (block.content ?? []).flatMap((b) => blockToParagraphs(b, st))
    case 'pageBreak':
      return [new Paragraph({ children: [], pageBreakBefore: true })]
    case 'image': {
      const img = dataUrlToImage(block.attrs.src)
      if (!img) return [new Paragraph({ children: [] })]
      return [
        new Paragraph({
          alignment: block.attrs.align ? ALIGN[block.attrs.align] : ALIGN.left,
          children: [
            new ImageRun({
              type: img.type,
              data: img.data,
              transformation: { width: block.attrs.width ?? 400, height: block.attrs.height ?? 300 },
            }),
          ],
        }),
      ]
    }
    case 'listItem':
      return (block.content ?? []).flatMap((b) => blockToParagraphs(b, st))
    default:
      return []
  }
}

// ── images: decode data URLs (only supported image source on the server) ───────

function dataUrlToImage(src: string): { data: Buffer; type: 'png' | 'jpg' } | null {
  const m = src.match(/^data:image\/(png|jpe?g);base64,(.+)$/i)
  if (!m) return null
  const type = m[1].toLowerCase().startsWith('jp') ? 'jpg' : 'png'
  return { data: Buffer.from(m[2], 'base64'), type }
}

// ── letterhead header (full-page floating image, behind text) ──────────────────

function buildLetterheadHeader(letterhead?: DocxRenderOptions['letterhead']): Header | undefined {
  if (!letterhead) return undefined
  // Full A4 page dimensions at 96 DPI.
  const A4_W_PX = Math.round(210 * 3.7795) // 794px
  const A4_H_PX = Math.round(297 * 3.7795) // 1123px
  return new Header({
    children: [
      new Paragraph({
        children: [
          new ImageRun({
            type: letterhead.type,
            data: letterhead.data,
            transformation: { width: A4_W_PX, height: A4_H_PX },
            floating: {
              horizontalPosition: {
                relative: HorizontalPositionRelativeFrom.PAGE,
                align: HorizontalPositionAlign.LEFT,
              },
              verticalPosition: {
                relative: VerticalPositionRelativeFrom.PAGE,
                align: VerticalPositionAlign.TOP,
              },
              wrap: { type: TextWrappingType.NONE, side: TextWrappingSide.BOTH_SIDES },
              behindDocument: true,
            },
          }),
        ],
      }),
    ],
  })
}

// ── public API ─────────────────────────────────────────────────────────────────

/** Render a LexDoc to a .docx buffer. */
export async function documentToDocx(doc: LexDoc, opts: DocxRenderOptions = {}): Promise<Buffer> {
  const st: RenderState = { valores: opts.valores, olInstance: 1 }
  const children = doc.content.flatMap((b) => blockToParagraphs(b, st))
  const header = buildLetterheadHeader(opts.letterhead)
  const m = opts.marginsMm ?? DEFAULT_MARGINS_MM

  const docFile = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: FONT_SIZE_HP },
          paragraph: { spacing: { line: LINE_SPACING } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: OL_REF,
          levels: [0, 1, 2].map((level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: MM(8 * (level + 1)), hanging: MM(5) } } },
          })),
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: MM(210), height: MM(297) },
            margin: { top: MM(m.top), right: MM(m.right), bottom: MM(m.bottom), left: MM(m.left) },
          },
        },
        ...(header ? { headers: { default: header } } : {}),
        children,
      },
    ],
  })

  return Packer.toBuffer(docFile)
}
