import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { success: withinLimit } = rateLimit(`delete:${user.id}`, 3, 300_000)
  if (!withinLimit) {
    return Response.json({ error: 'Too many attempts. Please wait 5 minutes.' }, { status: 429 })
  }

  // Require confirmation text
  let body: { confirmation?: string }
  try { body = await request.json() } catch { body = {} }
  if (body.confirmation !== 'DELETE MY ACCOUNT') {
    return Response.json({ error: 'Please type "DELETE MY ACCOUNT" to confirm.' }, { status: 400 })
  }

  // Use service role to delete all user data and the auth user
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const db = admin as any
  const id = user.id

  // Delete in dependency order
  await db.from('credit_transactions').delete().eq('user_id', id)
  await db.from('credit_balances').delete().eq('user_id', id)
  await db.from('subscriptions').delete().eq('user_id', id)
  await db.from('story_bank').delete().eq('user_id', id)
  await db.from('generated_files').delete().eq('user_id', id)
  await db.from('reports').delete().eq('user_id', id)
  await db.from('applications').delete().eq('user_id', id)
  await db.from('cv_documents').delete().eq('user_id', id)
  await db.from('archetypes').delete().eq('user_id', id)
  await db.from('pipeline_items').delete().eq('user_id', id)
  await db.from('scan_history').delete().eq('user_id', id)
  await db.from('portal_companies').delete().eq('user_id', id)
  await db.from('profiles').delete().eq('id', id)

  // Delete storage files
  try {
    const { data: files } = await admin.storage.from('generated-files').list(id)
    if (files?.length) {
      await admin.storage.from('generated-files').remove(files.map(f => `${id}/${f.name}`))
    }
  } catch {}

  // Delete auth user
  await admin.auth.admin.deleteUser(id)

  return Response.json({ deleted: true })
}
