'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ─── Block A: Role Summary ───────────────────────────────────────────────────
function BlockA({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted p-4">
        <p className="text-sm font-medium text-muted-foreground">TL;DR</p>
        <p className="mt-1 text-base">{String(data.tldr ?? '')}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Archetype', key: 'archetype' },
          { label: 'Domain', key: 'domain' },
          { label: 'Function', key: 'function' },
          { label: 'Seniority', key: 'seniority' },
          { label: 'Remote', key: 'remote' },
          { label: 'Team Size', key: 'team_size' },
        ].map(({ label, key }) =>
          data[key] ? (
            <div key={key} className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-sm font-medium">{String(data[key])}</p>
            </div>
          ) : null
        )}
      </div>
    </div>
  )
}

// ─── Block B: CV Match ───────────────────────────────────────────────────────
function StrengthBadge({ strength }: { strength: string }) {
  const map: Record<string, { label: string; className: string }> = {
    strong: { label: 'Strong', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    partial: { label: 'Partial', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    gap: { label: 'Gap', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  }
  const s = map[strength?.toLowerCase()] ?? map.gap
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>
}

function BlockB({ data }: { data: Record<string, unknown> }) {
  const requirements = (data.requirements as Array<Record<string, string>>) ?? []
  const gaps = (data.gaps as Array<Record<string, string>>) ?? []
  return (
    <div className="space-y-6">
      {requirements.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold">Requirements Match</h4>
          <div className="space-y-2">
            {requirements.map((r, i) => (
              <div key={i} className="flex items-start gap-3 rounded-md border p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.requirement}</p>
                  {r.cv_match && <p className="mt-1 text-xs text-muted-foreground">{r.cv_match}</p>}
                </div>
                <StrengthBadge strength={r.strength} />
              </div>
            ))}
          </div>
        </div>
      )}
      {gaps.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold">Gaps</h4>
          <div className="space-y-2">
            {gaps.map((g, i) => (
              <div key={i} className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{g.gap}</p>
                  {g.severity && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${g.severity === 'blocker' ? 'bg-red-200 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                      {g.severity === 'blocker' ? 'Blocker' : 'Nice to have'}
                    </span>
                  )}
                </div>
                {g.mitigation && <p className="mt-1 text-xs text-muted-foreground">{g.mitigation}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Block C: Level & Strategy ───────────────────────────────────────────────
function BlockC({ data }: { data: Record<string, unknown> }) {
  const fields = [
    { label: 'JD Level', key: 'jd_level' },
    { label: 'Your Level', key: 'candidate_level' },
    { label: 'Sell Senior Strategy', key: 'sell_senior_plan' },
    { label: 'Down-level Strategy', key: 'downlevel_plan' },
  ]
  return (
    <div className="space-y-3">
      {fields.map(({ label, key }) =>
        data[key] ? (
          <div key={key} className="rounded-md border p-3">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm">{String(data[key])}</p>
          </div>
        ) : null
      )}
    </div>
  )
}

// ─── Block D: Comp & Demand ──────────────────────────────────────────────────
function BlockD({ data }: { data: Record<string, unknown> }) {
  const sources = (data.sources as string[]) ?? []
  return (
    <div className="space-y-3">
      {!!data.salary_range && (
        <div className="rounded-lg bg-primary/10 p-4 text-center">
          <p className="text-xs text-muted-foreground">Salary Range</p>
          <p className="mt-1 text-xl font-bold">{String(data.salary_range)}</p>
        </div>
      )}
      {[
        { label: 'Company Reputation', key: 'company_reputation' },
        { label: 'Demand Trend', key: 'demand_trend' },
      ].map(({ label, key }) =>
        data[key] ? (
          <div key={key} className="rounded-md border p-3">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm">{String(data[key])}</p>
          </div>
        ) : null
      )}
      {sources.length > 0 && (
        <div className="rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground">Sources</p>
          <ul className="mt-1 space-y-0.5">
            {sources.map((s, i) => <li key={i} className="text-sm">• {s}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Block E: Customization Plan ─────────────────────────────────────────────
function ChangeList({ title, changes }: { title: string; changes: Array<Record<string, string>> }) {
  if (!changes?.length) return null
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold">{title}</h4>
      <div className="space-y-3">
        {changes.map((c, i) => (
          <div key={i} className="rounded-md border p-3 space-y-2">
            {c.section && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.section}</p>}
            {c.current && (
              <div>
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="text-sm line-through opacity-60">{c.current}</p>
              </div>
            )}
            {c.proposed && (
              <div>
                <p className="text-xs text-muted-foreground">Proposed</p>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">{c.proposed}</p>
              </div>
            )}
            {c.why && <p className="text-xs text-muted-foreground italic">{c.why}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

function BlockE({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-6">
      <ChangeList title="CV Changes" changes={data.cv_changes as Array<Record<string, string>>} />
      <ChangeList title="LinkedIn Changes" changes={data.linkedin_changes as Array<Record<string, string>>} />
    </div>
  )
}

// ─── Block F: Interview Plan ──────────────────────────────────────────────────
function BlockF({ data }: { data: Record<string, unknown> }) {
  const stories = (data.stories as Array<Record<string, string>>) ?? []
  const caseStudy = data.case_study as Record<string, string> | undefined
  const redFlags = (data.red_flag_questions as Array<Record<string, string>>) ?? []

  return (
    <div className="space-y-6">
      {stories.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold">STAR Stories</h4>
          <div className="space-y-4">
            {stories.map((s, i) => (
              <Card key={i}>
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm">{s.title ?? s.requirement}</CardTitle>
                  {s.requirement && s.title && <p className="text-xs text-muted-foreground">For: {s.requirement}</p>}
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  {[
                    { label: 'Situation', key: 'situation' },
                    { label: 'Task', key: 'task' },
                    { label: 'Action', key: 'action' },
                    { label: 'Result', key: 'result' },
                    { label: 'Reflection', key: 'reflection' },
                  ].map(({ label, key }) =>
                    s[key] ? (
                      <div key={key}>
                        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                        <p className="text-sm">{s[key]}</p>
                      </div>
                    ) : null
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {caseStudy && (
        <div>
          <h4 className="mb-3 text-sm font-semibold">Case Study</h4>
          <div className="rounded-md border p-3 space-y-2">
            {caseStudy.project && <p className="text-sm font-medium">{caseStudy.project}</p>}
            {caseStudy.how_to_present && <p className="text-sm text-muted-foreground">{caseStudy.how_to_present}</p>}
          </div>
        </div>
      )}
      {redFlags.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold">Red Flag Q&amp;A</h4>
          <div className="space-y-3">
            {redFlags.map((r, i) => (
              <div key={i} className="rounded-md border p-3 space-y-1">
                <p className="text-sm font-medium">Q: {r.question}</p>
                <p className="text-sm text-muted-foreground">A: {r.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Block G: Draft Application Answers ──────────────────────────────────────
function BlockG({ data }: { data: Record<string, unknown> }) {
  const fields = [
    { label: 'Cover Letter Hook', key: 'cover_letter_hook' },
    { label: 'Why This Role', key: 'why_this_role' },
    { label: 'Biggest Strength', key: 'biggest_strength' },
    { label: 'Salary Answer', key: 'salary_answer' },
    { label: 'Work Authorization', key: 'work_authorization' },
    { label: 'Location / Availability', key: 'location_availability' },
    { label: 'Additional Notes', key: 'additional_notes' },
  ]
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-900 p-3">
        <p className="text-xs font-semibold text-green-700 dark:text-green-400">Score &ge; 4.5 &mdash; Draft answers are ready to copy-paste</p>
      </div>
      {fields.map(({ label, key }) =>
        data[key] ? (
          <div key={key} className="rounded-md border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
            <p className="text-sm">{String(data[key])}</p>
          </div>
        ) : null
      )}
    </div>
  )
}

// ─── Main renderer ────────────────────────────────────────────────────────────
export function BlockRenderer({ blockKey, content }: { blockKey: string; content: unknown }) {
  const data = (typeof content === 'object' && content !== null ? content : {}) as Record<string, unknown>

  switch (blockKey) {
    case 'block_a': return <BlockA data={data} />
    case 'block_b': return <BlockB data={data} />
    case 'block_c': return <BlockC data={data} />
    case 'block_d': return <BlockD data={data} />
    case 'block_e': return <BlockE data={data} />
    case 'block_f': return <BlockF data={data} />
    case 'block_g': return <BlockG data={data} />
    default:
      return <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(content, null, 2)}</pre>
  }
}
