import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient, MODELS } from '@/lib/anthropic'

export async function GET() {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Load profile and CV
    const [profileRes, cvRes] = await Promise.all([
      db.from('profiles').select('target_roles, location').eq('id', user.id).single(),
      db.from('cv_documents').select('content').eq('user_id', user.id).eq('is_active', true).single(),
    ])

    const targetRoles = profileRes.data?.target_roles || []
    const location = profileRes.data?.location || ''
    const cvSnippet = (cvRes.data?.content || '').slice(0, 2000)

    if (!cvSnippet && targetRoles.length === 0) {
      return Response.json({ companies: [] })
    }

    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: MODELS.quick,
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Based on this person's profile, suggest 6 companies that would be good to scan for job openings. Only suggest companies that use Greenhouse ATS (boards-api.greenhouse.io).

Target roles: ${targetRoles.join(', ') || 'Not specified'}
Location: ${location || 'Not specified'}
Resume snippet: ${cvSnippet}

Return ONLY a JSON array of objects with "name" and "greenhouse_slug" fields. The slug must be the exact Greenhouse board slug. No explanation, just JSON.
Example: [{"name":"Cloudflare","greenhouse_slug":"cloudflare"}]`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return Response.json({ companies: [] })

    const companies = JSON.parse(match[0])
    return Response.json({ companies })
  } catch {
    return Response.json({ companies: [] })
  }
}
