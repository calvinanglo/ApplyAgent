import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/lib/button-variants'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PricingSection } from '@/components/pricing-section'
import { MobileNav } from '@/components/mobile-nav'
import {
  Search,
  FileText,
  Mail,
  Briefcase,
  Zap,
  Shield,
  CheckCircle2,
  ArrowRight,
  Star,
  Clock,
  Target,
  TrendingUp,
  Users,
  Globe,
  Sparkles,
  BarChart3,
  MessageSquare,
  BookOpen,
  Layers,
  ChevronRight,
  Check,
  Play,
} from 'lucide-react'

const features = [
  {
    icon: Search,
    title: 'AI Job Evaluation',
    description: 'Paste any job description and get a full match report — role fit, CV gap analysis, interview prep, and salary data.',
    badge: '10 credits',
    highlight: 'Know your odds before you apply',
  },
  {
    icon: FileText,
    title: 'ATS-Optimized Resume',
    description: 'Auto-generate tailored resumes with keyword injection, auto font-sizing, and perfectly formatted 1-page Garamond PDFs.',
    badge: '3 credits',
    highlight: 'Beat the ATS every time',
  },
  {
    icon: Mail,
    title: 'Tailored Cover Letters',
    description: 'AI-powered cover letters that reference specific JD requirements with your real experience. Professional, natural, ready to send.',
    badge: '5 credits',
    highlight: 'No more generic templates',
  },
  {
    icon: Zap,
    title: 'Portal Scanner',
    description: 'Scan 60+ company job boards automatically across Greenhouse, Lever, Ashby, and Workday. Filter by role, location, and type.',
    badge: '8 credits',
    highlight: 'Jobs come to you',
  },
  {
    icon: Briefcase,
    title: 'Application Tracker',
    description: 'Track every application from evaluation to offer. Scores, status updates, generated documents — all in one dashboard.',
    badge: 'Free',
    highlight: 'Never lose track again',
  },
  {
    icon: Shield,
    title: 'Interview Story Bank',
    description: 'STAR+R stories auto-generated from your evaluations, mapped to JD requirements. Walk into interviews prepared.',
    badge: 'Auto',
    highlight: 'Always interview-ready',
  },
]

const toolSuite = [
  {
    icon: MessageSquare,
    title: 'LinkedIn Outreach',
    description: 'Generate personalized 300-char connection messages. Identifies the best contact at each company.',
    cost: '2 credits',
  },
  {
    icon: BookOpen,
    title: 'Deep Research',
    description: 'Structured research prompts for Perplexity or Claude. Company intel before every interview.',
    cost: '3 credits',
  },
  {
    icon: Layers,
    title: 'Project Evaluator',
    description: 'Should you build that portfolio project? Get a BUILD / SKIP / MAYBE verdict with scoring.',
    cost: '2 credits',
  },
  {
    icon: TrendingUp,
    title: 'Training Evaluator',
    description: 'Is that certification worth it? Get a DO IT / SKIP / MAYBE verdict with ROI analysis.',
    cost: '2 credits',
  },
  {
    icon: BarChart3,
    title: 'Compare Offers',
    description: 'Multi-dimensional side-by-side offer comparison across 10 weighted factors.',
    cost: '5 credits',
  },
]

const steps = [
  {
    num: '01',
    title: 'Upload Your CV',
    description: 'One-time setup. Upload your resume and set your target roles, salary, and preferences.',
    time: '2 min',
  },
  {
    num: '02',
    title: 'Evaluate Jobs',
    description: 'Paste a job description or scan company portals. Get instant match scores with gap analysis.',
    time: '30 sec',
  },
  {
    num: '03',
    title: 'Generate Documents',
    description: 'One click generates an ATS-optimized resume and tailored cover letter for each job.',
    time: '15 sec',
  },
  {
    num: '04',
    title: 'Apply & Track',
    description: 'Download your documents, apply, and track every application status in one dashboard.',
    time: 'Ongoing',
  },
]

const stats = [
  { value: '60+', label: 'Company portals scanned' },
  { value: '100+', label: 'Countries supported' },
  { value: '5', label: 'ATS platforms covered' },
  { value: '10', label: 'Evaluation dimensions' },
]

