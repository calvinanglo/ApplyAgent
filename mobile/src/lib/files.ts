/**
 * File download + share helpers for the mobile client.
 *
 * Flow:
 *   1. Get a 60-second signed URL from /api/files/signed-url.
 *   2. Download the file via expo-file-system to the app's documentDirectory.
 *   3. Open the iOS / Android share sheet so the user can save to Files,
 *      AirDrop, email, etc.
 */

import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { getSignedFileUrl } from './api'

export interface DownloadResult {
  localUri: string
  filename: string
}

/**
 * Download a file from Supabase Storage by its path (e.g. "userId/Resume-CA.pdf"),
 * caching it in the app's documentDirectory. Re-downloads if the cached copy
 * is older than the URL expiry would permit.
 */
export async function downloadFromStorage(
  storagePath: string,
  bucket?: string
): Promise<DownloadResult> {
  const { url } = await getSignedFileUrl(storagePath, bucket)

  // Filename is the last path segment; preserve any extension.
  const filename = storagePath.split('/').pop() || 'download'
  const localUri = `${FileSystem.documentDirectory}${filename}`

  const result = await FileSystem.downloadAsync(url, localUri)
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Download failed: HTTP ${result.status}`)
  }

  return { localUri: result.uri, filename }
}

/**
 * Open the system share sheet for a downloaded file. Returns true if the
 * sheet was shown, false if sharing isn't available on this device.
 */
export async function shareFile(localUri: string, mimeType?: string): Promise<boolean> {
  const available = await Sharing.isAvailableAsync()
  if (!available) return false

  await Sharing.shareAsync(localUri, {
    mimeType: mimeType || guessMimeType(localUri),
    dialogTitle: 'Save or share',
    UTI: localUri.endsWith('.pdf') ? 'com.adobe.pdf' : undefined,
  })
  return true
}

function guessMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (ext === 'json') return 'application/json'
  return 'application/octet-stream'
}

/**
 * One-shot: download from storage and immediately open the share sheet.
 */
export async function downloadAndShare(storagePath: string, bucket?: string): Promise<void> {
  const { localUri } = await downloadFromStorage(storagePath, bucket)
  await shareFile(localUri)
}
