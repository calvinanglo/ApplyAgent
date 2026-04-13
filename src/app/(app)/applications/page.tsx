import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import { ApplicationsClient } from '@/components/applications-client'

type Application = Database['public']['Tables']['applications']['Row']

export default async function ApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: apps } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(200) as { data: Application[] | null }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Applications</h1>
        <p className="text-muted-foreground">Track all your evaluated job postings</p>
      </div>

      <ApplicationsClient apps={apps || []} />
    </div>
  )
}
