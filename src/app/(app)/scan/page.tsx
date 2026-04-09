'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, ChevronDown, ChevronUp, List } from 'lucide-react'
import { CreditConfirmButton } from '@/components/ui/credit-confirm'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { LocationCombobox } from '@/components/ui/location-combobox'

// Scanner auto-detects which ATS platform a company uses (Greenhouse, Lever, or Ashby)

// Verified companies across Greenhouse, Lever, Ashby, SmartRecruiters
const ALL_COMPANIES: Company[] = [
  // ── Tech ──
  { name: 'Airbnb', slug: 'airbnb', platform: 'greenhouse' },
  { name: 'Airtable', slug: 'airtable', platform: 'greenhouse' },
  { name: 'Amplitude', slug: 'amplitude', platform: 'greenhouse' },
  { name: 'Asana', slug: 'asana', platform: 'greenhouse' },
  { name: 'Cloudflare', slug: 'cloudflare', platform: 'greenhouse' },
  { name: 'CockroachDB', slug: 'cockroachlabs', platform: 'greenhouse' },
  { name: 'Coinbase', slug: 'coinbase', platform: 'greenhouse' },
  { name: 'Confluent', slug: 'confluent', platform: 'greenhouse' },
  { name: 'Databricks', slug: 'databricks', platform: 'greenhouse' },
  { name: 'Datadog', slug: 'datadog', platform: 'greenhouse' },
  { name: 'Discord', slug: 'discord', platform: 'greenhouse' },
  { name: 'DoorDash', slug: 'doordash', platform: 'greenhouse' },
  { name: 'Dropbox', slug: 'dropbox', platform: 'greenhouse' },
  { name: 'Elastic', slug: 'elastic', platform: 'greenhouse' },
  { name: 'Faire', slug: 'faire', platform: 'greenhouse' },
  { name: 'Fastly', slug: 'fastly', platform: 'greenhouse' },
  { name: 'Figma', slug: 'figma', platform: 'greenhouse' },
  { name: 'GitLab', slug: 'gitlab', platform: 'greenhouse' },
  { name: 'HubSpot', slug: 'hubspot', platform: 'greenhouse' },
  { name: 'Intercom', slug: 'intercom', platform: 'greenhouse' },
  { name: 'Mixpanel', slug: 'mixpanel', platform: 'greenhouse' },
  { name: 'Okta', slug: 'okta', platform: 'greenhouse' },
  { name: 'PagerDuty', slug: 'pagerduty', platform: 'greenhouse' },
  { name: 'Reddit', slug: 'reddit', platform: 'greenhouse' },
  { name: 'Samsara', slug: 'samsara', platform: 'greenhouse' },
  { name: 'Tailscale', slug: 'tailscale', platform: 'greenhouse' },
  { name: 'Twilio', slug: 'twilio', platform: 'greenhouse' },
  { name: 'Twitch', slug: 'twitch', platform: 'greenhouse' },
  { name: 'Zscaler', slug: 'zscaler', platform: 'greenhouse' },
  { name: 'Netflix', slug: 'netflix', platform: 'lever' },
  { name: 'Spotify', slug: 'spotify', platform: 'lever' },
  { name: 'Linear', slug: 'linear', platform: 'ashby' },
  { name: 'Notion', slug: 'notion', platform: 'ashby' },
  { name: 'OpenAI', slug: 'openai', platform: 'ashby' },
  { name: 'Supabase', slug: 'supabase', platform: 'ashby' },
  { name: 'Vercel', slug: 'vercel', platform: 'ashby' },
  // ── Finance & Fintech ──
  { name: 'Stripe', slug: 'stripe', platform: 'greenhouse' },
  { name: 'Chime', slug: 'chime', platform: 'greenhouse' },
  { name: 'Gusto', slug: 'gusto', platform: 'greenhouse' },
  { name: 'Robinhood', slug: 'robinhood', platform: 'greenhouse' },
  { name: 'Point72', slug: 'point72', platform: 'greenhouse' },
  { name: 'Brex', slug: 'brex', platform: 'greenhouse' },
  { name: 'SoFi', slug: 'sofi', platform: 'greenhouse' },
  { name: 'Affirm', slug: 'affirm', platform: 'greenhouse' },
  { name: 'Nubank', slug: 'nubank', platform: 'greenhouse' },
  { name: 'Block', slug: 'block', platform: 'greenhouse' },
  { name: 'Mercury', slug: 'mercury', platform: 'greenhouse' },
  { name: 'Toast', slug: 'toast', platform: 'greenhouse' },
  { name: 'Marqeta', slug: 'marqeta', platform: 'greenhouse' },
  { name: 'N26', slug: 'n26', platform: 'greenhouse' },
  { name: 'Plaid', slug: 'plaid', platform: 'lever' },
  { name: 'Ramp', slug: 'ramp', platform: 'ashby' },
  { name: 'Wealthsimple', slug: 'wealthsimple', platform: 'ashby' },
  { name: 'Deel', slug: 'deel', platform: 'ashby' },
  { name: 'Visa', slug: 'Visa', platform: 'smartrecruiters' },
  { name: 'Wise', slug: 'wise', platform: 'smartrecruiters' },
  // ── Healthcare & Pharma ──
  { name: 'Oscar Health', slug: 'oscar', platform: 'greenhouse' },
  { name: 'Zocdoc', slug: 'zocdoc', platform: 'greenhouse' },
  { name: 'Flatiron Health', slug: 'flatironhealth', platform: 'greenhouse' },
  { name: 'Veracyte', slug: 'veracyte', platform: 'greenhouse' },
  { name: 'Ro', slug: 'ro', platform: 'lever' },
  { name: 'AbbVie', slug: 'abbvie', platform: 'smartrecruiters' },
  { name: 'Guardant Health', slug: 'guardanthealth', platform: 'smartrecruiters' },
  // ── Retail & E-commerce ──
  { name: 'Instacart', slug: 'instacart', platform: 'greenhouse' },
  { name: 'Peloton', slug: 'peloton', platform: 'greenhouse' },
  { name: 'Gap Inc', slug: 'gapinc', platform: 'smartrecruiters' },
  { name: 'Wayfair', slug: 'wayfair', platform: 'smartrecruiters' },
  // ── Consulting ──
  { name: 'Accenture Federal', slug: 'AccentureFederalServices', platform: 'greenhouse' },
  { name: 'Oliver Wyman', slug: 'oliverwyman', platform: 'lever' },
  // ── Manufacturing & Automotive ──
  { name: 'Lucid Motors', slug: 'lucidmotors', platform: 'greenhouse' },
  { name: 'Bosch', slug: 'BoschGroup', platform: 'smartrecruiters' },
  { name: 'Continental', slug: 'Continental', platform: 'smartrecruiters' },
  { name: 'Parker Hannifin', slug: 'parker', platform: 'ashby' },
  // ── Media & Entertainment ──
  { name: 'New York Times', slug: 'thenewyorktimes', platform: 'greenhouse' },
  { name: 'Take-Two', slug: 'taketwo', platform: 'greenhouse' },
  { name: 'Fox', slug: 'fox', platform: 'greenhouse' },
  { name: 'Live Nation', slug: 'livenationentertainment', platform: 'smartrecruiters' },
  // ── Insurance ──
  { name: 'Coalition', slug: 'coalition', platform: 'greenhouse' },
  { name: 'MetLife', slug: 'metlife', platform: 'lever' },
  { name: 'Lemonade', slug: 'lemonade', platform: 'ashby' },
  // ── Transport & Logistics ──
  { name: 'Lyft', slug: 'lyft', platform: 'greenhouse' },
  { name: 'Flexport', slug: 'flexport', platform: 'greenhouse' },
  { name: 'Uber', slug: 'uber', platform: 'smartrecruiters' },
  // ── Food & Beverage ──
  { name: 'Anheuser-Busch InBev', slug: 'abinbev', platform: 'greenhouse' },
  { name: 'Sodexo', slug: 'sodexo', platform: 'smartrecruiters' },
  { name: "McDonald's", slug: 'McDonaldsCorporation', platform: 'smartrecruiters' },
  // ── Energy ──
  { name: 'ChargePoint', slug: 'chargepoint', platform: 'greenhouse' },
  { name: 'Vattenfall', slug: 'Vattenfall', platform: 'smartrecruiters' },
  // ── Real Estate ──
  { name: 'Opendoor', slug: 'opendoor', platform: 'greenhouse' },
  { name: 'Colliers', slug: 'colliers', platform: 'smartrecruiters' },
  // ── Education ──
  { name: 'Duolingo', slug: 'duolingo', platform: 'greenhouse' },
  { name: 'Khan Academy', slug: 'khanacademy', platform: 'greenhouse' },
  { name: 'Udemy', slug: 'udemy', platform: 'greenhouse' },
  { name: 'Coursera', slug: 'coursera', platform: 'greenhouse' },
  { name: 'Handshake', slug: 'handshake', platform: 'ashby' },
  // ── Defense & Government ──
  { name: 'Anduril', slug: 'andurilindustries', platform: 'greenhouse' },
  { name: 'Palantir', slug: 'palantir', platform: 'lever' },
  { name: 'Shield AI', slug: 'shieldai', platform: 'lever' },
  { name: 'CACI', slug: 'caci', platform: 'smartrecruiters' },
  // ── Hospitality ──
  { name: 'Four Seasons', slug: 'fourseasons', platform: 'greenhouse' },
  { name: 'Equinox', slug: 'equinox', platform: 'smartrecruiters' },
  { name: 'Accor', slug: 'accor', platform: 'smartrecruiters' },
  // ── Workday ──
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
const FILTERS_KEY = 'applyagent_scan_filters'

function loadSavedCompanies(): Company[] {
  if (typeof window === 'undefined') return []
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
  return []
}

export default function ScanPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanySlug, setNewCompanySlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Board search state
  const [boardKeywords, setBoardKeywords] = useState('')
  const [boardLocation, setBoardLocation] = useState('')
  const [boardLoading, setBoardLoading] = useState(false)
  const [boardResult, setBoardResult] = useState<any>(null)
  const [boardError, setBoardError] = useState<string | null>(null)
  const [boardSources, setBoardSources] = useState<Set<string>>(new Set(['indeed', 'linkedin']))
  const [suggesting] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [companiesOpen, setCompaniesOpen] = useState(true)
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(new Set())

  // Target roles state
  const [targetRoles, setTargetRoles] = useState<string[]>([])
  const [newRole, setNewRole] = useState('')
  const [userId, setUserId] = useState('')

  // Filter state
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([])
  const [selectedArrangements, setSelectedArrangements] = useState<string[]>([])
  const [datePosted, setDatePosted] = useState('any')
  const [salaryMin, setSalaryMin] = useState('')

  // Load saved companies + profile preferences
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      ;(supabase as any).from('profiles').select('work_arrangement, job_types, location, target_roles').eq('id', user.id).single()
        .then(({ data }: any) => {
          // Load saved scanner filters from localStorage — they override profile defaults
          const savedFilters = localStorage.getItem(FILTERS_KEY)
          if (savedFilters) {
            try {
              const f = JSON.parse(savedFilters)
              if (f.jobTypes) setSelectedJobTypes(f.jobTypes)
              if (f.arrangements) setSelectedArrangements(f.arrangements)
              if (f.datePosted) setDatePosted(f.datePosted)
              if (f.boardLocation) setBoardLocation(f.boardLocation)
            } catch {}
          } else {
            // No saved scanner filters — fall back to profile defaults
            if (data?.work_arrangement?.length) setSelectedArrangements(data.work_arrangement)
            if (data?.job_types?.length) setSelectedJobTypes(data.job_types)
          }
          if (data?.location && !boardLocation) setBoardLocation(data.location)
          if (data?.target_roles?.length) setTargetRoles(data.target_roles)
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
    // First visit — start empty
    setCompanies([])
  }, [])

  // Persist companies
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies))
  }, [companies])

  // Persist scanner filters — overrides profile defaults on next load
  useEffect(() => {
    localStorage.setItem(FILTERS_KEY, JSON.stringify({
      jobTypes: selectedJobTypes,
      arrangements: selectedArrangements,
      datePosted,
      boardLocation,
    }))
  }, [selectedJobTypes, selectedArrangements, datePosted, boardLocation])

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
      duration: 10000,
    })
  }

  function resetCompanies() {
    localStorage.removeItem(STORAGE_KEY)
    setCompanies([])
    setSelectedCompanies(new Set())
    toast('Companies cleared')
  }

  function toggleChip(value: string, selected: string[], setSelected: (v: string[]) => void) {
    setSelected(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }

  async function handleScan() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const scanCompanies = companies.length > 0 ? companies : [...ALL_COMPANIES]
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companies: scanCompanies,
          target_roles: targetRoles,
          filters: {
            job_types: selectedJobTypes.map(t => t.toLowerCase()),
            work_arrangement: selectedArrangements.map(a => a.toLowerCase()),
            date_posted: datePosted,
            location: boardLocation.trim() || undefined,
            salary_min: salaryMin ? parseInt(salaryMin, 10) : undefined,
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

  function saveTargetRoles(roles: string[]) {
    setTargetRoles(roles)
    if (!userId) return
    const supabase = createClient()
    ;(supabase as any).from('profiles').update({ target_roles: roles }).eq('id', userId).then(() => {})
  }

  function addRole() {
    const role = newRole.trim()
    if (!role || targetRoles.includes(role)) return
    saveTargetRoles([...targetRoles, role])
    setNewRole('')
  }

  function removeRole(role: string) {
    saveTargetRoles(targetRoles.filter(r => r !== role))
  }

  async function handleBoardSearch() {
    setBoardLoading(true)
    setBoardError(null)
    setBoardResult(null)
    try {
      const res = await fetch('/api/scan/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: boardKeywords,
          location: boardLocation,
          sources: Array.from(boardSources),
          target_roles: targetRoles,
          filters: {
            job_types: selectedJobTypes.map(t => t.toLowerCase()),
            work_arrangement: selectedArrangements.map(a => a.toLowerCase()),
            date_posted: datePosted,
            location: boardLocation.trim() || undefined,
            salary_min: salaryMin ? parseInt(salaryMin, 10) : undefined,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setBoardError(data.error || 'Search failed'); return }
      setBoardResult(data)
      toast(`Found ${data.stats.added} new jobs`)
    } catch (err) {
      setBoardError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setBoardLoading(false)
    }
  }

  const hasBoardSearch = boardKeywords.trim() && boardLocation.trim() && boardSources.size > 0
  const hasCareerPages = true // always available — scans all companies when none selected
  const creditCost = (hasBoardSearch ? 3 : 0) + (hasCareerPages ? 3 : 0)
  const canScan = hasBoardSearch || hasCareerPages

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scanner</h1>
        <p className="text-muted-foreground">Search job boards and company career pages — results go to your pipeline</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">

          {/* ── Target Roles ─────────────────────────────── */}
          <div className="border rounded-lg px-4 py-3 space-y-2">
            <p className="text-sm font-medium">Target Roles</p>
            <div className="flex flex-wrap gap-2">
              {targetRoles.map(role => (
                <span key={role} className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-sm">
                  {role}
                  <button onClick={() => removeRole(role)} className="ml-0.5 text-muted-foreground hover:text-destructive">&times;</button>
                </span>
              ))}
              {targetRoles.length === 0 && <p className="text-xs text-muted-foreground italic">No target roles — all jobs included</p>}
            </div>
            <form onSubmit={e => { e.preventDefault(); addRole() }} className="flex gap-2">
              <Input placeholder="Add a role (e.g. Infrastructure Analyst)" value={newRole} onChange={e => setNewRole(e.target.value)} className="h-8 text-sm" />
              <Button type="submit" size="sm" variant="outline" disabled={!newRole.trim()}><Plus className="size-3.5 mr-1" />Add</Button>
            </form>
          </div>

          {/* ── Companies ───── */}
          <div className="border rounded-lg">
              <button onClick={() => setCompaniesOpen(!companiesOpen)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                <p className="text-sm font-medium">Companies ({companies.length > 0 ? companies.length : 'All'})</p>
                {companiesOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              {companiesOpen && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Click to toggle · {companies.length > 0 ? `${companies.length} selected` : 'none selected (scans all)'}</p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setCompanies([...ALL_COMPANIES])}>All</Button>
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={resetCompanies}>None</Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                    {ALL_COMPANIES.map(c => {
                      const active = companies.some(co => co.slug === c.slug)
                      return (
                        <button key={c.slug} onClick={() => {
                          if (active) setCompanies(prev => prev.filter(co => co.slug !== c.slug))
                          else setCompanies(prev => [...prev, c])
                        }}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-input text-muted-foreground'}`}>
                          {c.name}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Add custom company" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCompany() } }} className="flex-1 h-8 text-sm" />
                    <Button type="button" size="sm" variant="outline" onClick={addCompany}><Plus className="size-4" /></Button>
                  </div>
                </div>
              )}
          </div>

          {/* ── Filters ──────────────────────────────────── */}
          <div className="border rounded-lg">
            <button onClick={() => setFiltersOpen(!filtersOpen)} className="w-full flex items-center justify-between px-4 py-3 text-left">
              <div>
                <p className="text-sm font-medium">Filters</p>
                <p className="text-xs text-muted-foreground">
                  {selectedJobTypes.length || selectedArrangements.length || datePosted !== 'any' || salaryMin || boardKeywords.trim() || boardLocation.trim()
                    ? `${[boardKeywords.trim(), boardLocation.trim(), ...selectedJobTypes, ...selectedArrangements, datePosted !== 'any' ? DATE_OPTIONS.find(d => d.value === datePosted)?.label : '', salaryMin ? `$${parseInt(salaryMin).toLocaleString()}+` : ''].filter(Boolean).join(', ')}`
                    : 'No filters applied'}
                </p>
              </div>
              {filtersOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
            {filtersOpen && (
              <div className="px-4 pb-4 space-y-4">
                {boardSources.size > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-2 block">Keywords</label>
                      <Input placeholder="e.g. Infrastructure Analyst, Cloud Engineer" value={boardKeywords} onChange={e => setBoardKeywords(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-2 block">Location</label>
                      <LocationCombobox value={boardLocation} onChange={setBoardLocation} />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Job Type</label>
                  <div className="flex flex-wrap gap-2">
                    {JOB_TYPES.map(type => (
                      <button key={type} onClick={() => toggleChip(type, selectedJobTypes, setSelectedJobTypes)}
                        className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${selectedJobTypes.includes(type) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border'}`}>{type}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Work Arrangement</label>
                  <div className="flex flex-wrap gap-2">
                    {WORK_ARRANGEMENTS.map(arr => (
                      <button key={arr} onClick={() => toggleChip(arr, selectedArrangements, setSelectedArrangements)}
                        className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${selectedArrangements.includes(arr) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border'}`}>{arr}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Date Posted</label>
                  <div className="flex flex-wrap gap-2">
                    {DATE_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setDatePosted(opt.value)}
                        className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${datePosted === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border'}`}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Minimum salary ($/year)</label>
                  <Input type="number" placeholder="e.g. 80000" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} className="h-9 text-sm" />
                </div>
                {(selectedJobTypes.length > 0 || selectedArrangements.length > 0 || datePosted !== 'any' || salaryMin || boardKeywords.trim() || boardLocation.trim()) && (
                  <Button variant="ghost" size="sm" onClick={() => { setBoardKeywords(''); setBoardLocation(''); setSelectedJobTypes([]); setSelectedArrangements([]); setDatePosted('any'); setSalaryMin('') }} className="text-xs">Clear all filters</Button>
                )}
              </div>
            )}
          </div>

          {/* ── Scan Button ──────────────────────────────── */}
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-xs text-muted-foreground">
              {`Costs ${creditCost} credits`}
              {hasBoardSearch && ' (3 board + 3 career pages)'}
            </p>
            <CreditConfirmButton
              credits={creditCost || 3}
              label="Scan"
              loadingLabel="Scanning..."
              disabled={(loading || boardLoading) || !canScan}
              onConfirm={async () => {
                setResult(null); setBoardResult(null)
                const promises: Promise<void>[] = []
                if (hasBoardSearch) promises.push(handleBoardSearch())
                if (hasCareerPages) promises.push(handleScan())
                await Promise.all(promises)
              }}
              icon={<Search className="size-4" />}
            />
          </div>
        </CardContent>
      </Card>

      {(error || boardError) && (
        <Card className="border-destructive">
          <CardContent className="pt-6"><p className="text-sm text-destructive">{error || boardError}</p></CardContent>
        </Card>
      )}

      {/* ── Scan Results ─────────────────────────────────── */}
      {(result || boardResult) && (() => {
        const stats = {
          found: (result?.stats?.found || 0) + (boardResult?.stats?.found || 0),
          skipped_title: (result?.stats?.skipped_title || 0) + (boardResult?.stats?.skipped_title || 0),
          skipped_dup: (result?.stats?.skipped_dup || 0) + (boardResult?.stats?.skipped_dup || 0),
          added: (result?.stats?.added || 0) + (boardResult?.stats?.added || 0),
        }
        const items = [...(result?.new_items || []), ...(boardResult?.new_items || [])]
        const sourceStats = boardResult?.stats?.source_stats || null
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Results</CardTitle>
              {stats.added > 0 && <a href="/pipeline"><Button size="sm"><List className="size-4" />Go to Pipeline</Button></a>}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Scraped', value: stats.found, color: '' },
                  { label: 'Matched roles', value: stats.found - (stats.skipped_title || 0), color: 'text-blue-600' },
                  { label: 'Duplicates', value: stats.skipped_dup, color: 'text-muted-foreground' },
                  { label: 'Added', value: stats.added, color: stats.added > 0 ? 'text-green-600 font-bold' : 'text-red-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-md border p-3 text-center">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              {sourceStats && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {sourceStats.indeed && <span>Indeed: {sourceStats.indeed.found}{sourceStats.indeed.error ? ' (error)' : ''}</span>}
                  {sourceStats.linkedin && <span>LinkedIn: {sourceStats.linkedin.found}{sourceStats.linkedin.error ? ' (error)' : ''}</span>}
                </div>
              )}
              {stats.skipped_title > 0 && <p className="text-xs text-muted-foreground">{stats.skipped_title} didn't match your target roles</p>}
              {items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Added to pipeline:</p>
                  {items.map((item: any, i: number) => (
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
        )
      })()}
    </div>
  )
}
