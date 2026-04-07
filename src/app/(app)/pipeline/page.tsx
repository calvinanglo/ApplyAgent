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
  const [activeTab, setActiveTab] = useState<'pending' | 'done' | 'errors' | 'processing'>('pending')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50
  const [processProgress, setProcessProgress] = useState<{ current: number; total: number } | null>(null)
  const cancelRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline?status=all&limit=2000')
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } catch {}
    setLoading(false)
  }, [])

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
    const deleted = items.find(i => i.id === id)
    if (!deleted) return
    // Remove from UI immediately
    setItems(prev => prev.filter(i => i.id !== id))
    let undone = false
    toast('Item removed', {
      action: {
        label: 'Undo',
        onClick: () => {
          undone = true
          setItems(prev => [...prev, deleted].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
        },
      },
      duration: 10000,
      onAutoClose: () => {
        if (!undone) {
          fetch('/api/pipeline', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
        }
      },
      onDismiss: () => {
        if (!undone) {
          fetch('/api/pipeline', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
        }
      },
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

  const PARALLEL = 3 // Process 3 items at a time

  async function handleProcessAll() {
    const pending = items.filter(i => i.status === 'pending')
    cancelRef.current = false
    let completed = 0
    let stopped = false
    setProcessProgress({ current: 0, total: pending.length })

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
          })
          return res.status
        })
      )

      // Check results for insufficient credits
      for (const r of results) {
        if (r.status === 'fulfilled') {
          completed++
          if (r.value === 402) {
            stopped = true
            toast('Insufficient credits — processing stopped.')
          }
        } else {
          completed++
          if (r.reason instanceof DOMException && r.reason.name === 'AbortError') {
            stopped = true
            toast(`Cancelled — ${completed} processed.`)
          }
        }
      }

      setProcessProgress({ current: Math.min(completed, pending.length), total: pending.length })
      await loadItems()
    }

    abortRef.current = null
    setProcessProgress(null)
  }

  async function handleProcessSelected() {
    const selected = items.filter(i => selectedItems.has(i.id) && i.status === 'pending')
    if (!selected.length) { toast('No pending items selected'); return }
    cancelRef.current = false
    let completed = 0
    let stopped = false
    setProcessProgress({ current: 0, total: selected.length })
    setSelectedItems(new Set())

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
          })
          return res.status
        })
      )
      for (const r of results) {
        if (r.status === 'fulfilled') {
          completed++
          if (r.value === 402) { stopped = true; toast('Insufficient credits — processing stopped.') }
        } else {
          completed++
          if (r.reason instanceof DOMException && r.reason.name === 'AbortError') { stopped = true; toast(`Cancelled — ${completed} processed.`) }
        }
      }
      setProcessProgress({ current: Math.min(completed, selected.length), total: selected.length })
      await loadItems()
    }
    abortRef.current = null
    setProcessProgress(null)
  }

  async function handleClearItems(type: 'pending' | 'done' | 'errors') {
    setClearConfirm(null)
    const cleared = type === 'pending'
      ? items.filter(i => i.status === 'pending')
      : type === 'errors'
      ? items.filter(i => i.status === 'error')
      : items.filter(i => i.status === 'done')
    // Remove from UI immediately
    setItems(prev => prev.filter(i => !cleared.some(c => c.id === i.id)))
    let undone = false
    toast(`${cleared.length} ${type} items removed`, {
      action: {
        label: 'Undo',
        onClick: () => {
          undone = true
          setItems(prev => [...prev, ...cleared].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
        },
      },
      duration: 10000,
      onAutoClose: () => {
        if (!undone) {
          fetch('/api/pipeline', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clear: type }) })
        }
      },
      onDismiss: () => {
        if (!undone) {
          fetch('/api/pipeline', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clear: type }) })
        }
      },
    })
  }

  const [clearConfirm, setClearConfirm] = useState<'pending' | 'done' | 'errors' | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const pendingCount = items.filter(i => i.status === 'pending').length
  const doneCount = items.filter(i => i.status === 'done').length
  const errorCount = items.filter(i => i.status === 'error').length
  const processingCount = items.filter(i => i.status === 'processing').length
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
                Clear Pending
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
              <CreditConfirmButton
                credits={10 * items.filter(i => selectedItems.has(i.id) && i.status === 'pending').length}
                label={`Process Selected (${items.filter(i => selectedItems.has(i.id) && i.status === 'pending').length})`}
                loadingLabel="Processing..."
                onConfirm={handleProcessSelected}
                icon={<Play className="size-4" />}
              />
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
        <div className="space-y-2">
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
                    <CreditConfirmButton
                      credits={10}
                      label=""
                      loadingLabel=""
                      disabled={processing[item.id]}
                      onConfirm={() => handleProcess(item)}
                      icon={<RotateCcw className="size-4" />}
                    />
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
