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
            <>
              {/* Mobile card view */}
              <div className="space-y-2 md:hidden">
                {apps.map((app) => {
                  const href = `/reports/${app.report_id || app.id}`
                  return (
                    <Link key={app.id} href={href} className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{app.company}</p>
                          <p className="text-xs text-muted-foreground truncate">{app.role}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {app.score && <span className="font-mono text-sm font-bold">{app.score}/5</span>}
                          <StatusSelect id={app.id} currentStatus={app.status} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>{new Date(app.created_at).toLocaleDateString()}</span>
                        <span>PDF {app.has_pdf ? '✅' : '❌'}</span>
                        <span>CL {app.has_cover_letter ? '✅' : '❌'}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block">
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
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
