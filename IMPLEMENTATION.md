# Lexia Document Generation Implementation

## Overview
Implementation of DOCX and PDF generation for legal contract "Contrato de Honorários Advocatícios" with server-side generation via `/api/documents/generate`.

## Architecture

### Content Generation Layer
- **`src/lib/documents/types.ts`**: Defines intermediate `ContentBlock` AST (ParagraphBlock, HeadingBlock, SignatureBlock) for format-agnostic representation
- **`src/lib/documents/generators/contrato-honorarios/content.ts`**: Pure function `buildContratoHonorarios(data)` that generates all contract content blocks
  - Contains contract qualifications (PF/PJ/Sócio)
  - 6 honorários types (avista, parcelado, parcelas_diferentes, exito, avista_exito, parcelado_exito)
  - Static clauses (CLAUSULAS_GERAIS, CLAUSULAS_COMPROMISSO)
  - Helper functions: `t()`, `b()`, `fl()`, `v()`, `p()`, `chapter()`, `clause()`

### Format Renderers
- **DOCX**: `src/lib/documents/generators/contrato-honorarios/docx.ts`
  - Uses `docx` v9.6.1 npm package
  - Floating letterhead image anchored to PAGE (not margin) with `behindDocument: true`
  - All widths use `WidthType.DXA` with explicit `columnWidths` array
  - Letterhead image: 794px × 1123px (A4 dimensions at 96 DPI)
  
- **PDF**: `src/lib/documents/generators/contrato-honorarios/pdf.ts`
  - Uses puppeteer v25.0.4 for server-side Chromium PDF generation
  - Embeds letterhead.png as base64 data URL
  - Dynamic CSS layout with `position: fixed` background
  
- **HTML**: `src/lib/documents/generators/contrato-honorarios/html.ts`
  - Converts ContentBlock[] to HTML string for puppeteer PDF rendering
  - Letterhead as fixed div with image
  - A4 margins: 3cm top/bottom, 2.5cm left/right

### API Layer
- **`src/app/api/documents/generate/route.ts`**: POST endpoint
  - Body: `{ type: 'contrato-honorarios', format: 'docx' | 'pdf', data: ContratoHonorariosData }`
  - Returns binary file with proper Content-Type and Content-Disposition headers

### UI Integration
- **`src/app/documents/new/manual/page.tsx`**: Added download buttons
  - `downloadDocx()`: POSTs to API, triggers DOCX file download
  - `downloadPdf()`: POSTs to API, triggers PDF file download
  - Two icon buttons in preview header (FileDown for DOCX, Printer for PDF)

## Files Created/Modified

### Created
- `src/lib/documents/types.ts`
- `src/lib/documents/generators/contrato-honorarios/content.ts`
- `src/lib/documents/generators/contrato-honorarios/html.ts`
- `src/lib/documents/generators/contrato-honorarios/pdf.ts`
- `src/lib/documents/generators/contrato-honorarios/docx.ts`
- `src/app/api/documents/generate/route.ts`
- `src/lib/types/contrato-honorarios.ts` (type definitions for contract data)
- `public/letterhead.png` (A4-sized image)
- `.claude/launch.json` (dev server config)

### Modified
- `src/app/documents/new/manual/page.tsx`
- `src/components/documents/Letterhead.tsx`
- `src/components/theme/ThemeProvider.tsx`
- `.claude/settings.local.json`

## Key Technical Details

### DOCX Generation
- Font: Arial 12pt, 1.5 line spacing
- Paragraph spacing: 3.5mm after, first-line indent 12.5mm
- Signature cells: 160mm content width ÷ 2 columns, no borders
- Letterhead: Full-page floating image in header, anchored to PAGE with `behindDocument: true`
- Content width: 160mm (A4 210mm - 2×25mm margins)