const companies = [
  'Airbnb', 'Stripe', 'GitLab', 'Datadog', 'Discord', 'Figma',
  'Coinbase', 'Cloudflare', 'Reddit', 'Twitch', 'OpenAI', 'Vercel',
  'Shopify', 'Netflix', 'Spotify', 'HubSpot', 'Palantir', 'Notion',
  'DoorDash', 'Instacart', 'Plaid', 'Supabase', 'Linear', 'Ramp',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image src="/icon.svg" alt="" width={28} height={28} />
            <span className="text-lg font-bold">ApplyAgent</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#tools" className="text-muted-foreground hover:text-foreground transition-colors">Tools</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'hidden sm:inline-flex' })}>Sign in</Link>
            <Link href="/signup" className={buttonVariants({ size: 'sm', className: 'text-xs sm:text-sm' })}>Get Started</Link>
            <MobileNav />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-20 text-center sm:pt-28 sm:pb-24">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
            <Sparkles className="mr-1.5 size-3.5" />
            Powered by Claude AI
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Stop guessing.
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Start landing interviews.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            ApplyAgent evaluates every job against your CV, generates tailored resumes and cover letters,
            scans 60+ company portals, and tracks your entire search — all in one command center.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup" className={buttonVariants({ size: 'lg', className: 'px-8 text-base font-semibold' })}>
              Start for Free
              <ArrowRight className="ml-2 size-4" />
            </Link>
            <a href="#how-it-works" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'px-8 text-base' })}>
              <Play className="mr-2 size-4" />
              See How It Works
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Set up in 2 minutes. Start applying today.
          </p>
        </div>
      </section>

      {/* Social proof ticker — companies scanned */}
      <section className="border-y bg-muted/30 py-6">
        <div className="mx-auto max-w-6xl px-4">
          <p className="mb-4 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Scans job boards from leading companies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {companies.map((c) => (
              <span key={c} className="text-sm font-medium text-muted-foreground/70">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-extrabold text-primary sm:text-4xl">{stat.value}</div>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why most applications fail */}
      <section className="bg-muted/20 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center">
            <Badge variant="outline" className="mb-4">The Problem</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              75% of resumes are rejected before a human ever reads them
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Companies use Applicant Tracking Systems (ATS) to automatically filter candidates.
              If your resume doesn't match, you're invisible.
            </p>
          </div>

          <div className="mt-14 grid gap-0 md:grid-cols-4">
            {[
              {
                step: '1',
                title: 'You Apply',
                desc: 'Your resume enters the company\'s ATS — Greenhouse, Lever, Workday, or similar.',
                color: 'text-blue-500',
                bg: 'bg-blue-500/10',
              },
              {
                step: '2',
                title: 'ATS Scans & Scores',
                desc: 'Software parses your resume for keywords, skills, and experience that match the job description.',
                color: 'text-yellow-500',
                bg: 'bg-yellow-500/10',
              },
              {
                step: '3',
                title: 'Most Get Filtered Out',
                desc: 'Resumes that don\'t score high enough are automatically rejected. No human ever sees them.',
                color: 'text-red-500',
                bg: 'bg-red-500/10',
              },
              {
                step: '4',
                title: 'Top Matches Get Interviews',
                desc: 'Only the highest-scoring resumes surface to the recruiter, who decides who to interview.',
                color: 'text-green-500',
                bg: 'bg-green-500/10',
              },
            ].map((item, i) => (
              <div key={item.step} className="relative flex flex-col items-center text-center px-4 py-6">
                {i < 3 && (
                  <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight className="size-5 text-muted-foreground/40" />
                  </div>
                )}
                <div className={`flex size-12 items-center justify-center rounded-full ${item.bg} mb-4`}>
                  <span className={`text-lg font-bold ${item.color}`}>{item.step}</span>
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-xl border bg-background p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">ApplyAgent fixes every step</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" />
                    <span><strong className="text-foreground">Evaluate first</strong> — know your match score before you waste time applying to jobs you won't get</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" />
                    <span><strong className="text-foreground">Beat the ATS</strong> — keyword-optimized resumes that score high in automated screening</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" />
                    <span><strong className="text-foreground">Impress the human</strong> — tailored cover letters that connect your experience to their exact requirements</span>
                  </li>
                </ul>
              </div>
              <div className="shrink-0 text-center md:text-left">
                <Link href="/signup" className={buttonVariants({ size: 'lg', className: 'px-8 w-full sm:w-auto' })}>
                  Start Beating the ATS
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="mx-auto max-w-5xl px-4 py-20">
        <div className="text-center">
          <Badge variant="outline" className="mb-4">How It Works</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            From job posting to application in under 5 minutes
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Four simple steps. Upload once, then evaluate and apply to unlimited jobs.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.num} className="relative">
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-8 hidden w-6 translate-x-1/2 md:block">
                  <ChevronRight className="size-5 text-muted-foreground/40" />
                </div>
              )}
              <div className="rounded-xl border bg-card p-6 transition-colors hover:border-primary/50">
                <div className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Step {step.num}</div>
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Clock className="size-3.5" />
                  {step.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <Badge variant="outline" className="mb-4">Core Features</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to land your next role
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Six powerful tools working together as one integrated job search platform.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="group relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <feature.icon className="size-5 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">{feature.badge}</Badge>
                  </div>
                  <CardTitle className="mt-4 text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                  <p className="mt-3 text-xs font-semibold text-primary flex items-center gap-1">
                    <Target className="size-3" />
                    {feature.highlight}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline & Scanner deep dive */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="text-center md:text-left">
              <Badge variant="outline" className="mb-4">Automation</Badge>
              <h2 className="text-3xl font-bold tracking-tight">
                Let jobs come to you
              </h2>
              <p className="mt-4 text-muted-foreground">
                The Portal Scanner monitors 60+ company career pages across Greenhouse, Lever, Ashby, Workday, and SmartRecruiters.
                New matches flow into your Pipeline for batch evaluation.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Auto-scan job boards from companies you follow',
                  'Filter by role, location, work type, and date posted',
                  'Batch-process 50+ jobs with one click',
                  'Duplicates automatically detected and skipped',
                  'International support — 100+ countries',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className={buttonVariants({ className: 'mt-8 w-full sm:w-auto' })}>
                Try the Scanner
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                  <div className="size-2 rounded-full bg-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Senior Backend Engineer</p>
                    <p className="text-xs text-muted-foreground">Stripe — via Greenhouse</p>
                  </div>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">4.8/5</Badge>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                  <div className="size-2 rounded-full bg-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Platform Engineer</p>
                    <p className="text-xs text-muted-foreground">Datadog — via Greenhouse</p>
                  </div>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">4.5/5</Badge>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                  <div className="size-2 rounded-full bg-yellow-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">DevOps Engineer</p>
                    <p className="text-xs text-muted-foreground">Cloudflare — via Greenhouse</p>
                  </div>
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">3.9/5</Badge>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                  <div className="size-2 rounded-full bg-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Infrastructure Analyst</p>
                    <p className="text-xs text-muted-foreground">Coinbase — via Greenhouse</p>
                  </div>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">4.2/5</Badge>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                <Zap className="mx-auto mb-1 size-4 text-primary" />
                4 new jobs found — 3 strong matches ready to process
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tool Suite */}
      <section id="tools" className="bg-muted/30 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center">
            <Badge variant="outline" className="mb-4">Bonus Tools</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              5 specialized career tools included
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Beyond evaluations and documents — tools for networking, research, and decision-making.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {toolSuite.map((tool) => (
              <div key={tool.title} className="group flex gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary/50">
                <div className="shrink-0 rounded-lg bg-primary/10 p-2 h-fit">
                  <tool.icon className="size-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{tool.title}</h3>
                    <span className="text-xs text-muted-foreground">{tool.cost}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Evaluation deep dive */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="order-2 md:order-1 rounded-xl border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">Senior Cloud Engineer</p>
                  <p className="text-xs text-muted-foreground">Shopify — Remote, Canada</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex">
                    {[1, 2, 3, 4].map((s) => (
                      <Star key={s} className="size-4 fill-primary text-primary" />
                    ))}
                    <Star className="size-4 fill-primary/30 text-primary/30" />
                  </div>
                  <span className="text-sm font-bold">4.3/5</span>
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Role Summary', grade: 'A', color: 'text-green-500' },
                  { label: 'CV Match Analysis', grade: 'B+', color: 'text-green-500' },
                  { label: 'Interview Prep', grade: 'A-', color: 'text-green-500' },
                  { label: 'Salary & Market Data', grade: 'B', color: 'text-yellow-500' },
                  { label: 'Customization Tips', grade: 'A', color: 'text-green-500' },
                  { label: 'STAR+R Stories', grade: '4 stories', color: 'text-primary' },
                ].map((block) => (
                  <div key={block.label} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                    <span>{block.label}</span>
                    <span className={`font-bold ${block.color}`}>{block.grade}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" className="flex-1 text-xs">Generate Resume</Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs">Cover Letter</Button>
              </div>
            </div>
            <div className="order-1 md:order-2 text-center md:text-left">
              <Badge variant="outline" className="mb-4">AI Evaluation</Badge>
              <h2 className="text-3xl font-bold tracking-tight">
                Know exactly where you stand
              </h2>
              <p className="mt-4 text-muted-foreground">
                Every evaluation gives you a complete breakdown: how well your CV matches, which gaps to address,
                what salary to expect, and exactly how to prepare for the interview — with ready-made STAR stories.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Scored across 6 evaluation dimensions',
                  'CV gap analysis with specific improvement tips',
                  'Market salary data and demand signals',
                  'Auto-generated STAR+R interview stories',
                  'One-click resume and cover letter generation',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof / Testimonials placeholder */}
      <section className="border-y bg-muted/30 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Built for serious job seekers
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Whether you are applying to 5 jobs or 500, ApplyAgent gives you an unfair advantage
            at every step of the process.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 text-left">
              <div className="mb-3 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="size-3.5 fill-primary text-primary" />)}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                &ldquo;I evaluated 40 jobs in one afternoon and knew exactly which ones to apply to.
                The tailored resumes got me 3 interviews in the first week.&rdquo;
              </p>
              <p className="mt-3 text-xs font-semibold">Software Engineer, Toronto</p>
            </div>
            <div className="rounded-xl border bg-card p-6 text-left">
              <div className="mb-3 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="size-3.5 fill-primary text-primary" />)}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                &ldquo;The portal scanner found roles I never would have discovered. Batch processing
                saved me hours of manual evaluation work.&rdquo;
              </p>
              <p className="mt-3 text-xs font-semibold">DevOps Engineer, London</p>
            </div>
            <div className="rounded-xl border bg-card p-6 text-left">
              <div className="mb-3 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="size-3.5 fill-primary text-primary" />)}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                &ldquo;The STAR stories from evaluations were a game-changer for interviews. I walked in
                with prepared answers for every question.&rdquo;
              </p>
              <p className="mt-3 text-xs font-semibold">Cloud Architect, New York</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* Referral CTA */}
      <section className="border-t bg-muted/30 py-12">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <Users className="mx-auto mb-4 size-8 text-primary" />
          <h3 className="text-xl font-bold">Refer a friend, both get 50 credits</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Share your referral link after signing up. When they create an account, you both get 50 credits free.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your next job is closer than you think
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Stop spending hours on applications that go nowhere. Let AI evaluate, tailor, and track —
            so you can focus on landing interviews.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup" className={buttonVariants({ size: 'lg', className: 'px-8 text-base font-semibold' })}>
              Start for Free
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Set up in 2 minutes. Start applying today.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 text-sm text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center text-center gap-8 md:flex-row md:items-start md:text-left md:justify-between">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 font-semibold text-foreground hover:opacity-80 transition-opacity">
                <Image src="/icon.svg" alt="" width={20} height={20} />
                <span>ApplyAgent</span>
              </Link>
              <p className="mt-2 max-w-xs text-xs text-muted-foreground mx-auto md:mx-0">
                AI-powered job search command center. Evaluate, generate, scan, and track — all in one place.
              </p>
            </div>
            <div className="flex flex-col gap-6 sm:flex-row sm:gap-12">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground">Product</p>
                <nav className="flex flex-col gap-1.5">
                  <a href="#features" className="hover:text-foreground transition-colors">Features</a>
                  <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
                  <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
                </nav>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground">Legal</p>
                <nav className="flex flex-col gap-1.5">
                  <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                  <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
                  <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
                </nav>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t pt-6 text-center text-xs">
            &copy; {new Date().getFullYear()} ApplyAgent. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
