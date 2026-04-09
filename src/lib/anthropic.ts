import Anthropic from '@anthropic-ai/sdk'

export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY is not set in environment variables')
  }
  return new Anthropic({ apiKey })
}

export const MODELS = {
  evaluation: 'claude-sonnet-4-20250514',
  pdf: 'claude-sonnet-4-20250514',
  cover_letter: 'claude-haiku-4-5-20251001',
  quick: 'claude-haiku-4-5-20251001',
} as const
