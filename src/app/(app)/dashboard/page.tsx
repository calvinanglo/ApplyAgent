import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Search, FileText, Briefcase, CreditCard, Inbox, FileDown, Mail, Wrench, BarChart3, CheckCircle2, Circle, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: profile },
    { count: totalApps },
    { data: recentApps },
    { data: balance },
    { count: pendingPipeline },
    { data: cvDoc },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, onboarding_completed, target_roles, email').eq('id', user!.id).single(),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
    supabase.from('applications')
      .select('id, company, role, score, status, report_id, created_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('credit_balances').select('balance, free_evaluations_used').eq('user_id', user!.id).single(),
    supabase.from('pipeline_items').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('status', 'pending'),
    supabase.from('cv_documents').select('id').eq('user_id', user!.id).eq('is_active', true).single(),
  ]) as any[]

  // Onboarding checklist
  const p = profile as any
  const hasName = !!p?.full_name?.trim()
  const hasEmail = !!p?.email?.trim()
  const hasCV = !!cvDoc
  const hasRoles = (p?.target_roles || []).length > 0
  const hasEvaluated = (totalApps || 0) > 0
  const onboardingSteps = [
    { done: hasName && hasEmail, label: 'Fill in your name and email', href: '/settings', action: 'Go to Profile' },
    { done: hasCV, label: 'Upload your resume (PDF or DOCX)', href: '/settings', action: 'Upload CV' },
    { done: hasRoles, label: 'Set your target roles', href: '/settings', action: 'Add Roles' },
    { done: hasEvaluated, label: 'Evaluate your first job posting', href: '/evaluate', action: 'Evaluate' },
  ]
  const onboardingComplete = onboardingSteps.every(s => s.done)
  const currentStep = onboardingSteps.findIndex(s => !s.done)

  if (!onboardingComplete) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome to ApplyAgent</h1>
          <p className="text-muted-foreground mt-1">Complete these steps to get started. It only takes 2 minutes.</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {onboardingSteps.map((step, i) => (
                <div key={i} className={`flex items-center gap-3 ${i === currentStep ? '' : step.done ? 'opacity-60' : 'opacity-40'}`}>
                  {step.done ? (
                    <CheckCircle2 className="size-5 text-green-600 shrink-0" />
                  ) : (
                    <Circle className={`size-5 shrink-0 ${i === currentStep ? 'text-primary' : 'text-muted-foreground'}`} />
                  )}
                  <span className={`flex-1 text-sm ${step.done ? 'line-through text-muted-foreground' : i === currentStep ? 'font-medium' : ''}`}>
                    {step.label}
                  </span>
                  {i === currentStep && (
                    <Link href={step.href}>
                      <Button size="sm">
                        {step.action}
                        <ArrowRight className="size-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(onboardingSteps.filter(s => s.done).length / onboardingSteps.length) * 100}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{onboardingSteps.filter(s => s.done).length} of {onboardingSteps.length} complete</p>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">You get <strong>3 free uses</strong> to try any feature before buying credits.</p>
      </div>
    )
  }

  const freeLeft = Math.max(0, 3 - ((balance as any)?.free_evaluations_used || 0))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {(profile as any)?.full_name || 'there'}.</p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Evaluations</CardTitle>
            <Briefcase className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApps || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Credits</CardTitle>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(balance as any)?.balance || 0}</div>
            {freeLeft > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">{freeLeft} free use{freeLeft !== 1 ? 's' : ''} left</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
            <Inbox className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPipeline || 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reports</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Link href="/applications">
              <Button variant="outline" size="sm" className="w-full">View All</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Jump straight to the most common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: '/evaluate', icon: Search, label: 'Evaluate Job', desc: 'Full A-F evaluation', credits: '10 cr' },
              { href: '/cover-letter', icon: Mail, label: 'Cover Letter', desc: 'Tailored cover letter', credits: '5 cr' },
              { href: '/resume', icon: FileDown, label: 'Resume', desc: 'ATS-optimized PDF', credits: '3 cr' },
              { href: '/tools', icon: Wrench, label: 'Tools', desc: 'LinkedIn, research & more', credits: '2-5 cr' },
              { href: '/scan', icon: Inbox, label: 'Run Scanner', desc: 'Discover new openings', credits: '8 cr' },
              { href: '/pipeline', icon: BarChart3, label: 'Process Pipeline', desc: `${pendingPipeline || 0} items pending`, credits: '' },
            ].map(({ href, icon: Icon, label, desc, credits }) => (
              <Link key={href} href={href}>
                <div className="rounded-lg border p-3 transition-colors hover:bg-muted cursor-pointer">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    {credits && <span className="text-xs text-muted-foreground">{credits}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent evaluations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Evaluations</CardTitle>
          <CardDescription>Your latest evaluated job postings</CardDescription>
        </CardHeader>
        <CardContent>
          {!(recentApps as any[])?.length ? (
            <p className="py-8 text-center text-muted-foreground">
              No evaluations yet.{' '}
              <Link href="/evaluate" className="text-primary underline">Evaluate your first job posting</Link>.
            </p>
          ) : (
            <div className="space-y-2">
              {(recentApps as any[]).map((app) => (
                <Link
                  key={app.id}
                  href={app.report_id ? `/reports/${app.report_id}` : `/applications`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                >
                  <div>
                    <p className="font-medium">{app.company}</p>
                    <p className="text-sm text-muted-foreground">{app.role}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {app.score != null && (
                      <span className={`font-mono text-sm font-bold ${app.score >= 4 ? 'text-green-600' : app.score >= 3 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                        {Number(app.score).toFixed(1)}/5
                      </span>
                    )}
                    <Badge variant={app.status === 'Applied' ? 'default' : 'secondary'}>
                      {app.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
