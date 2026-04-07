'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { StatusSelect } from '@/components/status-select'
import { Search, CheckCircle2, XCircle, Minus } from 'lucide-react'

interface Application {
  id: string
  sequence_number: number
  company: string
  role: string
  score: number | null
  status: string
  has_pdf: boolean
  has_cover_letter: boolean
  report_id: string | null
  created_at: string
}

const statusFilters = ['All', 'Evaluated', 'Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn', 'Accepted'] as const

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null || score === 0) {
    return <span className="text-xs text-muted-foreground flex items-center gap-1"><Minus className="size-3" />N/A</span>
  }
  const color = score >= 4 ? 'text-green-500' : score >= 3 ? 'text-yellow-500' : 'text-red-500'
  return <span className={`font-mono text-sm font-bold ${color}`}>{score}/5</span>
}

export function ApplicationsClient({ apps }: { apps: Application[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const q = search.toLowerCase()
  const filtered = apps.filter((app) => {
    if (statusFilter !== 'All' && app.status !== statusFilter) return false
    if (q && !app.company.toLowerCase().includes(q) && !app.role.toLowerCase().includes(q)) return false
    return true
  })

  const statusCounts = apps.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <>
      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold">{apps.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold text-green-500">{apps.filter(a => a.score != null && a.score >= 4).length}</p>
            <p className="text-xs text-muted-foreground">Strong Match (4+)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold">{statusCounts['Applied'] || 0}</p>
            <p className="text-xs text-muted-foreground">Applied</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold">{statusCounts['Interview'] || 0}</p>
            <p className="text-xs text-muted-foreground">Interviews</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Applications ({filtered.length})</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search company or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-1.5 pt-2">
            {statusFilters.map((s) => {
              const count = s === 'All' ? apps.length : (statusCounts[s] || 0)
              if (s !== 'All' && count === 0) return null
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {s} ({count})
                </button>
              )
            })}
          </div>
        </CardHeader>
        <CardContent>
          {!filtered.length ? (
            <p className="py-8 text-center text-muted-foreground">
              {apps.length === 0
                ? <>No applications yet. <Link href="/evaluate" className="text-primary underline">Start evaluating</Link>.</>
                : 'No matching applications found.'}
            </p>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="space-y-2 md:hidden">
                {filtered.map((app) => {
                  const href = `/reports/${app.report_id || app.id}`
                  return (
                    <Link key={app.id} href={href} className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{app.company}</p>
                          <p className="text-xs text-muted-foreground truncate">{app.role}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <ScoreBadge score={app.score} />
                          <StatusSelect id={app.id} currentStatus={app.status} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>{new Date(app.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-0.5">
                          PDF {app.has_pdf ? <CheckCircle2 className="size-3 text-green-500" /> : <XCircle className="size-3 text-muted-foreground/40" />}
                        </span>
                        <span className="flex items-center gap-0.5">
                          CL {app.has_cover_letter ? <CheckCircle2 className="size-3 text-green-500" /> : <XCircle className="size-3 text-muted-foreground/40" />}
                        </span>
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
                      <TableHead className="w-16 text-center">PDF</TableHead>
                      <TableHead className="w-16 text-center">CL</TableHead>
                      <TableHead className="w-28">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((app) => {
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
                            <Link href={href} className="block px-4 py-2 max-w-md truncate">{app.role}</Link>
                          </TableCell>
                          <TableCell className="p-0">
                            <Link href={href} className="block px-4 py-2">
                              <ScoreBadge score={app.score} />
                            </Link>
                          </TableCell>
                          <TableCell className="p-0">
                            <div className="px-4 py-2">
                              <StatusSelect id={app.id} currentStatus={app.status} />
                            </div>
                          </TableCell>
                          <TableCell className="p-0 text-center">
                            <Link href={href} className="flex justify-center px-4 py-2">
                              {app.has_pdf
                                ? <CheckCircle2 className="size-4 text-green-500" />
                                : <XCircle className="size-4 text-muted-foreground/30" />}
                            </Link>
                          </TableCell>
                          <TableCell className="p-0 text-center">
                            <Link href={href} className="flex justify-center px-4 py-2">
                              {app.has_cover_letter
                                ? <CheckCircle2 className="size-4 text-green-500" />
                                : <XCircle className="size-4 text-muted-foreground/30" />}
                            </Link>
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
    </>
  )
}
