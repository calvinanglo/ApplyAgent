import Link from 'next/link'
import Image from 'next/image'
import { buttonVariants } from '@/lib/button-variants'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { PricingSection } from '@/components/pricing-section'
import { MobileNav } from '@/components/mobile-nav'
import { AnimatedStats } from '@/components/landing/animated-stats'
import { FeatureShowcase } from '@/components/landing/feature-showcase'
import {
  Sparkles, ArrowRight, Play, CheckCircle2, ChevronRight,
  Clock, Star, Users, Check,
} from 'lucide-react'

const companies = [
  'Airbnb', 'Stripe', 'GitLab', 'Datadog', 'Discord', 'Figma', 'Coinbase',
  'Cloudflare', 'Reddit', 'Twitch', 'OpenAI', 'Vercel', 'Shopify', 'Netflix',
  'Spotify', 'HubSpot', 'Notion', 'DoorDash', 'Instacart', 'Plaid', 'Supabase',
  'Linear', 'Ramp', 'SoFi', 'Robinhood', 'Gusto', 'Toast', 'AbbVie',
  'Visa', 'Gap Inc', 'Peloton', 'Wayfair',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* ── Nav ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image src="/icon.svg" alt="" width={28} height={28} />
            <span className="text-lg font-bold">ApplyAgent</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
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

      {/* ── Hero + Stats + Marquee ──────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

        <div className="mx-auto max-w-5xl px-4 pb-12 pt-20 text-center sm:pt-28 sm:pb-16">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
            <Sparkles className="mr-1.5 size-3.5" />
            Powered by AI
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Stop guessing.
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Start landing interviews.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Evaluate jobs against your CV, generate tailored documents, scan 109 company portals and 4 job boards,
            and track your entire search — all in one command center.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup" className={buttonVariants({ size: 'lg', className: 'cta-pulse px-8 text-base font-semibold' })}>
              Start for Free
              <ArrowRight className="ml-2 size-4" />
            </Link>
            <a href="#how-it-works" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'px-8 text-base' })}>
              <Play className="mr-2 size-4" />
              See How It Works
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Set up in 2 minutes. Start applying today.</p>

          {/* Stats */}
          <div className="mt-12">
            <AnimatedStats />
          </div>
        </div>

        {/* Company marquee */}
        <div className="border-y bg-muted/30 py-5 overflow-hidden">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Scans career pages from leading companies
          </p>
          <div className="relative">
            <div className="flex gap-8 hover:[animation-play-state:paused]" style={{ animation: 'marquee 40s linear infinite', width: 'max-content' }}>
              {[...companies, ...companies].map((c, i) => (
                <span key={`${c}-${i}`} className="whitespace-nowrap text-sm font-medium text-muted-foreground/60">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── The Problem ─────────────────────────────── */}
      <section className="bg-muted/20 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center scroll-reveal">
            <Badge variant="outline" className="mb-4">The Problem</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              75% of resumes are rejected before a human reads them
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Companies use Applicant Tracking Systems to automatically filter candidates.
              If your resume doesn&apos;t match, you&apos;re invisible.
            </p>
          </div>

          <div className="mt-14 grid gap-0 md:grid-cols-4">
            {[
              { step: '1', title: 'You Apply', desc: 'Your resume enters the ATS — Greenhouse, Lever, Workday, or similar.', color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { step: '2', title: 'ATS Scans', desc: 'Software parses for keywords, skills, and experience matching the job description.', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
              { step: '3', title: 'Filtered Out', desc: 'Resumes that don\'t score high enough are automatically rejected. No human sees them.', color: 'text-red-500', bg: 'bg-red-500/10' },
              { step: '4', title: 'Top Matches Win', desc: 'Only the highest-scoring resumes reach the recruiter, who decides who to interview.', color: 'text-green-500', bg: 'bg-green-500/10' },
            ].map((item, i) => (
              <div key={item.step} className={`scroll-reveal scroll-reveal-delay-${i} relative flex flex-col items-center text-center px-4 py-6`}>
                {i < 3 && <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 z-10"><ChevronRight className="size-5 text-muted-foreground/40" /></div>}
                <div className={`flex size-12 items-center justify-center rounded-full ${item.bg} mb-4`}>
                  <span className={`text-lg font-bold ${item.color}`}>{item.step}</span>
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 scroll-reveal rounded-xl border bg-background p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">ApplyAgent fixes every step</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[
                    ['Evaluate first', 'know your match score before wasting time on long-shot applications'],
                    ['Beat the ATS', 'keyword-optimized resumes that score high in automated screening'],
                    ['Impress the human', 'tailored cover letters connecting your experience to their requirements'],
                  ].map(([bold, text]) => (
                    <li key={bold} className="flex items-start gap-2">
                      <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" />
                      <span><strong className="text-foreground">{bold}</strong> — {text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/signup" className={buttonVariants({ size: 'lg', className: 'shrink-0 w-full sm:w-auto' })}>
                Start Beating the ATS <ArrowRight className="ml-2 size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────── */}
      <section id="how-it-works" className="mx-auto max-w-5xl px-4 py-20">
        <div className="text-center scroll-reveal">
          <Badge variant="outline" className="mb-4">How It Works</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            From job posting to application in under 5 minutes
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Upload once, then evaluate and apply to unlimited jobs.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-4">
          {[
            { num: '01', title: 'Upload Your CV', desc: 'One-time setup. Upload your resume and set your target roles and preferences.', time: '2 min' },
            { num: '02', title: 'Evaluate Jobs', desc: 'Paste a job description or scan company portals. Get instant match scores.', time: '30 sec' },
            { num: '03', title: 'Generate Documents', desc: 'One click generates an ATS-optimized resume and tailored cover letter.', time: '15 sec' },
            { num: '04', title: 'Apply & Track', desc: 'Download documents, apply, and track every application in one dashboard.', time: 'Ongoing' },
          ].map((step, i) => (
            <div key={step.num} className={`scroll-reveal scroll-reveal-delay-${i} relative`}>
              {i < 3 && <div className="absolute right-0 top-8 hidden w-6 translate-x-1/2 md:block"><ChevronRight className="size-5 text-muted-foreground/40" /></div>}
              <div className="rounded-xl border bg-card p-6 transition-colors hover:border-primary/50 h-full">
                <div className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Step {step.num}</div>
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Clock className="size-3.5" />{step.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Showcase (interactive tabs) ────── */}
      <FeatureShowcase />

      {/* ── Testimonials ────────────────────────────── */}
      <section className="border-y bg-muted/30 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="scroll-reveal text-2xl font-bold tracking-tight sm:text-3xl">
            Built for serious job seekers
          </h2>
          <p className="scroll-reveal mx-auto mt-3 max-w-xl text-muted-foreground">
            Whether you&apos;re applying to 5 jobs or 500, ApplyAgent gives you an unfair advantage at every step.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { quote: 'I evaluated 40 jobs in one afternoon and knew exactly which ones to apply to. The tailored resumes got me 3 interviews in the first week.', role: 'Software Engineer, Toronto' },
              { quote: 'The portal scanner found roles I never would have discovered. Batch processing saved me hours of manual work.', role: 'DevOps Engineer, London' },
              { quote: 'The STAR stories from evaluations were a game-changer for interviews. I walked in with prepared answers for every question.', role: 'Cloud Architect, New York' },
            ].map((t, i) => (
              <div key={t.role} className={`scroll-reveal scroll-reveal-delay-${i} rounded-xl border bg-card p-6 text-left`}>
                <div className="mb-3 flex gap-0.5">
                  {[1,2,3,4,5].map(s => <Star key={s} className="size-3.5 fill-primary text-primary" />)}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-3 text-xs font-semibold">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────── */}
      <PricingSection />

      {/* ── Final CTA ───────────────────────────────── */}
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
          <div className="mt-8">
            <Link href="/signup" className={buttonVariants({ size: 'lg', className: 'cta-pulse px-8 text-base font-semibold' })}>
              Start for Free <ArrowRight className="ml-2 size-4" />
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Set up in 2 minutes. Start applying today.</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
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
              <p className="mt-3 text-xs text-muted-foreground">
                <Users className="inline size-3 mr-1" />
                Refer a friend — both get 50 credits free.
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
