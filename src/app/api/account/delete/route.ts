import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'

export async function DELETE() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role to delete all user data and the auth user
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const db = admin as any
  const id = user.id

  // Delete in dependency order
  await db.from('credit_transactions').delete().eq('user_id', id)
  await db.from('credit_balances').delete().eq('user_id', id)
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

  // Delete auth user
  await admin.auth.admin.deleteUser(id)

  return Response.json({ deleted: true })
}
