import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = db.from('pipeline_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit)
    if (status !== 'all') query = query.eq('status', status)

    const { data: items, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ items: items || [] })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    let body: { url: string; company?: string; title?: string }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }
    if (!body.url) return Response.json({ error: 'URL required' }, { status: 400 })

    const { data: item, error } = await db.from('pipeline_items').insert({
      user_id: user.id,
      url: body.url,
      company: body.company || null,
      title: body.title || null,
      source: 'manual',
      status: 'pending',
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ item })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    let body: { id: string }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }

    await db.from('pipeline_items').delete().eq('id', body.id).eq('user_id', user.id)
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
