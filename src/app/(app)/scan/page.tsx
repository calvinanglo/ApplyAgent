'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, Search, ChevronDown, ChevronUp, RotateCcw, List } from 'lucide-react'
import { CreditConfirmButton } from '@/components/ui/credit-confirm'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

// Scanner auto-detects which ATS platform a company uses (Greenhouse, Lever, or Ashby)

// Verified companies across Greenhouse, Lever, Ashby, SmartRecruiters
const ALL_COMPANIES: Company[] = [
  // Greenhouse
  { name: 'Airbnb', slug: 'airbnb', platform: 'greenhouse' },
  { name: 'Airtable', slug: 'airtable', platform: 'greenhouse' },
  { name: 'Amplitude', slug: 'amplitude', platform: 'greenhouse' },
  { name: 'Asana', slug: 'asana', platform: 'greenhouse' },
  { name: 'Chime', slug: 'chime', platform: 'greenhouse' },
  { name: 'Cloudflare', slug: 'cloudflare', platform: 'greenhouse' },
  { name: 'CockroachDB', slug: 'cockroachlabs', platform: 'greenhouse' },
  { name: 'Coinbase', slug: 'coinbase', platform: 'greenhouse' },
  { name: 'Confluent', slug: 'confluent', platform: 'greenhouse' },
  { name: 'Databricks', slug: 'databricks', platform: 'greenhouse' },
  { name: 'Datadog', slug: 'datadog', platform: 'greenhouse' },
  { name: 'Discord', slug: 'discord', platform: 'greenhouse' },
  { name: 'DoorDash', slug: 'doordash', platform: 'greenhouse' },
  { name: 'Dropbox', slug: 'dropbox', platform: 'greenhouse' },
  { name: 'Duolingo', slug: 'duolingo', platform: 'greenhouse' },
  { name: 'Elastic', slug: 'elastic', platform: 'greenhouse' },
  { name: 'Faire', slug: 'faire', platform: 'greenhouse' },
  { name: 'Fastly', slug: 'fastly', platform: 'greenhouse' },
  { name: 'Figma', slug: 'figma', platform: 'greenhouse' },
  { name: 'GitLab', slug: 'gitlab', platform: 'greenhouse' },
  { name: 'Gusto', slug: 'gusto', platform: 'greenhouse' },
  { name: 'HubSpot', slug: 'hubspot', platform: 'greenhouse' },
  { name: 'Instacart', slug: 'instacart', platform: 'greenhouse' },
  { name: 'Intercom', slug: 'intercom', platform: 'greenhouse' },
  { name: 'Lyft', slug: 'lyft', platform: 'greenhouse' },
  { name: 'Mixpanel', slug: 'mixpanel', platform: 'greenhouse' },
  { name: 'Okta', slug: 'okta', platform: 'greenhouse' },
  { name: 'PagerDuty', slug: 'pagerduty', platform: 'greenhouse' },
  { name: 'Palantir', slug: 'palantir', platform: 'greenhouse' },
  { name: 'Plaid', slug: 'plaid', platform: 'greenhouse' },
  { name: 'Point72', slug: 'point72', platform: 'greenhouse' },
  { name: 'Reddit', slug: 'reddit', platform: 'greenhouse' },
  { name: 'Robinhood', slug: 'robinhood', platform: 'greenhouse' },
  { name: 'Samsara', slug: 'samsara', platform: 'greenhouse' },
  { name: 'Stripe', slug: 'stripe', platform: 'greenhouse' },
  { name: 'Tailscale', slug: 'tailscale', platform: 'greenhouse' },
  { name: 'Twilio', slug: 'twilio', platform: 'greenhouse' },
  { name: 'Twitch', slug: 'twitch', platform: 'greenhouse' },
  { name: 'Zscaler', slug: 'zscaler', platform: 'greenhouse' },
  // Lever
  { name: 'Netflix', slug: 'netflix', platform: 'lever' },
  { name: 'Spotify', slug: 'spotify', platform: 'lever' },
  // Ashby
  { name: 'Linear', slug: 'linear', platform: 'ashby' },
  { name: 'Notion', slug: 'notion', platform: 'ashby' },
  { name: 'OpenAI', slug: 'openai', platform: 'ashby' },
  { name: 'Ramp', slug: 'ramp', platform: 'ashby' },
  { name: 'Supabase', slug: 'supabase', platform: 'ashby' },
  { name: 'Vercel', slug: 'vercel', platform: 'ashby' },
  // SmartRecruiters
  { name: 'Visa', slug: 'Visa', platform: 'smartrecruiters' },
  // Workday (slug format: subdomain/wd#/siteId)
  { name: 'NVIDIA', slug: 'nvidia/wd5/NVIDIAExternalCareerSite', platform: 'workday' },
  { name: 'Intel', slug: 'intel/wd1/External', platform: 'workday' },
  { name: 'PayPal', slug: 'paypal/wd1/Jobs', platform: 'workday' },
  { name: 'Salesforce', slug: 'salesforce/wd12/External_Career_Site', platform: 'workday' },
  { name: 'NXP', slug: 'nxp/wd3/careers', platform: 'workday' },
  { name: 'Marvell', slug: 'marvell/wd1/MarvellCareers', platform: 'workday' },
]

