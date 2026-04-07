'use client'

import { useRef, useState } from 'react'
import { Upload, FileText, Loader2, X } from 'lucide-react'
import { Button } from './button'

interface FileUploadProps {
  onTextExtracted: (text: string, filename: string) => void
  accept?: string
  label?: string
  description?: string
}

export function FileUpload({
  onTextExtracted,
  accept = '.pdf,.docx,.txt,.md',
  label = 'Upload file',
  description = 'PDF, DOCX, or TXT',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setParsing(true)
    setError(null)
    setUploadedFile(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/parse-file', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to parse file')
        return
      }

      setUploadedFile(data.filename)
      onTextExtracted(data.text, data.filename)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setParsing(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so same file can be re-uploaded
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function clear() {
    setUploadedFile(null)
    setError(null)
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      {uploadedFile ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
          <FileText className="size-4 text-primary shrink-0" />
          <span className="truncate flex-1">{uploadedFile}</span>
          <button onClick={clear} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => !parsing && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-4 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
        >
          {parsing ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="size-5 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">{parsing ? 'Extracting text...' : label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
