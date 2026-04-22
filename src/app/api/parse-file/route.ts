import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

/**
 * Extract unique URLs from raw bytes that look like hyperlinks.
 * Used to recover links that upstream parsers strip (DOCX display-text-only,
 * PDF annotation URIs, etc.).
 */
function extractUrls(raw: string): string[] {
  const found = new Set<string>()
  // Generic http(s) URLs
  const genericUrl = /https?:\/\/[^\s"'<>)\]}\\`]+/gi
  for (const m of raw.matchAll(genericUrl)) {
    // Strip trailing punctuation common in text (., ,, ;, ))
    const clean = m[0].replace(/[.,;:)'"]+$/, '')
    if (clean.length > 10 && clean.length < 500) found.add(clean)
  }
  // PDF annotation URIs: /URI (https://...) or /URI(https://...)
  const pdfUri = /\/URI\s*\(([^)]+)\)/gi
  for (const m of raw.matchAll(pdfUri)) {
    const clean = m[1].trim().replace(/[.,;:)'"]+$/, '')
    if (clean.length > 10 && clean.length < 500) found.add(clean)
  }
  return Array.from(found)
}

/**
 * Merge recovered links into the text. Only appends URLs NOT already present.
 * Formats as a trailing "Links" section the downstream autofill/AI can parse.
 */
function mergeLinks(text: string, urls: string[]): string {
  const textLower = text.toLowerCase()
  const missing = urls.filter(u => !textLower.includes(u.toLowerCase()))
  if (!missing.length) return text
  return `${text}\n\nLinks:\n${missing.map(u => `- ${u}`).join('\n')}`
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success: withinLimit } = await rateLimit(`parse:${user.id}`, 10, 60_000)
    if (!withinLimit) return Response.json({ error: 'Too many uploads. Please wait.' }, { status: 429 })

    const formData = await request.formData()
    const file = formData.get('file') as unknown as File | null
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return Response.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    let text = ''

    if (ext === 'txt' || ext === 'md') {
      text = await file.text()
    } else if (ext === 'pdf') {
      const buffer = Buffer.from(await file.arrayBuffer())
      // Import pdf-parse/lib/pdf-parse.js directly to avoid the index.js debug mode
      // bug that tries to read './test/data/05-versions-space.pdf'
      const pdfParse = (await import('pdf-parse/lib/pdf-parse.js' as any)).default
      const parsed = await pdfParse(buffer)
      text = parsed.text

      // pdf-parse only returns visible text — hyperlinks stored as annotations
      // (e.g. "View my Credly" → https://credly.com/...) are lost. Scan the raw
      // bytes for URI annotations and http(s) URLs and merge anything missing.
      try {
        const raw = buffer.toString('latin1')
        const urls = extractUrls(raw)
        text = mergeLinks(text, urls)
      } catch { /* best effort */ }
    } else if (ext === 'docx') {
      const buffer = Buffer.from(await file.arrayBuffer())
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value

      // mammoth.extractRawText() strips hyperlinks — a link like
      // <a href="https://credly.com/...">View my Credly</a> loses the href.
      // Also call convertToHtml() to capture hrefs and merge back anything missing.
      try {
        const htmlResult = await mammoth.convertToHtml({ buffer })
        const hrefMatches = htmlResult.value.matchAll(/href\s*=\s*["']([^"']+)["']/gi)
        const urls: string[] = []
        for (const m of hrefMatches) {
          const href = m[1]
          if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) urls.push(href)
        }
        text = mergeLinks(text, urls)
      } catch { /* best effort */ }
    } else if (ext === 'doc') {
      return Response.json({ error: 'Legacy .doc format not supported. Please convert to .docx or .pdf' }, { status: 400 })
    } else {
      return Response.json({ error: `Unsupported file type: .${ext}. Use PDF, DOCX, TXT, or MD.` }, { status: 400 })
    }

    if (!text.trim()) {
      return Response.json({ error: 'Could not extract text from file. The file may be image-based or empty.' }, { status: 400 })
    }

    return Response.json({ text: text.trim(), filename: file.name, size: file.size })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to parse file' },
      { status: 500 }
    )
  }
}
