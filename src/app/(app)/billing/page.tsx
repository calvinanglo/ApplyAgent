'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CREDIT_PACKS, CREDIT_COSTS, getActionLabel, type CreditAction } from '@/lib/credits'
import { CreditCard, Loader2, CheckCircle2, Gift, Copy, Check } from 'lucide-react'

export default function BillingPage() {
  const [balance, setBalance] = useState<number>(0)
  const [freeUsed, setFreeUsed] = useState<number>(0)
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

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [balanceRes, txRes] = await Promise.all([
      supabase.from('credit_balances').select('*').eq('user_id', user.id).single() as any,
      supabase.from('credit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20) as any,
    ])

    if (balanceRes.data) {
      setBalance(balanceRes.data.balance)
      setFreeUsed(balanceRes.data.free_evaluations_used)
    }
    if (txRes.data) setTransactions(txRes.data)

    // Load referral info
    try {
      const refRes = await fetch('/api/referral')
      if (refRes.ok) setReferral(await refRes.json())
    } catch {}

    setLoading(false)
  }

  async function handlePurchase(packId: string) {
    setPurchasing(packId)
    try {
      const res = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: packId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setPurchasing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Manage your credits and purchases</p>
      </div>

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
        <Card>
          <CardHeader>
            <CardTitle>Free Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{Math.max(0, 3 - freeUsed)}</div>
            <p className="mt-1 text-sm text-muted-foreground">free uses remaining</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Buy Credits</h2>
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
                  ${(pack.price / pack.credits / 100).toFixed(3)}/credit
                </p>
                <Button
                  className="w-full"
                  onClick={() => handlePurchase(pack.id)}
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
