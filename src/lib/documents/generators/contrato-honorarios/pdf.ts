import type { ContratoHonorariosData } from '@/lib/types/contrato-honorarios'
import { buildContratoHonorariosHtml } from './html'

export async function generateContratoHonorariosPdf(data: ContratoHonorariosData): Promise<Buffer> {
  // Dynamic import keeps puppeteer out of the client bundle
  const puppeteer = await import('puppeteer')

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    const html = buildContratoHonorariosHtml(data)

    await page.setContent(html, { waitUntil: 'load' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,   // render background-image (letterhead)
      margin: { top: 0, right: 0, bottom: 0, left: 0 },  // @page CSS handles margins
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
