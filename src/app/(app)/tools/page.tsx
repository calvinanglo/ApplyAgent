'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, Share2, Search, BookOpen, Code2, BarChart3, Copy, Check, Plus, Trash2 } from 'lucide-react'

// ── LinkedIn Message Tool ──────────────────────────────────────────────────────
function LinkedInTool() {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [jdText, setJdText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!company || !role) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/linkedin-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, role, jd_text: jdText }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setResult(data.messages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleGenerate} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Company name" value={company} onChange={e => setCompany(e.target.value)} />
          <Input placeholder="Role / Job title" value={role} onChange={e => setRole(e.target.value)} />
        </div>
        <Textarea placeholder="Job description (optional but improves quality)" value={jdText} onChange={e => setJdText(e.target.value)} rows={4} className="font-mono text-sm" />
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">Costs 2 credits</p>
          <Button type="submit" disabled={loading || !company || !role}>
            {loading ? <><Loader2 className="size-4 animate-spin" />Generating...</> : <><Share2 className="size-4" />Generate Messages</>}
          </Button>
        </div>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result?.primary_target && (
        <div className="space-y-3">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Primary: {result.primary_target.role}</p>
                <p className="text-xs text-muted-foreground">{result.primary_target.why}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{result.primary_target.message?.length || 0} chars</Badge>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(result.primary_target.message, 'primary')}>
                  {copied === 'primary' ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>
            <p className="text-sm bg-muted rounded p-3">{result.primary_target.message}</p>
          </div>
          {result.alternative_targets?.map((alt: any, i: number) => (
            <div key={i} className="rounded-lg border p-4 space-y-2 opacity-80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Alt {i+1}: {alt.role}</p>
                  <p className="text-xs text-muted-foreground">{alt.why}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{alt.message?.length || 0} chars</Badge>
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(alt.message, `alt-${i}`)}>
                    {copied === `alt-${i}` ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-sm bg-muted rounded p-3">{alt.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Deep Research Tool ─────────────────────────────────────────────────────────
function DeepResearchTool() {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [jdText, setJdText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!company || !role) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/deep-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, role, jd_text: jdText }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setResult(data.research)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result?.research_prompt || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleGenerate} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Company name" value={company} onChange={e => setCompany(e.target.value)} />
          <Input placeholder="Role / Job title" value={role} onChange={e => setRole(e.target.value)} />
        </div>
        <Textarea placeholder="Job description (optional)" value={jdText} onChange={e => setJdText(e.target.value)} rows={4} className="font-mono text-sm" />
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">Costs 3 credits — generates a research prompt you run in Perplexity/ChatGPT</p>
          <Button type="submit" disabled={loading || !company || !role}>
            {loading ? <><Loader2 className="size-4 animate-spin" />Generating...</> : <><Search className="size-4" />Generate Research Prompt</>}
          </Button>
        </div>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <div className="space-y-4">
          {result.quick_questions?.length > 0 && (
            <div className="rounded-lg border p-4">
              <p className="text-sm font-semibold mb-2">Key Questions to Answer</p>
              <ul className="space-y-1">
                {result.quick_questions.map((q: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">• {q}</li>
                ))}
              </ul>
            </div>
          )}
          {result.candidate_angle && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Your Angle</p>
              <p className="text-sm">{result.candidate_angle}</p>
            </div>
          )}
          {result.research_prompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Research Prompt (copy to Perplexity/ChatGPT)</p>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <><Check className="size-4" />Copied</> : <><Copy className="size-4" />Copy</>}
                </Button>
              </div>
              <pre className="rounded-lg bg-muted p-4 text-xs whitespace-pre-wrap overflow-auto max-h-96">{result.research_prompt}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Project Evaluator Tool ─────────────────────────────────────────────────────
function ProjectEvalTool() {
  const [description, setDescription] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleEvaluate(e: React.FormEvent) {
    e.preventDefault()
    if (!description) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/evaluate/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_description: description, target_role: targetRole }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setResult(data.evaluation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const verdictColor = result?.verdict === 'BUILD' ? 'text-green-600' : result?.verdict === 'SKIP' ? 'text-red-600' : 'text-yellow-600'

  return (
    <div className="space-y-4">
      <form onSubmit={handleEvaluate} className="space-y-3">
        <Input placeholder="Target role (optional, e.g. Security Analyst)" value={targetRole} onChange={e => setTargetRole(e.target.value)} />
        <Textarea
          placeholder="Describe the portfolio project you're considering building or showcasing..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={6}
          className="font-mono text-sm"
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">Costs 2 credits</p>
          <Button type="submit" disabled={loading || !description}>
            {loading ? <><Loader2 className="size-4 animate-spin" />Evaluating...</> : <><Code2 className="size-4" />Evaluate Project</>}
          </Button>
        </div>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className={`text-2xl font-bold ${verdictColor}`}>{result.verdict}</p>
              <p className="text-xs text-muted-foreground">Verdict</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{result.weighted_score?.toFixed(1)}/5</p>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
            <p className="flex-1 text-sm text-muted-foreground">{result.verdict_detail}</p>
          </div>
          {result.scores && (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(result.scores).map(([key, val]: [string, any]) => (
                <div key={key} className="rounded-md border p-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                  <Badge variant={val.score >= 4 ? 'default' : val.score >= 3 ? 'secondary' : 'outline'}>{val.score}/5</Badge>
                </div>
              ))}
            </div>
          )}
          {result.week1_plan?.length > 0 && (
            <div className="rounded-md border p-3">
              <p className="text-sm font-semibold mb-2">Week 1 Plan</p>
              <ul className="space-y-1">
                {result.week1_plan.map((t: string, i: number) => <li key={i} className="text-sm">• {t}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Training Evaluator Tool ────────────────────────────────────────────────────
function TrainingEvalTool() {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleEvaluate(e: React.FormEvent) {
    e.preventDefault()
    if (!description) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/evaluate/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_description: description }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setResult(data.evaluation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const verdictColor = result?.verdict === 'DO IT' ? 'text-green-600' : result?.verdict === 'SKIP' ? 'text-red-600' : 'text-yellow-600'

  return (
    <div className="space-y-4">
      <form onSubmit={handleEvaluate} className="space-y-3">
        <Textarea
          placeholder="Describe the course or certification you're considering (name, provider, duration, content)..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={6}
          className="font-mono text-sm"
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">Costs 2 credits</p>
          <Button type="submit" disabled={loading || !description}>
            {loading ? <><Loader2 className="size-4 animate-spin" />Evaluating...</> : <><BookOpen className="size-4" />Evaluate Training</>}
          </Button>
        </div>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <p className={`text-xl font-bold ${verdictColor}`}>{result.verdict}{result.timebox_weeks ? ` (${result.timebox_weeks} weeks)` : ''}</p>
            <p className="flex-1 text-sm text-muted-foreground">{result.verdict_rationale}</p>
          </div>
          {result.scores && (
            <div className="space-y-2">
              {result.scores.north_star && (
                <div className="flex justify-between items-center rounded border p-2">
                  <span className="text-xs">North Star alignment</span>
                  <Badge>{result.scores.north_star.score}/5</Badge>
                </div>
              )}
              {result.scores.recruiter_signal && (
                <div className="flex justify-between items-center rounded border p-2">
                  <span className="text-xs">Recruiter signal</span>
                  <Badge>{result.scores.recruiter_signal.score}/5</Badge>
                </div>
              )}
            </div>
          )}
          {result.scores?.risks?.length > 0 && (
            <div className="rounded border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950">
              <p className="text-xs font-semibold mb-1">Risks</p>
              {result.scores.risks.map((r: string, i: number) => <p key={i} className="text-sm">• {r}</p>)}
            </div>
          )}
          {result.alternative && (
            <div className="rounded border p-3">
              <p className="text-xs font-semibold text-muted-foreground">Better alternative</p>
              <p className="text-sm">{result.alternative}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Compare Offers Tool ────────────────────────────────────────────────────────
function CompareOffersTool() {
  const [offers, setOffers] = useState([
    { company: '', role: '', jd_text: '' },
    { company: '', role: '', jd_text: '' },
  ])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  function addOffer() {
    setOffers([...offers, { company: '', role: '', jd_text: '' }])
  }

  function removeOffer(i: number) {
    if (offers.length <= 2) return
    setOffers(offers.filter((_, idx) => idx !== i))
  }

  function updateOffer(i: number, field: string, value: string) {
    const updated = [...offers]
    updated[i] = { ...updated[i], [field]: value }
    setOffers(updated)
  }

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault()
    const validOffers = offers.filter(o => o.company && o.role)
    if (validOffers.length < 2) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/compare-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offers: validOffers }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setResult(data.comparison)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const dimensionLabels: Record<string, string> = {
    north_star: 'North Star', cv_match: 'CV Match', level: 'Level', comp: 'Comp',
    growth: 'Growth', remote: 'Remote', company_rep: 'Company', tech_stack: 'Tech Stack',
    speed: 'Speed', culture: 'Culture',
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCompare} className="space-y-4">
        {offers.map((offer, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Offer {i + 1}</p>
              {offers.length > 2 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeOffer(i)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Company" value={offer.company} onChange={e => updateOffer(i, 'company', e.target.value)} />
              <Input placeholder="Role" value={offer.role} onChange={e => updateOffer(i, 'role', e.target.value)} />
            </div>
            <Textarea placeholder="Job description (optional)" value={offer.jd_text} onChange={e => updateOffer(i, 'jd_text', e.target.value)} rows={3} className="font-mono text-sm" />
          </div>
        ))}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={addOffer}>
            <Plus className="size-4 mr-1" />Add Offer
          </Button>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">Costs 5 credits</p>
            <Button type="submit" disabled={loading || offers.filter(o => o.company && o.role).length < 2}>
              {loading ? <><Loader2 className="size-4 animate-spin" />Comparing...</> : <><BarChart3 className="size-4" />Compare Offers</>}
            </Button>
          </div>
        </div>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result?.offers && (
        <div className="space-y-4">
          {result.recommendation && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Recommendation</p>
              <p className="text-sm">{result.recommendation}</p>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 text-xs text-muted-foreground">Dimension</th>
                  {result.offers.map((offer: any, i: number) => (
                    <th key={i} className="text-center p-2 text-xs">{offer.company}<br/><span className="text-muted-foreground font-normal">{offer.role}</span></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(dimensionLabels).map(dim => (
                  <tr key={dim} className="border-t">
                    <td className="p-2 text-xs text-muted-foreground">{dimensionLabels[dim]}</td>
                    {result.offers.map((offer: any, i: number) => {
                      const score = offer.scores?.[dim]?.score
                      return (
                        <td key={i} className="text-center p-2">
                          <Badge variant={score >= 4 ? 'default' : score >= 3 ? 'secondary' : 'outline'} className="text-xs">{score ?? '-'}</Badge>
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr className="border-t font-semibold">
                  <td className="p-2 text-xs">Total</td>
                  {result.offers.map((offer: any, i: number) => (
                    <td key={i} className="text-center p-2">
                      <span className="font-bold">{offer.weighted_score?.toFixed(2)}</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tools</h1>
        <p className="text-muted-foreground">LinkedIn outreach, deep research, project &amp; training evaluators, offer comparison</p>
      </div>

      <Tabs defaultValue="linkedin">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="linkedin"><Share2 className="size-3.5 mr-1.5" />LinkedIn</TabsTrigger>
          <TabsTrigger value="deep"><Search className="size-3.5 mr-1.5" />Deep Research</TabsTrigger>
          <TabsTrigger value="project"><Code2 className="size-3.5 mr-1.5" />Project Eval</TabsTrigger>
          <TabsTrigger value="training"><BookOpen className="size-3.5 mr-1.5" />Training Eval</TabsTrigger>
          <TabsTrigger value="compare"><BarChart3 className="size-3.5 mr-1.5" />Compare Offers</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="linkedin"><Card><CardHeader><CardTitle>LinkedIn Message</CardTitle><CardDescription>Generate a 300-char connection request that gets responses</CardDescription></CardHeader><CardContent><LinkedInTool /></CardContent></Card></TabsContent>
          <TabsContent value="deep"><Card><CardHeader><CardTitle>Deep Research</CardTitle><CardDescription>Generate a structured research prompt for Perplexity or ChatGPT</CardDescription></CardHeader><CardContent><DeepResearchTool /></CardContent></Card></TabsContent>
          <TabsContent value="project"><Card><CardHeader><CardTitle>Project Evaluator</CardTitle><CardDescription>Should you build or showcase this portfolio project?</CardDescription></CardHeader><CardContent><ProjectEvalTool /></CardContent></Card></TabsContent>
          <TabsContent value="training"><Card><CardHeader><CardTitle>Training Evaluator</CardTitle><CardDescription>Is this course or certification worth your time?</CardDescription></CardHeader><CardContent><TrainingEvalTool /></CardContent></Card></TabsContent>
          <TabsContent value="compare"><Card><CardHeader><CardTitle>Compare Offers</CardTitle><CardDescription>10-dimension weighted scoring matrix across multiple offers</CardDescription></CardHeader><CardContent><CompareOffersTool /></CardContent></Card></TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
