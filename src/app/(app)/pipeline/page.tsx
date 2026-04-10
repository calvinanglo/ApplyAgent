'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, Play, ExternalLink, AlertCircle, RotateCcw } from 'lucide-react'
import { CreditConfirmButton } from '@/components/ui/credit-confirm'
import { toast } from 'sonner'
import Link from 'next/link'

function timeAgo(date: string): string {
  const now = Date.now()
  const d = new Date(date).getTime()
  const diff = now - d
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

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
  const [processing, setProcessing] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<'pending' | 'done' | 'errors' | 'processing'>('pending')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50
  const [processProgress, setProcessProgress] = useState<{ current: number; total: number } | null>(null)
  const cancelRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  const processingRef = useRef(false) // tracks whether a batch loop is actively running
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline?status=all&limit=200')
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
        if (data.counts) setCounts(data.counts)
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Poll for updates while processing is active (keeps progress alive when tab is hidden)
  useEffect(() => {
    if (processingRef.current && !pollRef.current) {
      pollRef.current = setInterval(() => { loadItems() }, 5000)
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [loadItems])

  // Refresh items when tab becomes visible again
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        loadItems()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [loadItems])

  async function handleAddUrl(e: React.FormEvent) {
    e.preventDefault()
    if (!newUrl.trim()) return
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl.trim() }),
      })
      if (res.ok) {
        setNewUrl('')
        await loadItems()
      }
    } catch {}
  }

  async function handleDelete(id: string) {
    const deleted = items.find(i => i.id === id)
    if (!deleted) return
    // Remove from UI immediately
    setItems(prev => prev.filter(i => i.id !== id))
    let undone = false
    const timer = setTimeout(() => {
      if (!undone) {
        fetch('/api/pipeline', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      }
    }, 10500)
    toast.dismiss('pipeline-delete')
    toast('Item removed', {
      id: 'pipeline-delete',
      action: {
        label: 'Undo',
        onClick: () => {
          undone = true
          clearTimeout(timer)
          loadItems()
        },
      },
      duration: 10000,
    })
  }

  async function handleProcess(item: PipelineItem) {
    setProcessing(p => ({ ...p, [item.id]: true }))
    // Optimistically update status to processing in the UI
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' as const } : i))
    try {
      const res = await fetch('/api/pipeline/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_item_id: item.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        console.error('Process failed:', data.error)
      }
    } catch {}
    setProcessing(p => ({ ...p, [item.id]: false }))
    await loadItems()
  }

  const PARALLEL = 5 // Process 5 at a time — deduct_credits RPC is atomic so parallel is safe

  async function handleProcessAll() {
    const pending = items.filter(i => i.status === 'pending')
    cancelRef.current = false
    processingRef.current = true
    let completed = 0
    let stopped = false
    setProcessProgress({ current: 0, total: pending.length })

    // Start polling for server-side progress
    if (!pollRef.current) {
      pollRef.current = setInterval(() => { loadItems() }, 5000)
    }

    // Mark all as processing optimistically
    setItems(prev => prev.map(it =>
      pending.some(p => p.id === it.id) ? { ...it, status: 'processing' as const } : it
    ))

    // Process in batches of PARALLEL
    for (let i = 0; i < pending.length; i += PARALLEL) {
      if (cancelRef.current || stopped) {
        toast(`Cancelled — ${completed} of ${pending.length} processed.`)
        break
      }

      const batch = pending.slice(i, i + PARALLEL)
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const controller = new AbortController()
          abortRef.current = controller
          const res = await fetch('/api/pipeline/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pipeline_item_id: item.id }),
            signal: controller.signal,
            keepalive: true,
          })
          // Update progress as each item completes
          completed++
          setProcessProgress({ current: Math.min(completed, pending.length), total: pending.length })
          return res.status
        })
      )

      // Check results for insufficient credits
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value === 402) {
          stopped = true
          toast('Insufficient credits — processing stopped. Remaining items kept in pending.')
          // Revert unprocessed items back to pending
          const remaining = pending.slice(i + PARALLEL)
          if (remaining.length) {
            await fetch('/api/pipeline', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: remaining.map(r => r.id), status: 'pending' }),
            })
          }
        } else if (r.status === 'rejected' && r.reason instanceof DOMException && r.reason.name === 'AbortError') {
          stopped = true
          toast(`Cancelled — ${completed} processed.`)
        }
      }

      await loadItems()
    }

    abortRef.current = null
    processingRef.current = false
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    setProcessProgress(null)
  }

  async function handleProcessSelected() {
    // Requeue any selected error items to pending first
    const errorItems = items.filter(i => selectedItems.has(i.id) && i.status === 'error')
    if (errorItems.length) {
      await fetch('/api/pipeline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: errorItems.map(i => i.id), status: 'pending' }),
      })
      await loadItems()
    }
    const selected = items.filter(i => selectedItems.has(i.id) && (i.status === 'pending' || errorItems.some(e => e.id === i.id)))
    if (!selected.length) { toast('No items to process'); return }
    cancelRef.current = false
    processingRef.current = true
    let completed = 0
    let stopped = false
    setProcessProgress({ current: 0, total: selected.length })
    setSelectedItems(new Set())

    // Start polling for server-side progress
    if (!pollRef.current) {
      pollRef.current = setInterval(() => { loadItems() }, 5000)
    }

    setItems(prev => prev.map(it =>
      selected.some(s => s.id === it.id) ? { ...it, status: 'processing' as const } : it
    ))

    for (let i = 0; i < selected.length; i += PARALLEL) {
      if (cancelRef.current || stopped) {
        toast(`Cancelled — ${completed} of ${selected.length} processed.`)
        break
      }
      const batch = selected.slice(i, i + PARALLEL)
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const controller = new AbortController()
          abortRef.current = controller
          const res = await fetch('/api/pipeline/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pipeline_item_id: item.id }),
            signal: controller.signal,
            keepalive: true,
          })
          completed++
          setProcessProgress({ current: Math.min(completed, selected.length), total: selected.length })
          return res.status
        })
      )
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value === 402) {
          stopped = true
          toast('Insufficient credits — processing stopped.')
          const remaining = selected.slice(i + PARALLEL)
          if (remaining.length) {
            await fetch('/api/pipeline', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: remaining.map(r => r.id), status: 'pending' }),
            })
          }
        } else if (r.status === 'rejected' && r.reason instanceof DOMException && r.reason.name === 'AbortError') {
          stopped = true
          toast(`Cancelled — ${completed} processed.`)
        }
      }
      await loadItems()
    }
    abortRef.current = null
    processingRef.current = false
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    setProcessProgress(null)
    setSelectedItems(new Set())
  }

  async function handleClearItems(type: 'pending' | 'done' | 'errors') {
    setClearConfirm(null)
    // Delete on server immediately (clears ALL, not just loaded 200)
    await fetch('/api/pipeline', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clear: type }),
    })
    toast(`All ${type} items cleared`)
    await loadItems()
  }

  const [clearConfirm, setClearConfirm] = useState<'pending' | 'done' | 'errors' | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const [counts, setCounts] = useState({ pending: 0, done: 0, error: 0, processing: 0 })
  const pendingCount = counts.pending
  const doneCount = counts.done
  const errorCount = counts.error
  const processingCount = counts.processing
  const isInsufficientError = (msg: string | null) => msg?.toLowerCase().includes('insufficient') || msg?.toLowerCase().includes('credit')
  const insufficientCount = items.filter(i => i.status === 'error' && isInsufficientError(i.error_message)).length

  async function requeueInsufficient() {
    const ids = items.filter(i => i.status === 'error' && isInsufficientError(i.error_message)).map(i => i.id)
    if (!ids.length) return
    await fetch('/api/pipeline', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status: 'pending' }),
    })
    toast(`${ids.length} items moved back to pending`)
    await loadItems()
  }
  const allFiltered = activeTab === 'errors'
      ? items.filter(i => i.status === 'error')
      : activeTab === 'done'
      ? items.filter(i => i.status === 'done').sort((a, b) => new Date(b.processed_at || 0).getTime() - new Date(a.processed_at || 0).getTime())
      : items.filter(i => i.status === activeTab)
  const totalPages = Math.ceil(allFiltered.length / PAGE_SIZE)
  const filteredItems = allFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">URL inbox — add offers to evaluate in bulk</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {pendingCount > 0 && (
            clearConfirm === 'pending' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Clear {pendingCount} pending?</span>
                <Button size="sm" variant="destructive" onClick={() => handleClearItems('pending')}>
                  Confirm
                </Button>
                <Button size="sm" variant="outline" onClick={() => setClearConfirm(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setClearConfirm('pending')}>
                <Trash2 className="size-4" />
                Clear All Pending
              </Button>
            )
          )}
          {insufficientCount > 0 && (
            <Button variant="outline" size="sm" onClick={requeueInsufficient}>
              <RotateCcw className="size-4" />
              Requeue {insufficientCount} Failed
            </Button>
          )}
          {doneCount > 0 && (
            clearConfirm === 'done' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Clear {doneCount} done?</span>
                <Button size="sm" variant="destructive" onClick={() => handleClearItems('done')}>Confirm</Button>
                <Button size="sm" variant="outline" onClick={() => setClearConfirm(null)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setClearConfirm('done')}>
                <Trash2 className="size-4" />
                Clear Done
              </Button>
            )
          )}
          {errorCount > 0 && (
            clearConfirm === 'errors' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Clear {errorCount} errors?</span>
                <Button size="sm" variant="destructive" onClick={() => handleClearItems('errors')}>Confirm</Button>
                <Button size="sm" variant="outline" onClick={() => setClearConfirm(null)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setClearConfirm('errors')}>
                <Trash2 className="size-4" />
                Clear Errors
              </Button>
            )
          )}
          {pendingCount > 0 && (
            <CreditConfirmButton
              credits={10 * pendingCount}
              label={`Process All (${pendingCount})`}
              loadingLabel="Processing..."
              onConfirm={handleProcessAll}
              icon={<Play className="size-4" />}
            />
          )}
        </div>
      </div>

      {/* Processing progress bar */}
      {processProgress && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Processing {processProgress.current} of {processProgress.total}...</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs">{Math.round((processProgress.current / processProgress.total) * 100)}%</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { cancelRef.current = true; abortRef.current?.abort() }}
                >
                  Cancel
                </Button>
              </div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(processProgress.current / processProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {processProgress.current * 10} credits used · {(processProgress.total - processProgress.current) * 10} credits remaining for this batch
            </p>
          </CardContent>
        </Card>
      )}

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
        {(['pending', 'done', 'errors', 'processing'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(1) }}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'pending' ? `Pending (${pendingCount})`
              : tab === 'done' ? `Done (${doneCount})`
              : tab === 'errors' ? `Errors (${errorCount})`
              : `Processing (${processingCount})`}
          </button>
        ))}
      </div>

      {/* Selection controls */}
      {filteredItems.length > 0 && (
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" className="rounded" checked={selectedItems.size > 0 && filteredItems.every(i => selectedItems.has(i.id))} onChange={(e) => {
              if (e.target.checked) setSelectedItems(new Set(filteredItems.map(i => i.id)))
              else setSelectedItems(new Set())
            }} />
            Select all
          </label>
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2">
              {(activeTab === 'pending' || activeTab === 'errors') && (
                <CreditConfirmButton
                  credits={10 * items.filter(i => selectedItems.has(i.id) && (i.status === 'pending' || i.status === 'error')).length}
                  label={`Process Selected (${items.filter(i => selectedItems.has(i.id) && (i.status === 'pending' || i.status === 'error')).length})`}
                  loadingLabel="Processing..."
                  onConfirm={handleProcessSelected}
                  icon={<Play className="size-4" />}
                />
              )}
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                if (window.confirm(`Remove ${selectedItems.size} selected item(s)?`)) {
                  const ids = Array.from(selectedItems)
                  setItems(prev => prev.filter(i => !ids.includes(i.id)))
                  ids.forEach(id => fetch('/api/pipeline', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }))
                  setSelectedItems(new Set())
                }
              }}>
                <Trash2 className="size-4" />Remove ({selectedItems.size})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {activeTab === 'pending' ? (
            <>No pending items. Add a URL above or run the <a href="/scan" className="underline">Scanner</a> to find new offers.</>
          ) : (
            'No items in this view.'
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto md:max-h-none md:overflow-visible">
          {filteredItems.map((item) => (
            <div key={item.id} className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <input type="checkbox" className="rounded mt-1 shrink-0" checked={selectedItems.has(item.id)} onChange={(e) => {
                  const next = new Set(selectedItems)
                  if (e.target.checked) next.add(item.id); else next.delete(item.id)
                  setSelectedItems(next)
                }} />
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
                    <span className="text-xs text-muted-foreground/50">{timeAgo(item.created_at)}</span>
                  </div>
                  {(item as any).location && (
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{(item as any).location}</p>
                  )}
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
                  {processing[item.id] && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" />
                        Processing — fetching JD and evaluating...
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                      </div>
                    </div>
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
                  {item.status === 'error' && isInsufficientError(item.error_message) && (
                    <Button variant="outline" size="sm" onClick={async () => {
                      await fetch('/api/pipeline', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, status: 'pending' }) })
                      await loadItems()
                    }}>
                      <RotateCcw className="size-4" />
                    </Button>
                  )}
                  {item.status === 'error' && !isInsufficientError(item.error_message) && (
                    <Button variant="outline" size="sm" disabled={processing[item.id]} onClick={async () => {
                      await fetch('/api/pipeline', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, status: 'pending' }) })
                      await loadItems()
                      toast('Moved back to pending for retry')
                    }}>
                      <RotateCcw className="size-4" />
                    </Button>
                  )}
                  {item.status === 'pending' && (
                    <CreditConfirmButton
                      credits={10}
                      label=""
                      loadingLabel=""
                      disabled={processing[item.id]}
                      onConfirm={() => handleProcess(item)}
                      icon={processing[item.id] ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                    />
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, allFiltered.length)} of {allFiltered.length}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(1)}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Prev
            </Button>
            <span className="flex items-center px-3 text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
