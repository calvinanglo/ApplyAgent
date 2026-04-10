import { readFileSync } from 'fs'

const raw = readFileSync(new URL('.env.local', import.meta.url))
const text = raw.toString('utf8')
const lines = text.split('\n')

lines.forEach((line, i) => {
  const trimmed = line.replace(/\r/g, '\\r')
  if (line.startsWith('ANTHROPIC') || line.startsWith('STRIPE_SECRET') || line.startsWith('SUPABASE_SERVICE')) {
    console.log(`Line ${i+1} [${line.length} chars]: ${trimmed.substring(0, 60)}`)
    // Print char codes of first 20 chars
    const codes = Array.from(line.substring(0, 20)).map(c => c.charCodeAt(0))
    console.log(`  CharCodes: ${codes.join(',')}`)
  }
})
