'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CREDIT_PACKS, CREDIT_COSTS, SUBSCRIPTION_PLANS, getActionLabel, type CreditAction } from '@/lib/credits'
import { CreditCard, Loader2, CheckCircle2, Gift, Copy, Check, Crown, Calendar, AlertCircle, ExternalLink } from 'lucide-react'

interface Subscription {
  id: string
  plan_id: string
  billing_period: 'monthly' | 'annually'
  status: 'active' | 'canceled' | 'past_due' | 'incomplete'
  credits_per_month: number
  current_period_end: string
  cancel_at_period_end: boolean
}

export default function BillingPage() {
  const [balance, setBalance] = useState<number>(0)
  const [freeUsed, setFreeUsed] = useState<number>(0)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [referral, setReferral] = useState<{ code: string; referrals: number; link: string } | null>(null)
  const [refCopied, setRefCopied] = useState(false)
  const [transactions, setTransactions] = useState<Array<{
    id: string
    amount: number
    type: string
    action: string | null
    description: string | null
    created_at: string
  }>>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [billingTab, setBillingTab] = useState<'subscription' | 'packs'>('subscription')
  const [subBilling, setSubBilling] = useState<'monthly' | 'annually'>('monthly')
  const [managingAction, setManagingAction] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [balanceRes, txRes, subRes] = await Promise.all([
      supabase.from('credit_balances').select('*').eq('user_id', user.id).single() as any,
      supabase.from('credit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20) as any,
      fetch('/api/subscriptions').then(r => r.json()),
    ])

    if (balanceRes.data) {
      setBalance(balanceRes.data.balance)
      setFreeUsed(balanceRes.data.free_evaluations_used)
    }
    if (txRes.data) setTransactions(txRes.data)
    if (subRes.subscription) setSubscription(subRes.subscription)

    // Load referral info
    try {
      const refRes = await fetch('/api/referral')
      if (refRes.ok) setReferral(await refRes.json())
    } catch {}

    setLoading(false)
  }

  async function handlePurchasePack(packId: string) {
    setPurchasing(packId)
    try {
      const res = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: packId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setPurchasing(null)
    } catch {
      setPurchasing(null)
    }
  }

  async function handleSubscribe(planId: string) {
    setPurchasing(planId)
    try {
      const res = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, billing_period: subBilling }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else {
        alert(data.error || 'Failed to start checkout')
        setPurchasing(null)
      }
    } catch {
      setPurchasing(null)
    }
  }

  async function handleManageSubscription(action: 'cancel' | 'resume' | 'portal') {
    setManagingAction(action)
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.success) {
        await loadData()
      } else {
        alert(data.error || 'Failed')
      }
    } catch {
      // ignore
    } finally {
      setManagingAction(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const activePlan = subscription && subscription.status === 'active'
    ? SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan_id)
    : null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription, credits, and purchases</p>
      </div>

      {/* Balance + Subscription Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Credit Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{balance}</div>
            <p className="mt-1 text-sm text-muted-foreground">credits remaining</p>
          </CardContent>
        </Card>

        {subscription && subscription.status !== 'canceled' ? (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="size-5 text-primary" />
                {activePlan?.name || subscription.plan_id} Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Credits/month</span>
                <span className="font-bold">{subscription.credits_per_month}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Billing</span>
                <span className="capitalize">{subscription.billing_period}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Next renewal</span>
                <span>{new Date(subscription.current_period_end).toLocaleDateString()}</span>
              </div>
              {subscription.cancel_at_period_end && (
                <div className="mt-2 flex items-center gap-2 rounded-md bg-yellow-500/10 px-3 py-2 text-sm text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="size-4" />
                  Cancels {new Date(subscription.current_period_end).toLocaleDateString()}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {subscription.cancel_at_period_end ? (
                  <Button
                    size="sm"
                    onClick={() => handleManageSubscription('resume')}
                    disabled={managingAction !== null}
                  >
                    {managingAction === 'resume' ? <Loader2 className="size-4 animate-spin" /> : null}
                    Resume
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManageSubscription('cancel')}
                    disabled={managingAction !== null}
                  >
                    {managingAction === 'cancel' ? <Loader2 className="size-4 animate-spin" /> : null}
                    Cancel
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleManageSubscription('portal')}
                  disabled={managingAction !== null}
                >
                  <ExternalLink className="size-3.5" />
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Free Tier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{Math.max(0, 3 - freeUsed)}</div>
              <p className="mt-1 text-sm text-muted-foreground">free uses remaining</p>
            </CardContent>
          </Card>
        )}
      </div>

      {subscription?.status === 'past_due' && (
        <Card className="border-red-500/30">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="size-5 text-red-500" />
            <div>
              <p className="font-medium text-red-500">Payment Past Due</p>
              <p className="text-sm text-muted-foreground">
                Your last payment failed. Please update your payment method to keep your subscription active.
              </p>
            </div>
            <Button
              size="sm"
              className="ml-auto"
              onClick={() => handleManageSubscription('portal')}
            >
              Update Payment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Purchase Section */}
      <div>
        <div className="mb-4 flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            {subscription && subscription.status === 'active' ? 'Buy More Credits' : 'Get Credits'}
          </h2>
          <div className="flex rounded-full bg-muted p-1">
            <button
              onClick={() => setBillingTab('subscription')}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                billingTab === 'subscription'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Subscriptions
            </button>
            <button
              onClick={() => setBillingTab('packs')}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                billingTab === 'packs'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Credit Packs
            </button>
          </div>
        </div>

        {billingTab === 'subscription' && (
          <>
            {/* Monthly/Annual toggle */}
            <div className="mb-4 flex items-center justify-center gap-1 rounded-full bg-muted p-1 w-fit">
              <button
                onClick={() => setSubBilling('monthly')}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  subBilling === 'monthly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setSubBilling('annually')}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  subBilling === 'annually'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Annually <span className="ml-1 text-xs text-green-600 dark:text-green-400 font-semibold">Save 20%</span>
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const price = subBilling === 'monthly' ? plan.priceMonthlyDisplay : plan.priceAnnuallyDisplay
                const isPopular = plan.badge === 'Most Popular'
                const isCurrentPlan = subscription?.status === 'active' && subscription.plan_id === plan.id
                return (
                  <Card key={plan.id} className={`relative overflow-visible ${isPopular ? 'border-primary' : ''} ${isCurrentPlan ? 'border-green-500' : ''}`}>
                    {isPopular && !isCurrentPlan && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
                    )}
                    {isCurrentPlan && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600">Current Plan</Badge>
                    )}
                    <CardHeader>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>{plan.credits} credits/month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-1">
                        <span className="text-3xl font-bold">{price}</span>
                        <span className="text-muted-foreground text-sm">/mo</span>
                      </div>
                      {subBilling === 'annually' && (
                        <p className="mb-3 text-xs text-green-600 dark:text-green-400 font-medium">
                          Billed {plan.priceAnnualTotalDisplay}/year
                        </p>
                      )}
                      <ul className="mb-4 space-y-1.5 text-sm text-muted-foreground">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full"
                        variant={isCurrentPlan ? 'outline' : isPopular ? 'default' : 'outline'}
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={purchasing !== null || isCurrentPlan}
                      >
                        {purchasing === plan.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : isCurrentPlan ? (
                          'Current Plan'
                        ) : (
                          <>
                            <CreditCard className="size-4" />
                            Subscribe
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}

        {billingTab === 'packs' && (
          <div className="grid gap-4 md:grid-cols-3">
            {CREDIT_PACKS.map((pack) => (
              <Card key={pack.id} className={`relative overflow-visible ${pack.id === 'professional' ? 'border-primary' : ''}`}>
                {pack.id === 'professional' && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Best Value</Badge>
                )}
                <CardHeader>
                  <CardTitle>{pack.name}</CardTitle>
                  <CardDescription>{pack.credits} credits</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 text-3xl font-bold">{pack.priceDisplay}</div>
                  <p className="mb-4 text-xs text-muted-foreground">
                    ${(pack.price / pack.credits / 100).toFixed(3)}/credit · one-time
                  </p>
                  <Button
                    className="w-full"
                    variant={pack.id === 'professional' ? 'default' : 'outline'}
                    onClick={() => handlePurchasePack(pack.id)}
                    disabled={purchasing !== null}
                  >
                    {purchasing === pack.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CreditCard className="size-4" />
                    )}
                    Buy {pack.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Credit Costs</CardTitle>
          <CardDescription>How many credits each action uses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
            {(Object.keys(CREDIT_COSTS) as CreditAction[]).map((action) => (
              <div key={action} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span>{getActionLabel(action)}</span>
                <Badge variant="outline">{CREDIT_COSTS[action]}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between border-b py-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{tx.description || tx.action || tx.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`font-mono text-sm font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Program */}
      {referral && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="size-5 text-primary" />
              Refer a Friend, Get 50 Credits
            </CardTitle>
            <CardDescription>Share your link. When someone signs up, you both get 50 free credits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm truncate">
                {referral.link}
              </div>
              <Button variant="outline" size="sm" onClick={async () => {
                await navigator.clipboard.writeText(referral.link)
                setRefCopied(true)
                setTimeout(() => setRefCopied(false), 2000)
              }}>
                {refCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your code: <strong>{referral.code}</strong> &middot; {referral.referrals} referral{referral.referrals !== 1 ? 's' : ''} so far
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
