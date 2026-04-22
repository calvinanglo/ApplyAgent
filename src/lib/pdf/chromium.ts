import fs from 'fs'

function findWindowsChrome(): string | undefined {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA
      ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
      : '',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean)

  return candidates.find(p => {
    try { return fs.existsSync(p) } catch { return false }
  })
}

async function countPages(page: any, format: 'letter' | 'a4'): Promise<number> {
  const buf = await page.pdf({
    format: format === 'letter' ? 'Letter' : 'A4',
    printBackground: true,
    margin: { top: '0.6in', right: '0.6in', bottom: '0.6in', left: '0.6in' },
  })
  const str = Buffer.from(buf).toString('latin1')
  // Most reliable: find /Pages object with /Count N
  const countMatch = str.match(/\/Type\s*\/Pages\b[^>]*\/Count\s+(\d+)/)
  if (countMatch) return parseInt(countMatch[1], 10)
  // Fallback: count individual /Type /Page entries (exclude /Pages, /PageLabel)
  const pageMatches = str.match(/\/Type\s*\/Page\b(?!s|L)/g)
  if (pageMatches) return pageMatches.length
  // Last resort: assume more than 1 page to force shrinking
  return 2
}

async function setFontSize(page: any, sizePx: number): Promise<void> {
  await page.evaluate((size: number) => {
    const style = document.getElementById('__font_override') || document.createElement('style')
    style.id = '__font_override'
    // Two sizes: headings slightly larger, everything else uniform
    const heading = Math.round(size * 1.15 * 10) / 10
    style.textContent = `
      body, .summary-text, .job-role, .job li,
      .project-desc, .cert-title, .cert-inline, .cert-sep, .cert-verify,
      .skill-item, .skill-line, .skill-category,
      .contact-row, .job-period, .job-location, .edu-year, .edu-desc,
      .cert-year, .project-tech, .competency-tag, .github-project,
      .project-badge { font-size: ${size}px !important; }
      .header h1 { font-size: ${Math.round(size * 1.8)}px !important; }
      .section-title, .job-company, .edu-title, .project-title { font-size: ${heading}px !important; }
    `
    document.head.appendChild(style)
  }, sizePx)
}

export async function getPdfBuffer(html: string, format: 'letter' | 'a4' = 'letter'): Promise<Buffer> {
  let browser: any

  try {
    let executablePath: string | undefined
    let launchArgs: string[] = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ]

    // Production (Vercel / Linux): use @sparticuz/chromium-min
    if (process.platform === 'linux') {
      try {
        const chromium = await import('@sparticuz/chromium-min')
        executablePath = await chromium.default.executablePath(
          `https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar`
        )
        launchArgs = [...chromium.default.args, '--no-sandbox']
      } catch {
        // chromium-min not available, fall through
      }
    }

    // Windows dev: find system Chrome or Edge
    if (!executablePath && process.platform === 'win32') {
      executablePath = findWindowsChrome()
      if (!executablePath) {
        throw new Error(
          'No Chrome or Edge found. Install Chrome and try again.\n' +
          'Checked: Program Files\\Google\\Chrome and Program Files\\Microsoft\\Edge'
        )
      }
    }

    // macOS dev
    if (!executablePath && process.platform === 'darwin') {
      const macPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      if (fs.existsSync(macPath)) executablePath = macPath
    }

    if (!executablePath) {
      throw new Error(`Unsupported platform for PDF generation: ${process.platform}`)
    }

    const puppeteer = await import('puppeteer-core')
    browser = await puppeteer.default.launch({
      args: launchArgs,
      executablePath,
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    await page.evaluate(() => (document as any).fonts.ready)

    // Auto font-sizing loop (CLI spec):
    // Start at 13px, decrease by 0.5px until fits 1 page, then fine-tune up by 0.25px
    // Cap at 13px max (larger looks unprofessional)

    let currentSize = 13
    await setFontSize(page, currentSize)
    let pages = await countPages(page, format)

    // Step down by 0.5px until 1 page (floor at 8px for readability)
    while (pages > 1 && currentSize > 8) {
      currentSize -= 0.5
      await setFontSize(page, currentSize)
      pages = await countPages(page, format)
    }

    // Fine-tune up by 0.25px as long as it still fits
    if (pages === 1) {
      while (currentSize + 0.25 <= 13) {
        await setFontSize(page, currentSize + 0.25)
        pages = await countPages(page, format)
        if (pages === 1) {
          currentSize += 0.25
        } else {
          // revert
          await setFontSize(page, currentSize)
          break
        }
      }
    }

    // Generate final PDF at optimal size
    const pdfBuffer = await page.pdf({
      format: format === 'letter' ? 'Letter' : 'A4',
      printBackground: true,
      margin: { top: '0.6in', right: '0.6in', bottom: '0.6in', left: '0.6in' },
    })

    return Buffer.from(pdfBuffer)
  } finally {
    if (browser) await browser.close()
  }
}
