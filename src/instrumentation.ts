export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Manually parse .env.local to work around Turbopack env loading issues
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    try {
      const envPath = resolve(process.cwd(), '.env.local')
      const content = readFileSync(envPath, 'utf8')
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx === -1) continue
        const key = trimmed.substring(0, eqIdx).trim()
        const value = trimmed.substring(eqIdx + 1).trim()
        if (key && value && !process.env[key]) {
          process.env[key] = value
        }
      }
    } catch {
      // ignore — env file may not exist in production
    }
  }
}
