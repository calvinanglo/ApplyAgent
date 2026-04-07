'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, Play, ExternalLink, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface PipelineItem {
  id: string
  url: string
  company: string | null
  title: string | null
  source: string
  status: 'pending' | 'processing' | 'done' | 'error'
  score: number | null
  report_id: string | null
  error_message: string | null
  created_at: string
  processed_at: string | null
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export default function PipelinePage() {
  const [items, setItems] = useState<PipelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newUrl, setNewUrl] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [processing, setProcessing] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<'pending' | 'done' | 'all'>('pending')

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/pipeline?status=${activeTab}&limit=100`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } catch {}
    setLoading(false)
  }, [activeTab])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  async function handleAddUrl(e: React.FormEvent) {
    e.preventDefault()
    if (!newUrl.trim()) return
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl.trim(), company: newCompany || undefined, title: newTitle || undefined }),
      })
      if (res.ok) {
        setNewUrl('')
        setNewCompany('')
        setNewTitle('')
        await loadItems()
      }
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      await fetch('/api/pipeline', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setItems(items.filter(item => item.id !== id))
    } catch {}
  }

  async function handleProcess(item: PipelineItem) {
    setProcessing(p => ({ ...p, [item.id]: true }))
    try {
      const res = await fetch('/api/pipeline/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_item_id: item.id }),
      })
      if (res.ok) {
        await loadItems()
      } else {
        const data = await res.json()
        console.error('Process failed:', data.error)
        await loadItems()
      }
    } catch {
      await loadItems()
    }
    setProcessing(p => ({ ...p, [item.id]: false }))
  }

  async function handleProcessAll() {
    const pending = items.filter(i => i.status === 'pending')
    for (const item of pending) {
      await handleProcess(item)
    }
  }

  const pendingCount = items.filter(i => i.status === 'pending').length
  const doneCount = items.filter(i => i.status === 'done').length

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">URL inbox — add offers to evaluate in bulk</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadItems}>
            <RefreshCw className="size-4" />
          </Button>
          {pendingCount > 0 && (
            <Button size="sm" onClick={handleProcessAll}>
              <Play className="size-4" />
              Process All ({pendingCount})
            </Button>
          )}
        </div>
      </div>

      {/* Add URL form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleAddUrl} className="space-y-3">
            <Input
              placeholder="Job posting URL — https://..."
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              className="font-mono text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Company (optional)" value={newCompany} onChange={e => setNewCompany(e.target.value)} />
              <Input placeholder="Job title (optional)" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={!newUrl.trim()} size="sm">
                <Plus className="size-4" />Add to Pipeline
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['pending', 'done', 'all'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'pending' ? `Pending (${pendingCount})` : tab === 'done' ? `Done (${doneCount})` : 'All'}
          </button>
        ))}
      </div>

      {/* Items list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {activeTab === 'pending' ? (
            <>No pending items. Add a URL above or run the <a href="/scan" className="underline">Scanner</a> to find new offers.</>
          ) : (
            'No items in this view.'
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.company && <span className="font-medium text-sm">{item.company}</span>}
                    {item.title && <span className="text-sm text-muted-foreground">{item.title}</span>}
                    {item.score !== null && (
                      <Badge variant={item.score >= 4 ? 'default' : 'secondary'} className="text-xs">
                        {item.score.toFixed(1)}/5
                      </Badge>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] ?? ''}`}>
                      {item.status}
                    </span>
                    <Badge variant="outline" className="text-xs">{item.source}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground font-mono truncate max-w-sm"
                    >
                      {item.url}
                    </a>
                    <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                  </div>
                  {item.error_message && (
                    <p className="text-xs text-destructive mt-1">{item.error_message}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {item.report_id && (
                    <Link href={`/reports/${item.report_id}`}>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="size-4" />
                      </Button>
                    </Link>
                  )}
                  {item.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleProcess(item)}
                      disabled={processing[item.id]}
                    >
                      {processing[item.id] ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Play className="size-4" />
                      )}
                    </Button>
                  )}
                  {item.status !== 'processing' && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
