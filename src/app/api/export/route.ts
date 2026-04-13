import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export async function GET() {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { success: withinLimit } = await rateLimit(`export:${user.id}`, 3, 60_000)
    if (!withinLimit) return Response.json({ error: 'Too many exports. Please wait.' }, { status: 429 })

    const [profile, cv, applications, reports, pipelineItems, storyBank, creditBalance, transactions, generatedFiles] = await Promise.all([
      db.from('profiles').select('*').eq('id', user.id).single(),
      db.from('cv_documents').select('content, version, created_at').eq('user_id', user.id).eq('is_active', true).single(),
      db.from('applications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      db.from('reports').select('id, company, role, score, archetype, jd_url, keywords, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      db.from('pipeline_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      db.from('story_bank').select('*').eq('user_id', user.id),
      db.from('credit_balances').select('*').eq('user_id', user.id).single(),
      db.from('credit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
      db.from('generated_files').select('file_name, file_type, storage_path, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
      profile: profile.data,
      cv: cv.data,
      applications: applications.data || [],
      reports: reports.data || [],
      pipeline_items: pipelineItems.data || [],
      story_bank: storyBank.data || [],
      credit_balance: creditBalance.data,
      credit_transactions: transactions.data || [],
      generated_files: generatedFiles.data || [],
    }

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="applyagent-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
