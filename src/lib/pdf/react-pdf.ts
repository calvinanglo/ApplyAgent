/**
 * React-PDF renderer with auto-font-sizing.
 *
 * Replaces the Chromium pipeline entirely:
 *   - Chromium: cold-start (~3-5s) + linear font search (~10 passes × ~800ms) = ~8-12s
 *   - React-PDF: no cold-start + binary search (~8 passes × ~80ms) = ~700ms
 *
 * The binary search finds the largest font scale (0.65–1.0) that still fits
 * the resume on exactly one page — same visual result as Chromium's auto-sizing
 * loop but ~10x faster.
 */

import React from 'react'
import { pdf } from '@react-pdf/renderer'
import { ResumeDocument } from './react-pdf-template'
import type { PdfContent } from './generator'

/**
 * Count pages in a raw PDF buffer by parsing the /Pages /Count object.
 * Same approach as chromium.ts — works on any valid PDF.
 */
function countPages(buffer: Buffer): number {
  const str = buffer.toString('latin1')
  // Primary: find /Pages object with /Count N
  const countMatch = str.match(/\/Type\s*\/Pages\b[^>]*\/Count\s+(\d+)/)
  if (countMatch) return parseInt(countMatch[1], 10)
  // Fallback: count individual /Type /Page entries (exclude /Pages, /PageLabel)
  const pageMatches = str.match(/\/Type\s*\/Page\b(?!s|L)/g)
  if (pageMatches) return pageMatches.length
  // Worst case: assume >1 to trigger shrinking
  return 2
}

/**
 * Render the resume at a given font scale and return a Buffer.
 */
async function renderAtScale(content: PdfContent, scale: number): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(ResumeDocument, { content, scale }) as any
  const instance = pdf(element)
  const blob = await instance.toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Generate a 1-page resume PDF with auto-sized fonts.
 *
 * Algorithm:
 *   1. Try full scale (1.0). If it fits → done.
 *   2. Binary search between 0.65 and 1.0 for the largest scale that fits.
 *   3. 8 iterations of binary search → precision of ~0.003 scale units.
 *   4. Total render time: ~600-800ms (8 passes × ~80ms each).
 */
export async function getReactPdfBuffer(content: PdfContent): Promise<Buffer> {
  // Fast path: try full size first
  let buf = await renderAtScale(content, 1.0)
  if (countPages(buf) === 1) return buf

  // Binary search for optimal scale
  let lo = 0.65    // floor — below this text is unreadably small
  let hi = 1.0
  let bestBuffer = buf
  let bestScale = lo

  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2
    buf = await renderAtScale(content, mid)
    const pages = countPages(buf)

    if (pages === 1) {
      bestBuffer = buf
      bestScale = mid
      lo = mid       // fits — try larger
    } else {
      hi = mid       // doesn't fit — try smaller
    }
  }

  // If nothing fits at 0.65 scale, return whatever we got (rare — very long CVs)
  if (bestScale === 0.65 && countPages(bestBuffer) > 1) {
    // One final attempt at the floor
    bestBuffer = await renderAtScale(content, 0.65)
  }

  return bestBuffer
}
