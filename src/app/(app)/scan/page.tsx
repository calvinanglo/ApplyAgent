'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Inbox, Plus, Trash2, Search, Sparkles } from 'lucide-react'
import { CreditConfirmButton } from '@/components/ui/credit-confirm'

const EXAMPLE_COMPANIES: Company[] = [
  { name: 'Cloudflare', greenhouse_slug: 'cloudflare' },
  { name: 'GitLab', greenhouse_slug: 'gitlab' },
  { name: 'Elastic', greenhouse_slug: 'elastic' },
  { name: 'Datadog', greenhouse_slug: 'datadog' },
  { name: 'Okta', greenhouse_slug: 'okta' },
  { name: 'Zscaler', greenhouse_slug: 'zscaler' },
]

interface Company {
  name: string
  greenhouse_slug?: string | null
  careers_url?: string
}

interface ScanResult {
  stats: {
    found: number
    filtered: number
    skipped_title: number
    skipped_dup: number
    added: number
  }
  new_items: Array<{ title: string; url: string; company: string; source: string }>
}

const STORAGE_KEY = 'applyagent_scan_companies'

function loadSavedCompanies(): Company[] {
  if (typeof window === 'undefined') return EXAMPLE_COMPANIES
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try { return JSON.parse(saved) } catch { /* fall through */ }
  }
  return EXAMPLE_COMPANIES
}

export default function ScanPage() {
  const [companies, setCompanies] = useState<Company[]>(EXAMPLE_COMPANIES)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanySlug, setNewCompanySlug] = useState('')
  const [newCustomUrl, setNewCustomUrl] = useState('')
  const [customUrls, setCustomUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [suggesting, setSuggesting] = useState(false)

  // Load saved companies on mount, or fetch AI suggestions if first visit
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setCompanies(JSON.parse(saved))
        return
      } catch { /* fall through to suggestions */ }
    }
    // First visit — fetch personalized suggestions
    setSuggesting(true)
    fetch('/api/suggest-companies')
      .then(res => res.json())
      .then(data => {
        if (data.companies?.length > 0) {
          setCompanies(data.companies)
        } else {
          setCompanies(EXAMPLE_COMPANIES)
        }
      })
      .catch(() => setCompanies(EXAMPLE_COMPANIES))
      .finally(() => setSuggesting(false))
  }, [])

  // Persist to localStorage whenever companies change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies))
  }, [companies])

  function addCompany() {
    if (!newCompanyName) return
    setCompanies([...companies, { name: newCompanyName, greenhouse_slug: newCompanySlug || null }])
    setNewCompanyName('')
    setNewCompanySlug('')
  }

  function removeCompany(i: number) {
    setCompanies(companies.filter((_, idx) => idx !== i))
  }

  function addCustomUrl() {
    if (!newCustomUrl.trim()) return
    setCustomUrls([...customUrls, newCustomUrl.trim()])
    setNewCustomUrl('')
  }

  function removeCustomUrl(i: number) {
    setCustomUrls(customUrls.filter((_, idx) => idx !== i))
  }

  async function handleScan() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companies, custom_urls: customUrls }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Scan failed'); return }
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Portal Scanner</h1>
        <p className="text-muted-foreground">Scan company job boards for new matching roles and add them to your pipeline</p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Companies to Scan</CardTitle>
            <CardDescription>Companies with Greenhouse ATS will be scanned via API. Others can be scanned by adding their careers URL.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggesting && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="size-4 animate-spin" />
                Suggesting companies based on your resume...
              </div>
            )}
            <div className="space-y-2">
              {companies.map((company, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <span className="flex-1 text-sm font-medium">{company.name}</span>
                  {company.greenhouse_slug && (
                    <Badge variant="secondary" className="text-xs">Greenhouse: {company.greenhouse_slug}</Badge>
                  )}
                  {company.careers_url && (
                    <Badge variant="outline" className="text-xs">Custom URL</Badge>
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeCompany(i)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input placeholder="Company name" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} />
              <Input placeholder="Greenhouse slug (optional)" value={newCompanySlug} onChange={e => setNewCompanySlug(e.target.value)} />
              <Button type="button" variant="outline" onClick={addCompany}>
                <Plus className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Individual Job URLs</CardTitle>
            <CardDescription>Paste specific job posting URLs to add directly to your pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {customUrls.map((url, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-2">
                <span className="flex-1 text-xs font-mono truncate text-muted-foreground">{url}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeCustomUrl(i)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="https://jobs.example.com/..."
                value={newCustomUrl}
                onChange={e => setNewCustomUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomUrl() } }}
                className="font-mono text-sm"
              />
              <Button type="button" variant="outline" onClick={addCustomUrl}>
                <Plus className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Costs 8 credits per scan</p>
          <CreditConfirmButton
            credits={8}
            label="Run Scan"
            loadingLabel="Scanning..."
            disabled={loading || (companies.length === 0 && customUrls.length === 0)}
            onConfirm={handleScan}
            icon={<Search className="size-4" />}
          />
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6"><p className="text-sm text-destructive">{error}</p></CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Scan Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Found', value: result.stats.found, color: '' },
                { label: 'Relevant', value: result.stats.filtered, color: 'text-blue-600' },
                { label: 'Duplicates skipped', value: result.stats.skipped_dup, color: 'text-muted-foreground' },
                { label: 'Added to pipeline', value: result.stats.added, color: 'text-green-600 font-bold' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-md border p-3 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {result.new_items.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">New items added to pipeline:</p>
                {result.new_items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.company}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{item.source}</Badge>
                  </div>
                ))}
              </div>
            )}

            {result.stats.added > 0 && (
              <p className="text-sm text-muted-foreground">
                Go to <a href="/pipeline" className="underline font-medium">Pipeline</a> to evaluate these new offers.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
