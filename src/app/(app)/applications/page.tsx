import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import type { Database } from '@/lib/supabase/types'
import { StatusSelect } from '@/components/status-select'
import { ApplicationsClient } from '@/components/applications-client'

type Application = Database['public']['Tables']['applications']['Row']

export default async function ApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: apps } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false }) as { data: Application[] | null }

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
