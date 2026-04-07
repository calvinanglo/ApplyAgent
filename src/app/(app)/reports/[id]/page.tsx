'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BlockRenderer } from '@/components/evaluation/BlockRenderer'
import { Loader2, FileDown, Mail, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ReportPage() {
  const params = useParams()
  const id = params.id as string
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single()
      setReport(data)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <p className="text-muted-foreground">Report not found.</p>
        <Link href="/applications"><Button variant="outline" className="mt-4">Back to Applications</Button></Link>
      </div>
    )
  }

  const blocks = [
    { key: 'block_a', label: 'A) Role Summary' },
    { key: 'block_b', label: 'B) CV Match' },
    { key: 'block_c', label: 'C) Level & Strategy' },
    { key: 'block_d', label: 'D) Comp & Demand' },
    { key: 'block_e', label: 'E) Customization' },
    { key: 'block_f', label: 'F) Interview' },
    { key: 'block_g', label: 'G) Draft Answers' },
  ].filter(b => report[b.key])

  const scoreColor = report.score >= 4 ? 'bg-green-600' : report.score >= 3 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/applications">
          <Button variant="ghost" size="sm"><ArrowLeft className="size-4 mr-1" />Applications</Button>
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{report.company}</h1>
            <p className="text-sm sm:text-lg text-muted-foreground truncate">{report.role}</p>
          </div>
          {report.score && (
            <div className={`${scoreColor} text-white rounded-lg px-3 py-1.5 text-center shrink-0`}>
              <p className="text-xl font-bold leading-none">{report.score}</p>
              <p className="text-xs opacity-80">out of 5</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {report.archetype && <Badge variant="outline">{report.archetype}</Badge>}
          {report.jd_url && (
            <a href={report.jd_url} target="_blank" rel="noopener noreferrer">
              <Badge variant="secondary" className="cursor-pointer hover:opacity-80">View Job Posting ↗</Badge>
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/cover-letter?report_id=${id}`}>
            <Button variant="outline" size="sm"><Mail className="size-4 mr-1" />Cover Letter</Button>
          </Link>
          <Link href={`/resume?report_id=${id}`}>
            <Button variant="outline" size="sm"><FileDown className="size-4 mr-1" />Resume</Button>
          </Link>
        </div>
      </div>

      {blocks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Report</CardTitle>
            {report.created_at && (
              <CardDescription>
                {new Date(report.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={blocks[0]?.key}>
              <TabsList className="flex flex-wrap h-auto">
                {blocks.map((block) => (
                  <TabsTrigger key={block.key} value={block.key} className="text-xs">
                    {block.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {blocks.map((block) => (
                <TabsContent key={block.key} value={block.key} className="mt-4">
                  <BlockRenderer blockKey={block.key} content={report[block.key]} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {report.keywords?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ATS Keywords</CardTitle>
            <CardDescription>Keywords extracted from the job description for resume optimization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {report.keywords.map((kw: string) => (
                <Badge key={kw} variant="secondary">{kw}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
