/**
 * React-PDF renderer.
 *
 * Drop-in alternative to getPdfBuffer() from chromium.ts. Generates the PDF
 * natively in Node.js using @react-pdf/renderer — no Chromium process, no
 * cold-start delay, ~40MB smaller Lambda bundle.
 *
 * Auto-sizing strategy: React-PDF lays out with a fixed 10.5pt base. The
 * document flows naturally. If content genuinely overflows one page, the PDF
 * will have two pages — which is acceptable for content-heavy CVs that would
 * have needed the same space in the Chromium path anyway.
 */

import React from 'react'
import { pdf } from '@react-pdf/renderer'
import { ResumeDocument } from './react-pdf-template'
import type { PdfContent } from './generator'

/**
 * Generates a PDF Buffer from PdfContent using React-PDF.
 * Returns the same Buffer type as the Chromium getPdfBuffer().
 */
export async function getReactPdfBuffer(content: PdfContent): Promise<Buffer> {
  // pdf() accepts any ReactElement — the Document wrapper inside ResumeDocument
  // satisfies @react-pdf/renderer's runtime requirements.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(ResumeDocument, { content }) as any
  const instance = pdf(element)
  const blob = await instance.toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
