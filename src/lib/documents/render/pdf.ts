// Generic HTML → A4 PDF engine. Renders ANY HTML string (the canonical document
// HTML from ./html) through headless Chromium, so the PDF is pixel-identical to
// the on-screen Preview (which renders the same HTML). SERVER ONLY.
//
// Lifecycle (carried over from the legacy contract renderer): one module-level
// browser reused across requests (launching Chromium per PDF costs seconds +
// ~100 MB), a promise-chain serial queue (concurrency 1 — right for a few
// PDFs/day), and a 30s timeout. Each job closes its PAGE, never the browser; a
// disconnect resets the singleton so the next job relaunches.
import type { Browser } from 'puppeteer'
import { PDFDocument } from 'pdf-lib'
import { log } from '@/lib/log'

const PDF_TIMEOUT_MS = 30_000

let browserPromise: Promise<Browser> | null = null
let queue: Promise<unknown> = Promise.resolve()

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = (async () => {
      // Dynamic import keeps puppeteer out of the client bundle.
      const puppeteer = await import('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        // Safe only because the process runs as the unprivileged `lexia` user.
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
      browser.on('disconnected', () => {
        browserPromise = null
      })
      return browser
    })()
    browserPromise.catch(() => {
      browserPromise = null
    })
  }
  return browserPromise
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${what} excedeu ${ms / 1000}s`)), ms)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

async function renderPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: 'load', timeout: PDF_TIMEOUT_MS })
    const pdfBuffer = await withTimeout(
      page.pdf({
        format: 'A4',
        printBackground: true, // render the letterhead background
        margin: { top: 0, right: 0, bottom: 0, left: 0 }, // @page CSS owns the margins
      }),
      PDF_TIMEOUT_MS,
      'Geração do PDF',
    )
    return Buffer.from(pdfBuffer)
  } finally {
    // Close the page, NOT the browser — the singleton lives on.
    await page
      .close()
      .catch((e) => log.warn({ err: e instanceof Error ? e.message : String(e) }, 'pdf page close failed'))
  }
}

/**
 * Render an HTML string to an A4 PDF buffer. Jobs are serialized: each waits for
 * the previous one (success or failure) so a single Chromium handles them all.
 */
export function htmlToPdf(html: string): Promise<Buffer> {
  const job = queue.then(() => renderPdf(html))
  queue = job.catch(() => {})
  return job
}

export interface LetterheadImage {
  data: Buffer
  type: 'png' | 'jpg'
}

/**
 * Stamp a full-page letterhead BEHIND every page of a content PDF.
 *
 * Why not CSS: a repeating full-bleed letterhead with per-page content margins
 * cannot be done reliably in Chromium print — `position: fixed` and root/body
 * backgrounds both anchor to the page area INSIDE the @page margins (or tile by
 * content flow), so the art drifts page-to-page (the bug where the navy header
 * landed mid-page). Compositing with pdf-lib is deterministic: each output page
 * gets the image drawn at (0,0)→full A4, then the original (transparent-bg) page
 * drawn on top, so the letterhead is pixel-identical on every page and the text
 * stays crisp above the watermark.
 */
export async function overlayLetterhead(contentPdf: Buffer, letterhead: LetterheadImage): Promise<Buffer> {
  const out = await PDFDocument.create()
  const src = await PDFDocument.load(contentPdf)
  const img = letterhead.type === 'png' ? await out.embedPng(letterhead.data) : await out.embedJpg(letterhead.data)
  const embedded = await out.embedPages(src.getPages())
  const sizes = src.getPages().map((p) => p.getSize())
  for (let i = 0; i < embedded.length; i++) {
    const { width, height } = sizes[i]
    const page = out.addPage([width, height])
    page.drawImage(img, { x: 0, y: 0, width, height })
    page.drawPage(embedded[i], { x: 0, y: 0, width, height })
  }
  const bytes = await out.save()
  return Buffer.from(bytes)
}

/** Render HTML to PDF, compositing the letterhead behind every page when present. */
export async function htmlToPdfWithLetterhead(html: string, letterhead: LetterheadImage | null): Promise<Buffer> {
  const content = await htmlToPdf(html)
  return letterhead ? overlayLetterhead(content, letterhead) : content
}
