import type { Browser } from 'puppeteer'
import { log } from '@/lib/log'
import type { ContratoHonorariosData } from '@/lib/types/contrato-honorarios'
import { buildContratoHonorariosHtml } from './html'

// Puppeteer lifecycle (P1-9): one module-level browser reused across requests
// (launching Chromium per PDF costs seconds + ~100 MB), a promise-chain serial
// queue (concurrency 1 — right for a few PDFs/day), and a 30s timeout. Each job
// closes its PAGE, never the browser; a disconnect resets the singleton so the
// next job relaunches.

const PDF_TIMEOUT_MS = 30_000

let browserPromise: Promise<Browser> | null = null
let queue: Promise<unknown> = Promise.resolve()

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = (async () => {
      // Dynamic import keeps puppeteer out of the client bundle
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

async function renderPdf(data: ContratoHonorariosData): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    const html = buildContratoHonorariosHtml(data)
    await page.setContent(html, { waitUntil: 'load', timeout: PDF_TIMEOUT_MS })
    const pdfBuffer = await withTimeout(
      page.pdf({
        format: 'A4',
        printBackground: true, // render background-image (letterhead)
        margin: { top: 0, right: 0, bottom: 0, left: 0 }, // @page CSS handles margins
      }),
      PDF_TIMEOUT_MS,
      'Geração do PDF',
    )
    return Buffer.from(pdfBuffer)
  } finally {
    // Close the page, NOT the browser — the singleton lives on.
    await page.close().catch((e) => log.warn({ err: e instanceof Error ? e.message : String(e) }, 'pdf page close failed'))
  }
}

export async function generateContratoHonorariosPdf(data: ContratoHonorariosData): Promise<Buffer> {
  // Serialize jobs: each waits for the previous one, success or failure.
  const job = queue.then(() => renderPdf(data))
  queue = job.catch(() => {})
  return job
}
