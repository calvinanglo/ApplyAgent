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
                {apps.map((app) => {
                  const href = `/reports/${app.report_id || app.id}`
                  return (
                    <TableRow key={app.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono text-xs p-0">
                        <Link href={href} className="block px-4 py-2">{app.sequence_number}</Link>
                      </TableCell>
                      <TableCell className="font-medium p-0">
                        <Link href={href} className="block px-4 py-2">{app.company}</Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground p-0">
                        <Link href={href} className="block px-4 py-2">{app.role}</Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link href={href} className="block px-4 py-2">
                          {app.score && <span className="font-mono text-sm font-bold">{app.score}/5</span>}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link href={href} className="block px-4 py-2">
                          <Badge variant={statusColors[app.status] || 'secondary'}>{app.status}</Badge>
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link href={href} className="block px-4 py-2">{app.has_pdf ? '✅' : '❌'}</Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link href={href} className="block px-4 py-2">{app.has_cover_letter ? '✅' : '❌'}</Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground p-0">
                        <Link href={href} className="block px-4 py-2">
                          {new Date(app.created_at).toLocaleDateString()}
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
