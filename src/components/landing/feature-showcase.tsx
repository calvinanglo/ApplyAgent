'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/lib/button-variants'
import {
  Search, FileText, Zap, Briefcase, Wrench, Star, Check,
  ArrowRight, MessageSquare, BookOpen, Layers, TrendingUp, BarChart3,
} from 'lucide-react'

const tabs = [
  { id: 'evaluate', label: 'Evaluate', icon: Search },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'scanner', label: 'Scanner', icon: Zap },
  { id: 'track', label: 'Track', icon: Briefcase },
  { id: 'tools', label: 'Tools', icon: Wrench },
] as const

export function FeatureShowcase() {
  const [active, setActive] = useState<string>('evaluate')

  return (
    <section id="features" className="bg-muted/30 py-20">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center">
          <Badge variant="outline" className="mb-4">Features</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            One platform, every step covered
          </h2>
        </div>

        {/* Tab triggers */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                active === t.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background text-muted-foreground hover:text-foreground border'
              }`}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-10 min-h-[420px]">
          {active === 'evaluate' && <EvaluateTab />}
          {active === 'documents' && <DocumentsTab />}
          {active === 'scanner' && <ScannerTab />}
          {active === 'track' && <TrackTab />}
          {active === 'tools' && <ToolsTab />}
        </div>
      </div>
    </section>
  )
}

function TabLayout({ children, title, description, bullets, badge, mockUi }: {
  children?: React.ReactNode
  title: string
  description: string
  bullets: string[]
  badge: string
  mockUi: React.ReactNode
}) {
  return (
    <div className="grid items-start gap-10 md:grid-cols-2">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-2xl font-bold">{title}</h3>
          <Badge variant="secondary">{badge}</Badge>
        </div>
        <p className="text-muted-foreground">{description}</p>
        <ul className="mt-5 space-y-2.5">
          {bullets.map(b => (
            <li key={b} className="flex items-start gap-2.5 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              {b}
            </li>
          ))}
        </ul>
        <Link href="/signup" className={buttonVariants({ className: 'mt-6' })}>
          Try it free <ArrowRight className="ml-2 size-4" />
        </Link>
        {children}
      </div>
      <div className="rounded-xl border bg-card p-5 shadow-sm">{mockUi}</div>
    </div>
  )
}

/* ── Tab panels ──────────────────────────────── */

function EvaluateTab() {
  return (
    <TabLayout
      title="AI Job Evaluation"
      badge="10 credits"
      description="Paste any job description and get a comprehensive match report scored across 6 dimensions."
      bullets={[
        'Role fit analysis against your CV',
        'Gap identification with improvement tips',
        'Market salary data and demand signals',
        'Auto-generated STAR+R interview stories',
        'One-click resume and cover letter generation',
      ]}
      mockUi={
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold">Senior Cloud Engineer</p>
              <p className="text-xs text-muted-foreground">Shopify — Remote, Canada</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex">{[1,2,3,4].map(s=><Star key={s} className="size-3.5 fill-primary text-primary"/>)}<Star className="size-3.5 fill-primary/30 text-primary/30"/></div>
              <span className="text-sm font-bold">4.3/5</span>
            </div>
          </div>
          {[
            { label: 'Role Summary', grade: 'A', c: 'text-green-500' },
            { label: 'CV Match', grade: 'B+', c: 'text-green-500' },
            { label: 'Interview Prep', grade: 'A-', c: 'text-green-500' },
            { label: 'Salary Data', grade: 'B', c: 'text-yellow-500' },
            { label: 'Customization', grade: 'A', c: 'text-green-500' },
            { label: 'STAR Stories', grade: '4 stories', c: 'text-primary' },
          ].map(b => (
            <div key={b.label} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span>{b.label}</span>
              <span className={`font-bold ${b.c}`}>{b.grade}</span>
            </div>
          ))}
        </div>
      }
    />
  )
}

function DocumentsTab() {
  return (
    <TabLayout
      title="Resume & Cover Letter"
      badge="3-35 credits"
      description="Generate ATS-optimized resumes and tailored cover letters. Choose your AI model: Fast, Balanced (best value), or Premium."
      bullets={[
        'Keyword injection from job description',
        'Auto font-sizing for perfect 1-page fit',
        '3 AI tiers: Fast (3 cr), Balanced (8 cr), Premium (35 cr)',
        'Cover letters that reference specific JD requirements',
        'Simultaneous resume + cover letter generation',
      ]}
      mockUi={
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-primary">
              <FileText className="size-3.5" /> Resume
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-3/4 rounded bg-foreground/15" />
              <div className="h-1.5 w-full rounded bg-muted-foreground/10" />
              <div className="h-1.5 w-5/6 rounded bg-muted-foreground/10" />
              <div className="mt-3 h-2 w-1/2 rounded bg-foreground/10" />
              <div className="h-1.5 w-full rounded bg-muted-foreground/10" />
              <div className="h-1.5 w-4/5 rounded bg-muted-foreground/10" />
              <div className="h-1.5 w-full rounded bg-muted-foreground/10" />
              <div className="mt-3 h-2 w-2/3 rounded bg-foreground/10" />
              <div className="h-1.5 w-full rounded bg-muted-foreground/10" />
              <div className="h-1.5 w-3/4 rounded bg-muted-foreground/10" />
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-primary">
              <FileText className="size-3.5" /> Cover Letter
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 w-1/3 rounded bg-muted-foreground/10" />
              <div className="h-1.5 w-1/4 rounded bg-muted-foreground/10" />
              <div className="mt-3 h-1.5 w-full rounded bg-muted-foreground/10" />
              <div className="h-1.5 w-full rounded bg-muted-foreground/10" />
              <div className="h-1.5 w-4/5 rounded bg-muted-foreground/10" />
              <div className="mt-2 h-1.5 w-full rounded bg-muted-foreground/10" />
              <div className="h-1.5 w-full rounded bg-muted-foreground/10" />
              <div className="h-1.5 w-3/5 rounded bg-muted-foreground/10" />
              <div className="mt-2 h-1.5 w-full rounded bg-muted-foreground/10" />
              <div className="h-1.5 w-2/3 rounded bg-muted-foreground/10" />
            </div>
          </div>
        </div>
      }
    />
  )
}

function ScannerTab() {
  return (
    <TabLayout
      title="Job Scanner"
      badge="3 credits"
      description="Scan company career pages and major job boards simultaneously. Unified filters with role autocomplete and multi-currency salary matching."
      bullets={[
        'Direct ATS integration: Greenhouse, Lever, Ashby, SmartRecruiters, Workday',
        'Major job boards: LinkedIn, Talent.com, CareerJet, Jooble',
        'Smart role autocomplete',
        'Salary filters with currency selector (CAD, USD, EUR, and more)',
        'Unified filters — companies, salary, work type, all in one panel',
      ]}
      mockUi={
        <div className="space-y-2.5">
          {[
            { title: 'Senior Backend Engineer', company: 'Stripe — via Greenhouse', score: '4.8', color: 'green' },
            { title: 'Platform Engineer', company: 'Datadog — via Lever', score: '4.5', color: 'green' },
            { title: 'Infrastructure Analyst', company: 'Coinbase — via LinkedIn', score: '4.2', color: 'green' },
            { title: 'DevOps Engineer', company: 'Cloudflare — via Talent.com', score: '3.9', color: 'yellow' },
          ].map(j => (
            <div key={j.title} className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
              <div className={`size-2 rounded-full ${j.color === 'green' ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{j.title}</p>
                <p className="text-xs text-muted-foreground">{j.company}</p>
              </div>
              <Badge className={`${j.color === 'green' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'} shrink-0`}>
                {j.score}/5
              </Badge>
            </div>
          ))}
          <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
            <Zap className="mx-auto mb-1 size-4 text-primary" />
            4 new jobs found across 3 sources
          </div>
        </div>
      }
    />
  )
}

