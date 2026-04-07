import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      // pdf-parse v1 uses CommonJS — dynamic import with default
      const pdfParse = (await import('pdf-parse' as any)).default
      const parsed = await pdfParse(buffer)
      text = parsed.text
    } else if (ext === 'docx') {
      const buffer = Buffer.from(await file.arrayBuffer())
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
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