### PDF Generation with Puppeteer
- Page format: A4
- Print background: enabled (`printBackground: true`)
- Margin handling: `@page { margin: 3cm 2.5cm 3cm 2.5cm }` (CSS, not puppeteer)
- Letterhead: `position: fixed` div with inset-based sizing

### HTML/CSS for PDF
```css
@page {
  size: A4;
  margin: 3cm 2.5cm 3cm 2.5cm;
}
.letterhead-bg {
  position: fixed;
  top: -3cm; left: -2.5cm; right: -2.5cm; bottom: -3cm;
  z-index: 0;
  pointer-events: none;
}
.letterhead-bg img { width: 100%; height: 100%; object-fit: fill; }
.doc-content { position: relative; z-index: 1; }
```

## Issues Resolved

1. **DOCX Signature Malformatting**
   - Cause: Used `WidthType.PERCENTAGE` without explicit `columnWidths`
   - Fix: Changed to `WidthType.DXA` with explicit `columnWidths` array matching column layout

2. **DOCX Missing Letterhead**
   - Cause: Letterhead image not properly configured
   - Fix: Added floating image to header with PAGE-relative positioning and `behindDocument: true`

3. **PDF as Download Instead of Print**
   - Cause: Originally using browser print dialog
   - Fix: Switched to puppeteer server-side PDF generation with `POST /api/documents/generate`

4. **PDF Letterhead Only on Page 1**
   - Cause: Used `background-image` on `<html>` (not repeated in print)
   - Fix: Changed to `position: fixed` div (repeated on every page in Chromium print mode)

5. **PDF Margins Only on First/Last Page**
   - Cause: Used `@page { margin: 0 }` + `body { padding }`
   - Fix: Changed to `@page { margin: 3cm 2.5cm }` which repeats on every page

6. **Letterhead Not Covering Full Page**
   - Current status: UNRESOLVED
   - Observation: Letterhead div only covers content area, not margins or empty space below content
   - Hypothesis: `z-index` negative values cause clipping to content stacking context in print mode
   - Applied fix: Use `z-index: 0` on background, `z-index: 1` on content, use inset-based sizing
   - Result: Still not working - letterhead still only covers content area

## Current Status

### Working
- ✅ DOCX generation with proper formatting, letterhead, and signatures
- ✅ PDF generation with per-page margins
- ✅ PDF letterhead on all pages
- ✅ API endpoint with file downloads
- ✅ UI buttons for DOCX/PDF download

### Not Working
- ❌ PDF letterhead doesn't extend beyond content area
  - File: `src/lib/documents/generators/contrato-honorarios/html.ts`
  - The letterhead image only covers the area where document content exists
  - Bottom and side margins are blank (white) instead of showing letterhead
  - Applied fixes so far:
    - Changed to `position: fixed`
    - Changed `z-index` from `-1` to `0`
    - Switched from explicit `width: 210mm; height: 297mm` to inset-based sizing
    - Added `.doc-content { position: relative; z-index: 1 }` wrapper
    - None of these fixed the issue

## Design Principles

1. **Reusability**: ContentBlock AST allows same content builder to feed multiple format renderers
2. **Separation of Concerns**: Content generation, HTML/CSS, DOCX config, PDF generation are separate modules
3. **Format Independence**: Content is format-agnostic; renderers handle format-specific details
4. **Maintainability**: Easy to add new document types by creating new `content.ts` + format renderers

## Testing Notes

- Preview component renders correctly in browser
- DOCX opens in Word with proper formatting, letterhead, and signatures
- PDF downloads directly (not print dialog) with A4 size
- Margins work on all pages
- Letterhead appears on all pages but doesn't cover full sheet area

## Next Steps

1. Debug why PDF letterhead doesn't cover full page area (only content area)
   - Possible: Chromium print mode has special stacking context rules
   - Try: Different positioning strategies, SVG background, or content-based approach
   
2. Once letterhead is working, document should be production-ready
3. Then extend with other document types using same ContentBlock architecture
