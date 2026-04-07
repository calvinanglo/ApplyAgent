'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { CreditCard } from 'lucide-react'

interface CreditBadgeProps {
  credits: number
  freeRemaining: number
}

export function CreditBadge({ credits, freeRemaining }: CreditBadgeProps) {
  return (
    <Link href="/billing" className="flex items-center gap-2">
      <Badge variant="outline" className="gap-1.5 px-2.5 py-1">
        <CreditCard className="size-3.5" />
        <span className="font-mono text-xs">{credits}</span>
        <span className="text-[10px] text-muted-foreground">credits</span>
      </Badge>
      {freeRemaining > 0 && (
        <span className="text-[10px] text-muted-foreground">
          {freeRemaining} free use{freeRemaining !== 1 ? 's' : ''}
        </span>
      )}
    </Link>
  )
}
