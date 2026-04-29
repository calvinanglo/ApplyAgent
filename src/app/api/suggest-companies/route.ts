import { getApiClient } from '@/lib/supabase/api'
import { getAIClient, MODELS } from '@/lib/ai'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(request: Request) {
  try {
    const supabase = await getApiClient(request)
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { success: withinLimit } = await rateLimit(`suggest:${user.id}`, 5, 60_000)
    if (!withinLimit) return Response.json({ companies: [] })

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

    const client = getAIClient()
    const response = await client.messages.create({
      model: MODELS.quick,
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Based on this person's profile, suggest 6 companies that would be good to scan for job openings. Suggest a mix of companies across these ATS platforms:

- Greenhouse (slug used at: boards-api.greenhouse.io/v1/boards/{slug}/jobs)
- Lever (slug used at: api.lever.co/v0/postings/{slug})
- Ashby (slug used at: api.ashbyhq.com/posting-api/job-board/{slug})
- SmartRecruiters (slug used at: api.smartrecruiters.com/v1/companies/{slug}/postings)

Target roles: ${targetRoles.join(', ') || 'Not specified'}
Location: ${location || 'Not specified'}
Resume snippet: ${cvSnippet}

Return ONLY a JSON array of objects with "name", "slug", and "platform" fields. The slug must be the exact board slug for that platform. Platform must be one of: greenhouse, lever, ashby, smartrecruiters. No explanation, just JSON.
Example: [{"name":"Cloudflare","slug":"cloudflare","platform":"greenhouse"},{"name":"Visa","slug":"Visa","platform":"smartrecruiters"}]`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return Response.json({ companies: [] })

    const suggestions = JSON.parse(match[0]) as Array<{ name: string; slug: string; platform: string }>

    // Verify each slug actually works
    const verified = await Promise.all(
      suggestions.map(async (c) => {
        try {
          let url = ''
          switch (c.platform) {
            case 'lever': url = `https://api.lever.co/v0/postings/${c.slug}`; break
            case 'ashby': url = `https://api.ashbyhq.com/posting-api/job-board/${c.slug}`; break
            case 'smartrecruiters': url = `https://api.smartrecruiters.com/v1/companies/${c.slug}/postings?limit=1`; break
            default: url = `https://boards-api.greenhouse.io/v1/boards/${c.slug}/jobs`; break
          }
          const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
          return res.ok ? c : null
        } catch { return null }
      })
    )

    return Response.json({ companies: verified.filter(Boolean) })
  } catch {
    return Response.json({ companies: [] })
  }
}