const EXAMPLE_COMPANIES: Company[] = [
  ALL_COMPANIES.find(c => c.name === 'Cloudflare')!,
  ALL_COMPANIES.find(c => c.name === 'GitLab')!,
  ALL_COMPANIES.find(c => c.name === 'Datadog')!,
  ALL_COMPANIES.find(c => c.name === 'Netflix')!,
  ALL_COMPANIES.find(c => c.name === 'Notion')!,
  ALL_COMPANIES.find(c => c.name === 'OpenAI')!,
]

interface Company {
  name: string
  slug?: string | null
  platform?: string
  // backwards compat
  greenhouse_slug?: string | null
}

interface ScanResult {
  stats: {
    found: number
    filtered: number
    skipped_title: number
    skipped_filters: number
    skipped_dup: number
    added: number
  }
  new_items: Array<{ title: string; url: string; company: string; source: string }>
}

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Permanent', 'Fixed Term'] as const
const WORK_ARRANGEMENTS = ['Remote', 'Hybrid', 'On-site'] as const
const DATE_OPTIONS = [
  { value: 'any', label: 'Any time' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '3d', label: 'Last 3 days' },
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
] as const

const STORAGE_KEY = 'applyagent_scan_companies'

function loadSavedCompanies(): Company[] {
  if (typeof window === 'undefined') return EXAMPLE_COMPANIES
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      // Migrate old format: greenhouse_slug → slug + platform
      return parsed.map((c: any) => ({
        name: c.name,
        slug: c.slug || c.greenhouse_slug || null,
        platform: c.platform || (c.greenhouse_slug ? 'greenhouse' : 'greenhouse'),
      }))
    } catch { /* fall through */ }
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
  const [suggesting] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [companiesOpen, setCompaniesOpen] = useState(true)
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(new Set())
  const [selectedUrls, setSelectedUrls] = useState<Set<number>>(new Set())

  // Filter state
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([])
  const [selectedArrangements, setSelectedArrangements] = useState<string[]>([])
  const [datePosted, setDatePosted] = useState('any')
  const [locationFilter, setLocationFilter] = useState('')

  // Load saved companies + profile preferences
  useEffect(() => {
    // Load profile preferences for filter defaults
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      ;(supabase as any).from('profiles').select('work_arrangement, job_types').eq('id', user.id).single()
        .then(({ data }: any) => {
          if (data?.work_arrangement?.length) setSelectedArrangements(data.work_arrangement)
          if (data?.job_types?.length) setSelectedJobTypes(data.job_types)
        })
    })

    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setCompanies(parsed.map((c: any) => ({
          name: c.name,
          slug: c.slug || c.greenhouse_slug || null,
          platform: c.platform || (c.greenhouse_slug ? 'greenhouse' : 'greenhouse'),
        })))
        return
      } catch { /* fall through to suggestions */ }
    }
    // First visit — use default companies
    setCompanies(EXAMPLE_COMPANIES)
  }, [])

  // Persist companies
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies))
  }, [companies])

  function addCompany() {
    if (!newCompanyName) return
    // Auto-generate slug from company name (lowercase, no spaces)
    const autoSlug = newCompanySlug || newCompanyName.toLowerCase().replace(/[^a-z0-9]/g, '')
    setCompanies([...companies, { name: newCompanyName, slug: autoSlug }])
    setNewCompanyName('')
    setNewCompanySlug('')
  }

  function removeCompany(i: number) {
    const removed = companies[i]
    setCompanies(companies.filter((_, idx) => idx !== i))
    toast(`${removed.name} removed`, {
      action: {
        label: 'Undo',
        onClick: () => setCompanies(prev => [...prev.slice(0, i), removed, ...prev.slice(i)]),
      },
      duration: 5000,
    })
  }

  function addCustomUrl() {
    if (!newCustomUrl.trim()) return
    setCustomUrls([...customUrls, newCustomUrl.trim()])
    setNewCustomUrl('')
  }

  function removeCustomUrl(i: number) {
    setCustomUrls(customUrls.filter((_, idx) => idx !== i))
  }

  function resetCompanies() {
    localStorage.removeItem(STORAGE_KEY)
    setCompanies(EXAMPLE_COMPANIES)
    toast('Reset to default companies')
  }

  function toggleChip(value: string, selected: string[], setSelected: (v: string[]) => void) {
    setSelected(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }

  async function handleScan() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companies,
          custom_urls: customUrls,
          filters: {
            job_types: selectedJobTypes.map(t => t.toLowerCase()),
            work_arrangement: selectedArrangements.map(a => a.toLowerCase()),
            date_posted: datePosted,
            location: locationFilter.trim() || undefined,
          },
        }),
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
          <button
            onClick={() => setCompaniesOpen(!companiesOpen)}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <div>
              <p className="text-sm font-semibold">Companies to Scan ({companies.length})</p>
              <p className="text-xs text-muted-foreground">
                We automatically check Greenhouse, Lever, Ashby, and SmartRecruiters job boards.
              </p>
            </div>
            {companiesOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          {companiesOpen && (
            <CardContent className="pt-0 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => {
                  const existing = new Set(companies.map(c => c.slug))
                  const available = ALL_COMPANIES.filter(c => !existing.has(c.slug))
                  if (available.length === 0) { toast('All companies already added'); return }
                  const pick = available[Math.floor(Math.random() * available.length)]
                  setCompanies([...companies, pick])
                  toast(`Added ${pick.name}`)
                }}>
                  <Plus className="size-4" />
                  Suggest Company
                </Button>
                <Button variant="ghost" size="sm" onClick={resetCompanies}>
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
                {selectedCompanies.size > 0 && (
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                    if (window.confirm(`Remove ${selectedCompanies.size} selected company(ies)?`)) {
                      setCompanies(prev => prev.filter((_, i) => !selectedCompanies.has(i)))
                      setSelectedCompanies(new Set())
                    }
                  }}>
                    <Trash2 className="size-4" />Remove ({selectedCompanies.size})
                  </Button>
                )}
              </div>
              {suggesting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="size-4 animate-spin" />
                  Suggesting companies based on your profile...
                </div>
              )}
              {companies.length > 0 && (
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" className="rounded" checked={selectedCompanies.size > 0 && selectedCompanies.size === companies.length} onChange={(e) => {
                      if (e.target.checked) setSelectedCompanies(new Set(companies.map((_, i) => i)))
                      else setSelectedCompanies(new Set())
                    }} />
                    Select all
                  </label>
                </div>
              )}
              <div className={`space-y-1 ${companies.length > 8 ? 'max-h-64 overflow-y-auto' : ''}`}>
                {companies.map((company, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-1.5">
                    <input type="checkbox" className="rounded shrink-0" checked={selectedCompanies.has(i)} onChange={(e) => {
                      const next = new Set(selectedCompanies)
                      if (e.target.checked) next.add(i); else next.delete(i)
                      setSelectedCompanies(next)
                    }} />
                    <span className="flex-1 text-sm">{company.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add company name"
                  value={newCompanyName}
                  onChange={e => setNewCompanyName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCompany() } }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addCompany}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Filters */}
        <Card>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <div>
              <p className="text-sm font-semibold">Filters</p>
              <p className="text-xs text-muted-foreground">
                {selectedJobTypes.length || selectedArrangements.length || datePosted !== 'any' || locationFilter.trim()
                  ? `${[...selectedJobTypes, ...selectedArrangements, datePosted !== 'any' ? DATE_OPTIONS.find(d => d.value === datePosted)?.label : '', locationFilter.trim()].filter(Boolean).join(', ')}`
                  : 'No filters applied — showing all results'}
              </p>
            </div>
            {filtersOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          {filtersOpen && (
            <CardContent className="pt-0 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Job Type</label>
                <div className="flex flex-wrap gap-2">
                  {JOB_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleChip(type, selectedJobTypes, setSelectedJobTypes)}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                        selectedJobTypes.includes(type)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted border-border'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Work Arrangement</label>
                <div className="flex flex-wrap gap-2">
                  {WORK_ARRANGEMENTS.map(arr => (
                    <button
                      key={arr}
                      onClick={() => toggleChip(arr, selectedArrangements, setSelectedArrangements)}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                        selectedArrangements.includes(arr)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted border-border'
                      }`}
                    >
                      {arr}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Date Posted</label>
                <div className="flex flex-wrap gap-2">
                  {DATE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setDatePosted(opt.value)}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                        datePosted === opt.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted border-border'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Location (country, state, or city)</label>
                <Input
                  placeholder="e.g. Canada, Ontario, Toronto, Remote..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {(selectedJobTypes.length > 0 || selectedArrangements.length > 0 || datePosted !== 'any' || locationFilter.trim()) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelectedJobTypes([]); setSelectedArrangements([]); setDatePosted('any'); setLocationFilter('') }}
                  className="text-xs"
                >
                  Clear all filters
                </Button>
              )}
            </CardContent>
          )}
        </Card>

        {/* Custom URLs */}
        <Card>
          <CardHeader>
            <CardTitle>Add Individual Job URLs</CardTitle>
            <CardDescription>Paste specific job posting URLs to add directly to your pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {customUrls.length > 0 && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" className="rounded" checked={selectedUrls.size > 0 && selectedUrls.size === customUrls.length} onChange={(e) => {
                    if (e.target.checked) setSelectedUrls(new Set(customUrls.map((_, i) => i)))
                    else setSelectedUrls(new Set())
                  }} />
                  Select all
                </label>
                {selectedUrls.size > 0 && (
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                    if (window.confirm(`Remove ${selectedUrls.size} selected URL(s)?`)) {
                      setCustomUrls(prev => prev.filter((_, i) => !selectedUrls.has(i)))
                      setSelectedUrls(new Set())
                    }
                  }}>
                    <Trash2 className="size-4" />Remove ({selectedUrls.size})
                  </Button>
                )}
              </div>
            )}
            {customUrls.map((url, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-2">
                <input type="checkbox" className="rounded shrink-0" checked={selectedUrls.has(i)} onChange={(e) => {
                  const next = new Set(selectedUrls)
                  if (e.target.checked) next.add(i); else next.delete(i)
                  setSelectedUrls(next)
                }} />
                <span className="flex-1 text-xs font-mono truncate text-muted-foreground">{url}</span>
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

      {/* Status banners — shown first */}
      {result && result.stats.added > 0 && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  {result.stats.added} new {result.stats.added === 1 ? 'job' : 'jobs'} added to your pipeline
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Go to Pipeline to review and process them.
                </p>
              </div>
              <a href="/pipeline">
                <Button size="sm">
                  <List className="size-4" />
                  Go to Pipeline
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {result && result.stats.added === 0 && result.stats.found > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <p className="text-sm text-center text-yellow-800 dark:text-yellow-200">
              No new jobs to add — {result.stats.skipped_dup > 0 ? `${result.stats.skipped_dup} were duplicates` : 'all were filtered out'}. Try adjusting your filters or adding more companies.
            </p>
          </CardContent>
        </Card>
      )}

      {result && result.stats.found === 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <p className="text-sm text-center text-yellow-800 dark:text-yellow-200">
              No jobs found. The companies in your list may not have active job boards on Greenhouse, Lever, or Ashby. Try clicking <strong>Reset</strong> to get AI-suggested companies, or add companies you know are hiring.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detailed results below */}
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
