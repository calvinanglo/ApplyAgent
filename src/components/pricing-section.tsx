'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CREDIT_PACKS, CREDIT_COSTS, SUBSCRIPTION_PLANS, getActionLabel, type CreditAction } from '@/lib/credits'
import { CheckCircle2, ArrowRight } from 'lucide-react'

type BillingPeriod = 'monthly' | 'annually' | 'one-time'

export function PricingSection() {
  const [billing, setBilling] = useState<BillingPeriod>('monthly')

  return (
    <section id="pricing" className="mx-auto max-w-5xl px-4 py-20">
      <div className="text-center">
        <Badge variant="outline" className="mb-4">Pricing</Badge>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Plans that grow with your job search
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Subscribe for monthly credits or buy one-time packs. No hidden fees.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="mt-8 flex items-center justify-center gap-1 rounded-full bg-muted p-1 w-fit mx-auto">
        {([
          { value: 'monthly' as const, label: 'Monthly' },
          { value: 'annually' as const, label: 'Annually' },
          { value: 'one-time' as const, label: 'Credit Packs' },
        ]).map((opt) => (
          <button
            key={opt.value}
            onClick={() => setBilling(opt.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              billing === opt.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
            {opt.value === 'annually' && (
              <span className="ml-1.5 text-xs text-green-600 dark:text-green-400 font-semibold">Save 20%</span>
            )}
          </button>
        ))}
      </div>

      {/* Subscription plans */}
      {billing !== 'one-time' && (
        <div className="mt-12 grid gap-6 md:grid-cols-3 pt-4 max-w-sm md:max-w-none mx-auto">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const price = billing === 'monthly' ? plan.priceMonthlyDisplay : plan.priceAnnuallyDisplay
            const isPopular = plan.badge === 'Most Popular'
            return (
              <Card key={plan.id} className={`relative overflow-visible transition-all hover:shadow-lg ${isPopular ? 'border-primary shadow-md scale-[1.02]' : ''}`}>
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">Most Popular</Badge>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.credits} credits / month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-1">
                    <span className="text-4xl font-extrabold">{price}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
                  {billing === 'annually' && (
                    <p className="mb-3 text-xs text-green-600 dark:text-green-400 font-medium">
                      Billed {plan.priceAnnualTotalDisplay}/year
                    </p>
                  )}
                  {billing === 'monthly' && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      ${(plan.priceMonthly / 100 / plan.credits).toFixed(3)} per credit
                    </p>
                  )}
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-primary shrink-0" />
                      {Math.floor(plan.credits / CREDIT_COSTS.evaluation)} evaluations/mo
                    </li>
                  </ul>
                  <Link href="/signup">
                    <Button variant={isPopular ? 'default' : 'outline'} className="mt-6 w-full">
                      Get Started
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* One-time credit packs */}
      {billing === 'one-time' && (
        <div className="mt-12 grid gap-6 md:grid-cols-3 pt-4 max-w-sm md:max-w-none mx-auto">
          {CREDIT_PACKS.map((pack) => {
            const hasBadge = !!pack.badge
            return (
              <Card key={pack.id} className={`relative overflow-visible transition-all hover:shadow-lg ${hasBadge ? 'border-primary shadow-md scale-[1.02]' : ''}`}>
                {pack.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">{pack.badge}</Badge>
                )}
                <CardHeader>
                  <CardTitle>{pack.name}</CardTitle>
                  <CardDescription>{pack.credits} credits</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-1 text-4xl font-extrabold">{pack.priceDisplay}</div>
                  <p className="mb-4 text-xs text-muted-foreground">
                    ${(pack.price / 100 / pack.credits).toFixed(3)} per credit · one-time
                  </p>
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
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-primary" />
                      Credits never expire
                    </li>
                  </ul>
                  <Link href="/signup">
                    <Button variant={hasBadge ? 'default' : 'outline'} className="mt-6 w-full">
                      Buy Credits
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Credit costs table */}
      <div className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credit costs per action</CardTitle>
            <CardDescription>Use credits on any feature — mix and match as needed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
              {(Object.keys(CREDIT_COSTS) as CreditAction[]).map((action) => (
                <div key={action} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-muted-foreground">{getActionLabel(action)}</span>
                  <span className="font-mono font-bold text-primary">{CREDIT_COSTS[action]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
