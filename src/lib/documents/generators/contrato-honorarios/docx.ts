import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  TextWrappingSide,
  TextWrappingType,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  WidthType,
  convertMillimetersToTwip,
} from 'docx'
import { readFileSync } from 'fs'
import path from 'path'
import type { ContentBlock, ParagraphBlock, HeadingBlock, SignatureBlock } from '../../types'
import type { ContratoHonorariosData } from '@/lib/types/contrato-honorarios'
import { buildContratoHonorarios } from './content'

// ── constants ─────────────────────────────────────────────────────────────────

const MM = convertMillimetersToTwip
const FONT = 'Arial'
const FONT_SIZE_HP = 24   // half-points (12pt × 2)
const SMALL_SIZE_HP = 20  // 10pt
const LINE_SPACING = 360  // 1.5 lines
const INDENT_FIRST_LINE = MM(12.5)
const PARA_SPACING_AFTER = MM(3.5)

// A4: 210mm wide, margins 25mm each side → content width = 160mm
const CONTENT_WIDTH_DXA = MM(160)   // 9072 twips
const COL_HALF_DXA = Math.round(CONTENT_WIDTH_DXA / 2)  // per signature column

const NO_BORDER_CELL = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
} as const

// ── helpers ───────────────────────────────────────────────────────────────────

const ALIGN: Record<string, string> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  justify: AlignmentType.BOTH,
  right: AlignmentType.RIGHT,
}

function paragraphToDocx(block: ParagraphBlock): Paragraph {
  return new Paragraph({
    children: block.chunks.map(
      (chunk) => new TextRun({ text: chunk.text, bold: chunk.bold, font: FONT, size: FONT_SIZE_HP }),
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    alignment: ALIGN[block.align ?? 'justify'] as any,
    indent: block.indent ? { firstLine: INDENT_FIRST_LINE } : undefined,
    spacing: { line: LINE_SPACING, after: PARA_SPACING_AFTER },
  })
}

function headingToDocx(block: HeadingBlock): Paragraph {
  const isChapter = block.level === 'chapter'
  return new Paragraph({
    children: [
      new TextRun({ text: block.text.toUpperCase(), bold: true, font: FONT, size: FONT_SIZE_HP }),
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    alignment: (isChapter ? AlignmentType.CENTER : AlignmentType.LEFT) as any,
    spacing: {
      before: MM(isChapter ? 5 : 4),
      after: MM(3),
      line: LINE_SPACING,
    },
  })
}

function signerCell(name: string | undefined, label: string): TableCell {
  return new TableCell({
    width: { size: COL_HALF_DXA, type: WidthType.DXA },
    borders: NO_BORDER_CELL,
    margins: { top: 0, bottom: 0, left: MM(2), right: MM(2) },
    children: [
      // vertical spacing
      new Paragraph({
        children: [new TextRun({ text: '', font: FONT, size: FONT_SIZE_HP })],
        spacing: { before: MM(18), after: 0 },
      }),
      // name with top border = signature line
      new Paragraph({
        children: [
          new TextRun({ text: name ?? '', bold: !!name, font: FONT, size: FONT_SIZE_HP }),
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        alignment: AlignmentType.CENTER as any,
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: '020D25', space: 1 } },
        spacing: { before: MM(1), after: MM(1) },
      }),
      // label
      ...(label ? [new Paragraph({
        children: [new TextRun({ text: label, font: FONT, size: SMALL_SIZE_HP, color: '808080' })],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        alignment: AlignmentType.CENTER as any,
        spacing: { before: 0, after: MM(4) },
      })] : []),
    ],
  })
}

function signatureToDocx(block: SignatureBlock): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = []

  result.push(new Paragraph({
    children: [new TextRun({ text: block.dateCity, font: FONT, size: FONT_SIZE_HP })],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    alignment: AlignmentType.RIGHT as any,
    spacing: { before: MM(8), after: MM(4), line: LINE_SPACING },
  }))

  for (let i = 0; i < block.rows.length; i += 2) {
    const pair = [...block.rows.slice(i, i + 2)]
    while (pair.length < 2) pair.push({ label: '' })

    result.push(new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: [COL_HALF_DXA, CONTENT_WIDTH_DXA - COL_HALF_DXA],
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      rows: [
        new TableRow({
          children: pair.map((signer) => signerCell(signer.name, signer.label)),
        }),
      ],
    }))
  }

  return result
}

function blocksToDocxChildren(blocks: ContentBlock[]): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = []
  for (const block of blocks) {
    if (block.type === 'paragraph') result.push(paragraphToDocx(block))
    else if (block.type === 'heading') result.push(headingToDocx(block))
    else if (block.type === 'signatures') result.push(...signatureToDocx(block))
  }
  return result
}

// ── letterhead: full-page floating image in header ────────────────────────────

function buildLetterheadHeader(): Header | undefined {
  try {
    const imgBuffer = readFileSync(path.join(process.cwd(), 'public', 'letterhead.png'))
    // Full A4 page dimensions at 96 DPI
    const A4_W_PX = Math.round(210 * 3.7795)   // 794px
    const A4_H_PX = Math.round(297 * 3.7795)   // 1123px

    return new Header({
      children: [
        new Paragraph({
          children: [
            new ImageRun({
              type: 'png',
              data: imgBuffer,
              transformation: { width: A4_W_PX, height: A4_H_PX },
              floating: {
                // Anchor the image to the top-left corner of the PAGE (not margin)
                horizontalPosition: {
                  relative: HorizontalPositionRelativeFrom.PAGE,
                  align: HorizontalPositionAlign.LEFT,
                },
                verticalPosition: {
                  relative: VerticalPositionRelativeFrom.PAGE,
                  align: VerticalPositionAlign.TOP,
                },
                wrap: {
                  type: TextWrappingType.NONE,
                  side: TextWrappingSide.BOTH_SIDES,
                },
                behindDocument: true,
              },
            }),
          ],
        }),
      ],
    })
  } catch {
    return undefined
  }
}

// ── public API ────────────────────────────────────────────────────────────────

export async function generateContratoHonorariosDocx(data: ContratoHonorariosData): Promise<Buffer> {
  const blocks = buildContratoHonorarios(data)
  const children = blocksToDocxChildren(blocks)
  const header = buildLetterheadHeader()

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: FONT_SIZE_HP },
          paragraph: { spacing: { line: LINE_SPACING } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: MM(210), height: MM(297) },
            margin: { top: MM(30), right: MM(25), bottom: MM(30), left: MM(25) },
          },
        },
        ...(header ? { headers: { default: header } } : {}),
        children,
      },
    ],
  })

  return Packer.toBuffer(doc)
}
