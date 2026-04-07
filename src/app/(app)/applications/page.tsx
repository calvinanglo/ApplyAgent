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

type Application = Database['public']['Tables']['applications']['Row']

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Evaluated: 'secondary',
  Applied: 'default',
  Interview: 'default',
  Offer: 'default',
  Rejected: 'destructive',
  Withdrawn: 'outline',
  Accepted: 'default',
}

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

      <Card>
        <CardHeader>
          <CardTitle>All Applications ({apps?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!apps?.length ? (
            <p className="py-8 text-center text-muted-foreground">
              No applications yet. <Link href="/evaluate" className="text-primary underline">Start evaluating</Link>.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-20">Score</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-16">PDF</TableHead>
                  <TableHead className="w-16">CL</TableHead>
                  <TableHead className="w-28">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-mono text-xs">{app.sequence_number}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/reports/${app.report_id || app.id}`} className="hover:underline">
                        {app.company}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{app.role}</TableCell>
                    <TableCell>
                      {app.score && (
                        <span className="font-mono text-sm font-bold">{app.score}/5</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[app.status] || 'secondary'}>
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{app.has_pdf ? '✅' : '❌'}</TableCell>
                    <TableCell>{app.has_cover_letter ? '✅' : '❌'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(app.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
