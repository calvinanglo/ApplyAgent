import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CREDIT_PACKS, CREDIT_COSTS, getActionLabel, type CreditAction } from '@/lib/credits'
import {
  Search,
  FileText,
  Mail,
  Briefcase,
  Zap,
  Shield,
  CheckCircle2,
} from 'lucide-react'

const features = [
  {
    icon: Search,
    title: 'AI Job Evaluation',
    description: 'Paste any job description and get a complete A-F evaluation: role match, CV gaps, interview prep, and salary data.',
  },
  {
    icon: FileText,
    title: 'ATS-Optimized Resume',
    description: 'Auto-generate tailored resumes with keyword injection, auto font-sizing, and 1-page Garamond PDFs.',
  },
  {
    icon: Mail,
    title: 'Cover Letters That Sound Human',
    description: 'AI-powered cover letters with strict anti-detection rules. No "I am writing to express my interest" here.',
  },
  {
    icon: Briefcase,
    title: 'Application Tracker',
    description: 'Track every application from evaluation to offer. Scores, status, PDFs, and cover letters in one place.',
  },
  {
    icon: Zap,
    title: 'Portal Scanner',
    description: 'Scan job boards automatically. Filter by title, seniority, and location. Batch-evaluate new postings.',
  },
  {
    icon: Shield,
    title: 'Interview Prep',
    description: 'STAR+R stories mapped to JD requirements. Red-flag questions with prepared answers. Case study recommendations.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FileText className="size-5" />
            <span className="text-lg font-bold">CareerOps</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-4">3 free evaluations to start</Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Your AI-powered job search command center
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Evaluate job postings, generate tailored resumes and cover letters,
          scan portals, and track applications. All powered by Claude AI.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg">Start for Free</Button>
          </Link>
          <Link href="#pricing">
            <Button variant="outline" size="lg">View Pricing</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">Everything you need to land your next role</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="mb-2 size-8 text-primary" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="mb-2 text-center text-2xl font-bold">Simple credit-based pricing</h2>
        <p className="mb-8 text-center text-muted-foreground">
          Start free. Buy credits when you need more.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <Card key={pack.id} className={pack.id === 'professional' ? 'border-primary' : ''}>
              {pack.id === 'professional' && (
                <Badge className="absolute -top-2.5 left-4">Most Popular</Badge>
              )}
              <CardHeader>
                <CardTitle>{pack.name}</CardTitle>
                <CardDescription>{pack.credits} credits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 text-3xl font-bold">{pack.priceDisplay}</div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-primary" />
                    {Math.floor(pack.credits / CREDIT_COSTS.evaluation)} evaluations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-primary" />
                    {Math.floor(pack.credits / CREDIT_COSTS.pdf)} resume PDFs
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-primary" />
                    {Math.floor(pack.credits / CREDIT_COSTS.cover_letter)} cover letters
                  </li>
                </ul>
                <Link href="/signup" className="mt-4 block">
                  <Button className="w-full" variant={pack.id === 'professional' ? 'default' : 'outline'}>
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Credit costs per action</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                {(Object.keys(CREDIT_COSTS) as CreditAction[]).map((action) => (
                  <div key={action} className="flex items-center justify-between rounded border px-2 py-1.5">
                    <span className="text-muted-foreground">{getActionLabel(action)}</span>
                    <span className="font-mono font-bold">{CREDIT_COSTS[action]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>CareerOps. Built with Next.js, Supabase, and Claude AI.</p>
      </footer>
    </div>
  )
}