function TrackTab() {
  return (
    <TabLayout
      title="Track & Prepare"
      badge="Free"
      description="Track every application from evaluation to offer. Multi-select management and STAR stories auto-generated for interview prep."
      bullets={[
        'Full application lifecycle tracking',
        'Multi-select checkboxes for bulk actions',
        'Status pipeline: pending, applied, interviewing, offer',
        'STAR+R interview stories mapped to JD requirements',
        'Generated documents attached to each application',
      ]}
      mockUi={
        <div className="space-y-2.5">
          {[
            { title: 'Senior Cloud Engineer', company: 'Shopify', status: 'Interviewing', statusColor: 'bg-blue-500/10 text-blue-600' },
            { title: 'Platform Engineer', company: 'Datadog', status: 'Applied', statusColor: 'bg-primary/10 text-primary' },
            { title: 'Backend Developer', company: 'Stripe', status: 'Offer', statusColor: 'bg-green-500/10 text-green-600' },
            { title: 'DevOps Engineer', company: 'GitLab', status: 'Evaluated', statusColor: 'bg-yellow-500/10 text-yellow-600' },
          ].map(a => (
            <div key={a.title} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.company}</p>
              </div>
              <Badge variant="outline" className={a.statusColor}>{a.status}</Badge>
            </div>
          ))}
        </div>
      }
    />
  )
}

function ToolsTab() {
  const tools = [
    { icon: MessageSquare, title: 'LinkedIn Outreach', desc: 'Personalized 300-char connection messages.', cost: '2 cr' },
    { icon: BookOpen, title: 'Deep Research', desc: 'Structured company research prompts.', cost: '3 cr' },
    { icon: Layers, title: 'Project Evaluator', desc: 'BUILD / SKIP verdict for portfolio projects.', cost: '2 cr' },
    { icon: TrendingUp, title: 'Training Evaluator', desc: 'DO IT / SKIP verdict with ROI analysis.', cost: '2 cr' },
    { icon: BarChart3, title: 'Compare Offers', desc: 'Side-by-side offer comparison across 10 factors.', cost: '5 cr' },
  ]
  return (
    <TabLayout
      title="Career Tools"
      badge="5 tools"
      description="Beyond evaluations and documents — tools for networking, research, and decision-making."
      bullets={[
        'LinkedIn outreach with best-contact identification',
        'Company research prompts for interview prep',
        'Portfolio project and certification ROI evaluators',
        'Multi-offer comparison with weighted scoring',
      ]}
      mockUi={
        <div className="space-y-2">
          {tools.map(t => (
            <div key={t.title} className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
              <div className="rounded-md bg-primary/10 p-1.5">
                <t.icon className="size-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground truncate">{t.desc}</p>
              </div>
              <span className="text-xs font-medium text-muted-foreground shrink-0">{t.cost}</span>
            </div>
          ))}
        </div>
      }
    />
  )
}
