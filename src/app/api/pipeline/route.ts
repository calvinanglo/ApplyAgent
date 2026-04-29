import { getApiClient } from '@/lib/supabase/api'

export async function GET(request: Request) {
  try {
    const supabase = await getApiClient(request)
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Auto-fix stuck "processing" items older than 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    await db.from('pipeline_items')
      .update({ status: 'error', error_message: 'Processing timed out — click retry' })
      .eq('user_id', user.id)
      .eq('status', 'processing')
      .lt('created_at', fiveMinAgo)

    // Clear stale error messages on items that actually completed successfully
    await db.from('pipeline_items')
      .update({ error_message: null })
      .eq('user_id', user.id)
      .in('status', ['done', 'evaluated'])
      .not('error_message', 'is', null)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = db.from('pipeline_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit)
    if (status !== 'all') query = query.eq('status', status)

    const { data: items, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Get real counts for all statuses
    const [pendingRes, doneRes, errorRes, processingRes] = await Promise.all([
      db.from('pipeline_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'pending'),
      db.from('pipeline_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['done', 'evaluated']),
      db.from('pipeline_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'error'),
      db.from('pipeline_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'processing'),
    ])

    return Response.json({
      items: items || [],
      counts: {
        pending: pendingRes.count || 0,
        done: doneRes.count || 0,
        error: errorRes.count || 0,
        processing: processingRes.count || 0,
      },
    })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await getApiClient(request)
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    let body: { id?: string; ids?: string[]; status: string }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }

    if (body.status !== 'pending') {
      return Response.json({ error: 'Can only reset to pending' }, { status: 400 })
    }

    // Bulk reset by IDs
    if (body.ids?.length) {
      await db.from('pipeline_items').update({ status: 'pending', error_message: null }).eq('user_id', user.id).in('id', body.ids)
      return Response.json({ success: true, count: body.ids.length })
    }

    // Single reset
    if (body.id) {
      await db.from('pipeline_items').update({ status: 'pending', error_message: null }).eq('id', body.id).eq('user_id', user.id)
      return Response.json({ success: true })
    }

    return Response.json({ error: 'No id or ids provided' }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getApiClient(request)
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
    const supabase = await getApiClient(request)
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    let body: { id?: string; ids?: string[]; clear?: 'pending' | 'done' | 'errors' }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }

    // Bulk clear by status
    if (body.clear === 'pending') {
      await db.from('pipeline_items').delete().eq('user_id', user.id).eq('status', 'pending')
      return Response.json({ success: true })
    }
    if (body.clear === 'done') {
      // Delete both 'done' and 'evaluated' items (both are completed states)
      await db.from('pipeline_items').delete().eq('user_id', user.id).in('status', ['done', 'evaluated'])
      return Response.json({ success: true })
    }
    if (body.clear === 'errors') {
      await db.from('pipeline_items').delete().eq('user_id', user.id).eq('status', 'error')
      return Response.json({ success: true })
    }

    // Bulk delete by IDs
    if (body.ids?.length) {
      await db.from('pipeline_items').delete().eq('user_id', user.id).in('id', body.ids)
      return Response.json({ success: true })
    }

    // Single delete
    if (body.id) {
      await db.from('pipeline_items').delete().eq('id', body.id).eq('user_id', user.id)
      return Response.json({ success: true })
    }

    return Response.json({ error: 'No id, ids, or clear param provided' }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
